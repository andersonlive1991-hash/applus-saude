const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabela de log se não existir
db.query(`
  CREATE TABLE IF NOT EXISTS medicos_acessos (
    id SERIAL PRIMARY KEY,
    medico_nome TEXT,
    medico_crm TEXT,
    especialidade TEXT,
    paciente_id TEXT,
    data_acesso TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log('Log medicos:', e.message));

// Registrar acesso
router.post('/log-acesso', async (req, res) => {
  const { medico_nome, medico_crm, especialidade, paciente_id, data_acesso } = req.body;
  try {
    await db.query(
      'INSERT INTO medicos_acessos (medico_nome, medico_crm, especialidade, paciente_id, data_acesso) VALUES ($1,$2,$3,$4,$5)',
      [medico_nome, medico_crm, especialidade, paciente_id, data_acesso || new Date()]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Listar acessos de um paciente
router.get('/log-acesso/:paciente_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM medicos_acessos WHERE paciente_id=$1 ORDER BY data_acesso DESC LIMIT 20',
      [req.params.paciente_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
