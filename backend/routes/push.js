const express = require('express');
const router = express.Router();
const db = require('../db');
const webpush = require('web-push');
const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: process.env.FIREBASE_CREDENTIALS
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
      : admin.credential.cert(path.join(__dirname, '../firebase-credentials.json'))
  });
}

// VAPID para Firefox/Mozilla
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@applus.saude',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function enviarPushParaSub(sub, titulo, corpo, url, extras) {
  const endpoint = sub.endpoint || '';
  const payload = { titulo, corpo, url: url || '/', ...extras };

  if (endpoint.includes('fcm.googleapis.com')) {
    // FCM v1 via Firebase Admin
    const token = endpoint.split('/').pop();
    try {
      await admin.messaging().send({
        token,
        notification: { title: titulo, body: corpo },
        data: Object.fromEntries(Object.entries(payload).map(([k,v]) => [k, String(v)])),
        webpush: {
          notification: { title: titulo, body: corpo, requireInteraction: true },
          fcmOptions: { link: url || '/' }
        }
      });
      return { ok: true };
    } catch (e) {
      console.log('[FCM v1] Erro:', e.message);
      return { ok: false, erro: e.message, expirado: e.code === 'messaging/registration-token-not-registered' };
    }
  } else {
    // Mozilla / outros via web-push VAPID
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      return { ok: true };
    } catch (e) {
      console.log('[webpush] Erro:', e.message);
      return { ok: false, erro: e.message, expirado: e.statusCode === 404 || e.statusCode === 410 };
    }
  }
}

router.post('/inscrever', async (req, res) => {
  const { membro_id, familia_id, subscription } = req.body;
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

router.post('/enviar-familia', async (req, res) => {
  const { familia_id, titulo, corpo, url, ...extras } = req.body;
  try {
    const result = await db.query(
      'SELECT membro_id, subscription FROM push_subscriptions WHERE familia_id = $1',
      [familia_id]
    );
    const envios = await Promise.all(result.rows.map(async row => {
      const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
      const r = await enviarPushParaSub(sub, titulo, corpo, url, extras);
      if (r.expirado) {
        await db.query('DELETE FROM push_subscriptions WHERE membro_id = $1', [row.membro_id]);
      }
      return r;
    }));
    res.json({ ok: true, enviados: envios.length });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/enviar-membro', async (req, res) => {
  const { membro_id, titulo, corpo, url, ...extras } = req.body;
  try {
    const result = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE membro_id = $1',
      [membro_id]
    );
    if (!result.rows.length) return res.json({ ok: false, erro: 'Sem inscricao' });
    const sub = typeof result.rows[0].subscription === 'string' ? JSON.parse(result.rows[0].subscription) : result.rows[0].subscription;
    const r = await enviarPushParaSub(sub, titulo, corpo, url, extras);
    if (r.expirado) {
      await db.query('DELETE FROM push_subscriptions WHERE membro_id = $1', [membro_id]);
    }
    res.json(r);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.get('/gerar-vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/erro-log', async (req, res) => {
  const { erro, membro_id } = req.body;
  console.log('[Push Frontend Erro]', erro, 'membro:', membro_id);
  res.json({ ok: true });
});

router.delete('/limpar/:membro_id', async (req, res) => {
  try {
    await db.query('DELETE FROM push_subscriptions WHERE membro_id = $1', [req.params.membro_id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.get('/debug/:membro_id', async (req, res) => {
  const result = await db.query('SELECT subscription FROM push_subscriptions WHERE membro_id = $1', [req.params.membro_id]);
  if (!result.rows.length) return res.json({ erro: 'Sem inscricao' });
  const sub = typeof result.rows[0].subscription === 'string' ? JSON.parse(result.rows[0].subscription) : result.rows[0].subscription;
  res.json({ endpoint: sub.endpoint, keys: Object.keys(sub.keys || {}) });
});

module.exports = router;
