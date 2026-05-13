const express = require('express');
const router = express.Router();
const db = require('../db');

// Criar família
router.post('/', async (req, res) => {
  const { nome } = req.body;
  const codigo = nome.substring(0,4).toUpperCase() + Math.floor(1000+Math.random()*9000);
  try {
    const result = await db.query(
      'INSERT INTO familias (nome, codigo) VALUES ($1, $2) RETURNING *',
      [nome, codigo]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Buscar família por código
router.get('/:codigo', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM familias WHERE codigo = $1',
      [req.params.codigo]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Família não encontrada' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
