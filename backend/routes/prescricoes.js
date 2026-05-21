const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabela se não existir
db.query(`
  CREATE TABLE IF NOT EXISTS prescricoes (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER REFERENCES membros(id),
    medico_nome VARCHAR(200),
    medico_crm VARCHAR(50),
    medicamentos TEXT,
    orientacoes TEXT,
    validade DATE,
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log('Erro criar tabela prescricoes:', e.message));

// Listar prescrições do paciente
router.get('/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM prescricoes WHERE membro_id = $1 ORDER BY criado_em DESC',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar prescrição
router.post('/', async (req, res) => {
  const { membro_id, medico_nome, medico_crm, medicamentos, orientacoes, validade } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO prescricoes (membro_id, medico_nome, medico_crm, medicamentos, orientacoes, validade) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, medico_nome, medico_crm, medicamentos, orientacoes, validade || null]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir prescrição
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM prescricoes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
