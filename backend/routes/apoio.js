const express = require('express');
const router = express.Router();
const db = require('../db');

db.query(`
  CREATE TABLE IF NOT EXISTS mensagens_apoio (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    autor_nome VARCHAR(100),
    texto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log('Tabela mensagens_apoio:', e.message));

router.get('/:familia_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM mensagens_apoio WHERE familia_id=$1 ORDER BY criado_em DESC LIMIT 10',
      [req.params.familia_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/', async (req, res) => {
  const { familia_id, autor_nome, texto } = req.body;
  if (!familia_id || !texto) return res.status(400).json({ erro: 'Campos obrigatorios' });
  try {
    const r = await db.query(
      'INSERT INTO mensagens_apoio (familia_id, autor_nome, texto) VALUES ($1,$2,$3) RETURNING *',
      [familia_id, autor_nome || 'Anônimo', texto]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
