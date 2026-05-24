const express = require('express');
const router = express.Router();
const db = require('../db');
const { chamarGemini } = require('../gemini');

// ── Criar tabelas ──
db.query(`
  CREATE TABLE IF NOT EXISTS baba_registros (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    baba_membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    bebe_nome VARCHAR(100),
    tipo VARCHAR(50) NOT NULL,
    detalhe TEXT,
    quantidade VARCHAR(50),
    humor VARCHAR(50),
    foto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS baba_checkins (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    baba_membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    checkin_em TIMESTAMP DEFAULT NOW(),
    checkout_em TIMESTAMP,
    gps_checkin TEXT,
    gps_checkout TEXT
  );
  CREATE TABLE IF NOT EXISTS baba_instrucoes (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER UNIQUE REFERENCES familias(id) ON DELETE CASCADE,
    texto TEXT,
    atualizado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS baba_marcos (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    foto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS baba_avaliacoes (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    baba_membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    estrelas INTEGER CHECK (estrelas BETWEEN 1 AND 5),
    comentario TEXT,
    data DATE DEFAULT CURRENT_DATE,
    criado_em TIMESTAMP DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS baba_estoque (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    item VARCHAR(100) NOT NULL,
    quantidade INTEGER DEFAULT 0,
    alerta_em INTEGER DEFAULT 5,
    atualizado_em TIMESTAMP DEFAULT NOW()
  );
`).then(() => console.log('✅ Tabelas babá OK')).catch(e => console.log('Tabelas babá:', e.message));

// ── Registros do dia ──
router.post('/registros', async (req, res) => {
  const { familia_id, baba_membro_id, bebe_nome, tipo, detalhe, quantidade, humor, foto } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_registros (familia_id, baba_membro_id, bebe_nome, tipo, detalhe, quantidade, humor, foto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [familia_id, baba_membro_id, bebe_nome, tipo, detalhe, quantidade, humor, foto]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/registros/:familia_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM baba_registros
       WHERE familia_id=$1 AND DATE(criado_em AT TIME ZONE 'America/Sao_Paulo')=CURRENT_DATE
       ORDER BY criado_em DESC`,
      [req.params.familia_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Check-in / Check-out ──
router.post('/checkin', async (req, res) => {
  const { familia_id, baba_membro_id, gps } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_checkins (familia_id, baba_membro_id, gps_checkin)
       VALUES ($1,$2,$3) RETURNING *`,
      [familia_id, baba_membro_id, gps]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/checkout/:id', async (req, res) => {
  const { gps } = req.body;
  try {
    const r = await db.query(
      `UPDATE baba_checkins SET checkout_em=NOW(), gps_checkout=$1
       WHERE id=$2 RETURNING *`,
      [gps, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/checkin-ativo/:familia_id/:baba_membro_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM baba_checkins
       WHERE familia_id=$1 AND baba_membro_id=$2 AND checkout_em IS NULL
       ORDER BY checkin_em DESC LIMIT 1`,
      [req.params.familia_id, req.params.baba_membro_id]
    );
    res.json(r.rows[0] || null);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Instruções da família ──
router.get('/instrucoes/:familia_id', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM baba_instrucoes WHERE familia_id=$1', [req.params.familia_id]);
    res.json(r.rows[0] || { texto: '' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/instrucoes', async (req, res) => {
  const { familia_id, texto } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_instrucoes (familia_id, texto)
       VALUES ($1,$2)
       ON CONFLICT (familia_id) DO UPDATE SET texto=$2, atualizado_em=NOW()
       RETURNING *`,
      [familia_id, texto]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Marcos ──
router.post('/marcos', async (req, res) => {
  const { familia_id, descricao, foto } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_marcos (familia_id, descricao, foto) VALUES ($1,$2,$3) RETURNING *`,
      [familia_id, descricao, foto]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/marcos/:familia_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM baba_marcos WHERE familia_id=$1 ORDER BY criado_em DESC LIMIT 20`,
      [req.params.familia_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Avaliações ──
router.post('/avaliacoes', async (req, res) => {
  const { familia_id, baba_membro_id, estrelas, comentario } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_avaliacoes (familia_id, baba_membro_id, estrelas, comentario)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [familia_id, baba_membro_id, estrelas, comentario]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.get('/avaliacoes/:baba_membro_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT *, TO_CHAR(data,'DD/MM/YYYY') as data_fmt
       FROM baba_avaliacoes WHERE baba_membro_id=$1 ORDER BY criado_em DESC`,
      [req.params.baba_membro_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Estoque ──
router.get('/estoque/:familia_id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT * FROM baba_estoque WHERE familia_id=$1 ORDER BY item`,
      [req.params.familia_id]
    );
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.post('/estoque', async (req, res) => {
  const { familia_id, item, quantidade, alerta_em } = req.body;
  try {
    const r = await db.query(
      `INSERT INTO baba_estoque (familia_id, item, quantidade, alerta_em)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING RETURNING *`,
      [familia_id, item, quantidade || 10, alerta_em || 5]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

router.put('/estoque/:id', async (req, res) => {
  const { quantidade } = req.body;
  try {
    const r = await db.query(
      `UPDATE baba_estoque SET quantidade=$1, atualizado_em=NOW() WHERE id=$2 RETURNING *`,
      [quantidade, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// ── Previsão IA (próxima mamada / sono) ──
router.get('/previsao/:familia_id', async (req, res) => {
  try {
    const registros = await db.query(
      `SELECT tipo, quantidade, criado_em FROM baba_registros
       WHERE familia_id=$1 AND DATE(criado_em AT TIME ZONE 'America/Sao_Paulo')=CURRENT_DATE
       AND tipo IN ('mamada','sono') ORDER BY criado_em ASC`,
      [req.params.familia_id]
    );
    if (registros.rows.length < 2) return res.json({ previsao: null });

    const prompt = `Voce e um assistente de saude infantil. Com base nos registros de hoje do bebe, calcule a previsao da proxima mamada e do proximo sono. Registros: ${JSON.stringify(registros.rows.map(r => ({ tipo: r.tipo, hora: new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), qtd: r.quantidade })))}. Responda APENAS com JSON no formato: {"proxima_mamada":"HH:MM","proximo_sono":"HH:MM","dica":"frase curta de ate 10 palavras"}`;

    const texto = await chamarGemini(prompt);
    const json = JSON.parse(texto.replace(/```json|```/g, '').trim());
    res.json({ previsao: json });
  } catch(e) { res.json({ previsao: null }); }
});

module.exports = router;
