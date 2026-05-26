const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/backend/server.js';
let c = fs.readFileSync(path, 'utf8');

const novasTabelas = `
      CREATE TABLE IF NOT EXISTS doencas (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id TEXT,
        nome TEXT,
        cid TEXT,
        data_diagnostico DATE,
        status TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS tratamentos (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id TEXT,
        doenca_id INTEGER,
        nome TEXT,
        tipo TEXT,
        inicio DATE,
        fim DATE,
        status TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS internacoes (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        familia_id TEXT,
        hospital TEXT,
        motivo TEXT,
        data_entrada DATE,
        data_saida DATE,
        medico TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      );`;

// Adicionar após a tabela de exames
c = c.replace(
  `CREATE TABLE IF NOT EXISTS exames (`,
  novasTabelas + `
      CREATE TABLE IF NOT EXISTS exames (`
);

fs.writeFileSync(path, c);
console.log('✅ Tabelas doencas, tratamentos e internacoes adicionadas ao auto-migration!');
