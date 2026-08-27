from flask import Flask, jsonify, request
from dotenv import load_dotenv
import mysql.connector
import os
import bcrypt
import uuid
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, timezone
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)
#Conexões com a env

def get_db():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT')),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    return conn

# Criptografia para momento de login
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def check_password(password, hashed):
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


# ═══════════════════════════════════════════════════════════
# AGENDA — Helpers internos
# ═══════════════════════════════════════════════════════════

STATUS_VALIDOS = {'pendente', 'confirmado', 'em-andamento', 'concluido', 'no-show'}


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
          AND status NOT IN ('concluido', 'no-show')
          AND hora_inicio < %s
          AND hora_fim > %s
    '''
    params = [barbeiro_id, data, hora_fim, hora_inicio]
    if excluir_id:
        query += ' AND id != %s'
        params.append(excluir_id)
    cursor.execute(query, tuple(params))
    return cursor.fetchone() is not None


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

        if existe_conflito(cursor, data['barberId'], data['date'], hora_inicio, hora_fim):
            return jsonify({'error': 'Já existe um agendamento nesse horário para este barbeiro.'}), 409

        novo_id = gerar_agendamento_id()
        cursor.execute(
            '''INSERT INTO agendamentos
               (id, cliente_id, cliente_nome, cliente_telefone, servico_id,
                barbeiro_id, data, hora_inicio, hora_fim, status, observacoes)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pendente', %s)''',
            (
                novo_id,
                data.get('clienteId'),
                data['client'],
                data.get('phone'),
                data['serviceId'],
                data['barberId'],
                data['date'],
                hora_inicio,
                hora_fim,
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
            hora_inicio = atual['hora_inicio']

        hora_fim = calcular_hora_fim(hora_inicio, servico['duracao_min'])

        if existe_conflito(cursor, barbeiro_id, data_agendamento, hora_inicio, hora_fim, excluir_id=agendamento_id):
            return jsonify({'error': 'Já existe um agendamento nesse horário para este barbeiro.'}), 409

        status = data.get('status', atual['status'])
        if status not in STATUS_VALIDOS:
            return jsonify({'error': f'Status inválido: {status}'}), 400

        cursor.execute(
            '''UPDATE agendamentos SET
                   cliente_id = %s, cliente_nome = %s, cliente_telefone = %s,
                   servico_id = %s, barbeiro_id = %s, data = %s,
                   hora_inicio = %s, hora_fim = %s, status = %s, observacoes = %s
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
# SERVIÇOS
# ═══════════════════════════════════════════════════════════

def serializar_servico(row):
    return {
        'id':          row['id'],
        'name':        row['nome'],
        'nome':        row['nome'],
        'price':       float(row['preco']) if row['preco'] is not None else 0.0,
        'preco':       float(row['preco']) if row['preco'] is not None else 0.0,
        'duration':    row['duracao_min'],
        'duracao_min': row['duracao_min'],
        'ativo':       bool(row['ativo']),
    }


@app.route('/api/services', methods=['GET'])
def listar_servicos():
    include_all = request.args.get('all') == '1'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if include_all:
            cursor.execute(
                '''SELECT id, nome, preco, duracao_min, ativo
                   FROM servicos
                   ORDER BY nome ASC'''
            )
        else:
            cursor.execute(
                '''SELECT id, nome, preco, duracao_min, ativo
                   FROM servicos
                   WHERE ativo = 1
                   ORDER BY nome ASC'''
            )
        rows = cursor.fetchall()
        return jsonify([serializar_servico(r) for r in rows]), 200
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

    try:
        duracao_min = int(data.get('duracao_min', 0))
        if duracao_min < 1:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Duração inválida. Informe um número inteiro positivo.'}), 400

    try:
        preco = float(data.get('preco', 0))
        if preco < 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({'error': 'Preço inválido.'}), 400

    ativo   = bool(data.get('ativo', True))
    novo_id = 's' + uuid.uuid4().hex[:12]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''INSERT INTO servicos (id, nome, preco, duracao_min, ativo)
               VALUES (%s, %s, %s, %s, %s)''',
            (novo_id, nome, preco, duracao_min, int(ativo))
        )
        conn.commit()
        cursor.execute(
            'SELECT id, nome, preco, duracao_min, ativo FROM servicos WHERE id = %s',
            (novo_id,)
        )
        return jsonify(serializar_servico(cursor.fetchone())), 201
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
        cursor.execute('SELECT id FROM servicos WHERE id = %s', (servico_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Serviço não encontrado.'}), 404

        campos = []
        params = []

        if 'nome' in data:
            nome = data['nome'].strip()
            if not nome:
                return jsonify({'error': 'O nome não pode ser vazio.'}), 400
            campos.append('nome = %s')
            params.append(nome)

        if 'duracao_min' in data:
            try:
                duracao = int(data['duracao_min'])
                if duracao < 1:
                    raise ValueError
            except (ValueError, TypeError):
                return jsonify({'error': 'Duração inválida.'}), 400
            campos.append('duracao_min = %s')
            params.append(duracao)

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

        if not campos:
            return jsonify({'error': 'Nenhum campo para atualizar.'}), 400

        params.append(servico_id)
        cursor.execute(
            f"UPDATE servicos SET {', '.join(campos)} WHERE id = %s",
            tuple(params)
        )
        conn.commit()

        cursor.execute(
            'SELECT id, nome, preco, duracao_min, ativo FROM servicos WHERE id = %s',
            (servico_id,)
        )
        return jsonify(serializar_servico(cursor.fetchone())), 200
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
            'SELECT id, nome, preco, duracao_min, ativo FROM servicos WHERE id = %s',
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
        'id':       row['id'],
        'nome':     row['nome'],
        'name':     row['nome'],
        'telefone': row['telefone'] or '',
        'phone':    row['telefone'] or '',
        'avatar':   row.get('avatar'),
        'ativo':    bool(row['ativo']),
    }


@app.route('/api/barbers', methods=['GET'])
def listar_barbeiros():
    include_inactive = request.args.get('includeInactive') == '1'
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if include_inactive:
            cursor.execute(
                '''SELECT id, nome, telefone, avatar, ativo
                   FROM barbeiros
                   ORDER BY nome ASC'''
            )
        else:
            cursor.execute(
                '''SELECT id, nome, telefone, avatar, ativo
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
    ativo    = bool(data.get('ativo', True))
    novo_id  = 'b' + uuid.uuid4().hex[:12]

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''INSERT INTO barbeiros (id, nome, telefone, ativo)
               VALUES (%s, %s, %s, %s)''',
            (novo_id, nome, telefone, int(ativo))
        )
        conn.commit()
        cursor.execute(
            'SELECT id, nome, telefone, avatar, ativo FROM barbeiros WHERE id = %s',
            (novo_id,)
        )
        return jsonify(serializar_barbeiro(cursor.fetchone())), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao criar barbeiro: {e}'}), 500
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
            campos.append('telefone = %s')
            params.append(data['telefone'].strip() or None)

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
            'SELECT id, nome, telefone, avatar, ativo FROM barbeiros WHERE id = %s',
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
            'SELECT id, nome, telefone, avatar, ativo FROM barbeiros WHERE id = %s',
            (barbeiro_id,)
        )
        return jsonify(serializar_barbeiro(cursor.fetchone())), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Erro ao atualizar status: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# ═══════════════════════════════════════════════════════════
# CLIENTES
# ═══════════════════════════════════════════════════════════

def serializar_cliente(row):
    """Converte tipos DATE do MySQL para JSON-friendly."""
    return {
        'id':        row['id'],
        'name':      row['nome'],
        'phone':     row['telefone'] or '',
        'since':     row['cliente_desde'].strftime('%Y-%m-%d') if row['cliente_desde'] else None,
        'lastVisit': row['ultima_visita'].strftime('%Y-%m-%d') if row['ultima_visita'] else None,
        'birthdate': row['data_nascimento'].strftime('%Y-%m-%d') if row['data_nascimento'] else None,
        'obs':       row['observacoes'] or '',
    }


@app.route('/api/clients', methods=['GET'])
def listar_clientes():
    search = request.args.get('search', '').strip()
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        if search:
            # Modo autocomplete (Agenda): retorna apenas id, name, phone
            cursor.execute(
                '''SELECT id, nome, telefone, cliente_desde, ultima_visita,
                          data_nascimento, observacoes
                   FROM clientes
                   WHERE nome LIKE %s
                   ORDER BY nome ASC
                   LIMIT 10''',
                (f'%{search}%',)
            )
        else:
            # Modo listagem completa (tela Clientes): sem limite
            cursor.execute(
                '''SELECT id, nome, telefone, cliente_desde, ultima_visita,
                          data_nascimento, observacoes
                   FROM clientes
                   ORDER BY nome ASC'''
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


@app.route('/api/clients/<cliente_id>', methods=['GET'])
def buscar_cliente(cliente_id):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, nome, telefone, cliente_desde, ultima_visita,
                      data_nascimento, observacoes
               FROM clientes WHERE id = %s''',
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
                  stock, reservado, categoria, img, destaque, ativo'''

RESERVA_COLS = '''id, numero, cliente_nome, cliente_telefone, cliente_telefone_e164,
                  cliente_pais, agendamento_id, estado, observacoes, total, poupanca,
                  data_reserva, data_confirmado, data_libertado'''


def gerar_produto_reserva_id():
    return 'res_' + uuid.uuid4().hex[:12]


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


@app.route('/api/products/<produto_id>', methods=['PUT', 'PATCH'])
def atualizar_produto(produto_id):
    """Campos que o CRM gere: ativo, destaque, precoPromo, preco e stock.
    Enviar precoPromo: null tira o produto de promoção."""
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


if __name__ == '__main__':
    try:
        conn = get_db()
        print("✅ Conectado ao banco de dados com sucesso!")
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
    
    app.run(debug=True, port=int(os.getenv('APP_PORT', 8000)))