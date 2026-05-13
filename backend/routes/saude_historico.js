const express = require('express');
const router = express.Router();
const db = require('../db');

// ── DOENÇAS ──
router.get('/doencas/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM doencas WHERE membro_id = $1 ORDER BY criado_em DESC',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/doencas', async (req, res) => {
  const { membro_id, nome, cid, data_diagnostico, status, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO doencas (membro_id, nome, cid, data_diagnostico, status, observacoes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, nome, cid, data_diagnostico, status, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/doencas/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM doencas WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── TRATAMENTOS ──
router.get('/tratamentos/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, d.nome as doenca_nome 
       FROM tratamentos t 
       LEFT JOIN doencas d ON d.id = t.doenca_id 
       WHERE t.membro_id = $1 
       ORDER BY t.criado_em DESC`,
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/tratamentos', async (req, res) => {
  const { membro_id, doenca_id, tipo, descricao, data_inicio, data_fim, status, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO tratamentos (membro_id, doenca_id, tipo, descricao, data_inicio, data_fim, status, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [membro_id, doenca_id, tipo, descricao, data_inicio, data_fim, status, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/tratamentos/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tratamentos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ── INTERNAÇÕES ──
router.get('/internacoes/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM internacoes WHERE membro_id = $1 ORDER BY data_entrada DESC',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/internacoes', async (req, res) => {
  const { membro_id, hospital, motivo, data_entrada, data_saida, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO internacoes (membro_id, hospital, motivo, data_entrada, data_saida, observacoes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, hospital, motivo, data_entrada, data_saida, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/internacoes/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM internacoes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
