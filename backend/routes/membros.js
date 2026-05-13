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

module.exports = router;
