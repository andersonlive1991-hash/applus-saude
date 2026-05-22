const express = require('express');
const router = express.Router();
const db = require('../db');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:contato@applus.saude', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

db.query(`
  CREATE TABLE IF NOT EXISTS passagem_plantao (
    id SERIAL PRIMARY KEY,
    familia_id INTEGER REFERENCES familias(id) ON DELETE CASCADE,
    cuidador_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    cuidador_nome VARCHAR(100),
    turno VARCHAR(50),
    resumo TEXT,
    intercorrencias TEXT,
    humor VARCHAR(20),
    medicamentos_ok BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log('Tabela passagem_plantao:', e.message));

// Listar passagens da familia (ultimas 5)
router.get('/:familia_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM passagem_plantao WHERE familia_id=$1 ORDER BY criado_em DESC LIMIT 5',
      [req.params.familia_id]
    );
    res.json(result.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Registrar passagem
router.post('/', async (req, res) => {
  const { familia_id, cuidador_id, cuidador_nome, turno, resumo, intercorrencias, humor, medicamentos_ok } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO passagem_plantao (familia_id, cuidador_id, cuidador_nome, turno, resumo, intercorrencias, humor, medicamentos_ok) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [familia_id, cuidador_id, cuidador_nome, turno, resumo, intercorrencias, humor, medicamentos_ok]
    );
    // Notificar familia
    try {
      const subs = await db.query(
        'SELECT subscription FROM push_subscriptions WHERE familia_id=$1 AND membro_id!=$2',
        [familia_id, cuidador_id]
      );
      const payload = JSON.stringify({
        titulo: '🔄 Passagem de plantão',
        corpo: (cuidador_nome || 'Cuidador') + ' registrou a passagem do turno ' + (turno || ''),
        url: '/#cuidados'
      });
      for (const row of subs.rows) {
        const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
        webpush.sendNotification(sub, payload).catch(() => {});
      }
    } catch(ep) {}
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
