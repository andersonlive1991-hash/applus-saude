const express = require('express');
const router = express.Router();
const db = require('../db');
const webpush = require('web-push');

// Configurar VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@applus.saude',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Salvar inscrição push
router.post('/inscrever', async (req, res) => {
  const { membro_id, familia_id, subscription } = req.body;
  console.log("[Push] Recebido:", membro_id, familia_id, subscription ? "sub ok" : "sem sub");
  try {
    await db.query(
      'INSERT INTO push_subscriptions (membro_id, familia_id, subscription) VALUES ($1,$2,$3) ON CONFLICT (membro_id) DO UPDATE SET subscription = $3',
      [membro_id, familia_id, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Enviar push para toda a família
router.post('/enviar-familia', async (req, res) => {
  const { familia_id, titulo, corpo, url } = req.body;
  try {
    const result = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE familia_id = $1',
      [familia_id]
    );
    const payload = JSON.stringify({ titulo, corpo, url: url || '/' });
    const envios = result.rows.map(row => {
      const sub = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : row.subscription;
      return webpush.sendNotification(sub, payload).catch(() => null);
    });
    await Promise.all(envios);
    res.json({ ok: true, enviados: envios.length });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Enviar push para um membro
router.post('/enviar-membro', async (req, res) => {
  const { membro_id, titulo, corpo, url } = req.body;
  try {
    const result = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE membro_id = $1',
      [membro_id]
    );
    if (!result.rows.length) return res.json({ ok: false, erro: 'Sem inscrição' });
    const sub = typeof result.rows[0].subscription === 'string'
      ? JSON.parse(result.rows[0].subscription)
      : result.rows[0].subscription;
    const payload = JSON.stringify({ titulo, corpo, url: url || '/' });
    await webpush.sendNotification(sub, payload);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Retornar chave pública VAPID configurada no servidor
router.get('/gerar-vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});


module.exports = router;
