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

// Buscar evento por ID
router.get('/detalhe/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM eventos WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ erro: 'Evento nao encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar evento
router.post('/', async (req, res) => {
  const { familia_id, membro_id, titulo, data, hora, tipo, local, observacoes, nome_medico, especialidade, pediu_exame, foto_exame, gerou_receita, data_retorno } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO eventos (familia_id, membro_id, titulo, data, hora, tipo, local, observacoes, nome_medico, especialidade, pediu_exame, foto_exame, gerou_receita, data_retorno) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [familia_id, membro_id, titulo, data, hora || null, tipo, local, observacoes, nome_medico, especialidade, pediu_exame || false, foto_exame || null, gerou_receita || false, data_retorno || null]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Editar evento
router.put('/:id', async (req, res) => {
  const { titulo, data, hora, tipo, local, observacoes, nome_medico, especialidade, pediu_exame, foto_exame, gerou_receita, data_retorno, resumo_gemini } = req.body;
  try {
    const result = await db.query(
      'UPDATE eventos SET titulo=$1, data=$2, hora=$3, tipo=$4, local=$5, observacoes=$6, nome_medico=$7, especialidade=$8, pediu_exame=$9, foto_exame=$10, gerou_receita=$11, data_retorno=$12, resumo_gemini=$13, atualizado_em=NOW() WHERE id=$14 RETURNING *',
      [titulo, data, hora, tipo, local, observacoes, nome_medico, especialidade, pediu_exame || false, foto_exame || null, gerou_receita || false, data_retorno || null, resumo_gemini || null, req.params.id]
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
