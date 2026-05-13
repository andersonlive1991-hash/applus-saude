const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar gastos da família
router.get('/:familia_id', async (req, res) => {
  const { mes, ano } = req.query;
  try {
    let query = 'SELECT * FROM gastos WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (mes && ano) {
      query += ' AND EXTRACT(MONTH FROM criado_em) = $2 AND EXTRACT(YEAR FROM criado_em) = $3';
      params.push(mes, ano);
    }
    query += ' ORDER BY criado_em DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Registrar gasto
router.post('/', async (req, res) => {
  const { familia_id, descricao, valor, categoria, responsavel } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO gastos (familia_id, descricao, valor, categoria, responsavel) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [familia_id, descricao, valor, categoria, responsavel]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Total por categoria
router.get('/:familia_id/resumo', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT categoria, SUM(valor) as total FROM gastos WHERE familia_id = $1 GROUP BY categoria ORDER BY total DESC',
      [req.params.familia_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir gasto
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM gastos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
