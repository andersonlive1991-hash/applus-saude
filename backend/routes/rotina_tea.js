const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar rotina do dia
router.get('/:membro_id', async (req, res) => {
  const { data } = req.query;
  try {
    let query = 'SELECT * FROM rotina_tea WHERE membro_id = $1';
    const params = [req.params.membro_id];
    if (data) {
      query += ' AND data = $2';
      params.push(data);
    }
    query += ' ORDER BY ordem, hora';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar atividade
router.post('/', async (req, res) => {
  const { membro_id, atividade, emoji, hora, ordem, data } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO rotina_tea (membro_id, atividade, emoji, hora, ordem, data) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, atividade, emoji || '📌', hora, ordem || 0, data || new Date().toISOString().split('T')[0]]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Marcar como concluída
router.put('/:id', async (req, res) => {
  const { concluida } = req.body;
  try {
    const result = await db.query(
      'UPDATE rotina_tea SET concluida=$1 WHERE id=$2 RETURNING *',
      [concluida, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir atividade
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM rotina_tea WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Resetar rotina do dia (nova cópia para hoje)
router.post('/resetar/:membro_id', async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    await db.query(
      'UPDATE rotina_tea SET concluida=FALSE, data=$1 WHERE membro_id=$2 AND data=$1',
      [hoje, req.params.membro_id]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;

// ── CRISES ──
router.get('/crises/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM crises_tea WHERE membro_id = $1 ORDER BY criado_em DESC LIMIT 20',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/crises', async (req, res) => {
  const { membro_id, data_hora, duracao_min, gatilho, ajudou, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO crises_tea (membro_id, data_hora, duracao_min, gatilho, ajudou, observacoes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, data_hora, duracao_min, gatilho, ajudou, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.delete('/crises/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM crises_tea WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});
