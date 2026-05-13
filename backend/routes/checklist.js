const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar tarefas da família por data
router.get('/:familia_id', async (req, res) => {
  const { data } = req.query;
  try {
    let query = 'SELECT * FROM checklist WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (data) {
      query += ' AND data = $2';
      params.push(data);
    }
    query += ' ORDER BY criado_em';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar tarefa
router.post('/', async (req, res) => {
  const { familia_id, membro_id, tarefa } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO checklist (familia_id, membro_id, tarefa) VALUES ($1,$2,$3) RETURNING *',
      [familia_id, membro_id, tarefa]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Atualizar status
router.put('/:id', async (req, res) => {
  const { concluida } = req.body;
  try {
    const result = await db.query(
      'UPDATE checklist SET concluida=$1 WHERE id=$2 RETURNING *',
      [concluida, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir tarefa
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM checklist WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
