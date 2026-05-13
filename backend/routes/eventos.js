const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar eventos filtrado por membro
router.get('/:familia_id', async (req, res) => {
  const { membro_id } = req.query;
  try {
    let query = 'SELECT * FROM eventos WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (membro_id) {
      query += ' AND membro_id = $2';
      params.push(membro_id);
    }
    query += ' ORDER BY data, hora';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar evento
router.post('/', async (req, res) => {
  const { familia_id, membro_id, titulo, data, hora, tipo, local, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO eventos (familia_id, membro_id, titulo, data, hora, tipo, local, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [familia_id, membro_id, titulo, data, hora, tipo, local, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir evento
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM eventos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
