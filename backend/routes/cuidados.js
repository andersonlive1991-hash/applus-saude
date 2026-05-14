const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar tabelas se não existirem
db.query(`
  CREATE TABLE IF NOT EXISTS cuidados_atividades (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    tipo VARCHAR(50), hora TIME, obs TEXT,
    cuidador_nome VARCHAR(100),
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cuidados_humor (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    humor VARCHAR(20), obs TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cuidados_refeicoes (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    tipo VARCHAR(50), quantidade VARCHAR(20), obs TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cuidados_hidratacao (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    copos INTEGER DEFAULT 0,
    data DATE DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cuidados_sono (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    inicio TIME, fim TIME, qualidade VARCHAR(20), obs TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS cuidados_intercorrencias (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    tipo VARCHAR(50), hora TIME, obs TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
`).then(() => console.log('✅ Tabelas cuidados OK')).catch(e => console.log('Cuidados:', e.message));

// ATIVIDADES
router.post('/atividade', async (req, res) => {
  const { familia_id, membro_id, tipo, hora, obs } = req.body;
  try {
    const mem = await db.query('SELECT nome FROM membros WHERE id=$1', [membro_id]);
    const nome = mem.rows[0]?.nome || '';
    await db.query('INSERT INTO cuidados_atividades (familia_id, membro_id, tipo, hora, obs, cuidador_nome) VALUES ($1,$2,$3,$4,$5,$6)',
      [familia_id, membro_id, tipo, hora || null, obs, nome]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/atividades/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM cuidados_atividades WHERE familia_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC', [req.params.familia_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// HUMOR
router.post('/humor', async (req, res) => {
  const { familia_id, membro_id, humor, obs } = req.body;
  try {
    await db.query('INSERT INTO cuidados_humor (familia_id, membro_id, humor, obs) VALUES ($1,$2,$3,$4)',
      [familia_id, membro_id, humor, obs]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/humor/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM cuidados_humor WHERE familia_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC', [req.params.familia_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// REFEIÇÕES
router.post('/refeicao', async (req, res) => {
  const { familia_id, membro_id, tipo, quantidade, obs } = req.body;
  try {
    await db.query('INSERT INTO cuidados_refeicoes (familia_id, membro_id, tipo, quantidade, obs) VALUES ($1,$2,$3,$4,$5)',
      [familia_id, membro_id, tipo, quantidade, obs]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/refeicoes/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM cuidados_refeicoes WHERE familia_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC', [req.params.familia_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// HIDRATAÇÃO
router.post('/hidratacao', async (req, res) => {
  const { familia_id, membro_id, copos } = req.body;
  try {
    const existe = await db.query('SELECT id, copos FROM cuidados_hidratacao WHERE familia_id=$1 AND membro_id=$2 AND data=CURRENT_DATE', [familia_id, membro_id]);
    if (existe.rows.length) {
      const novo = Math.max(0, (existe.rows[0].copos || 0) + copos);
      await db.query('UPDATE cuidados_hidratacao SET copos=$1 WHERE id=$2', [novo, existe.rows[0].id]);
    } else {
      await db.query('INSERT INTO cuidados_hidratacao (familia_id, membro_id, copos) VALUES ($1,$2,$3)', [familia_id, membro_id, Math.max(0, copos)]);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/hidratacao/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT COALESCE(SUM(copos),0) as total FROM cuidados_hidratacao WHERE familia_id=$1 AND data=CURRENT_DATE', [req.params.familia_id]);
    res.json({ total: r.rows[0].total });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// SONO
router.post('/sono', async (req, res) => {
  const { familia_id, membro_id, inicio, fim, qualidade, obs } = req.body;
  try {
    await db.query('INSERT INTO cuidados_sono (familia_id, membro_id, inicio, fim, qualidade, obs) VALUES ($1,$2,$3,$4,$5,$6)',
      [familia_id, membro_id, inicio || null, fim || null, qualidade, obs]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/sono/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM cuidados_sono WHERE familia_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC', [req.params.familia_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// INTERCORRÊNCIAS
router.post('/intercorrencia', async (req, res) => {
  const { familia_id, membro_id, tipo, hora, obs } = req.body;
  try {
    await db.query('INSERT INTO cuidados_intercorrencias (familia_id, membro_id, tipo, hora, obs) VALUES ($1,$2,$3,$4,$5)',
      [familia_id, membro_id, tipo, hora || null, obs]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/intercorrencias/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM cuidados_intercorrencias WHERE familia_id=$1 ORDER BY criado_em DESC LIMIT 20', [req.params.familia_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
