const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar exames do membro
router.get('/:membro_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM exames WHERE membro_id = $1 ORDER BY data_exame DESC, criado_em DESC',
      [req.params.membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Salvar exame
router.post('/', async (req, res) => {
  const { membro_id, familia_id, titulo, tipo, data_exame, laboratorio, medico_solicitante, resultados, observacoes, pdf_url, fonte } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO exames (membro_id, familia_id, titulo, tipo, data_exame, laboratorio, medico_solicitante, resultados, observacoes, pdf_url, fonte)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [membro_id, familia_id, titulo, tipo, data_exame, laboratorio, medico_solicitante, JSON.stringify(resultados||[]), observacoes, pdf_url, fonte||'manual']
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Excluir exame
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM exames WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
