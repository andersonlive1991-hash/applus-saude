const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar sinais de um membro
router.get('/:membro_id', async (req, res) => {
  const { tipo } = req.query;
  try {
    let query = 'SELECT * FROM sinais_vitais WHERE membro_id = $1';
    const params = [req.params.membro_id];
    if (tipo) {
      query += ' AND tipo = $2';
      params.push(tipo);
    }
    query += ' ORDER BY criado_em DESC LIMIT 50';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Registrar sinal vital
router.post('/', async (req, res) => {
  const { membro_id, tipo, valor, valor2, unidade, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO sinais_vitais (membro_id, tipo, valor, valor2, unidade, observacoes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, tipo, valor, valor2, unidade, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir sinal
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sinais_vitais WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
