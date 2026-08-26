from flask import Flask, jsonify, request
from dotenv import load_dotenv
import mysql.connector
import os
import bcrypt
import uuid
from datetime import datetime, timedelta
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

@app.route('/api/services', methods=['GET'])
def listar_servicos():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, nome AS name, preco AS price, duracao_min AS duration, cor AS color
               FROM servicos
               WHERE ativo = 1
               ORDER BY nome ASC'''
        )
        return jsonify(cursor.fetchall()), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar serviços: {e}'}), 500
    finally:
        cursor.close()
        conn.close()

# ═══════════════════════════════════════════════════════════
# BARBEIROS
# ═══════════════════════════════════════════════════════════

@app.route('/api/barbers', methods=['GET'])
def listar_barbeiros():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            '''SELECT id, nome AS name, avatar, avaliacao AS rating
               FROM barbeiros
               WHERE ativo = 1
               ORDER BY nome ASC'''
        )
        rows = cursor.fetchall()
        for row in rows:
            if row.get('rating') is not None:
                row['rating'] = float(row['rating'])
        return jsonify(rows), 200
    except Exception as e:
        return jsonify({'error': f'Erro ao listar barbeiros: {e}'}), 500
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

if __name__ == '__main__':
    try:
        conn = get_db()
        print("✅ Conectado ao banco de dados com sucesso!")
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
    
    app.run(debug=True, port=int(os.getenv('APP_PORT', 8000)))