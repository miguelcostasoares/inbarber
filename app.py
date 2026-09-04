from flask import Flask, jsonify, request, send_from_directory
import base64
from dotenv import load_dotenv
import mysql.connector
import os as _os
import bcrypt
import uuid
import json
import secrets
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)
#Conexões com a env

def get_db():
    conn = mysql.connector.connect(
        host=_os.getenv('DB_HOST'),
        port=int(_os.getenv('DB_PORT')),
        user=_os.getenv('DB_USER'),
        password=_os.getenv('DB_PASSWORD'),
        database=_os.getenv('DB_NAME')
    )
    return conn

# Criptografia para momento de login
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# ─── Auth helpers ─────────────────────────────────────────────
def gerar_token():
    """Gera um token opaco de 64 hex-chars (256 bits de entropia)."""
    return secrets.token_hex(32)


def usuario_do_token(cursor, token):
    """Retorna a linha de `usuarios` se o token for válido e não expirado."""
    if not token:
        return None
    cursor.execute(
        '''SELECT * FROM usuarios
           WHERE token_sessao = %s
             AND token_expira_em > NOW()
             AND ativo = 1''',
        (token,)
    )
    return cursor.fetchone()


def token_do_request():
    """Extrai o token do header Authorization: Bearer <token>."""
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
        return auth[7:].strip()
    return None


def serializar_usuario(row):
    """Serializa um usuário para o front (nunca expõe senha_hash nem token)."""
    return {
        'id':              row['id'],
        'primeiroNome':    row['primeiro_nome'],
        'sobrenome':       row['sobrenome'],
        'nomeCompleto':    f"{row['primeiro_nome']} {row['sobrenome']}",
        'email':           row['email'],
        'telefone':        row['telefone'],
        'dataNascimento':  row['data_nascimento'].isoformat() if row.get('data_nascimento') else None,
        'emailVerificado': bool(row['email_verificado']),
        'clienteId':       row['cliente_id'],
        'prefs': {
            'barbeiroId':    row['pref_barbeiro_id'],
            'horario':       row['pref_horario'],
            'pagamento':     row['pref_pagamento'],
            'notifLembrete': bool(row['pref_notif_lembrete']),
            'notifEmail':    bool(row['pref_notif_email']),
            'notifSms':      bool(row['pref_notif_sms']),
            'notifPromos':   bool(row['pref_notif_promos']),
            'leadHoras':     row['pref_lead_horas'],
            'idioma':        row['pref_idioma'],
            'formatoHora':   row['pref_formato_hora'],
            'tamanhoTexto':  row['pref_tamanho_texto'],
            'reduceMotion':  bool(row['pref_reduce_motion']),
        },
        'fotoUrl':   row.get('foto_url') or None,
        'createdAt': row['created_at'].isoformat() if row.get('created_at') else None,
    }


# ═══════════════════════════════════════════════════════════
# AGENDA — Helpers internos
# ═══════════════════════════════════════════════════════════

STATUS_VALIDOS = {'pendente', 'confirmado', 'concluido', 'cancelado'}


def gerar_agendamento_id():
    # Mesmo padrão do genId() do front (prefixo + string curta),
    # mas gerado no back-end para garantir unicidade real.
    return 'a' + uuid.uuid4().hex[:12]


def calcular_hora_fim(hora_inicio, duracao_min):
    """hora_inicio: datetime.time | duracao_min: int (minutos) -> datetime.time"""
    base = datetime.combine(datetime.min, hora_inicio)
    fim = base + timedelta(minutes=duracao_min)
    return fim.time()


def buscar_servico(cursor, servico_id):
    cursor.execute(
        'SELECT id, nome, preco, duracao_min FROM servicos WHERE id = %s AND ativo = 1',
        (servico_id,)
    )
    return cursor.fetchone()


def buscar_barbeiro(cursor, barbeiro_id):
    cursor.execute(
        'SELECT id, nome FROM barbeiros WHERE id = %s AND ativo = 1',
        (barbeiro_id,)
    )
    return cursor.fetchone()


def existe_conflito(cursor, barbeiro_id, data, hora_inicio, hora_fim, excluir_id=None):
    """
    Replica hasConflict() do agenda-crm.js: mesmo barbeiro, mesmo dia,
    faixa de horário sobreposta, ignorando agendamentos já concluídos
    ou no-show (não ocupam mais a agenda).
    """
    query = '''
        SELECT id FROM agendamentos
        WHERE barbeiro_id = %s
          AND data = %s
          AND status NOT IN ('concluido', 'cancelado')
          AND hora_inicio < %s
          AND hora_fim > %s
    '''
    params = [barbeiro_id, data, hora_fim, hora_inicio]
    if excluir_id:
        query += ' AND id != %s'
        params.append(excluir_id)
    cursor.execute(query, tuple(params))
    return cursor.fetchone() is not None


def _sobrepoe(inicio_a, fim_a, inicio_b, fim_b):
    """True se [inicio_a, fim_a) sobrepõe [inicio_b, fim_b)."""
    return inicio_a < fim_b and fim_a > inicio_b


def buscar_almoco_ativo(cursor):
    """Lê o bloqueio de almoço configurado em Preferências.
    Retorna (inicio: time, fim: time) ou None se o almoço estiver desativado
    ou sem preferências salvas ainda (comportamento igual ao GET /api/preferences)."""
    cursor.execute("SELECT almoco FROM preferencias WHERE id = 'default'")
    row = cursor.fetchone()
    almoco = _json_col(row['almoco']) if row and row.get('almoco') else None
    if not almoco or not almoco.get('ativo'):
        return None
    try:
        inicio = datetime.strptime(almoco['inicio'], '%H:%M').time()
        fim = datetime.strptime(almoco['fim'], '%H:%M').time()
        return (inicio, fim)
    except (KeyError, ValueError, TypeError):
        return None


def existe_bloqueio_manual(cursor, barbeiro_id, data, hora_inicio, hora_fim):
    """Verifica bloqueios manuais (folga, férias, manutenção, almoço manual etc.)
    cadastrados em `bloqueios_horario`. Considera tanto bloqueios do barbeiro
    específico quanto bloqueios gerais (barbeiro_id NULL = vale para todos)."""
    cursor.execute(
        '''SELECT id, motivo FROM bloqueios_horario
           WHERE data = %s
             AND (barbeiro_id = %s OR barbeiro_id IS NULL)
             AND hora_inicio < %s
             AND hora_fim > %s''',
        (data, barbeiro_id, hora_fim, hora_inicio)
    )
    return cursor.fetchone()


def validar_disponibilidade(cursor, barbeiro_id, data, hora_inicio, hora_fim, excluir_id=None):
    """Agrega todas as regras de disponibilidade de horário para um agendamento:
    1) conflito com outro agendamento do mesmo barbeiro,
    2) horário de almoço configurado em Preferências (vale para todos os barbeiros),
    3) bloqueios manuais cadastrados em bloqueios_horario (folga, férias, etc.).
    Retorna None se disponível, ou uma tupla (mensagem, http_status) em caso de bloqueio."""
    if existe_conflito(cursor, barbeiro_id, data, hora_inicio, hora_fim, excluir_id=excluir_id):
        return ('Já existe um agendamento nesse horário para este barbeiro.', 409)

    almoco = buscar_almoco_ativo(cursor)
    if almoco:
        almoco_inicio, almoco_fim = almoco
        if _sobrepoe(hora_inicio, hora_fim, almoco_inicio, almoco_fim):
            return ('Horário indisponível: intervalo de almoço da barbearia.', 409)

    bloqueio = existe_bloqueio_manual(cursor, barbeiro_id, data, hora_inicio, hora_fim)
    if bloqueio:
        motivo_label = {
            'almoco': 'almoço', 'folga': 'folga', 'ferias': 'férias',
            'manutencao': 'manutenção', 'outro': 'bloqueio manual',
        }.get(bloqueio['motivo'], 'bloqueio manual')
        return (f'Horário indisponível: {motivo_label} cadastrado(a) para este horário.', 409)

    return None


def serializar_agendamento(row):
    """Converte tipos DATE/TIME/DECIMAL do MySQL para JSON-friendly
    e usa os mesmos nomes de campo que o front já consome
    (client, phone, date, time, serviceId, barberId, notes)."""
    return {
        'id': row['id'],
        'client': row['cliente_nome'],
        'phone': row['cliente_telefone'],
        'clienteId': row['cliente_id'],
        'date': row['data'].strftime('%Y-%m-%d') if row['data'] else None,
        'time': row['hora_inicio'].strftime('%H:%M') if hasattr(row['hora_inicio'], 'strftime') else str(row['hora_inicio'])[:5],
        'endTime': row['hora_fim'].strftime('%H:%M') if hasattr(row['hora_fim'], 'strftime') else str(row['hora_fim'])[:5],
        'serviceId': row['servico_id'],
        'barberId': row['barbeiro_id'],
        'status': row['status'],
        'valorCobrado': float(row['valor_cobrado']) if row['valor_cobrado'] is not None else None,
        'formaPagamentoId': row['forma_pagamento_id'],
        'notes': row['observacoes'] or '',
    }


# ═══════════════════════════════════════════════════════════
# AGENDA — Rotas
# ═══════════════════════════════════════════════════════════

@app.route('/api/appointments', methods=['GET'])
def listar_agendamentos():
    filtros = []
    params = []

    if request.args.get('date'):
        filtros.append('data = %s')
        params.append(request.args['date'])

    if request.args.get('date_start') and request.args.get('date_end'):
        filtros.append('data BETWEEN %s AND %s')
        params.append(request.args['date_start'])
        params.append(request.args['date_end'])
    elif request.args.get('date_start'):
        filtros.append('data >= %s')
        params.append(request.args['date_start'])
    elif request.args.get('date_end'):
        filtros.append('data <= %s')
        params.append(request.args['date_end'])

    if request.args.get('barberId'):
        filtros.append('barbeiro_id = %s')
        params.append(request.args['barberId'])

    if request.args.get('serviceId'):
        filtros.append('servico_id = %s')
        params.append(request.args['serviceId'])

    if request.args.get('status'):
        status = request.args['status']
        if status not in STATUS_VALIDOS:
            return jsonify({'error': f'Status inválido: {status}'}), 400
        filtros.append('status = %s')
        params.append(status)

    if request.args.get('search'):
        # Busca sempre pelo snapshot (cliente_nome), igual ao front hoje
        # (a.client.toLowerCase().includes(...)), nunca via JOIN.
        filtros.append('cliente_nome LIKE %s')
        params.append(f"%{request.args['search']}%")

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ''

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'''SELECT id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                       barbeiro_id, data, hora_inicio, hora_fim, valor_cobrado,
                       status, forma_pagamento_id, observacoes
                FROM agendamentos
                {where}
                ORDER BY data ASC, hora_inicio ASC''',
            tuple(params)
        )
        agendamentos = [serializar_agendamento(row) for row in cursor.fetchall()]
        return jsonify(agendamentos), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar agendamentos: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/appointments/<agendamento_id>', methods=['GET'])
def buscar_agendamento(agendamento_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                      barbeiro_id, data, hora_inicio, hora_fim, valor_cobrado,
                      status, forma_pagamento_id, observacoes
               FROM agendamentos WHERE id = %s''',
            (agendamento_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Agendamento não encontrado.'}), 404
        return jsonify(serializar_agendamento(row)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar agendamento: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/appointments', methods=['POST'])
def criar_agendamento():
    data = request.get_json(silent=True) or {}

    obrigatorios = ['client', 'date', 'time', 'serviceId', 'barberId']
    faltando = [campo for campo in obrigatorios if not data.get(campo)]
    if faltando:
        return jsonify({'error': f"Campos obrigatórios ausentes: {', '.join(faltando)}"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        servico = buscar_servico(cursor, data['serviceId'])
        if not servico:
            return jsonify({'error': 'Serviço inválido ou inativo.'}), 400

        barbeiro = buscar_barbeiro(cursor, data['barberId'])
        if not barbeiro:
            return jsonify({'error': 'Barbeiro inválido ou inativo.'}), 400

        try:
            hora_inicio = datetime.strptime(data['time'], '%H:%M').time()
        except ValueError:
            return jsonify({'error': 'Horário inválido (use HH:MM).'}), 400

        hora_fim = calcular_hora_fim(hora_inicio, servico['duracao_min'])

        indisponivel = validar_disponibilidade(cursor, data['barberId'], data['date'], hora_inicio, hora_fim)
        if indisponivel:
            mensagem, status_code = indisponivel
            return jsonify({'error': mensagem}), status_code

        # Valor cobrado é travado no preço do serviço no momento da criação
        # (snapshot), para a Visão Geral do Financeiro não mudar retroativamente
        # se o preço do serviço for alterado depois.
        valor_cobrado = servico['preco']

        forma_pagamento_id = data.get('formaPagamentoId') or None

        # ── Upsert de cliente ──────────────────────────────────────────
        # Se o agendamento veio com telefone, garante que o cliente existe
        # na tabela clientes (cria ou actualiza ultima_visita).
        # Isso alimenta automaticamente a tela Clientes via Agenda.
        cliente_id_final = data.get('clienteId') or None
        phone_raw = (data.get('phone') or '').strip()
        nome_raw  = data['client'].strip()

        if phone_raw:
            cursor.execute(
                'SELECT id FROM clientes WHERE telefone = %s',
                (phone_raw,)
            )
            cli_row = cursor.fetchone()
            if cli_row:
                # Cliente já existe — atualiza ultima_visita
                cliente_id_final = cli_row['id']
                cursor.execute(
                    'UPDATE clientes SET ultima_visita = %s WHERE id = %s',
                    (data['date'], cliente_id_final)
                )
            else:
                # Cliente novo — insere na base
                cliente_id_final = 'c' + uuid.uuid4().hex[:12]
                cursor.execute(
                    '''INSERT INTO clientes
                       (id, nome, telefone, cliente_desde, ultima_visita)
                       VALUES (%s, %s, %s, %s, %s)''',
                    (cliente_id_final, nome_raw, phone_raw,
                     data['date'], data['date'])
                )
        # ──────────────────────────────────────────────────────────────

        novo_id = gerar_agendamento_id()
        cursor.execute(
            '''INSERT INTO agendamentos
               (id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                barbeiro_id, data, hora_inicio, hora_fim, valor_cobrado,
                forma_pagamento_id, status, observacoes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pendente', %s)''',
            (
                novo_id,
                cliente_id_final,
                nome_raw,
                data.get('phone'),
                data['serviceId'],
                data['barberId'],
                data['date'],
                hora_inicio,
                hora_fim,
                valor_cobrado,
                forma_pagamento_id,
                data.get('notes', ''),
            )
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                      barbeiro_id, data, hora_inicio, hora_fim, valor_cobrado,
                      status, forma_pagamento_id, observacoes
               FROM agendamentos WHERE id = %s''',
            (novo_id,)
        )
        return jsonify(serializar_agendamento(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar agendamento: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/appointments/<agendamento_id>', methods=['PUT', 'PATCH'])
def atualizar_agendamento(agendamento_id):
    data = request.get_json(silent=True) or {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM agendamentos WHERE id = %s', (agendamento_id,))
        atual = cursor.fetchone()
        if not atual:
            return jsonify({'error': 'Agendamento não encontrado.'}), 404

        # Campos que podem ser atualizados via modal de edição
        # (mesmo conjunto que saveAppt() envia hoje no PUT).
        servico_id = data.get('serviceId', atual['servico_id'])
        barbeiro_id = data.get('barberId', atual['barbeiro_id'])
        data_agendamento = data.get('date', atual['data'])
        time_str = data.get('time')

        servico = buscar_servico(cursor, servico_id)
        if not servico:
            return jsonify({'error': 'Serviço inválido ou inativo.'}), 400

        barbeiro = buscar_barbeiro(cursor, barbeiro_id)
        if not barbeiro:
            return jsonify({'error': 'Barbeiro inválido ou inativo.'}), 400

        if time_str:
            try:
                hora_inicio = datetime.strptime(time_str, '%H:%M').time()
            except ValueError:
                return jsonify({'error': 'Horário inválido (use HH:MM).'}), 400
        else:
            hi = atual['hora_inicio']
            # mysql-connector devolve TIME como timedelta; converte para time
            if isinstance(hi, timedelta):
                total_seg = int(hi.total_seconds())
                hora_inicio = (datetime.min + timedelta(seconds=total_seg)).time()
            else:
                hora_inicio = hi

        hora_fim = calcular_hora_fim(hora_inicio, servico['duracao_min'])

        indisponivel = validar_disponibilidade(
            cursor, barbeiro_id, data_agendamento, hora_inicio, hora_fim, excluir_id=agendamento_id
        )
        if indisponivel:
            mensagem, status_code = indisponivel
            return jsonify({'error': mensagem}), status_code

        status = data.get('status', atual['status'])
        if status not in STATUS_VALIDOS:
            return jsonify({'error': f'Status inválido: {status}'}), 400

        # valor_cobrado é o snapshot do preço no momento do agendamento.
        # Só recalcula se o serviço mudou nesta edição; caso contrário,
        # preserva o valor já gravado (evita alterar retroativamente um
        # agendamento já concluído que alimenta a Visão Geral).
        if servico_id != atual['servico_id']:
            valor_cobrado = servico['preco']
        else:
            valor_cobrado = atual['valor_cobrado']

        forma_pagamento_id = data.get('formaPagamentoId', atual['forma_pagamento_id'])

        cursor.execute(
            '''UPDATE agendamentos SET
                   cliente_id = %s, cliente_nome = %s, cliente_telefone = %s,
                   servico_id = %s, barbeiro_id = %s, data = %s,
                   hora_inicio = %s, hora_fim = %s, valor_cobrado = %s,
                   forma_pagamento_id = %s, status = %s, observacoes = %s
               WHERE id = %s''',
            (
                data.get('clienteId', atual['cliente_id']),
                data.get('client', atual['cliente_nome']),
                data.get('phone', atual['cliente_telefone']),
                servico_id,
                barbeiro_id,
                data_agendamento,
                hora_inicio,
                hora_fim,
                valor_cobrado,
                forma_pagamento_id,
                status,
                data.get('notes', atual['observacoes']),
                agendamento_id,
            )
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                      barbeiro_id, data, hora_inicio, hora_fim, valor_cobrado,
                      status, forma_pagamento_id, observacoes
               FROM agendamentos WHERE id = %s''',
            (agendamento_id,)
        )
        return jsonify(serializar_agendamento(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar agendamento: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/appointments/<agendamento_id>', methods=['DELETE'])
def deletar_agendamento(agendamento_id):
    # Comportamento igual ao deleteAppt() atual do front: remoção
    # definitiva (não é soft-delete/mudança de status).
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM agendamentos WHERE id = %s', (agendamento_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Agendamento não encontrado.'}), 404

        cursor.execute('DELETE FROM agendamentos WHERE id = %s', (agendamento_id,))
        conn.commit()
        return '', 204
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao deletar agendamento: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# DISPONIBILIDADE POR BARBEIRO
# Retorna os slots livres e ocupados de um barbeiro em uma data,
# considerando: agendamentos ativos, bloqueios manuais e
# horário de funcionamento + almoço das Preferências.
# ═══════════════════════════════════════════════════════════

@app.route('/api/barber-availability', methods=['GET'])
def disponibilidade_barbeiro():
    barbeiro_id = request.args.get('barberId', '').strip()
    data_str    = request.args.get('date', '').strip()

    if not barbeiro_id or not data_str:
        return jsonify({'error': 'barberId e date são obrigatórios.'}), 400

    try:
        datetime.strptime(data_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'date inválido (use YYYY-MM-DD).'}), 400

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # ── Horário de funcionamento do dia ────────────────────
        cursor.execute("SELECT horarios FROM preferencias WHERE id = 'default'")
        pref_row = cursor.fetchone()
        prefs_horarios = _json_col(pref_row['horarios']) if pref_row and pref_row.get('horarios') else {}

        dia_semana_idx = datetime.strptime(data_str, '%Y-%m-%d').weekday()  # 0=seg … 6=dom
        dia_keys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
        horario_dia = prefs_horarios.get(dia_keys[dia_semana_idx], {})

        if not horario_dia.get('aberto', True):
            # Barbearia fechada neste dia — nenhum slot disponível
            return jsonify({'available': [], 'occupied': [], 'closed': True}), 200

        try:
            open_h, open_m = map(int, (horario_dia.get('abertura', '08:00')).split(':'))
            close_h, close_m = map(int, (horario_dia.get('fechamento', '20:00')).split(':'))
        except (ValueError, AttributeError):
            open_h, open_m   = 8, 0
            close_h, close_m = 20, 0

        open_min  = open_h  * 60 + open_m
        close_min = close_h * 60 + close_m
        slot_min      = 30  # granularidade de exibição (passos do select)
        duration_min  = 30  # janela que o serviço ocupa — sobrescrita abaixo

        # Duração do serviço: aceita durationMin (minutos direto) ou serviceId
        raw_duration = request.args.get('durationMin', '').strip()
        if raw_duration:
            try:
                duration_min = max(1, int(raw_duration))
            except ValueError:
                pass
        else:
            raw_service = request.args.get('serviceId', '').strip()
            if raw_service:
                svc_row = buscar_servico(cursor, raw_service)
                if svc_row:
                    duration_min = svc_row['duracao_min']

        # ── Gera todos os slots do dia ─────────────────────────
        todos_slots = []
        cur = open_min
        while cur < close_min:
            h = cur // 60
            m = cur % 60
            todos_slots.append((cur, f'{h:02d}:{m:02d}'))
            cur += slot_min

        # ── Almoço ────────────────────────────────────────────
        almoco = buscar_almoco_ativo(cursor)
        almoco_start = int(almoco[0].hour * 60 + almoco[0].minute) if almoco else None
        almoco_end   = int(almoco[1].hour * 60 + almoco[1].minute) if almoco else None

        # ── Agendamentos ativos do barbeiro naquele dia ────────
        cursor.execute(
            '''SELECT hora_inicio, hora_fim FROM agendamentos
               WHERE barbeiro_id = %s
                 AND data = %s
                 AND status NOT IN ('concluido', 'cancelado')''',
            (barbeiro_id, data_str)
        )
        agendamentos_dia = []
        for row in cursor.fetchall():
            hi = row['hora_inicio']
            hf = row['hora_fim']
            # mysql-connector pode devolver timedelta para TIME
            if isinstance(hi, timedelta):
                hi = (datetime.min + hi).time()
            if isinstance(hf, timedelta):
                hf = (datetime.min + hf).time()
            agendamentos_dia.append((
                hi.hour * 60 + hi.minute,
                hf.hour * 60 + hf.minute,
            ))

        # ── Bloqueios manuais do barbeiro naquele dia ──────────
        cursor.execute(
            '''SELECT hora_inicio, hora_fim FROM bloqueios_horario
               WHERE data = %s
                 AND (barbeiro_id = %s OR barbeiro_id IS NULL)''',
            (data_str, barbeiro_id)
        )
        bloqueios_dia = []
        for row in cursor.fetchall():
            hi = row['hora_inicio']
            hf = row['hora_fim']
            if isinstance(hi, timedelta):
                hi = (datetime.min + hi).time()
            if isinstance(hf, timedelta):
                hf = (datetime.min + hf).time()
            bloqueios_dia.append((
                hi.hour * 60 + hi.minute,
                hf.hour * 60 + hf.minute,
            ))

        # ── Classifica cada slot ───────────────────────────────
        available = []
        occupied  = []

        for slot_start, label in todos_slots:
            # A janela real que o serviço ocupa a partir deste slot
            slot_end = slot_start + duration_min
            bloqueado = False

            # Slot que ultrapassaria o fechamento não está disponível
            if slot_end > close_min:
                occupied.append(label)
                continue

            # Almoço
            if almoco_start is not None and _sobrepoe(slot_start, slot_end, almoco_start, almoco_end):
                bloqueado = True

            # Agendamentos existentes
            if not bloqueado:
                for a_start, a_end in agendamentos_dia:
                    if _sobrepoe(slot_start, slot_end, a_start, a_end):
                        bloqueado = True
                        break

            # Bloqueios manuais
            if not bloqueado:
                for b_start, b_end in bloqueios_dia:
                    if _sobrepoe(slot_start, slot_end, b_start, b_end):
                        bloqueado = True
                        break

            if bloqueado:
                occupied.append(label)
            else:
                available.append(label)

        return jsonify({'available': available, 'occupied': occupied, 'closed': False}), 200

    except Exception as e:
        return jsonify({'error': f'Erro ao buscar disponibilidade: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# BLOQUEIOS DE HORÁRIO
#
# Espelha o mock BLOCKS do agenda-crm.js: cada bloqueio pode ser
# de um barbeiro específico (barberId) ou geral, valendo para
# todos (barberId nulo/omitido) — ex.: manutenção da barbearia.
# ═══════════════════════════════════════════════════════════

MOTIVOS_VALIDOS = {'almoco', 'folga', 'ferias', 'manutencao', 'outro'}


def serializar_bloqueio(row):
    """Mesmos nomes de campo que o front já usa em BLOCKS
    (date, startTime, endTime, barberId, reason, obs)."""
    return {
        'id': row['id'],
        'date': row['data'].strftime('%Y-%m-%d') if row['data'] else None,
        'startTime': row['hora_inicio'].strftime('%H:%M') if hasattr(row['hora_inicio'], 'strftime') else str(row['hora_inicio'])[:5],
        'endTime': row['hora_fim'].strftime('%H:%M') if hasattr(row['hora_fim'], 'strftime') else str(row['hora_fim'])[:5],
        'barberId': row['barbeiro_id'],
        'reason': row['motivo'],
        'obs': row['motivo_obs'] or '',
    }


@app.route('/api/blocks', methods=['GET'])
def listar_bloqueios():
    """Filtros opcionais: date, barberId (mesmo padrão de /api/appointments)."""
    filtros = []
    params = []

    if request.args.get('date'):
        filtros.append('data = %s')
        params.append(request.args['date'])

    if request.args.get('barberId'):
        # Inclui bloqueios gerais (barbeiro_id NULL) junto com os do barbeiro pedido,
        # já que um bloqueio geral também afeta a agenda dele.
        filtros.append('(barbeiro_id = %s OR barbeiro_id IS NULL)')
        params.append(request.args['barberId'])

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ''

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'''SELECT id, barbeiro_id, data, hora_inicio, hora_fim, motivo, motivo_obs
                FROM bloqueios_horario
                {where}
                ORDER BY data ASC, hora_inicio ASC''',
            tuple(params)
        )
        return jsonify([serializar_bloqueio(row) for row in cursor.fetchall()]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar bloqueios: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/blocks/<bloqueio_id>', methods=['GET'])
def buscar_bloqueio(bloqueio_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, barbeiro_id, data, hora_inicio, hora_fim, motivo, motivo_obs
               FROM bloqueios_horario WHERE id = %s''',
            (bloqueio_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Bloqueio não encontrado.'}), 404
        return jsonify(serializar_bloqueio(row)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar bloqueio: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/blocks', methods=['POST'])
def criar_bloqueio():
    """Body JSON (mesmo shape do modal de bloqueio do front):
        date       : 'YYYY-MM-DD' (obrigatório)
        startTime  : 'HH:MM' (obrigatório)
        endTime    : 'HH:MM' (obrigatório)
        barberId   : string | omitido/None = bloqueio geral (vale p/ todos)
        reason     : 'almoco'|'folga'|'ferias'|'manutencao'|'outro'
        obs        : string — usado quando reason == 'outro'
    Não valida conflito contra agendamentos: um bloqueio pode ser criado
    livremente; é a criação/edição de AGENDAMENTOS que respeita os bloqueios
    já existentes (ver validar_disponibilidade)."""
    data = request.get_json(silent=True) or {}

    obrigatorios = ['date', 'startTime', 'endTime']
    faltando = [campo for campo in obrigatorios if not data.get(campo)]
    if faltando:
        return jsonify({'error': f"Campos obrigatórios ausentes: {', '.join(faltando)}"}), 400

    reason = data.get('reason', 'outro')
    if reason not in MOTIVOS_VALIDOS:
        return jsonify({'error': f'Motivo inválido: {reason}'}), 400

    try:
        hora_inicio = datetime.strptime(data['startTime'], '%H:%M').time()
        hora_fim = datetime.strptime(data['endTime'], '%H:%M').time()
    except ValueError:
        return jsonify({'error': 'Horário inválido (use HH:MM).'}), 400

    if hora_inicio >= hora_fim:
        return jsonify({'error': 'O horário de início deve ser antes do fim.'}), 400

    barbeiro_id = data.get('barberId') or None

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if barbeiro_id:
            barbeiro = buscar_barbeiro(cursor, barbeiro_id)
            if not barbeiro:
                return jsonify({'error': 'Barbeiro inválido ou inativo.'}), 400

        novo_id = 'b' + uuid.uuid4().hex[:12]
        cursor.execute(
            '''INSERT INTO bloqueios_horario
               (id, barbeiro_id, data, hora_inicio, hora_fim, motivo, motivo_obs)
               VALUES (%s, %s, %s, %s, %s, %s, %s)''',
            (novo_id, barbeiro_id, data['date'], hora_inicio, hora_fim, reason, data.get('obs') or None)
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, barbeiro_id, data, hora_inicio, hora_fim, motivo, motivo_obs
               FROM bloqueios_horario WHERE id = %s''',
            (novo_id,)
        )
        return jsonify(serializar_bloqueio(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar bloqueio: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/blocks/<bloqueio_id>', methods=['DELETE'])
def deletar_bloqueio(bloqueio_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM bloqueios_horario WHERE id = %s', (bloqueio_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Bloqueio não encontrado.'}), 404

        cursor.execute('DELETE FROM bloqueios_horario WHERE id = %s', (bloqueio_id,))
        conn.commit()
        return '', 204
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao deletar bloqueio: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# SERVIÇOS
# ═══════════════════════════════════════════════════════════

def serializar_servico(row, itens=None):
    return {
        'id':                  row['id'],
        'name':                row['nome'],
        'nome':                row['nome'],
        'price':               float(row['preco']) if row['preco'] is not None else 0.0,
        'preco':               float(row['preco']) if row['preco'] is not None else 0.0,
        'duration':            row['duracao_min'],
        'duracao_min':         row['duracao_min'],
        'ativo':               bool(row['ativo']),
        'tipo':                row.get('tipo', 'padrao') or 'padrao',
        'plano_cobranca':      row.get('plano_cobranca'),
        'plano_usos':          row.get('plano_usos'),
        'plano_validade_dias': row.get('plano_validade_dias'),
        'itens':               itens or [],
    }


@app.route('/api/services', methods=['GET'])
def listar_servicos():
    include_all = request.args.get('all') == '1'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if include_all:
            cursor.execute(
                '''SELECT id, nome, preco, duracao_min, ativo,
                          tipo, plano_cobranca, plano_usos, plano_validade_dias
                   FROM servicos
                   ORDER BY nome ASC'''
            )
        else:
            cursor.execute(
                '''SELECT id, nome, preco, duracao_min, ativo,
                          tipo, plano_cobranca, plano_usos, plano_validade_dias
                   FROM servicos
                   WHERE ativo = 1
                   ORDER BY nome ASC'''
            )
        rows = cursor.fetchall()

        # Carrega itens de combo/plano de uma só vez
        ids = [r['id'] for r in rows]
        itens_map = {}
        if ids:
            placeholders = ', '.join(['%s'] * len(ids))
            cursor.execute(
                f'''SELECT si.servico_id, si.item_id, si.ordem,
                           s.nome, s.duracao_min, s.preco
                    FROM servico_itens si
                    JOIN servicos s ON s.id = si.item_id
                    WHERE si.servico_id IN ({placeholders})
                    ORDER BY si.servico_id, si.ordem''',
                ids
            )
            for item in cursor.fetchall():
                itens_map.setdefault(item['servico_id'], []).append({
                    'item_id':    item['item_id'],
                    'nome':       item['nome'],
                    'duracao_min': item['duracao_min'],
                    'preco':      float(item['preco']) if item['preco'] else 0.0,
                })

        return jsonify([
            serializar_servico(r, itens_map.get(r['id'], []))
            for r in rows
        ]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar serviços: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/services', methods=['POST'])
def criar_servico():
    data = request.get_json(silent=True) or {}

    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'O nome é obrigatório.'}), 400

    tipo = data.get('tipo', 'padrao')
    if tipo not in ('padrao', 'combo', 'plano'):
        return jsonify({'error': 'Tipo inválido. Use padrao, combo ou plano.'}), 400

    try:
        preco = float(data.get('preco', 0))
        if preco < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Preço inválido.'}), 400

    duracao_min = None
    if tipo in ('padrao', 'combo'):
        try:
            duracao_min = int(data.get('duracao_min', 0))
            if duracao_min < 1:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': 'Duração inválida. Informe um número inteiro positivo.'}), 400

    # Para planos, calcular duracao_min automaticamente somando a duração dos itens
    if tipo == 'plano':
        itens_ids = data.get('itens', [])
        duracao_total = 0
        conn_temp = get_db()
        cursor_temp = conn_temp.cursor(dictionary=True)
        try:
            for item_id in itens_ids:
                cursor_temp.execute(
                    'SELECT duracao_min FROM servicos WHERE id = %s AND tipo = "padrao"',
                    (item_id,)
                )
                item = cursor_temp.fetchone()
                if item and item['duracao_min']:
                    duracao_total += int(item['duracao_min'])
            duracao_min = duracao_total if duracao_total > 0 else 30  # fallback de 30 minutos
        except Exception as e:
            duracao_min = 30  # fallback em caso de erro
        finally:
            cursor_temp.close()
            conn_temp.close()

    plano_cobranca      = None
    plano_usos          = None
    plano_validade_dias = None
    if tipo == 'plano':
        plano_cobranca = data.get('plano_cobranca', 'mensal')
        if plano_cobranca not in ('mensal', 'trimestral', 'avulso'):
            return jsonify({'error': 'Tipo de cobrança inválido.'}), 400
        try:
            plano_usos = int(data.get('plano_usos', 0))
            if plano_usos < 1:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': 'Quantidade de usos inválida.'}), 400
        try:
            plano_validade_dias = int(data.get('plano_validade_dias', 0))
            if plano_validade_dias < 1:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': 'Validade inválida.'}), 400

    itens_ids = data.get('itens', [])
    if tipo in ('combo', 'plano') and not itens_ids:
        return jsonify({'error': 'Adicione pelo menos um serviço ao ' + tipo + '.'}), 400

    ativo   = bool(data.get('ativo', True))
    novo_id = 's' + uuid.uuid4().hex[:12]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''INSERT INTO servicos
               (id, nome, preco, duracao_min, ativo, tipo,
                plano_cobranca, plano_usos, plano_validade_dias)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)''',
            (novo_id, nome, preco, duracao_min, int(ativo), tipo,
             plano_cobranca, plano_usos, plano_validade_dias)
        )

        itens_inseridos = []
        for ordem, item_id in enumerate(itens_ids):
            cursor.execute('SELECT id FROM servicos WHERE id = %s AND tipo = "padrao"', (item_id,))
            if not cursor.fetchone():
                conn.rollback()
                return jsonify({'error': f'Serviço item "{item_id}" não encontrado ou não é do tipo padrão.'}), 400
            item_uuid = 'si' + uuid.uuid4().hex[:10]
            cursor.execute(
                'INSERT INTO servico_itens (id, servico_id, item_id, ordem) VALUES (%s, %s, %s, %s)',
                (item_uuid, novo_id, item_id, ordem)
            )
            cursor.execute(
                'SELECT nome, duracao_min, preco FROM servicos WHERE id = %s', (item_id,)
            )
            s = cursor.fetchone()
            itens_inseridos.append({
                'item_id':    item_id,
                'nome':       s['nome'],
                'duracao_min': s['duracao_min'],
                'preco':      float(s['preco']) if s['preco'] else 0.0,
            })

        conn.commit()
        cursor.execute(
            '''SELECT id, nome, preco, duracao_min, ativo,
                      tipo, plano_cobranca, plano_usos, plano_validade_dias
               FROM servicos WHERE id = %s''',
            (novo_id,)
        )
        return jsonify(serializar_servico(cursor.fetchone(), itens_inseridos)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar serviço: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/services/<servico_id>', methods=['PUT', 'PATCH'])
def atualizar_servico(servico_id):
    data = request.get_json(silent=True) or {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, tipo FROM servicos WHERE id = %s''',
            (servico_id,)
        )
        servico_atual = cursor.fetchone()
        if not servico_atual:
            return jsonify({'error': 'Serviço não encontrado.'}), 404

        tipo_atual = servico_atual.get('tipo', 'padrao') or 'padrao'

        campos = []
        params = []

        if 'nome' in data:
            nome = data['nome'].strip()
            if not nome:
                return jsonify({'error': 'O nome não pode ser vazio.'}), 400
            campos.append('nome = %s')
            params.append(nome)

        if 'tipo' in data:
            tipo_novo = data['tipo']
            if tipo_novo not in ('padrao', 'combo', 'plano'):
                return jsonify({'error': 'Tipo inválido.'}), 400
            campos.append('tipo = %s')
            params.append(tipo_novo)
            tipo_atual = tipo_novo

        if 'duracao_min' in data:
            try:
                duracao = int(data['duracao_min'])
                if duracao < 1:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Duração inválida.'}), 400
            campos.append('duracao_min = %s')
            params.append(duracao)

        # Se for plano e tiver itens, recalcular duracao_min automaticamente
        if tipo_atual == 'plano' and 'itens' in data:
            itens_ids = data['itens']
            duracao_total = 0
            for item_id in itens_ids:
                cursor.execute(
                    'SELECT duracao_min FROM servicos WHERE id = %s AND tipo = "padrao"',
                    (item_id,)
                )
                item = cursor.fetchone()
                if item and item['duracao_min']:
                    duracao_total += int(item['duracao_min'])
            
            duracao_calculada = duracao_total if duracao_total > 0 else 30
            campos.append('duracao_min = %s')
            params.append(duracao_calculada)

        if 'preco' in data:
            try:
                preco = float(data['preco'])
                if preco < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Preço inválido.'}), 400
            campos.append('preco = %s')
            params.append(preco)

        if 'ativo' in data:
            campos.append('ativo = %s')
            params.append(int(bool(data['ativo'])))

        if 'plano_cobranca' in data:
            pc = data['plano_cobranca']
            if pc not in ('mensal', 'trimestral', 'avulso'):
                return jsonify({'error': 'Tipo de cobrança inválido.'}), 400
            campos.append('plano_cobranca = %s')
            params.append(pc)

        if 'plano_usos' in data:
            try:
                usos = int(data['plano_usos'])
                if usos < 1:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Quantidade de usos inválida.'}), 400
            campos.append('plano_usos = %s')
            params.append(usos)

        if 'plano_validade_dias' in data:
            try:
                val = int(data['plano_validade_dias'])
                if val < 1:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Validade inválida.'}), 400
            campos.append('plano_validade_dias = %s')
            params.append(val)

        if 'novo' in data:
            campos.append('novo = %s')
            params.append(int(bool(data['novo'])))

        if 'img' in data:
            img = _validar_img(data['img'])
            if isinstance(img, tuple):
                return img
            campos.append('img = %s')
            params.append(img)

        if campos:
            params.append(servico_id)
            cursor.execute(
                f"UPDATE servicos SET {', '.join(campos)} WHERE id = %s",
                tuple(params)
            )

        # Atualiza itens se enviados
        if 'itens' in data and tipo_atual in ('combo', 'plano'):
            itens_ids = data['itens']
            cursor.execute(
                'DELETE FROM servico_itens WHERE servico_id = %s', (servico_id,)
            )
            for ordem, item_id in enumerate(itens_ids):
                cursor.execute(
                    'SELECT id FROM servicos WHERE id = %s AND tipo = "padrao"',
                    (item_id,)
                )
                if not cursor.fetchone():
                    conn.rollback()
                    return jsonify({'error': f'Serviço item "{item_id}" não encontrado ou não é do tipo padrão.'}), 400
                item_uuid = 'si' + uuid.uuid4().hex[:10]
                cursor.execute(
                    'INSERT INTO servico_itens (id, servico_id, item_id, ordem) VALUES (%s, %s, %s, %s)',
                    (item_uuid, servico_id, item_id, ordem)
                )

        if not campos and 'itens' not in data:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        conn.commit()

        cursor.execute(
            '''SELECT id, nome, preco, duracao_min, ativo,
                      tipo, plano_cobranca, plano_usos, plano_validade_dias
               FROM servicos WHERE id = %s''',
            (servico_id,)
        )
        row = cursor.fetchone()

        cursor.execute(
            '''SELECT si.item_id, s.nome, s.duracao_min, s.preco
               FROM servico_itens si
               JOIN servicos s ON s.id = si.item_id
               WHERE si.servico_id = %s
               ORDER BY si.ordem''',
            (servico_id,)
        )
        itens = [{
            'item_id':    i['item_id'],
            'nome':       i['nome'],
            'duracao_min': i['duracao_min'],
            'preco':      float(i['preco']) if i['preco'] else 0.0,
        } for i in cursor.fetchall()]

        return jsonify(serializar_servico(row, itens)), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar serviço: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/services/<servico_id>/status', methods=['PATCH'])
def toggle_servico_status(servico_id):
    data = request.get_json(silent=True) or {}

    if 'ativo' not in data:
        return jsonify({'error': 'Campo "ativo" é obrigatório.'}), 400

    ativo = int(bool(data['ativo']))

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM servicos WHERE id = %s', (servico_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Serviço não encontrado.'}), 404

        cursor.execute(
            'UPDATE servicos SET ativo = %s WHERE id = %s',
            (ativo, servico_id)
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, nome, preco, duracao_min, ativo,
                      tipo, plano_cobranca, plano_usos, plano_validade_dias
               FROM servicos WHERE id = %s''',
            (servico_id,)
        )
        return jsonify(serializar_servico(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar status: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# ═══════════════════════════════════════════════════════════
# BARBEIROS
# ═══════════════════════════════════════════════════════════

def serializar_barbeiro(row):
    return {
        'id':              row['id'],
        'nome':            row['nome'],
        'name':            row['nome'],
        'telefone':        row['telefone'] or '',
        'phone':           row['telefone'] or '',
        'email':           row['email'] or '',
        'data_nascimento': str(row['data_nascimento']) if row.get('data_nascimento') else None,
        'endereco':        row['endereco'] or '',
        'avatar':          row.get('avatar'),
        'ativo':           bool(row['ativo']),
        'comissao_pct':    float(row['comissao_pct']) if row.get('comissao_pct') is not None else 0.0,
    }


@app.route('/api/barbers', methods=['GET'])
def listar_barbeiros():
    include_inactive = request.args.get('includeInactive') == '1'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if include_inactive:
            cursor.execute(
                '''SELECT id, nome, telefone, email, data_nascimento, endereco, avatar, ativo,
                          comissao_pct
                   FROM barbeiros
                   ORDER BY nome ASC'''
            )
        else:
            cursor.execute(
                '''SELECT id, nome, telefone, email, data_nascimento, endereco, avatar, ativo,
                          comissao_pct
                   FROM barbeiros
                   WHERE ativo = 1
                   ORDER BY nome ASC'''
            )
        rows = cursor.fetchall()
        return jsonify([serializar_barbeiro(r) for r in rows]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar barbeiros: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/barbers', methods=['POST'])
def criar_barbeiro():
    data = request.get_json(silent=True) or {}

    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'O nome é obrigatório.'}), 400

    telefone = (data.get('telefone') or '').strip() or None
    if not telefone:
        return jsonify({'error': 'O telefone é obrigatório.'}), 400

    email = (data.get('email') or '').strip() or None
    if not email:
        return jsonify({'error': 'O e-mail é obrigatório.'}), 400

    ativo           = bool(data.get('ativo', True))
    data_nascimento = (data.get('data_nascimento') or '').strip() or None
    endereco        = (data.get('endereco') or '').strip() or None
    novo_id         = 'b' + uuid.uuid4().hex[:12]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''INSERT INTO barbeiros (id, nome, telefone, email, data_nascimento, endereco, ativo)
               VALUES (%s, %s, %s, %s, %s, %s, %s)''',
            (novo_id, nome, telefone, email, data_nascimento, endereco, int(ativo))
        )
        conn.commit()
        cursor.execute(
            '''SELECT id, nome, telefone, email, data_nascimento, endereco, avatar, ativo
               FROM barbeiros WHERE id = %s''',
            (novo_id,)
        )
        return jsonify(serializar_barbeiro(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar barbeiro: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/barbers/metas', methods=['GET'])
def listar_metas_barbeiros():
    """
    Retorna as metas individuais de todos os barbeiros para um período.
    Query param: periodo=YYYY-MM (default: mês corrente)
    Resposta: [{ barbeiro_id, meta_valor }]
    """
    import datetime
    periodo_str = request.args.get('periodo')
    if periodo_str:
        try:
            periodo_inicio = datetime.date.fromisoformat(periodo_str + '-01')
        except ValueError:
            return jsonify({'error': 'Formato de período inválido. Use YYYY-MM.'}), 400
    else:
        hoje = datetime.date.today()
        periodo_inicio = hoje.replace(day=1)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT barbeiro_id, meta_valor
               FROM metas_barbeiro
               WHERE periodo_tipo = 'mes'
                 AND periodo_inicio = %s''',
            (periodo_inicio,)
        )
        rows = cursor.fetchall()
        return jsonify([
            {
                'barbeiro_id': r['barbeiro_id'],
                'meta_valor':  float(r['meta_valor']),
            }
            for r in rows
        ]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar metas: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/barbers/<barbeiro_id>', methods=['PUT', 'PATCH'])
def atualizar_barbeiro(barbeiro_id):
    data = request.get_json(silent=True) or {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM barbeiros WHERE id = %s', (barbeiro_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Barbeiro não encontrado.'}), 404

        campos = []
        params = []

        if 'nome' in data:
            nome = data['nome'].strip()
            if not nome:
                return jsonify({'error': 'O nome não pode ser vazio.'}), 400
            campos.append('nome = %s')
            params.append(nome)

        if 'telefone' in data:
            telefone = data['telefone']
            campos.append('telefone = %s')
            params.append(telefone.strip() if telefone else None)

        if 'email' in data:
            email = data['email']
            campos.append('email = %s')
            params.append(email.strip() if email else None)

        if 'data_nascimento' in data:
            campos.append('data_nascimento = %s')
            params.append(data['data_nascimento'] or None)

        if 'endereco' in data:
            endereco = data['endereco']
            campos.append('endereco = %s')
            params.append(endereco.strip() if endereco else None)

        if 'ativo' in data:
            campos.append('ativo = %s')
            params.append(int(bool(data['ativo'])))

        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        params.append(barbeiro_id)
        cursor.execute(
            f"UPDATE barbeiros SET {', '.join(campos)} WHERE id = %s",
            tuple(params)
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, nome, telefone, email, data_nascimento, endereco, avatar, ativo,
                      comissao_pct
               FROM barbeiros WHERE id = %s''',
            (barbeiro_id,)
        )
        return jsonify(serializar_barbeiro(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar barbeiro: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/barbers/<barbeiro_id>/status', methods=['PATCH'])
def toggle_barbeiro_status(barbeiro_id):
    data = request.get_json(silent=True) or {}

    if 'ativo' not in data:
        return jsonify({'error': 'Campo "ativo" é obrigatório.'}), 400

    ativo = int(bool(data['ativo']))

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM barbeiros WHERE id = %s', (barbeiro_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Barbeiro não encontrado.'}), 404

        cursor.execute(
            'UPDATE barbeiros SET ativo = %s WHERE id = %s',
            (ativo, barbeiro_id)
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, nome, telefone, email, data_nascimento, endereco, avatar, ativo,
                      comissao_pct
               FROM barbeiros WHERE id = %s''',
            (barbeiro_id,)
        )
        return jsonify(serializar_barbeiro(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao alterar status: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# ═══════════════════════════════════════════════════════════
# CLIENTES
# ═══════════════════════════════════════════════════════════

def serializar_cliente(row):
    """Converte tipos DATE do MySQL para JSON-friendly."""
    return {
        'id':          row['id'],
        'name':        row['nome'],
        'phone':       row['telefone'] or '',
        'since':       row['cliente_desde'].strftime('%Y-%m-%d') if row['cliente_desde'] else None,
        'lastVisit':   row['ultima_visita'].strftime('%Y-%m-%d') if row['ultima_visita'] else None,
        'birthdate':   row['data_nascimento'].strftime('%Y-%m-%d') if row['data_nascimento'] else None,
        'obs':         row['observacoes'] or '',
        'totalVisits': int(row['total_visitas']) if row.get('total_visitas') is not None else 0,
    }


@app.route('/api/clients', methods=['GET'])
def listar_clientes():
    search = request.args.get('search', '').strip()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if search:
            cursor.execute(
                '''SELECT c.id, c.nome, c.telefone, c.cliente_desde, c.ultima_visita,
                          c.data_nascimento, c.observacoes,
                          COUNT(a.id) AS total_visitas
                   FROM clientes c
                   LEFT JOIN agendamentos a
                     ON a.cliente_id = c.id AND a.status = 'concluido'
                   WHERE c.nome LIKE %s
                   GROUP BY c.id
                   ORDER BY c.nome ASC
                   LIMIT 10''',
                (f'%{search}%',)
            )
        else:
            cursor.execute(
                '''SELECT c.id, c.nome, c.telefone, c.cliente_desde, c.ultima_visita,
                          c.data_nascimento, c.observacoes,
                          COUNT(a.id) AS total_visitas
                   FROM clientes c
                   LEFT JOIN agendamentos a
                     ON a.cliente_id = c.id AND a.status = 'concluido'
                   GROUP BY c.id
                   ORDER BY c.nome ASC'''
            )
        rows = cursor.fetchall()
        # Autocomplete só precisa de id/name/phone — mantém contrato original
        if search:
            return jsonify([{'id': r['id'], 'name': r['nome'], 'phone': r['telefone']} for r in rows]), 200
        return jsonify([serializar_cliente(r) for r in rows]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar clientes: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/clients', methods=['POST'])
def criar_cliente():
    data = request.get_json(silent=True) or {}
    nome  = (data.get('name')  or '').strip()
    phone = (data.get('phone') or '').strip()

    if not nome:
        return jsonify({'error': 'O nome é obrigatório.'}), 400
    if not phone:
        return jsonify({'error': 'O telefone é obrigatório.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM clientes WHERE telefone = %s', (phone,))
        if cursor.fetchone():
            return jsonify({'error': 'Já existe um cliente com este telefone.'}), 409

        novo_id = 'c' + uuid.uuid4().hex[:12]
        hoje = datetime.now().date().strftime('%Y-%m-%d')
        cursor.execute(
            '''INSERT INTO clientes
               (id, nome, telefone, data_nascimento, observacoes, cliente_desde)
               VALUES (%s, %s, %s, %s, %s, %s)''',
            (
                novo_id,
                nome,
                phone,
                data.get('birthdate') or None,
                (data.get('obs') or '').strip() or None,
                hoje,
            )
        )
        conn.commit()

        cursor.execute(
            '''SELECT c.id, c.nome, c.telefone, c.cliente_desde, c.ultima_visita,
                      c.data_nascimento, c.observacoes,
                      COUNT(a.id) AS total_visitas
               FROM clientes c
               LEFT JOIN agendamentos a
                 ON a.cliente_id = c.id AND a.status = 'concluido'
               WHERE c.id = %s
               GROUP BY c.id''',
            (novo_id,)
        )
        return jsonify(serializar_cliente(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar cliente: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/clients/<cliente_id>', methods=['GET'])
def buscar_cliente(cliente_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT c.id, c.nome, c.telefone, c.cliente_desde, c.ultima_visita,
                      c.data_nascimento, c.observacoes,
                      COUNT(a.id) AS total_visitas
               FROM clientes c
               LEFT JOIN agendamentos a
                 ON a.cliente_id = c.id AND a.status = 'concluido'
               WHERE c.id = %s
               GROUP BY c.id''',
            (cliente_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Cliente não encontrado.'}), 404
        return jsonify(serializar_cliente(row)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar cliente: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/clients/<cliente_id>/visitas', methods=['GET'])
def historico_visitas(cliente_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT a.id, a.data, a.hora_inicio, a.hora_fim,
                      a.status, a.valor_cobrado,
                      s.nome AS servico_nome,
                      b.nome AS barbeiro_nome
               FROM agendamentos a
               JOIN servicos  s ON s.id = a.servico_id
               JOIN barbeiros b ON b.id = a.barbeiro_id
               WHERE a.cliente_id = %s
               ORDER BY a.data DESC, a.hora_inicio DESC
               LIMIT 50''',
            (cliente_id,)
        )
        rows = cursor.fetchall()
        visitas = []
        for r in rows:
            hi = r['hora_inicio']
            if isinstance(hi, timedelta):
                total_seg = int(hi.total_seconds())
                hi = (datetime.min + timedelta(seconds=total_seg)).time()
            visitas.append({
                'id':          r['id'],
                'data':        r['data'].strftime('%Y-%m-%d'),
                'horaInicio':  hi.strftime('%H:%M'),
                'status':      r['status'],
                'valorCobrado': float(r['valor_cobrado']) if r['valor_cobrado'] else None,
                'servico':     r['servico_nome'],
                'barbeiro':    r['barbeiro_nome'],
            })
        return jsonify(visitas), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar histórico: {e}'}), 500
    finally:
        cursor.close()
        conn.close()
        
@app.route('/api/clients/<cliente_id>', methods=['PUT', 'PATCH'])
def atualizar_cliente(cliente_id):
    data = request.get_json(silent=True) or {}
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            'SELECT id FROM clientes WHERE id = %s',
            (cliente_id,)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Cliente não encontrado.'}), 404

        campos = []
        params = []

        if 'name' in data:
            if not data['name'].strip():
                return jsonify({'error': 'O nome não pode ser vazio.'}), 400
            campos.append('nome = %s')
            params.append(data['name'].strip())

        if 'phone' in data:
            campos.append('telefone = %s')
            params.append(data['phone'].strip() or None)

        if 'birthdate' in data:
            campos.append('data_nascimento = %s')
            params.append(data['birthdate'] or None)

        if 'obs' in data:
            campos.append('observacoes = %s')
            params.append(data['obs'].strip() or None)

        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        params.append(cliente_id)
        cursor.execute(
            f"UPDATE clientes SET {', '.join(campos)} WHERE id = %s",
            tuple(params)
        )
        conn.commit()

        cursor.execute(
            '''SELECT id, nome, telefone, cliente_desde, ultima_visita,
                      data_nascimento, observacoes
               FROM clientes WHERE id = %s''',
            (cliente_id,)
        )
        return jsonify(serializar_cliente(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar cliente: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/clients/<cliente_id>', methods=['DELETE'])
def deletar_cliente(cliente_id):
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            'SELECT id FROM clientes WHERE id = %s',
            (cliente_id,)
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Cliente não encontrado.'}), 404

        cursor.execute(
            'DELETE FROM clientes WHERE id = %s',
            (cliente_id,)
        )
        conn.commit()
        return '', 204
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao excluir cliente: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# ═══════════════════════════════════════════════════════════
# PRODUTOS — Helpers internos
#
# O contrato com o front está fechado em js/produtos-data.js:
# serializar_produto() devolve exatamente o mesmo objeto que o
# hidratar() do mock produzia (precoFinal, emPromocao, disponivel…),
# por isso nenhum ecrã precisa de saber se está em mock ou em API.
# ═══════════════════════════════════════════════════════════

ESTADOS_RESERVA = {'reservado', 'confirmado', 'libertado'}

PRODUTO_COLS = '''id, nome, descricao, i18n, preco, preco_promo,
                  stock, reservado, categoria, img, destaque, ativo, novo'''

# Categorias aceites pelo catálogo — as mesmas de CATEGORIAS em
# js/produtos-data.js. 'todos' é só um filtro da UI, não uma categoria.
CATEGORIAS_PRODUTO = {'pomadas', 'cabelo', 'barba', 'acessorios'}

RESERVA_COLS = '''id, numero, cliente_nome, cliente_telefone, cliente_telefone_e164,
                  cliente_pais, agendamento_id, estado, observacoes, total, poupanca,
                  data_reserva, data_confirmado, data_libertado'''


def gerar_produto_reserva_id():
    return 'res_' + uuid.uuid4().hex[:12]


# A fotografia chega do CRM como data URL já reduzido pelo browser
# (640px, JPEG). Guardamos a string tal como vem, do mesmo modo que
# guardaríamos um caminho para assets/produtos/ — mas com tecto, para
# ninguém encher a tabela com um bitmap de 20 MB.
IMG_MAX_BYTES = 3 * 1024 * 1024


def _validar_img(valor):
    """Devolve a string a guardar (ou None). Em caso de erro devolve o
    par (resposta, código) pronto a fazer return na rota."""
    if valor in (None, '', False):
        return None
    if not isinstance(valor, str):
        return jsonify({'error': 'Imagem inválida.'}), 400
    valor = valor.strip()
    if len(valor.encode('utf-8')) > IMG_MAX_BYTES:
        return jsonify({'error': 'Imagem demasiado grande.'}), 413
    if not (valor.startswith('data:image/') or valor.startswith('assets/')
            or valor.startswith('http://') or valor.startswith('https://')):
        return jsonify({'error': 'Imagem inválida.'}), 400
    return valor


def proximo_produto_id(cursor):
    """prod_010, prod_011, … a seguir ao maior id numérico já usado.
    Mantém a convenção do catálogo original em vez de gerar um uuid."""
    cursor.execute(
        r"""SELECT MAX(CAST(SUBSTRING(id, 6) AS UNSIGNED)) AS n
            FROM produtos
            WHERE id REGEXP '^prod_[0-9]+$'"""
    )
    linha = cursor.fetchone()
    n = int((linha or {}).get('n') or 0) + 1
    return 'prod_' + str(n).zfill(3)


def _json_col(valor):
    """Coluna JSON: o conector pode devolver str, bytes ou já o objeto."""
    if valor is None:
        return None
    if isinstance(valor, (bytes, bytearray)):
        valor = valor.decode('utf-8')
    if isinstance(valor, str):
        try:
            return json.loads(valor)
        except ValueError:
            return None
    return valor


def _q2(valor):
    """Duas casas decimais, half-up — o mesmo critério do toFixed(2) do JS."""
    return Decimal(str(valor)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def agora_utc():
    """DATETIME naive em UTC — o front compara com toISOString()."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso(dt):
    """DATETIME (guardado em UTC) → o mesmo formato do toISOString() do front."""
    return dt.strftime('%Y-%m-%dT%H:%M:%S.000Z') if dt else None


def serializar_produto(row):
    """Espelha hidratar() de js/produtos-data.js.

    'preco' é sempre o de tabela e 'precoFinal' é o que se cobra —
    a UI mostra precoFinal e só risca 'preco' quando há desconto,
    e é assim que nenhum ecrã pode somar o preço errado.
    """
    preco = float(row['preco'])
    promo = float(row['preco_promo']) if row['preco_promo'] is not None else None
    em_promocao = promo is not None and 0 < promo < preco

    stock = int(row['stock'] or 0)
    reservado = int(row['reservado'] or 0)

    return {
        'id':          row['id'],
        'nome':        row['nome'],
        'descricao':   row['descricao'] or '',
        # PT + traduções cruas: quem escolhe o idioma é o front,
        # tal como fazia no modo mock.
        'i18n':        _json_col(row.get('i18n')),
        'preco':       preco,
        'precoPromo':  promo if em_promocao else None,
        'precoFinal':  promo if em_promocao else preco,
        'emPromocao':  em_promocao,
        # int(x + 0.5) para bater certo com o Math.round() do JS,
        # que arredonda .5 para cima (o round() do Python não).
        'descontoPct': int((1 - promo / preco) * 100 + 0.5) if em_promocao else 0,
        'stock':       stock,
        'reservado':   reservado,
        'disponivel':  max(0, stock - reservado),
        'categoria':   row['categoria'],
        'img':         row['img'] or f"assets/produtos/{row['id']}.jpg",
        'destaque':    bool(row['destaque']),
        'ativo':       bool(row['ativo']),
        # Marcação manual do barbeiro; não expira sozinha.
        'novo':        bool(row['novo']),
    }


def serializar_item_reserva(row):
    return {
        'produtoId':   row['produto_id'],
        'nome':        row['nome'],
        'quantidade':  int(row['quantidade']),
        'preco':       float(row['preco']),
        'precoTabela': float(row['preco_tabela']) if row['preco_tabela'] is not None else None,
        'subtotal':    float(row['subtotal']),
    }


def serializar_reserva(row, itens):
    reserva = {
        'id':             row['id'],
        'numero':         row['numero'],
        'clienteNome':    row['cliente_nome'],
        'clienteTel':     row['cliente_telefone'] or '',
        'clienteTelE164': row['cliente_telefone_e164'] or '',
        'clientePais':    row['cliente_pais'] or '',
        'produtos':       [serializar_item_reserva(i) for i in itens],
        'agendamentoId':  row['agendamento_id'],
        'estado':         row['estado'],
        'dataReserva':    _iso(row['data_reserva']),
        'observacoes':    row['observacoes'] or '',
        'total':          float(row['total']),
        'poupanca':       float(row['poupanca']),
    }
    # Só aparecem depois de acontecerem, como no mock.
    if row['data_confirmado']:
        reserva['dataConfirmado'] = _iso(row['data_confirmado'])
    if row['data_libertado']:
        reserva['dataLibertado'] = _iso(row['data_libertado'])
    return reserva


def carregar_itens(cursor, reserva_ids):
    """Itens de várias reservas de uma vez — evita N+1 na listagem do CRM."""
    if not reserva_ids:
        return {}
    marcadores = ', '.join(['%s'] * len(reserva_ids))
    cursor.execute(
        f'''SELECT reserva_id, produto_id, nome, quantidade, preco, preco_tabela, subtotal
            FROM reservas_produtos_itens
            WHERE reserva_id IN ({marcadores})
            ORDER BY id ASC''',
        tuple(reserva_ids)
    )
    agrupado = {}
    for item in cursor.fetchall():
        agrupado.setdefault(item['reserva_id'], []).append(item)
    return agrupado


def proximo_numero_reserva(cursor):
    """RES-001, RES-002, … sem corrida entre dois clientes a reservar
    ao mesmo tempo: o UPDATE incrementa e devolve o novo valor."""
    cursor.execute(
        '''UPDATE contadores
           SET valor = LAST_INSERT_ID(valor + 1)
           WHERE nome = 'reservas_produtos' '''
    )
    if cursor.rowcount == 0:
        # Primeira reserva numa base onde o seed não correu.
        cursor.execute(
            "INSERT INTO contadores (nome, valor) VALUES ('reservas_produtos', 1)"
        )
        return 'RES-001'
    cursor.execute('SELECT LAST_INSERT_ID() AS n')
    return 'RES-' + str(cursor.fetchone()['n']).zfill(3)


def buscar_reserva_por_ref(cursor, ref, para_update=False):
    """Aceita o id interno (res_xxx) ou o número (RES-001), como o front."""
    cursor.execute(
        f'''SELECT {RESERVA_COLS} FROM reservas_produtos
            WHERE id = %s OR numero = %s
            {'FOR UPDATE' if para_update else ''}''',
        (ref, ref)
    )
    return cursor.fetchone()


# ═══════════════════════════════════════════════════════════
# PRODUTOS — Rotas do catálogo
# ═══════════════════════════════════════════════════════════

@app.route('/api/products', methods=['GET'])
def listar_produtos():
    # ?disponivel=true → o que a loja mostra (ativo e com stock livre).
    # Sem filtro → catálogo todo, incluindo esgotados e inativos,
    # que é o que o CRM e o dashboard precisam de ver.
    filtros = []
    params = []

    if request.args.get('disponivel') in ('true', '1'):
        filtros.append('ativo = 1')
        filtros.append('(stock - reservado) > 0')

    categoria = request.args.get('categoria')
    if categoria and categoria != 'todos':
        filtros.append('categoria = %s')
        params.append(categoria)

    if request.args.get('destaque') in ('true', '1'):
        filtros.append('destaque = 1')

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ''

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'''SELECT {PRODUTO_COLS} FROM produtos
                {where}
                ORDER BY id ASC''',
            tuple(params)
        )
        return jsonify([serializar_produto(r) for r in cursor.fetchall()]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar produtos: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/products/<produto_id>', methods=['GET'])
def buscar_produto(produto_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'SELECT {PRODUTO_COLS} FROM produtos WHERE id = %s',
            (produto_id,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Produto não encontrado.'}), 404
        return jsonify(serializar_produto(row)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar produto: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/products', methods=['POST'])
def criar_produto():
    """Cria um produto a partir do CRM.

    Espelha mock.criar() de js/produtos-data.js: as mesmas validações
    e o mesmo objeto de resposta, para que o front não precise de saber
    de onde veio o produto. 'reservado' começa sempre a zero — quem o
    mexe são as reservas.
    """
    data = request.get_json(silent=True) or {}

    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'O nome é obrigatório.'}), 400

    try:
        preco = float(data.get('preco'))
        if preco < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Preço inválido.'}), 400

    promo = data.get('precoPromo')
    if promo in (None, '', False):
        promo = None
    else:
        try:
            promo = float(promo)
            if promo <= 0:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': 'Preço promocional inválido.'}), 400
        if promo >= preco:
            return jsonify({'error': 'O preço promocional tem de ser menor que o preço de tabela.'}), 400

    try:
        stock = int(data.get('stock', 0))
        if stock < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Stock inválido.'}), 400

    categoria = (data.get('categoria') or '').strip()
    if categoria not in CATEGORIAS_PRODUTO:
        return jsonify({'error': 'Categoria inválida.'}), 400

    img = _validar_img(data.get('img'))
    if isinstance(img, tuple):
        return img

    descricao = (data.get('descricao') or '').strip() or None
    i18n = data.get('i18n')
    destaque = int(bool(data.get('destaque')))
    ativo = int(bool(data.get('ativo', True)))
    # Um produto criado agora é novidade por omissão, mas continua a ser
    # uma escolha do barbeiro: se ele desligar o switch, fica desligado.
    novo = int(bool(data.get('novo', True)))

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        produto_id = proximo_produto_id(cursor)
        cursor.execute(
            '''INSERT INTO produtos
                 (id, nome, descricao, i18n, preco, preco_promo, stock,
                  reservado, categoria, img, destaque, ativo, novo)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s)''',
            (produto_id, nome, descricao,
             json.dumps(i18n, ensure_ascii=False) if i18n else None,
             _q2(preco), _q2(promo) if promo is not None else None, stock,
             categoria, img, destaque, ativo, novo)
        )
        conn.commit()

        cursor.execute(
            f'SELECT {PRODUTO_COLS} FROM produtos WHERE id = %s',
            (produto_id,)
        )
        return jsonify(serializar_produto(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar produto: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/products/<produto_id>', methods=['PUT', 'PATCH'])
def atualizar_produto(produto_id):
    """Campos que o CRM gere: ativo, destaque, novo, precoPromo, preco,
    stock e img. Enviar precoPromo: null tira o produto de promoção;
    img: null repõe a convenção assets/produtos/<id>.jpg."""
    data = request.get_json(silent=True) or {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'SELECT {PRODUTO_COLS} FROM produtos WHERE id = %s',
            (produto_id,)
        )
        atual = cursor.fetchone()
        if not atual:
            return jsonify({'error': 'Produto não encontrado.'}), 404

        campos = []
        params = []

        # Valores finais depois deste PATCH, para validar a coerência
        # entre eles (promoção abaixo do preço, stock acima do reservado)
        # em vez de deixar rebentar na CHECK constraint.
        preco_final = float(atual['preco'])
        promo_final = float(atual['preco_promo']) if atual['preco_promo'] is not None else None
        stock_final = int(atual['stock'])

        if 'preco' in data:
            try:
                preco_final = float(data['preco'])
                if preco_final < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Preço inválido.'}), 400
            campos.append('preco = %s')
            params.append(_q2(preco_final))

        if 'precoPromo' in data:
            if data['precoPromo'] in (None, '', False):
                promo_final = None
                campos.append('preco_promo = NULL')
            else:
                try:
                    promo_final = float(data['precoPromo'])
                    if promo_final <= 0:
                        raise ValueError
                except (ValueError, TypeError):
                    return jsonify({'error': 'Preço promocional inválido.'}), 400
                campos.append('preco_promo = %s')
                params.append(_q2(promo_final))

        if promo_final is not None and promo_final >= preco_final:
            return jsonify({'error': 'O preço promocional tem de ser menor que o preço de tabela.'}), 400

        if 'stock' in data:
            try:
                stock_final = int(data['stock'])
                if stock_final < 0:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Stock inválido.'}), 400
            if stock_final < int(atual['reservado']):
                return jsonify({
                    'error': f"Já há {atual['reservado']} unidade(s) reservada(s): "
                             f'o stock não pode ficar abaixo disso.'
                }), 409
            campos.append('stock = %s')
            params.append(stock_final)

        if 'destaque' in data:
            campos.append('destaque = %s')
            params.append(int(bool(data['destaque'])))

        if 'ativo' in data:
            campos.append('ativo = %s')
            params.append(int(bool(data['ativo'])))

        if 'nome' in data:
            nome = (data['nome'] or '').strip()
            if not nome:
                return jsonify({'error': 'O nome não pode ser vazio.'}), 400
            campos.append('nome = %s')
            params.append(nome)

        if 'descricao' in data:
            campos.append('descricao = %s')
            params.append((data['descricao'] or '').strip() or None)

        if 'categoria' in data:
            categoria = (data['categoria'] or '').strip()
            if not categoria:
                return jsonify({'error': 'A categoria não pode ser vazia.'}), 400
            campos.append('categoria = %s')
            params.append(categoria)

        if 'i18n' in data:
            campos.append('i18n = %s')
            params.append(json.dumps(data['i18n'], ensure_ascii=False) if data['i18n'] else None)

        if 'novo' in data:
            campos.append('novo = %s')
            params.append(int(bool(data['novo'])))

        if 'img' in data:
            img_val = _validar_img(data['img'])
            if isinstance(img_val, tuple):
                return img_val
            campos.append('img = %s')
            params.append(img_val)

        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        params.append(produto_id)
        cursor.execute(
            f"UPDATE produtos SET {', '.join(campos)} WHERE id = %s",
            tuple(params)
        )
        conn.commit()

        cursor.execute(
            f'SELECT {PRODUTO_COLS} FROM produtos WHERE id = %s',
            (produto_id,)
        )
        return jsonify(serializar_produto(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar produto: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# PRODUTOS — Reservas
#
# Quem trava o stock é o back-end, nunca o front: a validação
# e o incremento de 'reservado' acontecem dentro da mesma
# transação, com as linhas dos produtos bloqueadas (FOR UPDATE).
# Dois clientes a reservar a última unidade ao mesmo tempo: um
# leva-a, o outro recebe 409.
# ═══════════════════════════════════════════════════════════

@app.route('/api/product-reservations', methods=['POST'])
def criar_reserva_produtos():
    data = request.get_json(silent=True) or {}

    nome_cliente = (data.get('clienteNome') or '').strip()
    if not nome_cliente:
        return jsonify({'error': 'O nome do cliente é obrigatório.'}), 400

    itens = data.get('itens') or []
    if not itens:
        return jsonify({'error': 'Carrinho vazio'}), 400

    # Junta quantidades repetidas do mesmo produto e valida os números
    # antes de tocar na base de dados.
    pedidos = {}
    for item in itens:
        produto_id = (item or {}).get('produtoId')
        if not produto_id:
            return jsonify({'error': 'Item sem produtoId.'}), 400
        try:
            quantidade = int(item.get('quantidade', 0))
            if quantidade < 1:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'error': f'Quantidade inválida para {produto_id}.'}), 400
        pedidos[produto_id] = pedidos.get(produto_id, 0) + quantidade

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        # Ordem alfabética dos ids ao bloquear: duas reservas com os
        # mesmos produtos pegam nos locks pela mesma ordem e não há deadlock.
        ids_ordenados = sorted(pedidos.keys())
        marcadores = ', '.join(['%s'] * len(ids_ordenados))
        cursor.execute(
            f'''SELECT {PRODUTO_COLS} FROM produtos
                WHERE id IN ({marcadores})
                ORDER BY id ASC
                FOR UPDATE''',
            tuple(ids_ordenados)
        )
        encontrados = {r['id']: r for r in cursor.fetchall()}

        linhas = []
        total = Decimal('0.00')
        poupanca = Decimal('0.00')

        for produto_id in ids_ordenados:
            row = encontrados.get(produto_id)
            if not row or not row['ativo']:
                conn.rollback()
                return jsonify({'error': 'Produto indisponível', 'produtoId': produto_id}), 409

            produto = serializar_produto(row)
            quantidade = pedidos[produto_id]

            if quantidade > produto['disponivel']:
                conn.rollback()
                return jsonify({
                    'error': f"Stock insuficiente para {produto['nome']}",
                    'produtoId': produto_id,
                    'disponivel': produto['disponivel'],
                }), 409

            preco = _q2(produto['precoFinal'])
            preco_tabela = _q2(produto['preco']) if produto['emPromocao'] else None
            subtotal = _q2(preco * quantidade)

            total += subtotal
            if preco_tabela is not None:
                poupanca += _q2((preco_tabela - preco) * quantidade)

            linhas.append({
                'produto_id': produto_id,
                'nome': produto['nome'],
                'quantidade': quantidade,
                'preco': preco,
                'preco_tabela': preco_tabela,
                'subtotal': subtotal,
            })

        reserva_id = gerar_produto_reserva_id()
        numero = proximo_numero_reserva(cursor)
        agora = agora_utc()

        cursor.execute(
            '''INSERT INTO reservas_produtos
               (id, numero, cliente_nome, cliente_telefone, cliente_telefone_e164,
                cliente_pais, agendamento_id, estado, observacoes, total, poupanca,
                data_reserva)
               VALUES (%s, %s, %s, %s, %s, %s, %s, 'reservado', %s, %s, %s, %s)''',
            (
                reserva_id,
                numero,
                nome_cliente,
                (data.get('clienteTel') or '').strip() or None,
                (data.get('clienteTelE164') or '').strip() or None,
                (data.get('clientePais') or '').strip() or None,
                data.get('agendamentoId') or None,
                (data.get('observacoes') or '').strip() or None,
                total,
                poupanca,
                agora,
            )
        )

        for linha in linhas:
            cursor.execute(
                '''INSERT INTO reservas_produtos_itens
                   (reserva_id, produto_id, nome, quantidade, preco, preco_tabela, subtotal)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)''',
                (
                    reserva_id, linha['produto_id'], linha['nome'], linha['quantidade'],
                    linha['preco'], linha['preco_tabela'], linha['subtotal'],
                )
            )
            # Só 'reservado' sobe: o stock só desce quando o barbeiro entrega.
            cursor.execute(
                'UPDATE produtos SET reservado = reservado + %s WHERE id = %s',
                (linha['quantidade'], linha['produto_id'])
            )

        conn.commit()

        cursor.execute(
            f'SELECT {RESERVA_COLS} FROM reservas_produtos WHERE id = %s',
            (reserva_id,)
        )
        reserva = cursor.fetchone()
        itens_db = carregar_itens(cursor, [reserva_id]).get(reserva_id, [])
        return jsonify(serializar_reserva(reserva, itens_db)), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar reserva: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/product-reservations', methods=['GET'])
def listar_reservas_produtos():
    filtros = []
    params = []

    estado = request.args.get('estado')
    if estado:
        if estado not in ESTADOS_RESERVA:
            return jsonify({'error': f'Estado inválido: {estado}'}), 400
        filtros.append('estado = %s')
        params.append(estado)

    if request.args.get('agendamentoId'):
        filtros.append('agendamento_id = %s')
        params.append(request.args['agendamentoId'])

    if request.args.get('clienteTelE164'):
        filtros.append('cliente_telefone_e164 = %s')
        params.append(request.args['clienteTelE164'])

    if request.args.get('search'):
        filtros.append('(cliente_nome LIKE %s OR numero LIKE %s)')
        termo = f"%{request.args['search']}%"
        params.extend([termo, termo])

    where = f"WHERE {' AND '.join(filtros)}" if filtros else ''

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f'''SELECT {RESERVA_COLS} FROM reservas_produtos
                {where}
                ORDER BY data_reserva DESC''',
            tuple(params)
        )
        reservas = cursor.fetchall()
        itens = carregar_itens(cursor, [r['id'] for r in reservas])
        return jsonify([
            serializar_reserva(r, itens.get(r['id'], [])) for r in reservas
        ]), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar reservas: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/product-reservations/<ref>', methods=['GET'])
def buscar_reserva_produtos(ref):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        reserva = buscar_reserva_por_ref(cursor, ref)
        if not reserva:
            return jsonify({'error': 'Reserva não encontrada'}), 404
        itens = carregar_itens(cursor, [reserva['id']]).get(reserva['id'], [])
        return jsonify(serializar_reserva(reserva, itens)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar reserva: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


def _mudar_estado_reserva(ref, de, para, delta_stock, delta_reservado):
    """reservado → confirmado (entregue: sai do stock e da reserva)
       reservado → libertado  (no-show: só larga a reserva)"""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()

        reserva = buscar_reserva_por_ref(cursor, ref, para_update=True)
        if not reserva:
            conn.rollback()
            return jsonify({'error': 'Reserva não encontrada'}), 404
        if reserva['estado'] != de:
            conn.rollback()
            return jsonify({'error': f"Reserva já está {reserva['estado']}"}), 409

        cursor.execute(
            '''SELECT produto_id, quantidade FROM reservas_produtos_itens
               WHERE reserva_id = %s ORDER BY produto_id ASC''',
            (reserva['id'],)
        )
        itens = cursor.fetchall()

        for item in itens:
            cursor.execute(
                '''UPDATE produtos
                   SET stock     = GREATEST(0, stock + %s),
                       reservado = GREATEST(0, reservado + %s)
                   WHERE id = %s''',
                (
                    delta_stock * item['quantidade'],
                    delta_reservado * item['quantidade'],
                    item['produto_id'],
                )
            )

        coluna_data = 'data_confirmado' if para == 'confirmado' else 'data_libertado'
        cursor.execute(
            f'''UPDATE reservas_produtos
                SET estado = %s, {coluna_data} = %s
                WHERE id = %s''',
            (para, agora_utc(), reserva['id'])
        )
        conn.commit()

        cursor.execute(
            f'SELECT {RESERVA_COLS} FROM reservas_produtos WHERE id = %s',
            (reserva['id'],)
        )
        atualizada = cursor.fetchone()
        itens_db = carregar_itens(cursor, [reserva['id']]).get(reserva['id'], [])
        return jsonify(serializar_reserva(atualizada, itens_db)), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar reserva: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/product-reservations/<ref>/confirm', methods=['POST'])
def confirmar_reserva_produtos(ref):
    # Barbeiro entregou: a venda efetiva-se e as unidades saem mesmo.
    return _mudar_estado_reserva(ref, 'reservado', 'confirmado', -1, -1)


@app.route('/api/product-reservations/<ref>/release', methods=['POST'])
def libertar_reserva_produtos(ref):
    # No-show ou cancelamento: o stock volta a ficar disponível.
    return _mudar_estado_reserva(ref, 'reservado', 'libertado', 0, -1)


# ═══════════════════════════════════════════════════════════
# PREFERÊNCIAS
#
# Guardadas numa única linha na tabela `preferencias`:
#   id = 'default'  (singleton — uma barbearia por instância)
#   horarios   JSON  { seg: {aberto, abertura, fechamento}, … }
#   almoco     JSON  { ativo, inicio, fim }
# ═══════════════════════════════════════════════════════════

DIAS_VALIDOS = {'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'}

HORARIO_DEFAULT = {
    'seg': {'aberto': True,  'abertura': '08:00', 'fechamento': '18:00'},
    'ter': {'aberto': True,  'abertura': '08:00', 'fechamento': '18:00'},
    'qua': {'aberto': True,  'abertura': '08:00', 'fechamento': '18:00'},
    'qui': {'aberto': True,  'abertura': '08:00', 'fechamento': '18:00'},
    'sex': {'aberto': True,  'abertura': '08:00', 'fechamento': '18:00'},
    'sab': {'aberto': True,  'abertura': '09:00', 'fechamento': '17:00'},
    'dom': {'aberto': False, 'abertura': '09:00', 'fechamento': '14:00'},
}

ALMOCO_DEFAULT = {'ativo': False, 'inicio': '12:00', 'fim': '13:00'}


def _hora_valida(valor):
    """Valida string no formato HH:MM."""
    if not isinstance(valor, str):
        return False
    try:
        datetime.strptime(valor, '%H:%M')
        return True
    except ValueError:
        return False


def serializar_preferencias(row):
    """Converte a linha da BD para o shape que o front consome."""
    horarios = _json_col(row.get('horarios')) or HORARIO_DEFAULT
    almoco   = _json_col(row.get('almoco'))   or ALMOCO_DEFAULT
    return {'horarios': horarios, 'almoco': almoco}


@app.route('/api/preferences', methods=['GET'])
def buscar_preferencias():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT horarios, almoco FROM preferencias WHERE id = 'default'"
        )
        row = cursor.fetchone()
        if not row:
            # Ainda não foi configurado: devolve os defaults sem criar registo
            return jsonify({'horarios': HORARIO_DEFAULT, 'almoco': ALMOCO_DEFAULT}), 200
        return jsonify(serializar_preferencias(row)), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar preferências: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/preferences', methods=['PUT'])
def salvar_preferencias():
    data = request.get_json(silent=True) or {}

    # ── Validação: horários ──────────────────────────────
    horarios_raw = data.get('horarios')
    if not isinstance(horarios_raw, dict):
        return jsonify({'error': 'Campo "horarios" inválido.'}), 400

    horarios = {}
    for dia in DIAS_VALIDOS:
        d = horarios_raw.get(dia)
        if not isinstance(d, dict):
            return jsonify({'error': f'Horário inválido para o dia "{dia}".'}), 400
        aberto    = bool(d.get('aberto', False))
        abertura  = d.get('abertura', '08:00')
        fechamento = d.get('fechamento', '18:00')
        if not _hora_valida(abertura) or not _hora_valida(fechamento):
            return jsonify({'error': f'Horário inválido para o dia "{dia}".'}), 400
        if aberto and abertura >= fechamento:
            return jsonify({'error': f'Abertura deve ser anterior ao fechamento para "{dia}".'}), 400
        horarios[dia] = {'aberto': aberto, 'abertura': abertura, 'fechamento': fechamento}

    # ── Validação: almoço ────────────────────────────────
    almoco_raw = data.get('almoco')
    if not isinstance(almoco_raw, dict):
        return jsonify({'error': 'Campo "almoco" inválido.'}), 400

    ativo  = bool(almoco_raw.get('ativo', False))
    inicio = almoco_raw.get('inicio', '12:00')
    fim    = almoco_raw.get('fim',    '13:00')

    if not _hora_valida(inicio) or not _hora_valida(fim):
        return jsonify({'error': 'Horário de almoço inválido.'}), 400
    if ativo and inicio >= fim:
        return jsonify({'error': 'O início do almoço deve ser anterior ao fim.'}), 400

    almoco = {'ativo': ativo, 'inicio': inicio, 'fim': fim}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO preferencias (id, horarios, almoco)
               VALUES ('default', %s, %s)
               ON DUPLICATE KEY UPDATE horarios = VALUES(horarios), almoco = VALUES(almoco)""",
            (json.dumps(horarios, ensure_ascii=False), json.dumps(almoco, ensure_ascii=False))
        )
        conn.commit()
        return jsonify({'horarios': horarios, 'almoco': almoco}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao salvar preferências: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

LOGO_FOLDER = _os.path.join(_os.path.dirname(__file__), 'uploads', 'logo')
LOGO_ALLOWED_EXT = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

def _ext_permitida(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in LOGO_ALLOWED_EXT

def serializar_barbearia(row):
    return {
        'nome': row['nome'] or '',
        'telefone': row['telefone'] or '',
        'endereco': row['endereco'] or '',
        'logoUrl': row['logo_url'] or None,
    }

@app.route('/api/barbershop', methods=['GET'])
def buscar_barbearia():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT nome, telefone, endereco, logo_url FROM barbearia WHERE id = 1"
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'nome': '', 'telefone': '', 'endereco': '', 'logoUrl': None}), 200
        return jsonify(serializar_barbearia(row)),200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar dados da barbearia: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/barbershop', methods=['PUT'])
def salvar_barbearia():
    data = request.get_json(silent=True) or {}

    nome     = (data.get('nome')     or '').strip()
    telefone = (data.get('telefone') or '').strip()
    endereco = (data.get('endereco') or '').strip()

    if not nome:
        return jsonify({'error': 'O nome da barbearia é obrigatório.'}), 400
    if not telefone:
        return jsonify({'error': 'O telefone é obrigatório.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """INSERT INTO barbearia (id, nome, telefone, endereco)
               VALUES (1, %s, %s, %s)
               ON DUPLICATE KEY UPDATE
                 nome     = VALUES(nome),
                 telefone = VALUES(telefone),
                 endereco = VALUES(endereco)""",
            (nome, telefone, endereco or None)
        )
        conn.commit()
        cursor.execute(
            "SELECT nome, telefone, endereco, logo_url FROM barbearia WHERE id = 1"
        )
        return jsonify(serializar_barbearia(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao salvar dados da barbearia: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/barbershop/logo', methods=['POST'])
def upload_logo():
    if 'logo' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado.'}), 400

    arquivo = request.files['logo']
    if not arquivo.filename:
        return jsonify({'error': 'Nome de arquivo inválido.'}), 400
    if not _ext_permitida(arquivo.filename):
        return jsonify({'error': 'Formato não suportado. Use PNG, JPG, WEBP ou GIF.'}), 400

    _os.makedirs(LOGO_FOLDER, exist_ok=True)
    ext      = arquivo.filename.rsplit('.', 1)[1].lower()
    filename = f'logo.{ext}'
    caminho  = _os.path.join(LOGO_FOLDER, filename)
    arquivo.save(caminho)

    logo_url = f'/uploads/logo/{filename}'

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO barbearia (id, nome, telefone, logo_url)
               VALUES (1, '', '', %s)
               ON DUPLICATE KEY UPDATE logo_url = VALUES(logo_url)""",
            (logo_url,)
        )
        conn.commit()
        return jsonify({'logoUrl': logo_url}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao salvar logo: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/uploads/logo/<filename>')
def servir_logo(filename):
    return send_from_directory(LOGO_FOLDER, filename)


@app.route('/api/barbers/<barbeiro_id>/metas-comissao', methods=['PATCH'])
def salvar_meta_comissao(barbeiro_id):
    """
    Atualiza a meta individual (metas_barbeiro) e/ou % de comissão
    (barbeiros.comissao_pct) de um barbeiro para o período atual.

    Body JSON (ao menos um campo obrigatório):
        meta_valor   : float  — meta em R$ para o mês corrente
        comissao_pct : float  — percentual de comissão (0-100)
    """
    data = request.get_json(silent=True) or {}

    meta_valor   = data.get('meta_valor')
    comissao_pct = data.get('comissao_pct')

    if meta_valor is None and comissao_pct is None:
        return jsonify({'error': 'Informe ao menos meta_valor ou comissao_pct.'}), 400

    if meta_valor is not None:
        try:
            meta_valor = float(meta_valor)
            if meta_valor < 0:
                raise ValueError()
        except (TypeError, ValueError):
            return jsonify({'error': 'meta_valor deve ser um número positivo.'}), 400

    if comissao_pct is not None:
        try:
            comissao_pct = float(comissao_pct)
            if not (0 <= comissao_pct <= 100):
                raise ValueError()
        except (TypeError, ValueError):
            return jsonify({'error': 'comissao_pct deve ser um número entre 0 e 100.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM barbeiros WHERE id = %s AND ativo = 1', (barbeiro_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Barbeiro não encontrado.'}), 404

        # ── 1. Atualiza comissao_pct na tabela barbeiros ───────────────────
        if comissao_pct is not None:
            cursor.execute(
                'UPDATE barbeiros SET comissao_pct = %s WHERE id = %s',
                (comissao_pct, barbeiro_id)
            )

        # ── 2. Upsert na tabela metas_barbeiro para o mês corrente ────────
        if meta_valor is not None:
            from datetime import date
            hoje = date.today()
            periodo_inicio = hoje.replace(day=1)

            cursor.execute(
                '''INSERT INTO metas_barbeiro
                       (barbeiro_id, periodo_tipo, periodo_inicio, meta_valor)
                   VALUES (%s, 'mes', %s, %s)
                   ON DUPLICATE KEY UPDATE
                       meta_valor = VALUES(meta_valor),
                       updated_at = CURRENT_TIMESTAMP''',
                (barbeiro_id, periodo_inicio, meta_valor)
            )

        conn.commit()

        # ── 3. Lê os valores atualizados para retornar ao front ───────────
        cursor.execute(
            'SELECT comissao_pct FROM barbeiros WHERE id = %s',
            (barbeiro_id,)
        )
        barb = cursor.fetchone()

        meta_retorno = None
        if meta_valor is not None:
            cursor.execute(
                '''SELECT meta_valor FROM metas_barbeiro
                   WHERE barbeiro_id = %s
                     AND periodo_tipo = 'mes'
                     AND periodo_inicio = %s''',
                (barbeiro_id, periodo_inicio)
            )
            row_meta = cursor.fetchone()
            meta_retorno = float(row_meta['meta_valor']) if row_meta else meta_valor

        return jsonify({
            'id':          barbeiro_id,
            'comissao_pct': float(barb['comissao_pct']),
            'meta_valor':   meta_retorno,
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao salvar meta/comissão: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# SAÍDAS — Financeiro
# GET    /api/saidas              → listar (com filtros)
# POST   /api/saidas              → criar
# PUT/PATCH /api/saidas/<id>      → editar
# DELETE /api/saidas/<id>         → excluir
# GET    /api/saidas/categorias   → lookup de categorias
# GET    /api/saidas/pgto         → lookup de formas de pagamento
# ═══════════════════════════════════════════════════════════


def serializar_saida(row):
    """Converte uma linha do banco em dict JSON-safe para a tela Saídas."""
    return {
        'id':        row['id'],
        'data':      str(row['data']),
        'desc':      row['descricao'],
        'categoria': row['categoria_nome'],
        'categoriaId': row['categoria_id'],
        'valor':     float(row['valor']),
        'pgto':      row['pgto_nome'],
        'pgtoId':    row['forma_pagamento_id'],
    }


@app.route('/api/saidas/categorias', methods=['GET'])
def listar_categorias_saida():
    """Retorna todas as categorias de saída para popular os <select> do front."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id, nome FROM categorias_saida ORDER BY nome')
        rows = cursor.fetchall()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar categorias: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/saidas/pgto', methods=['GET'])
def listar_pgto_saida():
    """Retorna formas de pagamento ativas para popular os <select> do front."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id, nome FROM formas_pagamento WHERE ativo = 1 ORDER BY nome')
        rows = cursor.fetchall()
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao buscar formas de pagamento: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/saidas', methods=['GET'])
def listar_saidas():
    """
    Lista saídas com filtros opcionais.

    Query params:
        periodo   : 'dia' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano'
        categoria : nome da categoria (string)
        pgto      : nome da forma de pagamento (string)
    """
    from datetime import date

    periodo   = request.args.get('periodo', 'mes')
    categoria = request.args.get('categoria', '')
    pgto      = request.args.get('pgto', '')

    hoje = date.today()

    if periodo == 'dia':
        data_inicio = hoje
        data_fim    = hoje
    elif periodo == 'semana':
        data_inicio = hoje - timedelta(days=hoje.weekday())
        data_fim    = data_inicio + timedelta(days=6)
    elif periodo == 'trimestre':
        mes_inicio  = ((hoje.month - 1) // 3) * 3 + 1
        data_inicio = hoje.replace(month=mes_inicio, day=1)
        mes_fim     = mes_inicio + 2
        import calendar
        data_fim = hoje.replace(
            month=mes_fim,
            day=calendar.monthrange(hoje.year, mes_fim)[1]
        )
    elif periodo == 'semestre':
        mes_inicio  = 1 if hoje.month <= 6 else 7
        data_inicio = hoje.replace(month=mes_inicio, day=1)
        mes_fim     = 6 if mes_inicio == 1 else 12
        import calendar
        data_fim = hoje.replace(
            month=mes_fim,
            day=calendar.monthrange(hoje.year, mes_fim)[1]
        )
    elif periodo == 'ano':
        data_inicio = hoje.replace(month=1, day=1)
        data_fim    = hoje.replace(month=12, day=31)
    else:
        # 'mes' (default)
        import calendar
        data_inicio = hoje.replace(day=1)
        data_fim    = hoje.replace(
            day=calendar.monthrange(hoje.year, hoje.month)[1]
        )

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = '''
            SELECT
                s.id,
                s.data,
                s.descricao,
                s.categoria_id,
                cs.nome AS categoria_nome,
                s.valor,
                s.forma_pagamento_id,
                fp.nome AS pgto_nome
            FROM saidas s
            JOIN categorias_saida cs ON cs.id = s.categoria_id
            JOIN formas_pagamento  fp ON fp.id = s.forma_pagamento_id
            WHERE s.data BETWEEN %s AND %s
        '''
        params = [data_inicio, data_fim]

        if categoria:
            sql += ' AND cs.nome = %s'
            params.append(categoria)

        if pgto:
            sql += ' AND fp.nome = %s'
            params.append(pgto)

        sql += ' ORDER BY s.data DESC, s.id DESC'

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        return jsonify([serializar_saida(r) for r in rows]), 200

    except Exception as e:
        return jsonify({'error': f'Erro ao listar saídas: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/saidas', methods=['POST'])
def criar_saida():
    """
    Cria uma nova saída.

    Body JSON:
        data        : 'YYYY-MM-DD'
        descricao   : string (obrigatório)
        categoriaId : int — id de categorias_saida
        valor       : float
        pgtoId      : int — id de formas_pagamento
    """
    data_req = request.get_json(silent=True) or {}

    descricao    = (data_req.get('descricao') or '').strip()
    data_saida   = data_req.get('data')
    categoria_id = data_req.get('categoriaId')
    valor        = data_req.get('valor')
    pgto_id      = data_req.get('pgtoId')

    if not all([descricao, data_saida, categoria_id, valor is not None, pgto_id]):
        return jsonify({'error': 'Campos obrigatórios: descricao, data, categoriaId, valor, pgtoId.'}), 400

    try:
        valor = float(valor)
        if valor <= 0:
            raise ValueError()
    except (TypeError, ValueError):
        return jsonify({'error': 'valor deve ser um número positivo.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''INSERT INTO saidas (data, descricao, categoria_id, valor, forma_pagamento_id)
               VALUES (%s, %s, %s, %s, %s)''',
            (data_saida, descricao, categoria_id, valor, pgto_id)
        )
        conn.commit()
        novo_id = cursor.lastrowid

        cursor.execute(
            '''SELECT s.id, s.data, s.descricao, s.categoria_id,
                      cs.nome AS categoria_nome, s.valor,
                      s.forma_pagamento_id, fp.nome AS pgto_nome
               FROM saidas s
               JOIN categorias_saida cs ON cs.id = s.categoria_id
               JOIN formas_pagamento  fp ON fp.id = s.forma_pagamento_id
               WHERE s.id = %s''',
            (novo_id,)
        )
        row = cursor.fetchone()
        return jsonify(serializar_saida(row)), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar saída: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/saidas/<int:saida_id>', methods=['PUT', 'PATCH'])
def atualizar_saida(saida_id):
    """
    Atualiza uma saída existente (edição completa ou parcial).

    Body JSON (ao menos um campo):
        data        : 'YYYY-MM-DD'
        descricao   : string
        categoriaId : int
        valor       : float
        pgtoId      : int
    """
    data_req = request.get_json(silent=True) or {}

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM saidas WHERE id = %s', (saida_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Saída não encontrada.'}), 404

        campos = []
        params = []

        if 'descricao' in data_req:
            desc = (data_req['descricao'] or '').strip()
            if not desc:
                return jsonify({'error': 'descricao não pode ser vazia.'}), 400
            campos.append('descricao = %s')
            params.append(desc)

        if 'data' in data_req:
            campos.append('data = %s')
            params.append(data_req['data'])

        if 'categoriaId' in data_req:
            campos.append('categoria_id = %s')
            params.append(data_req['categoriaId'])

        if 'valor' in data_req:
            try:
                v = float(data_req['valor'])
                if v <= 0:
                    raise ValueError()
            except (TypeError, ValueError):
                return jsonify({'error': 'valor deve ser um número positivo.'}), 400
            campos.append('valor = %s')
            params.append(v)

        if 'pgtoId' in data_req:
            campos.append('forma_pagamento_id = %s')
            params.append(data_req['pgtoId'])

        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        params.append(saida_id)
        cursor.execute(
            f'UPDATE saidas SET {", ".join(campos)} WHERE id = %s',
            params
        )
        conn.commit()

        cursor.execute(
            '''SELECT s.id, s.data, s.descricao, s.categoria_id,
                      cs.nome AS categoria_nome, s.valor,
                      s.forma_pagamento_id, fp.nome AS pgto_nome
               FROM saidas s
               JOIN categorias_saida cs ON cs.id = s.categoria_id
               JOIN formas_pagamento  fp ON fp.id = s.forma_pagamento_id
               WHERE s.id = %s''',
            (saida_id,)
        )
        row = cursor.fetchone()
        return jsonify(serializar_saida(row)), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar saída: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/saidas/<int:saida_id>', methods=['DELETE'])
def deletar_saida(saida_id):
    """Remove uma saída definitivamente."""
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM saidas WHERE id = %s', (saida_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Saída não encontrada.'}), 404

        cursor.execute('DELETE FROM saidas WHERE id = %s', (saida_id,))
        conn.commit()
        return '', 204

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao excluir saída: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# FINANCEIRO — Visão Geral
# GET /api/financeiro/visao-geral → KPIs, caixa por forma de
#     pagamento, evolução do faturamento e faturamento por
#     barbeiro, todos calculados a partir dos agendamentos
#     concluídos (status = 'concluido').
# ═══════════════════════════════════════════════════════════

def _intervalo_periodo(periodo, hoje=None):
    """
    Calcula (data_inicio, data_fim) para um período nomeado,
    igual à convenção já usada em listar_saidas().
    """
    from datetime import date
    import calendar

    hoje = hoje or date.today()

    if periodo == 'dia':
        return hoje, hoje

    if periodo == 'semana':
        inicio = hoje - timedelta(days=hoje.weekday())
        return inicio, inicio + timedelta(days=6)

    if periodo == 'trimestre':
        mes_inicio = ((hoje.month - 1) // 3) * 3 + 1
        inicio = hoje.replace(month=mes_inicio, day=1)
        mes_fim = mes_inicio + 2
        fim = hoje.replace(month=mes_fim, day=calendar.monthrange(hoje.year, mes_fim)[1])
        return inicio, fim

    if periodo == 'semestre':
        mes_inicio = 1 if hoje.month <= 6 else 7
        inicio = hoje.replace(month=mes_inicio, day=1)
        mes_fim = 6 if mes_inicio == 1 else 12
        fim = hoje.replace(month=mes_fim, day=calendar.monthrange(hoje.year, mes_fim)[1])
        return inicio, fim

    if periodo == 'ano':
        return hoje.replace(month=1, day=1), hoje.replace(month=12, day=31)

    # 'mes' (default)
    inicio = hoje.replace(day=1)
    fim = hoje.replace(day=calendar.monthrange(hoje.year, hoje.month)[1])
    return inicio, fim


@app.route('/api/financeiro/visao-geral', methods=['GET'])
def visao_geral_financeiro():
    """
    Retorna todos os dados da sub-aba Visão Geral do Financeiro,
    calculados a partir de agendamentos concluídos.

    Query params:
        periodo : 'dia' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano'
                  (default 'mes') — usado para os KPIs, caixa e barbeiros.
        evolucao: 'dia' | 'semana' | 'mes' (default 'semana') — granularidade
                  independente do gráfico de linha (filtro próprio da UI).

    Resposta:
        {
          kpis: { faturamentoTotal, faturamentoLiquido, totalCortes },
          formasPagamento: [{ id, nome, total, count }],
          evolucao: { labels: [...], values: [...] },
          barbeiros: [{ id, nome, faturamento, cortes }]
        }
    """
    from datetime import date

    periodo   = request.args.get('periodo', 'mes')
    evolucao_periodo = request.args.get('evolucao', 'semana')

    data_inicio, data_fim = _intervalo_periodo(periodo)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # ── KPIs + faturamento por forma de pagamento ──────────
        cursor.execute(
            '''SELECT
                   a.forma_pagamento_id,
                   fp.nome AS forma_pagamento_nome,
                   COUNT(*) AS qtd,
                   COALESCE(SUM(a.valor_cobrado), 0) AS total
               FROM agendamentos a
               LEFT JOIN formas_pagamento fp ON fp.id = a.forma_pagamento_id
               WHERE a.status = 'concluido'
                 AND a.data BETWEEN %s AND %s
               GROUP BY a.forma_pagamento_id, fp.nome
               ORDER BY total DESC''',
            (data_inicio, data_fim)
        )
        linhas_pgto = cursor.fetchall()

        formas_pagamento = [
            {
                'id':    row['forma_pagamento_id'],
                'nome':  row['forma_pagamento_nome'] or 'Não informado',
                # row['total'] já vem como Decimal do MySQL (SUM sobre
                # decimal(10,2)); _q2() só garante 2 casas exatas antes de
                # converter pra float — sem isso, e com soma/subtração em
                # float puro mais abaixo, é fácil acumular erro de ponto
                # flutuante e o centavo exibido não bater com o do banco.
                'total': float(_q2(row['total'])),
                'count': row['qtd'],
            }
            for row in linhas_pgto
        ]

        # Últimas transações de cada forma de pagamento, para as mini-listas
        # dos cards de "Conferência de Caixa". Limitado a 6 por forma para
        # manter a resposta enxuta (o card mostra no máximo 6 mesmo assim).
        cursor.execute(
            '''SELECT
                   a.forma_pagamento_id,
                   a.data,
                   a.cliente_nome,
                   sv.nome AS servico_nome,
                   a.valor_cobrado
               FROM agendamentos a
               LEFT JOIN servicos sv ON sv.id = a.servico_id
               WHERE a.status = 'concluido'
                 AND a.data BETWEEN %s AND %s
               ORDER BY a.data DESC, a.hora_inicio DESC''',
            (data_inicio, data_fim)
        )
        entries_por_forma = {}
        for row in cursor.fetchall():
            chave = row['forma_pagamento_id']
            lista = entries_por_forma.setdefault(chave, [])
            if len(lista) >= 6:
                continue
            lista.append({
                'date':    row['data'].strftime('%d/%m') if row['data'] else '',
                'client':  row['cliente_nome'],
                'service': row['servico_nome'] or '',
                'val':     float(_q2(row['valor_cobrado'])) if row['valor_cobrado'] is not None else 0,
            })

        for forma in formas_pagamento:
            forma['entries'] = entries_por_forma.get(forma['id'], [])

        # Soma em Decimal (não em float) para não acumular erro de ponto
        # flutuante entre as formas de pagamento antes de fechar o total.
        faturamento_total_dec = sum(
            (Decimal(str(f['total'])) for f in formas_pagamento),
            Decimal('0.00')
        )
        faturamento_total = float(_q2(faturamento_total_dec))
        total_cortes = sum(f['count'] for f in formas_pagamento)

        # ── Saídas do mesmo período (faturamento líquido) ──────
        cursor.execute(
            '''SELECT COALESCE(SUM(valor), 0) AS total
               FROM saidas
               WHERE data BETWEEN %s AND %s''',
            (data_inicio, data_fim)
        )
        total_saidas_dec = _q2(cursor.fetchone()['total'])
        total_saidas = float(total_saidas_dec)
        # Subtração também em Decimal — evita o clássico erro de ponto
        # flutuante (ex: 1234.56 - 358.97 em float puro pode virar
        # 875.5899999999999 em vez de 875.59 exato).
        faturamento_liquido = float(_q2(faturamento_total_dec - total_saidas_dec))

        # ── Faturamento por barbeiro (mesmo período) ────────────
        cursor.execute(
            '''SELECT
                   b.id,
                   b.nome,
                   COUNT(a.id) AS cortes,
                   COALESCE(SUM(a.valor_cobrado), 0) AS faturamento
               FROM barbeiros b
               LEFT JOIN agendamentos a
                      ON a.barbeiro_id = b.id
                     AND a.status = 'concluido'
                     AND a.data BETWEEN %s AND %s
               WHERE b.ativo = 1
               GROUP BY b.id, b.nome
               ORDER BY faturamento DESC''',
            (data_inicio, data_fim)
        )
        barbeiros = [
            {
                'id':          row['id'],
                'nome':        row['nome'],
                'faturamento': float(_q2(row['faturamento'])),
                'cortes':      row['cortes'],
            }
            for row in cursor.fetchall()
        ]

        # ── Evolução do faturamento (dia/semana/mês) ────────────
        if evolucao_periodo == 'dia':
            # Últimas 12 horas úteis do dia atual, agrupado por hora
            cursor.execute(
                '''SELECT HOUR(hora_inicio) AS bucket, COALESCE(SUM(valor_cobrado), 0) AS total
                   FROM agendamentos
                   WHERE status = 'concluido' AND data = %s
                   GROUP BY HOUR(hora_inicio)''',
                (date.today(),)
            )
            por_hora = {row['bucket']: float(_q2(row['total'])) for row in cursor.fetchall()}
            horas = list(range(8, 20))
            evolucao = {
                'labels': [f'{h:02d}h' for h in horas],
                'values': [por_hora.get(h, 0) for h in horas],
            }
        elif evolucao_periodo == 'mes':
            # Últimos 8 meses, agrupado por mês
            cursor.execute(
                '''SELECT DATE_FORMAT(data, '%%Y-%%m') AS bucket, COALESCE(SUM(valor_cobrado), 0) AS total
                   FROM agendamentos
                   WHERE status = 'concluido'
                     AND data >= DATE_SUB(CURDATE(), INTERVAL 8 MONTH)
                   GROUP BY DATE_FORMAT(data, '%%Y-%%m')
                   ORDER BY bucket ASC'''
            )
            rows = cursor.fetchall()
            meses_pt = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
            evolucao = {
                'labels': [meses_pt[int(row['bucket'].split('-')[1]) - 1] for row in rows],
                'values': [float(_q2(row['total'])) for row in rows],
            }
        else:
            # 'semana' (default): semana corrente, agrupado por dia
            semana_inicio, semana_fim = _intervalo_periodo('semana')
            cursor.execute(
                '''SELECT data, COALESCE(SUM(valor_cobrado), 0) AS total
                   FROM agendamentos
                   WHERE status = 'concluido'
                     AND data BETWEEN %s AND %s
                   GROUP BY data''',
                (semana_inicio, semana_fim)
            )
            por_dia = {row['data']: float(_q2(row['total'])) for row in cursor.fetchall()}
            dias_pt = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
            labels, values = [], []
            for i in range(7):
                dia = semana_inicio + timedelta(days=i)
                labels.append(f'{dias_pt[i]} {dia.day}')
                values.append(por_dia.get(dia, 0))
            evolucao = {'labels': labels, 'values': values}

        return jsonify({
            'kpis': {
                'faturamentoTotal':    faturamento_total,
                'faturamentoLiquido':  faturamento_liquido,
                'totalCortes':         total_cortes,
            },
            'formasPagamento': formas_pagamento,
            'evolucao': evolucao,
            'barbeiros': barbeiros,
        }), 200

    except Exception as e:
        return jsonify({'error': f'Erro ao carregar visão geral: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# DASHBOARD — Endpoint único de resumo
# GET /api/dashboard
# ═══════════════════════════════════════════════════════════

@app.route('/api/dashboard', methods=['GET'])
def dashboard_summary():
    """
    Retorna todos os dados necessários para o Dashboard em uma única chamada.
    Resposta dividida em seções independentes que alimentam cada bloco do front.
    """
    from datetime import date
    import calendar

    hoje = date.today()
    ontem = hoje - timedelta(days=1)
    inicio_semana = hoje - timedelta(days=hoje.weekday())
    inicio_mes = hoje.replace(day=1)
    fim_mes = hoje.replace(day=calendar.monthrange(hoje.year, hoje.month)[1])
    inicio_mes_anterior = (inicio_mes - timedelta(days=1)).replace(day=1)
    fim_mes_anterior = inicio_mes - timedelta(days=1)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:

        # ── 1. KPIs: faturamento de hoje ──────────────────────
        cursor.execute(
            '''SELECT
                   COALESCE(SUM(valor_cobrado), 0) AS receita,
                   COUNT(*) AS total_agendamentos
               FROM agendamentos
               WHERE status = 'concluido' AND data = %s''',
            (hoje,)
        )
        kpi_hoje = cursor.fetchone()
        receita_hoje = float(_q2(kpi_hoje['receita']))
        agend_hoje_concluidos = kpi_hoje['total_agendamentos']

        # Total de agendamentos do dia (qualquer status)
        cursor.execute(
            '''SELECT COUNT(*) AS total,
                      COALESCE(SUM(s.preco), 0) AS valor_previsto
               FROM agendamentos a
               JOIN servicos s ON s.id = a.servico_id
               WHERE a.data = %s''',
            (hoje,)
        )
        row_agend = cursor.fetchone()
        total_agend_hoje = row_agend['total']
        valor_previsto_hoje = float(_q2(row_agend['valor_previsto']))

        # Receita de ontem (para variação)
        cursor.execute(
            '''SELECT COALESCE(SUM(valor_cobrado), 0) AS receita
               FROM agendamentos
               WHERE status = 'concluido' AND data = %s''',
            (ontem,)
        )
        receita_ontem = float(_q2(cursor.fetchone()['receita']))

        # ── 2. KPIs: ticket médio (mês atual vs semana passada) ─
        cursor.execute(
            '''SELECT
                   COALESCE(AVG(valor_cobrado), 0) AS ticket_mes,
                   COUNT(*) AS qtd_mes
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s''',
            (inicio_mes, hoje)
        )
        row_ticket = cursor.fetchone()
        ticket_mes = float(_q2(row_ticket['ticket_mes']))

        inicio_semana_passada = inicio_semana - timedelta(days=7)
        fim_semana_passada = inicio_semana - timedelta(days=1)
        cursor.execute(
            '''SELECT COALESCE(AVG(valor_cobrado), 0) AS ticket
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s''',
            (inicio_semana_passada, fim_semana_passada)
        )
        ticket_semana_passada = float(_q2(cursor.fetchone()['ticket']))

        # ── 3. KPIs: novos clientes esta semana ──────────────
        cursor.execute(
            '''SELECT COUNT(*) AS qtd
               FROM clientes
               WHERE cliente_desde BETWEEN %s AND %s''',
            (inicio_semana, hoje)
        )
        novos_clientes_semana = cursor.fetchone()['qtd']

        # ── 4. Faturamento mensal (cabeçalho) ─────────────────
        cursor.execute(
            '''SELECT COALESCE(SUM(valor_cobrado), 0) AS receita
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s''',
            (inicio_mes, fim_mes)
        )
        receita_mes = float(_q2(cursor.fetchone()['receita']))

        cursor.execute(
            '''SELECT COALESCE(SUM(valor_cobrado), 0) AS receita
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s''',
            (inicio_mes_anterior, fim_mes_anterior)
        )
        receita_mes_anterior = float(_q2(cursor.fetchone()['receita']))

        # ── 5. Agenda do dia ──────────────────────────────────
        cursor.execute(
            '''SELECT
                   a.id, a.cliente_nome, a.cliente_telefone,
                   a.hora_inicio, a.hora_fim, a.status,
                   a.servico_id, a.barbeiro_id,
                   s.nome AS servico_nome, s.preco AS servico_preco,
                   s.duracao_min, s.cor_hex,
                   b.nome AS barbeiro_nome, b.avatar_iniciais
               FROM agendamentos a
               JOIN servicos s ON s.id = a.servico_id
               JOIN barbeiros b ON b.id = a.barbeiro_id
               WHERE a.data = %s
               ORDER BY a.hora_inicio ASC''',
            (hoje,)
        )
        agendamentos_hoje = []
        for row in cursor.fetchall():
            hi = row['hora_inicio']
            hora_str = (datetime.min + hi).strftime('%H:%M') if isinstance(hi, timedelta) else str(hi)[:5]
            agendamentos_hoje.append({
                'id':          row['id'],
                'time':        hora_str,
                'client':      row['cliente_nome'],
                'phone':       row['cliente_telefone'] or '',
                'serviceId':   row['servico_id'],
                'serviceName': row['servico_nome'],
                'servicePrice': float(_q2(row['servico_preco'])),
                'duration':    row['duracao_min'],
                'color':       row['cor_hex'] or '#3B82F6',
                'barberId':    row['barbeiro_id'],
                'barberName':  row['barbeiro_nome'],
                'barberAvatar': row['avatar_iniciais'] or '',
                'status':      row['status'],
            })

        # ── 6. Faturamento últimos 30 dias (gráfico) ─────────
        data_30d = hoje - timedelta(days=29)
        cursor.execute(
            '''SELECT data, COALESCE(SUM(valor_cobrado), 0) AS total
               FROM agendamentos
               WHERE status = 'concluido' AND data BETWEEN %s AND %s
               GROUP BY data
               ORDER BY data ASC''',
            (data_30d, hoje)
        )
        por_dia_30d = {row['data']: float(_q2(row['total'])) for row in cursor.fetchall()}
        revenue_30d = []
        revenue_30d_labels = []
        for i in range(29, -1, -1):
            dia = hoje - timedelta(days=i)
            revenue_30d_labels.append(dia.strftime('%d/%m'))
            revenue_30d.append(por_dia_30d.get(dia, 0))

        # Faturamento por mês (últimos 12 meses)
        cursor.execute(
            '''SELECT DATE_FORMAT(data, '%%Y-%%m') AS mes,
                      COALESCE(SUM(valor_cobrado), 0) AS total
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
               GROUP BY mes ORDER BY mes ASC'''
        )
        por_mes = {row['mes']: float(_q2(row['total'])) for row in cursor.fetchall()}
        revenue_month_labels = []
        revenue_month_data = []
        for i in range(11, -1, -1):
            ref = hoje.replace(day=1) - timedelta(days=i * 30)
            chave = ref.strftime('%Y-%m')
            label = ref.strftime('%b/%y')
            revenue_month_labels.append(label)
            revenue_month_data.append(por_mes.get(chave, 0))

        # Faturamento por ano (últimos 5 anos)
        cursor.execute(
            '''SELECT YEAR(data) AS ano, COALESCE(SUM(valor_cobrado), 0) AS total
               FROM agendamentos
               WHERE status = 'concluido'
                 AND YEAR(data) >= YEAR(CURDATE()) - 4
               GROUP BY ano ORDER BY ano ASC'''
        )
        por_ano = {row['ano']: float(_q2(row['total'])) for row in cursor.fetchall()}
        ano_atual = hoje.year
        revenue_year_labels = [str(a) for a in range(ano_atual - 4, ano_atual + 1)]
        revenue_year_data = [por_ano.get(a, 0) for a in range(ano_atual - 4, ano_atual + 1)]

        # ── 7. Distribuição de serviços do mês (donut) ────────
        cursor.execute(
            '''SELECT
                   a.servico_id,
                   s.nome AS servico_nome,
                   s.preco, s.cor_hex,
                   COUNT(*) AS qtd
               FROM agendamentos a
               JOIN servicos s ON s.id = a.servico_id
               WHERE a.status = 'concluido'
                 AND a.data BETWEEN %s AND %s
               GROUP BY a.servico_id, s.nome, s.preco, s.cor_hex
               ORDER BY qtd DESC
               LIMIT 8''',
            (inicio_mes, hoje)
        )
        servicos_dist = [
            {
                'serviceId':   row['servico_id'],
                'name':        row['servico_nome'],
                'price':       float(_q2(row['preco'])),
                'color':       row['cor_hex'] or '#3B82F6',
                'count':       row['qtd'],
            }
            for row in cursor.fetchall()
        ]

        # ── 8. Ocupação por faixa de horário (últimos 30 dias) ─
        cursor.execute(
            '''SELECT
                   HOUR(hora_inicio) AS hora,
                   COUNT(*) AS total
               FROM agendamentos
               WHERE data BETWEEN %s AND %s
                 AND status IN ('concluido', 'em-andamento', 'confirmado')
               GROUP BY HOUR(hora_inicio)
               ORDER BY hora ASC''',
            (data_30d, hoje)
        )
        agend_por_hora = {row['hora']: row['total'] for row in cursor.fetchall()}
        # Normaliza: máximo = 100% de ocupação
        max_agend = max(agend_por_hora.values(), default=1)
        occupancy = []
        for h in range(8, 20):
            pct = round((agend_por_hora.get(h, 0) / max_agend) * 100) if max_agend > 0 else 0
            occupancy.append({'label': f'{h:02d}h', 'value': pct})

        # ── 9. Metas dos barbeiros ─────────────────────────────
        # Semana
        cursor.execute(
            '''SELECT mb.barbeiro_id, mb.meta_valor,
                      b.nome, b.avatar_iniciais, b.comissao_pct,
                      COALESCE(SUM(a.valor_cobrado), 0) AS sold
               FROM metas_barbeiro mb
               JOIN barbeiros b ON b.id = mb.barbeiro_id
               LEFT JOIN agendamentos a
                      ON a.barbeiro_id = mb.barbeiro_id
                     AND a.status = 'concluido'
                     AND a.data BETWEEN %s AND %s
               WHERE mb.periodo_tipo = 'semana'
                 AND mb.periodo_inicio = %s
               GROUP BY mb.barbeiro_id, mb.meta_valor, b.nome, b.avatar_iniciais, b.comissao_pct''',
            (inicio_semana, hoje, inicio_semana)
        )
        metas_semana_rows = cursor.fetchall()

        # Tendência semanal (7 dias) por barbeiro
        def _tendencia_barbeiro(barbeiro_id, data_inicio_trend, data_fim_trend):
            cursor.execute(
                '''SELECT data, COALESCE(SUM(valor_cobrado), 0) AS total
                   FROM agendamentos
                   WHERE barbeiro_id = %s AND status = 'concluido'
                     AND data BETWEEN %s AND %s
                   GROUP BY data ORDER BY data ASC''',
                (barbeiro_id, data_inicio_trend, data_fim_trend)
            )
            por_dia = {row['data']: float(_q2(row['total'])) for row in cursor.fetchall()}
            return [
                por_dia.get(data_inicio_trend + timedelta(days=i), 0)
                for i in range(7)
            ]

        def _calcular_status_meta(sold, target):
            if target <= 0:
                return 'on-track'
            pct = (sold / target) * 100
            if pct >= 100:
                return 'ahead'
            if pct >= 75:
                return 'on-track'
            if pct >= 50:
                return 'almost'
            return 'behind'

        trend_inicio_semana = inicio_semana - timedelta(days=6)

        barbers_week = []
        for row in metas_semana_rows:
            sold = float(_q2(row['sold']))
            target = float(_q2(row['meta_valor']))
            status = _calcular_status_meta(sold, target)
            barbers_week.append({
                'barberId':    row['barbeiro_id'],
                'name':        row['nome'],
                'avatar':      row['avatar_iniciais'] or row['nome'][:2].upper(),
                'sold':        sold,
                'target':      target,
                'commissionPct': float(_q2(row['comissao_pct'])),
                'status':      status,
                'trend':       _tendencia_barbeiro(row['barbeiro_id'], trend_inicio_semana, hoje),
                'forecast':    None,
            })

        # Meta da equipe — semana
        cursor.execute(
            '''SELECT COALESCE(meta_valor, 0) AS meta
               FROM metas_barbearia
               WHERE periodo_tipo = 'semana' AND periodo_inicio = %s''',
            (inicio_semana,)
        )
        row_meta_equipe_sem = cursor.fetchone()
        team_target_week = float(_q2(row_meta_equipe_sem['meta'])) if row_meta_equipe_sem else 0
        team_sold_week = sum(b['sold'] for b in barbers_week)

        cursor.execute(
            '''SELECT data, COALESCE(SUM(valor_cobrado), 0) AS total
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s
               GROUP BY data ORDER BY data ASC''',
            (trend_inicio_semana, hoje)
        )
        team_trend_dict = {row['data']: float(_q2(row['total'])) for row in cursor.fetchall()}
        team_trend_week = [
            team_trend_dict.get(trend_inicio_semana + timedelta(days=i), 0)
            for i in range(7)
        ]

        goals_week = {
            'teamTarget': team_target_week,
            'teamSold':   team_sold_week,
            'teamTrend':  team_trend_week,
            'barbers':    barbers_week,
        }

        # Mensal
        cursor.execute(
            '''SELECT mb.barbeiro_id, mb.meta_valor,
                      b.nome, b.avatar_iniciais, b.comissao_pct,
                      COALESCE(SUM(a.valor_cobrado), 0) AS sold
               FROM metas_barbeiro mb
               JOIN barbeiros b ON b.id = mb.barbeiro_id
               LEFT JOIN agendamentos a
                      ON a.barbeiro_id = mb.barbeiro_id
                     AND a.status = 'concluido'
                     AND a.data BETWEEN %s AND %s
               WHERE mb.periodo_tipo = 'mes'
                 AND mb.periodo_inicio = %s
               GROUP BY mb.barbeiro_id, mb.meta_valor, b.nome, b.avatar_iniciais, b.comissao_pct''',
            (inicio_mes, hoje, inicio_mes)
        )
        metas_mes_rows = cursor.fetchall()

        trend_inicio_mes = hoje - timedelta(days=6)
        barbers_month = []
        for row in metas_mes_rows:
            sold = float(_q2(row['sold']))
            target = float(_q2(row['meta_valor']))
            status = _calcular_status_meta(sold, target)
            barbers_month.append({
                'barberId':    row['barbeiro_id'],
                'name':        row['nome'],
                'avatar':      row['avatar_iniciais'] or row['nome'][:2].upper(),
                'sold':        sold,
                'target':      target,
                'commissionPct': float(_q2(row['comissao_pct'])),
                'status':      status,
                'trend':       _tendencia_barbeiro(row['barbeiro_id'], trend_inicio_mes, hoje),
                'forecast':    None,
            })

        cursor.execute(
            '''SELECT COALESCE(meta_valor, 0) AS meta
               FROM metas_barbearia
               WHERE periodo_tipo = 'mes' AND periodo_inicio = %s''',
            (inicio_mes,)
        )
        row_meta_equipe_mes = cursor.fetchone()
        team_target_month = float(_q2(row_meta_equipe_mes['meta'])) if row_meta_equipe_mes else 0
        team_sold_month = sum(b['sold'] for b in barbers_month)

        cursor.execute(
            '''SELECT data, COALESCE(SUM(valor_cobrado), 0) AS total
               FROM agendamentos
               WHERE status = 'concluido'
                 AND data BETWEEN %s AND %s
               GROUP BY data ORDER BY data ASC''',
            (trend_inicio_mes, hoje)
        )
        team_trend_mes_dict = {row['data']: float(_q2(row['total'])) for row in cursor.fetchall()}
        team_trend_month = [
            team_trend_mes_dict.get(trend_inicio_mes + timedelta(days=i), 0)
            for i in range(7)
        ]

        goals_month = {
            'teamTarget': team_target_month,
            'teamSold':   team_sold_month,
            'teamTrend':  team_trend_month,
            'barbers':    barbers_month,
        }

        # ── 10. Comissões por período ──────────────────────────
        def _comissoes_periodo(data_ini, data_fim):
            cursor.execute(
                '''SELECT
                       b.id AS barbeiro_id, b.nome, b.avatar_iniciais, b.comissao_pct,
                       COUNT(a.id) AS appointments,
                        COALESCE(SUM(a.valor_cobrado), 0) AS total_gerado
                    FROM barbeiros b
                    LEFT JOIN agendamentos a
                            ON a.barbeiro_id = b.id
                            AND a.status = 'concluido'
                            AND a.data BETWEEN %s AND %s
                    WHERE b.ativo = 1
                    GROUP BY b.id, b.nome, b.avatar_iniciais, b.comissao_pct
                    ORDER BY total_gerado DESC''',
                (data_ini, data_fim)
            )
            barbers_comm = []
            total_gen = Decimal('0')
            total_pay = Decimal('0')
            total_appts = 0
            for row in cursor.fetchall():
                gen = _q2(row['total_gerado'])
                pct = _q2(row['comissao_pct'])
                pay = _q2(gen * pct / Decimal('100'))
                appointments = row['appointments']
                total_gen += gen
                total_pay += pay
                total_appts += appointments
                gen_f = float(gen)
                perf = 'good' if appointments >= 5 else ('medium' if appointments >= 2 else 'warning')
                barbers_comm.append({
                    'barberId':      row['barbeiro_id'],
                    'name':          row['nome'],
                    'avatar':        row['avatar_iniciais'] or row['nome'][:2].upper(),
                    'commissionPct': float(pct),
                    'generated':     gen_f,
                    'payout':        float(pay),
                    'appointments':  appointments,
                    'performance':   perf,
                })
            return {
                'totalGenerated': float(_q2(total_gen)),
                'totalPayout':    float(_q2(total_pay)),
                'appointments':   total_appts,
                'barbers':        barbers_comm,
            }

        commissions = {
            'today': _comissoes_periodo(hoje, hoje),
            'week':  _comissoes_periodo(inicio_semana, hoje),
            'month': _comissoes_periodo(inicio_mes, hoje),
        }

        # ── 11. Alertas: clientes para reativar ───────────────
        limite_reativar = hoje - timedelta(days=30)
        cursor.execute(
            '''SELECT c.id, c.nome, c.ultima_visita,
                      DATEDIFF(CURDATE(), c.ultima_visita) AS dias_ausente,
                      COALESCE(SUM(a.valor_cobrado), 0) AS total_gasto
               FROM clientes c
               LEFT JOIN agendamentos a
                      ON a.cliente_id = c.id AND a.status = 'concluido'
               WHERE c.ultima_visita IS NOT NULL
                 AND c.ultima_visita < %s
               GROUP BY c.id, c.nome, c.ultima_visita
               ORDER BY c.ultima_visita ASC
               LIMIT 5''',
            (limite_reativar,)
        )
        reativar = [
            {
                'id':        row['id'],
                'name':      row['nome'],
                'lastVisit': f'{row["dias_ausente"]} dias',
                'spend':     f'R$ {float(_q2(row["total_gasto"])):,.0f}'.replace(',', '.'),
            }
            for row in cursor.fetchall()
        ]

        # ── 12. Alertas: aniversariantes do mês ───────────────
        cursor.execute(
            '''SELECT id, nome, telefone, data_nascimento
               FROM clientes
               WHERE MONTH(data_nascimento) = MONTH(CURDATE())
               ORDER BY DAY(data_nascimento) ASC
               LIMIT 10'''
        )
        aniversariantes = []
        for row in cursor.fetchall():
            dn = row['data_nascimento']
            dia_nasc = dn.day if dn else None
            if dia_nasc == hoje.day:
                label = 'Hoje'
            elif dia_nasc == (hoje + timedelta(days=1)).day:
                label = 'Amanhã'
            else:
                label = f"{dia_nasc:02d}/{hoje.month:02d}"
            aniversariantes.append({
                'id':    row['id'],
                'name':  row['nome'],
                'phone': row['telefone'],
                'day':   label,
            })

        # ── 13. Alertas: estoque baixo ────────────────────────
        # Usa a tabela `produtos` — mesma fonte da tela de Produtos.
        # Critério: disponivel (= stock - reservado) <= 5, produto ativo.
        LIMITE_STOCK_BAIXO_DASHBOARD = 5
        cursor.execute(
            '''SELECT id, nome, stock, reservado,
                      (stock - reservado) AS disponivel
               FROM produtos
               WHERE ativo = 1
                 AND (stock - reservado) <= %s
               ORDER BY (stock - reservado) ASC
               LIMIT 10''',
            (LIMITE_STOCK_BAIXO_DASHBOARD,)
        )
        estoque_baixo = [
            {
                'id':   row['id'],
                'name': row['nome'],
                'qty':  int(row['disponivel']),
                'unit': 'un',
            }
            for row in cursor.fetchall()
        ]

        # ── 14. Alertas: agendamentos pendentes hoje ──────────
        pendentes = [
            {
                'id':     a['id'],
                'client': a['client'],
                'time':   a['time'],
                'phone':  a['phone'],
            }
            for a in agendamentos_hoje if a['status'] == 'pendente'
        ]

        # ── 15. Relatórios rápidos — preview ──────────────────
        def _top_servico(data_ini, data_fim):
            cursor.execute(
                '''SELECT s.nome, COUNT(*) AS qtd
                   FROM agendamentos a
                   JOIN servicos s ON s.id = a.servico_id
                   WHERE a.status = 'concluido' AND a.data BETWEEN %s AND %s
                   GROUP BY s.nome ORDER BY qtd DESC LIMIT 1''',
                (data_ini, data_fim)
            )
            row = cursor.fetchone()
            return row['nome'] if row else '—'

        def _no_shows(data_ini, data_fim):
            cursor.execute(
                '''SELECT COUNT(*) AS qtd FROM agendamentos
                   WHERE status = 'no-show' AND data BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return cursor.fetchone()['qtd']

        def _novos_clientes(data_ini, data_fim):
            cursor.execute(
                '''SELECT COUNT(*) AS qtd FROM clientes
                   WHERE cliente_desde BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return cursor.fetchone()['qtd']

        def _ticket_medio(data_ini, data_fim):
            cursor.execute(
                '''SELECT COALESCE(AVG(valor_cobrado), 0) AS ticket
                   FROM agendamentos
                   WHERE status = 'concluido' AND data BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return float(_q2(cursor.fetchone()['ticket']))

        def _faturamento(data_ini, data_fim):
            cursor.execute(
                '''SELECT COALESCE(SUM(valor_cobrado), 0) AS total
                   FROM agendamentos
                   WHERE status = 'concluido' AND data BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return float(_q2(cursor.fetchone()['total']))

        def _total_agend(data_ini, data_fim):
            cursor.execute(
                '''SELECT COUNT(*) AS qtd FROM agendamentos
                   WHERE data BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return cursor.fetchone()['qtd']

        def _comissoes_total(data_ini, data_fim):
            cursor.execute(
                '''SELECT COALESCE(SUM(a.valor_cobrado * b.comissao_pct / 100), 0) AS total
                   FROM agendamentos a
                   JOIN barbeiros b ON b.id = a.barbeiro_id
                   WHERE a.status = 'concluido' AND a.data BETWEEN %s AND %s''',
                (data_ini, data_fim)
            )
            return float(_q2(cursor.fetchone()['total']))

        fim_semana_atual = inicio_semana + timedelta(days=6)

        def _fmt_brl(v):
            return f"R$ {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

        reports_preview = {
            'today': {
                'period': 'Hoje',
                'filename': f'relatorio-{hoje.strftime("%d-%m-%Y")}',
                'items': [
                    {'label': 'Faturamento',       'value': _fmt_brl(_faturamento(hoje, hoje))},
                    {'label': 'Agendamentos',       'value': str(_total_agend(hoje, hoje))},
                    {'label': 'Ticket Médio',       'value': _fmt_brl(_ticket_medio(hoje, hoje))},
                    {'label': 'Top Serviço',        'value': _top_servico(hoje, hoje)},
                    {'label': 'Comissões a pagar',  'value': _fmt_brl(_comissoes_total(hoje, hoje))},
                    {'label': 'No-shows',           'value': str(_no_shows(hoje, hoje))},
                ],
            },
            'week': {
                'period': 'Esta Semana',
                'filename': f'relatorio-semana-{inicio_semana.strftime("%d-%m-%Y")}',
                'items': [
                    {'label': 'Faturamento',       'value': _fmt_brl(_faturamento(inicio_semana, hoje))},
                    {'label': 'Agendamentos',       'value': str(_total_agend(inicio_semana, hoje))},
                    {'label': 'Ticket Médio',       'value': _fmt_brl(_ticket_medio(inicio_semana, hoje))},
                    {'label': 'Top Serviço',        'value': _top_servico(inicio_semana, hoje)},
                    {'label': 'Comissões a pagar',  'value': _fmt_brl(_comissoes_total(inicio_semana, hoje))},
                    {'label': 'Novos Clientes',     'value': str(_novos_clientes(inicio_semana, hoje))},
                ],
            },
            'month': {
                'period': f'{inicio_mes.strftime("%B/%Y")}',
                'filename': f'relatorio-{inicio_mes.strftime("%m-%Y")}',
                'items': [
                    {'label': 'Faturamento',        'value': _fmt_brl(receita_mes)},
                    {'label': 'Agendamentos',        'value': str(_total_agend(inicio_mes, hoje))},
                    {'label': 'Ticket Médio',        'value': _fmt_brl(ticket_mes)},
                    {'label': 'Top Serviço',         'value': _top_servico(inicio_mes, hoje)},
                    {'label': 'Comissões a pagar',   'value': _fmt_brl(_comissoes_total(inicio_mes, hoje))},
                    {'label': 'Taxa de Ocupação',    'value': f'{round((agend_hoje_concluidos / max(total_agend_hoje, 1)) * 100)}%'},
                ],
            },
        }

        # ── 16. Dados de barbeiros e serviços (para modal) ────
        cursor.execute(
            '''SELECT id, nome, avatar_iniciais, comissao_pct
               FROM barbeiros WHERE ativo = 1 ORDER BY nome ASC'''
        )
        barbeiros_modal = [
            {
                'id':     row['id'],
                'name':   row['nome'],
                'avatar': row['avatar_iniciais'] or row['nome'][:2].upper(),
            }
            for row in cursor.fetchall()
        ]

        cursor.execute(
            '''SELECT id, nome, preco, duracao_min, cor_hex
               FROM servicos WHERE ativo = 1 ORDER BY nome ASC'''
        )
        servicos_modal = [
            {
                'id':       row['id'],
                'name':     row['nome'],
                'price':    float(_q2(row['preco'])),
                'duration': row['duracao_min'],
                'color':    row['cor_hex'] or '#3B82F6',
            }
            for row in cursor.fetchall()
        ]

        # ── 17. Loyalty ───────────────────────────────────────
        cursor.execute(
            '''SELECT
                   lb.barbeiro_id, lb.pontos, lb.nivel, lb.proxima_meta_pontos,
                   b.nome, b.avatar_iniciais,
                   GROUP_CONCAT(lben.descricao ORDER BY lben.ordem SEPARATOR '||') AS beneficios
               FROM loyalty_barbeiro lb
               JOIN barbeiros b ON b.id = lb.barbeiro_id
               LEFT JOIN loyalty_beneficios lben ON lben.nivel = lb.nivel
               WHERE b.ativo = 1
               GROUP BY lb.barbeiro_id, lb.pontos, lb.nivel, lb.proxima_meta_pontos,
                        b.nome, b.avatar_iniciais
               ORDER BY lb.pontos DESC'''
        )
        loyalty = []
        for i, row in enumerate(cursor.fetchall()):
            meta = row['proxima_meta_pontos'] or 0
            pontos = row['pontos']
            progress = round((pontos / meta) * 100) if meta > 0 else 100
            beneficios = row['beneficios'].split('||') if row['beneficios'] else []
            loyalty.append({
                'barberId':  row['barbeiro_id'],
                'name':      row['nome'],
                'avatar':    row['avatar_iniciais'] or row['nome'][:2].upper(),
                'points':    pontos,
                'level':     row['nivel'],
                'progress':  min(progress, 100),
                'nextGoal':  meta,
                'benefits':  beneficios,
                'rank':      i + 1,
            })

        # ── 18. Dados da barbearia (header) ───────────────────
        cursor.execute('SELECT nome FROM barbearia WHERE id = 1')
        row_barb = cursor.fetchone()
        barbershop_name = row_barb['nome'] if row_barb else 'Barbearia'

        return jsonify({
            'barbershop': {'name': barbershop_name},
            'header': {
                'monthlyRevenue':     receita_mes,
                'prevMonthRevenue':   receita_mes_anterior,
            },
            'kpis': {
                'todayRevenue':         receita_hoje,
                'todayRevenueYesterday': receita_ontem,
                'todayAppointments':    total_agend_hoje,
                'todayAppointmentsValue': valor_previsto_hoje,
                'ticketAvg':            ticket_mes,
                'ticketAvgLastWeek':    ticket_semana_passada,
                'newClientsWeek':       novos_clientes_semana,
            },
            'agenda': agendamentos_hoje,
            'charts': {
                'revenue': {
                    'day':   {'labels': revenue_30d_labels, 'data': revenue_30d},
                    'month': {'labels': revenue_month_labels, 'data': revenue_month_data},
                    'year':  {'labels': revenue_year_labels, 'data': revenue_year_data},
                },
                'servicesDistribution': servicos_dist,
                'occupancy': occupancy,
            },
            'goals': {
                'week':  goals_week,
                'month': goals_month,
            },
            'commissions': commissions,
            'alerts': {
                'reactivate': reativar,
                'birthdays':  aniversariantes,
                'lowStock':   estoque_baixo,
                'pending':    pendentes,
            },
            'reportsPreview': reports_preview,
            'modal': {
                'barbers':  barbeiros_modal,
                'services': servicos_modal,
            },
            'loyalty': loyalty,
        }), 200

    except Exception as e:
        return jsonify({'error': f'Erro ao carregar dashboard: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


# ═══════════════════════════════════════════════════════════
# AUTH — Usuários (tela de login/cadastro da LP)
# ═══════════════════════════════════════════════════════════

TOKEN_TTL_HORAS = 720  # 30 dias


@app.route('/api/auth/signup', methods=['POST'])
def cadastrar_usuario():
    """Cadastra novo usuário da LP. Campos: primeiroNome, sobrenome, email, telefone, senha."""
    dados = request.get_json(silent=True) or {}
    primeiro_nome = (dados.get('primeiroNome') or '').strip()
    sobrenome     = (dados.get('sobrenome')     or '').strip()
    email         = (dados.get('email')         or '').strip().lower()
    telefone      = (dados.get('telefone')      or '').strip() or None
    senha         = dados.get('senha', '')

    if not primeiro_nome:
        return jsonify({'error': 'O nome é obrigatório.'}), 400
    if not sobrenome:
        return jsonify({'error': 'O sobrenome é obrigatório.'}), 400
    if not email or '@' not in email:
        return jsonify({'error': 'E-mail inválido.'}), 400
    if not senha or len(senha) < 8:
        return jsonify({'error': 'A senha deve ter pelo menos 8 caracteres.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM usuarios WHERE email = %s', (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Este e-mail já está em uso.'}), 409

        usuario_id   = 'u' + uuid.uuid4().hex[:12]
        senha_hash   = hash_password(senha)
        token        = gerar_token()
        token_expira = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HORAS)

        cursor.execute(
            '''INSERT INTO usuarios
               (id, primeiro_nome, sobrenome, email, telefone,
                senha_hash, token_sessao, token_expira_em)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)''',
            (usuario_id, primeiro_nome, sobrenome, email, telefone,
             senha_hash, token, token_expira)
        )
        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = %s', (usuario_id,))
        usuario = cursor.fetchone()
        return jsonify({
            'token':   token,
            'usuario': serializar_usuario(usuario),
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao cadastrar: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login_usuario():
    """Login com email e senha. Retorna token + dados do usuário."""
    dados = request.get_json(silent=True) or {}
    email = (dados.get('email') or '').strip().lower()
    senha = dados.get('senha', '')

    if not email or not senha:
        return jsonify({'error': 'E-mail e senha são obrigatórios.'}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            'SELECT * FROM usuarios WHERE email = %s AND ativo = 1',
            (email,)
        )
        usuario = cursor.fetchone()

        if not usuario or not check_password(senha, usuario['senha_hash']):
            return jsonify({'error': 'E-mail ou senha incorretos.'}), 401

        token        = gerar_token()
        token_expira = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HORAS)

        cursor.execute(
            'UPDATE usuarios SET token_sessao = %s, token_expira_em = %s WHERE id = %s',
            (token, token_expira, usuario['id'])
        )
        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = %s', (usuario['id'],))
        usuario = cursor.fetchone()
        return jsonify({
            'token':   token,
            'usuario': serializar_usuario(usuario),
        }), 200

    except Exception as e:
        return jsonify({'error': f'Erro ao fazer login: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/logout', methods=['POST'])
def logout_usuario():
    """Invalida o token da sessão atual."""
    token = token_do_request()
    if not token:
        return jsonify({'error': 'Não autenticado.'}), 401

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            'UPDATE usuarios SET token_sessao = NULL, token_expira_em = NULL WHERE token_sessao = %s',
            (token,)
        )
        conn.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao fazer logout: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/me', methods=['GET'])
def me_usuario():
    """Retorna os dados do usuário logado a partir do token. Usado para hidratar o front ao recarregar."""
    token = token_do_request()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        usuario = usuario_do_token(cursor, token)
        if not usuario:
            return jsonify({'error': 'Token inválido ou expirado.'}), 401
        return jsonify({'usuario': serializar_usuario(usuario)}), 200
    except Exception as e:
        return jsonify({'error': f'Erro: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/profile', methods=['PATCH'])
def atualizar_perfil():
    """Atualiza dados pessoais do usuário logado (nome, email, telefone, data_nascimento)."""
    token = token_do_request()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        usuario = usuario_do_token(cursor, token)
        if not usuario:
            return jsonify({'error': 'Não autenticado.'}), 401

        dados = request.get_json(silent=True) or {}
        campos = {}

        if 'primeiroNome' in dados:
            v = str(dados['primeiroNome']).strip()
            if not v:
                return jsonify({'error': 'O nome é obrigatório.'}), 400
            campos['primeiro_nome'] = v

        if 'sobrenome' in dados:
            v = str(dados['sobrenome']).strip()
            if not v:
                return jsonify({'error': 'O sobrenome é obrigatório.'}), 400
            campos['sobrenome'] = v

        if 'email' in dados:
            v = str(dados['email']).strip().lower()
            if not v or '@' not in v:
                return jsonify({'error': 'E-mail inválido.'}), 400
            cursor.execute(
                'SELECT id FROM usuarios WHERE email = %s AND id != %s',
                (v, usuario['id'])
            )
            if cursor.fetchone():
                return jsonify({'error': 'Este e-mail já está em uso.'}), 409
            campos['email'] = v

        if 'telefone' in dados:
            campos['telefone'] = str(dados['telefone']).strip() or None

        if 'dataNascimento' in dados:
            campos['data_nascimento'] = dados['dataNascimento'] or None

        if not campos:
            return jsonify({'error': 'Nenhum campo enviado.'}), 400

        set_clause = ', '.join(f'`{k}` = %s' for k in campos)
        cursor.execute(
            f'UPDATE usuarios SET {set_clause} WHERE id = %s',
            list(campos.values()) + [usuario['id']]
        )
        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = %s', (usuario['id'],))
        return jsonify({'usuario': serializar_usuario(cursor.fetchone())}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar perfil: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/prefs', methods=['PATCH'])
def atualizar_prefs():
    """Atualiza preferências do usuário logado (notificações, idioma, aparência, reserva)."""
    token = token_do_request()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        usuario = usuario_do_token(cursor, token)
        if not usuario:
            return jsonify({'error': 'Não autenticado.'}), 401

        dados = request.get_json(silent=True) or {}

        MAPA = {
            'barbeiroId':   'pref_barbeiro_id',
            'horario':      'pref_horario',
            'pagamento':    'pref_pagamento',
            'notifLembrete':'pref_notif_lembrete',
            'notifEmail':   'pref_notif_email',
            'notifSms':     'pref_notif_sms',
            'notifPromos':  'pref_notif_promos',
            'leadHoras':    'pref_lead_horas',
            'idioma':       'pref_idioma',
            'formatoHora':  'pref_formato_hora',
            'tamanhoTexto': 'pref_tamanho_texto',
            'reduceMotion': 'pref_reduce_motion',
        }

        campos = {}
        for chave_front, col in MAPA.items():
            if chave_front in dados:
                campos[col] = dados[chave_front]

        if not campos:
            return jsonify({'error': 'Nenhum campo enviado.'}), 400

        set_clause = ', '.join(f'`{k}` = %s' for k in campos)
        cursor.execute(
            f'UPDATE usuarios SET {set_clause} WHERE id = %s',
            list(campos.values()) + [usuario['id']]
        )
        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = %s', (usuario['id'],))
        return jsonify({'usuario': serializar_usuario(cursor.fetchone())}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar preferências: {e}'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/auth/password', methods=['PATCH'])
def alterar_senha():
    """Altera a senha do usuário logado. Exige senhaAtual + novaSenha."""
    token = token_do_request()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        usuario = usuario_do_token(cursor, token)
        if not usuario:
            return jsonify({'error': 'Não autenticado.'}), 401

        dados = request.get_json(silent=True) or {}
        senha_atual = dados.get('senhaAtual', '')
        nova_senha  = dados.get('novaSenha', '')

        if not senha_atual:
            return jsonify({'error': 'Senha atual obrigatória.'}), 400
        if not nova_senha or len(nova_senha) < 8:
            return jsonify({'error': 'A nova senha deve ter pelo menos 8 caracteres.'}), 400
        if not check_password(senha_atual, usuario['senha_hash']):
            return jsonify({'error': 'Senha atual incorreta.'}), 401

        novo_hash   = hash_password(nova_senha)
        novo_token  = gerar_token()
        token_expira = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HORAS)

        cursor.execute(
            'UPDATE usuarios SET senha_hash = %s, token_sessao = %s, token_expira_em = %s WHERE id = %s',
            (novo_hash, novo_token, token_expira, usuario['id'])
        )
        conn.commit()

        return jsonify({'token': novo_token, 'ok': True}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao alterar senha: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/auth/avatar', methods=['POST'])
def atualizar_avatar():
    """Recebe a foto em base64 (data URI), salva no DB e devolve a URL."""
    token = token_do_request()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        usuario = usuario_do_token(cursor, token)
        if not usuario:
            return jsonify({'error': 'Não autenticado.'}), 401

        dados = request.get_json(silent=True) or {}
        data_uri = dados.get('dataUri', '').strip()

        if not data_uri:
            return jsonify({'error': 'dataUri obrigatório.'}), 400

        # Aceita apenas imagens
        if not data_uri.startswith('data:image/'):
            return jsonify({'error': 'Formato inválido. Envie uma imagem.'}), 400

        # Limita tamanho: ~600 KB em base64 ≈ 450 KB real
        if len(data_uri) > 200_000:
            return jsonify({'error': 'Imagem muito grande. Tente outra foto.'}), 413

        cursor.execute(
            'UPDATE usuarios SET foto_url = %s WHERE id = %s',
            (data_uri, usuario['id'])
        )
        conn.commit()

        cursor.execute('SELECT * FROM usuarios WHERE id = %s', (usuario['id'],))
        return jsonify({'usuario': serializar_usuario(cursor.fetchone())}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao salvar avatar: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    try:
        conn = get_db()
        print("✅ Conectado ao banco de dados com sucesso!")
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
    
    app.run(debug=True, port=int(_os.getenv('APP_PORT', 8000)))