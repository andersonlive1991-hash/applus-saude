const express = require('express');
const router = express.Router();
const db = require('../db');

// Salvar perfil do cuidador
router.post('/salvar', async (req, res) => {
  const { membro_id, cpf, data_nascimento, telefone, tipo_cuidador, experiencia, especialidades, turno, dias_disponiveis, observacoes } = req.body;
  try {
    await db.query(`
      INSERT INTO perfil_cuidador (membro_id, cpf, data_nascimento, telefone, tipo_cuidador, experiencia, especialidades, turno, dias_disponiveis, observacoes, atualizado_em)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      ON CONFLICT (membro_id) DO UPDATE SET
        cpf=$2, data_nascimento=$3, telefone=$4, tipo_cuidador=$5,
        experiencia=$6, especialidades=$7, turno=$8, dias_disponiveis=$9,
        observacoes=$10, atualizado_em=NOW()
    `, [membro_id, cpf, data_nascimento, telefone, tipo_cuidador, experiencia, especialidades, turno, dias_disponiveis, observacoes]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Buscar perfil do cuidador
router.get('/:membro_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM perfil_cuidador WHERE membro_id=$1', [req.params.membro_id]);
    res.json(r.rows[0] || {});
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
