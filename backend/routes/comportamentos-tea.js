const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/', async (req, res) => {
  const { membro_id, familia_id, tipo, descricao, abc_antecedente, abc_consequencia, intensidade, duracao } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO comportamentos_tea (membro_id, familia_id, tipo, descricao, abc_antecedente, abc_consequencia, intensidade, duracao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [membro_id, familia_id, tipo, descricao, abc_antecedente || null, abc_consequencia || null, intensidade || 3, duracao || null]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/:membro_id', async (req, res) => {
  const { dias } = req.query;
  try {
    let query = 'SELECT * FROM comportamentos_tea WHERE membro_id = $1';
    const params = [req.params.membro_id];
    if (dias) {
      query += ` AND data >= NOW() - INTERVAL '${parseInt(dias)} days'`;
    }
    query += ' ORDER BY data DESC LIMIT 50';
    const r = await db.query(query, params);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
