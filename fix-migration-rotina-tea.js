const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/backend/server.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `CREATE TABLE IF NOT EXISTS exames (`,
  `CREATE TABLE IF NOT EXISTS rotina_tea (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id INTEGER,
        atividade TEXT NOT NULL,
        emoji TEXT DEFAULT '📌',
        hora TIME,
        ordem INTEGER DEFAULT 0,
        concluida BOOLEAN DEFAULT FALSE,
        data DATE DEFAULT CURRENT_DATE,
        criado_em TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS crises_tea (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id INTEGER,
        descricao TEXT,
        intensidade INTEGER,
        criado_em TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS historico_tea (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id INTEGER,
        emoji TEXT,
        frase TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS exames (`
);

fs.writeFileSync(path, c);
console.log('✅ Tabelas rotina_tea, crises_tea e historico_tea adicionadas!');
