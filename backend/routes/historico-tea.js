const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabela se não existir
db.query(`CREATE TABLE IF NOT EXISTS historico_comunicacao_tea (
  id SERIAL PRIMARY KEY,
  membro_id INTEGER,
  familia_id INTEGER,
  emoji TEXT,
  frase TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
)`).catch(() => {});

// Registrar comunicação
router.post('/', async (req, res) => {
  const { membro_id, familia_id, emoji, frase } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO historico_comunicacao_tea (membro_id, familia_id, emoji, frase) VALUES ($1,$2,$3,$4) RETURNING *',
      [membro_id, familia_id, emoji, frase]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Listar histórico por membro e data
router.get('/:membro_id', async (req, res) => {
  const { data } = req.query;
  try {
    let query = 'SELECT * FROM historico_comunicacao_tea WHERE membro_id = $1';
    const params = [req.params.membro_id];
    if (data) {
      query += ' AND DATE(criado_em AT TIME ZONE \'America/Sao_Paulo\') = $2';
      params.push(data);
    }
    query += ' ORDER BY criado_em DESC LIMIT 50';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
