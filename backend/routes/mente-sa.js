const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabelas
async function inicializar() {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS ms_humor (
      id SERIAL PRIMARY KEY,
      membro_id INTEGER,
      familia_id INTEGER,
      humor VARCHAR(20),
      valor INTEGER,
      obs TEXT,
      data DATE DEFAULT CURRENT_DATE,
      criado_em TIMESTAMP DEFAULT NOW()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS ms_diario (
      id SERIAL PRIMARY KEY,
      membro_id INTEGER,
      familia_id INTEGER,
      bom TEXT,
      dificil TEXT,
      sentimento TEXT,
      criado_em TIMESTAMP DEFAULT NOW()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS ms_rotinas (
      id SERIAL PRIMARY KEY,
      membro_id INTEGER,
      familia_id INTEGER,
      titulo VARCHAR(200),
      descricao TEXT,
      tipo VARCHAR(50),
      frequencia VARCHAR(50),
      horario VARCHAR(10),
      especialista VARCHAR(100),
      concluido BOOLEAN DEFAULT FALSE,
      data_conclusao DATE,
      criado_em TIMESTAMP DEFAULT NOW()
    )`);
    console.log('Tabelas Mente Sa OK');
  } catch(e) { console.log('Erro Mente Sa:', e.message); }
}
inicializar();

// ── HUMOR ──
router.post('/humor', async (req, res) => {
  const { membro_id, familia_id, humor, valor, obs } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO ms_humor (membro_id, familia_id, humor, valor, obs) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [membro_id, familia_id, humor, valor, obs]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/humor/:membro_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM ms_humor WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 30',
      [req.params.membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── DIÁRIO ──
router.post('/diario', async (req, res) => {
  const { membro_id, familia_id, bom, dificil, sentimento } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO ms_diario (membro_id, familia_id, bom, dificil, sentimento) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [membro_id, familia_id, bom, dificil, sentimento]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/diario/:membro_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM ms_diario WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 20',
      [req.params.membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── ROTINAS ──
router.post('/rotinas', async (req, res) => {
  const { membro_id, familia_id, titulo, descricao, tipo, frequencia, horario, especialista } = req.body;
  try {
    const r = await db.query(
      'INSERT INTO ms_rotinas (membro_id, familia_id, titulo, descricao, tipo, frequencia, horario, especialista) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [membro_id, familia_id, titulo, descricao, tipo, frequencia, horario, especialista]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/rotinas/:membro_id', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM ms_rotinas WHERE membro_id=$1 ORDER BY criado_em DESC',
      [req.params.membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/rotinas/:id', async (req, res) => {
  const { concluido } = req.body;
  try {
    await db.query(
      'UPDATE ms_rotinas SET concluido=$1, data_conclusao=CASE WHEN $1 THEN CURRENT_DATE ELSE NULL END WHERE id=$2',
      [concluido, req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
