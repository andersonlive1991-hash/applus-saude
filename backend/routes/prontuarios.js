const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar prontuários de uma internação
router.get('/:internacao_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome_arquivo, tipo, criado_em FROM prontuarios WHERE internacao_id = $1 ORDER BY criado_em DESC',
      [req.params.internacao_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Salvar prontuário (base64)
router.post('/', async (req, res) => {
  const { internacao_id, membro_id, nome_arquivo, dados, tipo } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO prontuarios (internacao_id, membro_id, nome_arquivo, dados, tipo) VALUES ($1,$2,$3,$4,$5) RETURNING id, nome_arquivo, tipo, criado_em',
      [internacao_id, membro_id, nome_arquivo, dados, tipo]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Buscar imagem completa
router.get('/imagem/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT dados, tipo, nome_arquivo FROM prontuarios WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir prontuário
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM prontuarios WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
