require('dotenv').config();
const db = require('./db');

async function setup() {
  console.log('Criando tabelas...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS familias (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        codigo VARCHAR(20) UNIQUE NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS membros (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        tipo VARCHAR(20) NOT NULL,
        relacao VARCHAR(50),
        id_pessoal VARCHAR(20) UNIQUE NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS medicamentos (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        dosagem VARCHAR(50),
        horarios JSONB,
        via VARCHAR(50),
        estoque INTEGER DEFAULT 0,
        validade DATE,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS historico_meds (
        id SERIAL PRIMARY KEY,
        med_id INTEGER REFERENCES medicamentos(id) ON DELETE CASCADE,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        motivo TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        titulo VARCHAR(200) NOT NULL,
        data DATE NOT NULL,
        hora TIME,
        tipo VARCHAR(50),
        local VARCHAR(200),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sinais_vitais (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        valor NUMERIC,
        valor2 NUMERIC,
        unidade VARCHAR(20),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vacinas (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        nome VARCHAR(100) NOT NULL,
        data DATE,
        doses_total INTEGER DEFAULT 1,
        doses_tomadas INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Pendente',
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS mensagens (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        autor VARCHAR(100) NOT NULL,
        autor_id VARCHAR(20),
        texto TEXT NOT NULL,
        categoria VARCHAR(50) DEFAULT 'Geral',
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        descricao VARCHAR(200) NOT NULL,
        valor NUMERIC(10,2) NOT NULL,
        categoria VARCHAR(50),
        responsavel VARCHAR(100),
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER UNIQUE REFERENCES membros(id) ON DELETE CASCADE,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        subscription JSONB NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS perfil_idoso (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER UNIQUE REFERENCES membros(id) ON DELETE CASCADE,
        data_nascimento DATE,
        tipo_sanguineo VARCHAR(5),
        alergias TEXT,
        cpf VARCHAR(20),
        rg VARCHAR(20),
        cartao_sus VARCHAR(30),
        convenio VARCHAR(100),
        contato_emergencia VARCHAR(100),
        tel_emergencia VARCHAR(20),
        observacoes TEXT,
        atualizado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS checklist (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        tarefa VARCHAR(200) NOT NULL,
        concluida BOOLEAN DEFAULT FALSE,
        data DATE DEFAULT CURRENT_DATE,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS escala (
        id SERIAL PRIMARY KEY,
        familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        dia_semana VARCHAR(20) NOT NULL,
        turno VARCHAR(20) NOT NULL,
        tarefas TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hidratacao (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
        quantidade_ml INTEGER NOT NULL,
        meta_ml INTEGER DEFAULT 2000,
        data DATE DEFAULT CURRENT_DATE,
        criado_em TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS perfil_cuidador (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER UNIQUE REFERENCES membros(id) ON DELETE CASCADE,
        cpf VARCHAR(20),
        data_nascimento DATE,
        telefone VARCHAR(20),
        tipo_cuidador VARCHAR(50),
        experiencia VARCHAR(50),
        especialidades TEXT,
        turno VARCHAR(50),
        dias_disponiveis TEXT,
        observacoes TEXT,
        atualizado_em TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Todas as tabelas criadas com sucesso!');
    process.exit(0);
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
}

setup();
