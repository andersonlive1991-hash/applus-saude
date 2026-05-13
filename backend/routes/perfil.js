const express = require('express');
const router = express.Router();
const db = require('../db');

// Buscar perfil
router.get('/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM perfil_idoso WHERE membro_id = $1',
      [req.params.membro_id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Perfil não encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar ou atualizar perfil
router.post('/', async (req, res) => {
  const {
    membro_id, nome_completo, data_nascimento, tipo_sanguineo,
    alergias, cpf, cartao_sus, convenio,
    contato_emergencia, tel_emergencia
  } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO perfil_idoso 
        (membro_id, nome_completo, data_nascimento, tipo_sanguineo, alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (membro_id) DO UPDATE SET
        nome_completo=$2, data_nascimento=$3, tipo_sanguineo=$4,
        alergias=$5, cpf=$6, cartao_sus=$7, convenio=$8,
        contato_emergencia=$9, tel_emergencia=$10,
        atualizado_em=NOW()
       RETURNING *`,
      [membro_id, nome_completo, data_nascimento, tipo_sanguineo,
       alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
