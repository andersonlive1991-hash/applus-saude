const express = require('express');
const router = express.Router();
const db = require('../db');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@applus.saude',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
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
  const { familia_id, titulo, corpo, url } = req.body;
  try {
    const result = await db.query(
      'SELECT membro_id, subscription FROM push_subscriptions WHERE familia_id = $1',
      [familia_id]
    );
    const payload = JSON.stringify({ titulo, corpo, url: url || '/' });
    const envios = result.rows.map(row => {
      const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
      return webpush.sendNotification(sub, payload).catch(async (err) => {
        if (err.statusCode === 404 || err.statusCode === 410 || (err.message && err.message.includes('unexpected'))) {
          await db.query('DELETE FROM push_subscriptions WHERE membro_id = $1', [row.membro_id]);
          console.log('[Push] Inscricao invalida removida para membro', row.membro_id);
        }
        return null;
      });
    });
    await Promise.all(envios);
    res.json({ ok: true, enviados: envios.length });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/enviar-membro', async (req, res) => {
  const { membro_id, titulo, corpo, url } = req.body;
  try {
    const result = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE membro_id = $1',
      [membro_id]
    );
    if (!result.rows.length) return res.json({ ok: false, erro: 'Sem inscricao' });
    const sub = typeof result.rows[0].subscription === 'string' ? JSON.parse(result.rows[0].subscription) : result.rows[0].subscription;
    const payload = JSON.stringify({ titulo, corpo, url: url || '/' });
    await webpush.sendNotification(sub, payload);
    res.json({ ok: true });
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410 || (e.message && e.message.includes('unexpected'))) {
      await db.query('DELETE FROM push_subscriptions WHERE membro_id = $1', [membro_id]);
      console.log('[Push] Inscricao invalida removida para membro', membro_id);
    }
    res.status(500).json({ erro: e.message });
  }
});

router.get('/gerar-vapid', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

router.post('/erro-log', async (req, res) => {
  const { erro, membro_id, familia_id } = req.body;
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


// Enviar push SOS para contato externo pelo ID SOS
router.post("/enviar-sos-externo", async (req, res) => {
  const { id_sos_contato, nome, membro_id } = req.body;
  try {
    // Buscar membro pelo ID SOS
    const memRes = await db.query("SELECT id FROM membros WHERE id_sos=$1", [id_sos_contato]);
    if (!memRes.rows.length) return res.json({ ok: false, erro: "ID SOS não encontrado" });
    const membroIdContato = memRes.rows[0].id;
    // Buscar inscrição push
    const subRes = await db.query("SELECT subscription FROM push_subscriptions WHERE membro_id=$1", [membroIdContato]);
    if (!subRes.rows.length) return res.json({ ok: false, erro: "Sem inscrição push" });
    const sub = typeof subRes.rows[0].subscription === "string" ? JSON.parse(subRes.rows[0].subscription) : subRes.rows[0].subscription;
    const payload = JSON.stringify({
      titulo: "🚨 EMERGÊNCIA EXTERNA — SOS!",
      corpo: (nome || "Alguém") + " está em emergência e precisa de ajuda!",
      url: "/",
      urgente: true
    });
    await webpush.sendNotification(sub, payload);
    res.json({ ok: true });
  } catch(e) {
    console.log("Erro push SOS externo:", e.message);
    res.status(500).json({ erro: e.message });
  }
});


// ── Push para médico via CRM ──
router.post('/inscrever-medico', async (req, res) => {
  const { crm, nome, subscription } = req.body;
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS push_medicos (
        crm VARCHAR(50) PRIMARY KEY,
        nome VARCHAR(200),
        subscription TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )`
    );
    await db.query(
      'INSERT INTO push_medicos (crm, nome, subscription) VALUES ($1,$2,$3) ON CONFLICT (crm) DO UPDATE SET subscription=$3, nome=$2',
      [crm, nome, JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/enviar-medico-crm', async (req, res) => {
  const { crm, titulo, corpo, url } = req.body;
  try {
    const result = await db.query('SELECT subscription FROM push_medicos WHERE crm=$1', [crm]);
    if (!result.rows.length) return res.json({ ok: false, erro: 'Médico sem push cadastrado' });
    const sub = typeof result.rows[0].subscription === 'string' ? JSON.parse(result.rows[0].subscription) : result.rows[0].subscription;
    const payload = JSON.stringify({ titulo, corpo, url: url || '/' });
    await webpush.sendNotification(sub, payload);
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});

router.post('/salvar-fcm-token', async (req, res) => {
  const { membro_id, fcm_token, familia_id } = req.body;
  if (!membro_id || !fcm_token) return res.status(400).json({ erro: 'Campos obrigatorios' });
  try {
    await db.query(
      `INSERT INTO push_subscriptions (membro_id, familia_id, fcm_token, subscription)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (membro_id) DO UPDATE SET fcm_token = $3`,
      [membro_id, familia_id || null, fcm_token, JSON.stringify({})]
    );
    console.log('[FCM] Token salvo para membro', membro_id);
    res.json({ ok: true });
  } catch(e) {
    console.log('[FCM] Erro salvar token:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
