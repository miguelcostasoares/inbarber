from flask import Flask
from dotenv import load_dotenv
import mysql.connector
import os
import bcrypt

load_dotenv()

app = Flask(__name__)

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

if __name__ == '__main__':
    try:
        conn = get_db()
        print("✅ Conectado ao banco de dados com sucesso!")
        conn.close()
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
    
    app.run(debug=True, port=int(os.getenv('APP_PORT', 8000)))