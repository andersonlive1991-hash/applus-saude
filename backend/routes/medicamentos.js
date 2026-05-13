const express = require('express');
const router = express.Router();
const db = require('../db');

// Confirmar dose (rota fixa — deve vir antes de /:familia_id)
router.post('/historico', async (req, res) => {
  const { med_id, status, motivo, membro_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO historico_meds (med_id, status, motivo, membro_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [med_id, status, motivo, membro_id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Histórico de um medicamento (rota fixa — deve vir antes de /:familia_id)
router.get('/historico/:med_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM historico_meds WHERE med_id = $1 ORDER BY criado_em DESC LIMIT 30',
      [req.params.med_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Listar medicamentos da família filtrado por membro
router.get('/:familia_id', async (req, res) => {
  const { membro_id } = req.query;
  try {
    let query = 'SELECT * FROM medicamentos WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (membro_id) {
      query += ' AND membro_id = $2';
      params.push(membro_id);
    }
    query += ' ORDER BY nome';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Cadastrar medicamento
router.post('/', async (req, res) => {
  const { familia_id, membro_id, nome, dosagem, horarios, via, estoque, validade, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO medicamentos (familia_id, membro_id, nome, dosagem, horarios, via, estoque, validade, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [familia_id, membro_id, nome, dosagem, JSON.stringify(horarios), via, estoque, validade, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir medicamento
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM medicamentos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
