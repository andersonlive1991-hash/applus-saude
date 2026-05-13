const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar escala da família
router.get('/:familia_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, m.nome as membro_nome 
       FROM escala e 
       LEFT JOIN membros m ON m.id = e.membro_id 
       WHERE e.familia_id = $1 
       ORDER BY 
         CASE dia_semana 
           WHEN 'Segunda' THEN 1 WHEN 'Terça' THEN 2 WHEN 'Quarta' THEN 3
           WHEN 'Quinta' THEN 4 WHEN 'Sexta' THEN 5 WHEN 'Sábado' THEN 6
           WHEN 'Domingo' THEN 7 END,
         CASE turno WHEN 'Manhã' THEN 1 WHEN 'Tarde' THEN 2 WHEN 'Noite' THEN 3 END`,
      [req.params.familia_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar turno
router.post('/', async (req, res) => {
  const { familia_id, membro_id, dia_semana, turno, tarefas } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO escala (familia_id, membro_id, dia_semana, turno, tarefas) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [familia_id, membro_id, dia_semana, turno, tarefas]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir turno
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM escala WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
