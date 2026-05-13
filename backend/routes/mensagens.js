const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar mensagens da família
router.get('/:familia_id', async (req, res) => {
  const { categoria } = req.query;
  try {
    let query = 'SELECT * FROM mensagens WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (categoria) {
      query += ' AND categoria = $2';
      params.push(categoria);
    }
    query += ' ORDER BY criado_em DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows.reverse());
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Enviar mensagem
router.post('/', async (req, res) => {
  const { familia_id, autor, autor_id, texto, categoria } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO mensagens (familia_id, autor, autor_id, texto, categoria) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [familia_id, autor, autor_id, texto, categoria || 'Geral']
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir mensagem
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM mensagens WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
