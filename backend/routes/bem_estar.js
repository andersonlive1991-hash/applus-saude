const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabela se não existir
db.query(`
  CREATE TABLE IF NOT EXISTS bem_estar_cuidador (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER,
    familia_id INTEGER,
    humor INTEGER,
    estresse INTEGER,
    sono NUMERIC(4,1),
    tempo_proprio BOOLEAN,
    anotacao TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).then(() => console.log('Tabela bem_estar_cuidador OK')).catch(e => console.log('Erro bem_estar:', e.message));

// Salvar registro
router.post('/', async (req, res) => {
  const { membro_id, familia_id, humor, estresse, sono, tempo_proprio, anotacao } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO bem_estar_cuidador (membro_id, familia_id, humor, estresse, sono, tempo_proprio, anotacao) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [membro_id, familia_id, humor, estresse, sono || null, tempo_proprio, anotacao || null]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Buscar histórico
router.get('/:membro_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM bem_estar_cuidador WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 7',
      [req.params.membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
