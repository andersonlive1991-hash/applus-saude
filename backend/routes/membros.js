const express = require('express');
const router = express.Router();
const db = require('../db');

function gerarId(nome) {
  const letras = nome.substring(0,3).toUpperCase();
  const chars = Math.random().toString(36).substring(2,7).toUpperCase();
  return `${letras}-${chars}`;
}

// Criar membro
router.post('/', async (req, res) => {
  const { familia_id, nome, tipo, relacao } = req.body;
  const id_pessoal = gerarId(nome);
  try {
    const result = await db.query(
      'INSERT INTO membros (familia_id, nome, tipo, relacao, id_pessoal) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [familia_id, nome, tipo, relacao, id_pessoal]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Buscar membro por ID pessoal
router.get('/id/:id_pessoal', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT m.*, f.codigo as codigo_familia, f.nome as nome_familia FROM membros m JOIN familias f ON f.id = m.familia_id WHERE m.id_pessoal = $1',
      [req.params.id_pessoal]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Listar membros da família
router.get('/familia/:familia_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM membros WHERE familia_id = $1 ORDER BY nome',
      [req.params.familia_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});


router.put('/:id/foto', async (req, res) => {
  const { foto } = req.body;
  try {
    const result = await db.query(
      'UPDATE membros SET foto=$1 WHERE id=$2 RETURNING *',
      [foto, req.params.id]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;

// Excluir membro
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM membros WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});

const crypto = require('crypto');
function hashPin(pin, membro_id) {
  return crypto.createHash('sha256').update(String(pin) + String(membro_id)).digest('hex');
}
router.post('/pin/salvar', async (req, res) => {
  const { membro_id, pin } = req.body;
  if (!membro_id || !pin || String(pin).length !== 4) return res.status(400).json({ erro: 'PIN deve ter 4 digitos' });
  try {
    await db.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(64)').catch(()=>{});
    await db.query('UPDATE membros SET pin_hash=$1 WHERE id=$2', [hashPin(pin, membro_id), membro_id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});
router.post('/pin/verificar', async (req, res) => {
  const { membro_id, pin } = req.body;
  if (!membro_id || !pin) return res.json({ ok: false });
  try {
    const r = await db.query('SELECT pin_hash FROM membros WHERE id=$1', [membro_id]);
    if (!r.rows.length) return res.json({ ok: false });
    res.json({ ok: r.rows[0].pin_hash === hashPin(pin, membro_id) });
  } catch(e) { res.json({ ok: false }); }
});
router.post('/pin/remover', async (req, res) => {
  const { membro_id } = req.body;
  try {
    await db.query('UPDATE membros SET pin_hash=NULL WHERE id=$1', [membro_id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});
router.get('/pin/tem/:membro_id', async (req, res) => {
  try {
    await db.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(64)').catch(()=>{});
    const r = await db.query('SELECT pin_hash FROM membros WHERE id=$1', [req.params.membro_id]);
    res.json({ tem: r.rows.length > 0 && r.rows[0].pin_hash !== null });
  } catch(e) { res.json({ tem: false }); }
});

router.put('/:id/acesso', async (req, res) => {
  try {
    await db.query('UPDATE membros SET ultimo_acesso = NOW() WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});
