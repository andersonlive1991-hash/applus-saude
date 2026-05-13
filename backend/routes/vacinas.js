const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar vacinas de um membro
router.get('/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM vacinas WHERE membro_id = $1 ORDER BY data DESC',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Cadastrar vacina
router.post('/', async (req, res) => {
  const { membro_id, nome, data, doses_total, doses_tomadas, status, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO vacinas (membro_id, nome, data, doses_total, doses_tomadas, status, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [membro_id, nome, data, doses_total, doses_tomadas, status, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Atualizar vacina
router.put('/:id', async (req, res) => {
  const { doses_tomadas, status, observacoes } = req.body;
  try {
    const result = await db.query(
      'UPDATE vacinas SET doses_tomadas=$1, status=$2, observacoes=$3 WHERE id=$4 RETURNING *',
      [doses_tomadas, status, observacoes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir vacina
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM vacinas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
