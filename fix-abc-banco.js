const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/backend/server.js';
let c = fs.readFileSync(path, 'utf8');

// Adicionar colunas ABC na tabela
c = c.replace(
  `tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(200) NOT NULL,
        data TIMESTAMP DEFAULT NOW()
      )`,
  `tipo VARCHAR(20) NOT NULL,
        descricao VARCHAR(200) NOT NULL,
        abc_antecedente TEXT,
        abc_consequencia TEXT,
        intensidade INTEGER DEFAULT 3,
        duracao VARCHAR(20),
        data TIMESTAMP DEFAULT NOW()
      )`
);

// Adicionar ALTER TABLE para banco já existente
c = c.replace(
  `await db.query(\`

      CREATE TABLE IF NOT EXISTS doencas (`,
  `await db.query('ALTER TABLE comportamentos_tea ADD COLUMN IF NOT EXISTS abc_antecedente TEXT').catch(() => {});
    await db.query('ALTER TABLE comportamentos_tea ADD COLUMN IF NOT EXISTS abc_consequencia TEXT').catch(() => {});
    await db.query('ALTER TABLE comportamentos_tea ADD COLUMN IF NOT EXISTS intensidade INTEGER DEFAULT 3').catch(() => {});
    await db.query('ALTER TABLE comportamentos_tea ADD COLUMN IF NOT EXISTS duracao VARCHAR(20)').catch(() => {});
    await db.query(\`

      CREATE TABLE IF NOT EXISTS doencas (`
);

fs.writeFileSync(path, c);
console.log('✅ Colunas ABC adicionadas!');
