const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrar() {
  const colunas = [
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS nome_medico VARCHAR(200)',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS especialidade VARCHAR(100)',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS pediu_exame BOOLEAN DEFAULT FALSE',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS foto_exame TEXT',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS gerou_receita BOOLEAN DEFAULT FALSE',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS data_retorno DATE',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS resumo_gemini TEXT',
    'ALTER TABLE eventos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT NOW()'
  ];

  for (const sql of colunas) {
    try {
      await pool.query(sql);
      console.log('OK: ' + sql.substring(0, 60));
    } catch(e) {
      console.log('ERRO: ' + e.message);
    }
  }
  await pool.end();
  console.log('MIGRACAO CONCLUIDA!');
}

migrar();
