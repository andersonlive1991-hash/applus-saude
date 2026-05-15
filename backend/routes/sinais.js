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

// Limites clínicos por tipo de sinal
function verificarAlerta(tipo, valor, valor2) {
  const v = parseFloat(valor);
  const v2 = parseFloat(valor2);
  switch (tipo) {
    case 'pressao':
      if (v >= 180 || v2 >= 110) return { urgente: true,  msg: `Pressão MUITO ALTA: ${v}/${v2} mmHg` };
      if (v >= 140 || v2 >= 90)  return { urgente: false, msg: `Pressão alta: ${v}/${v2} mmHg` };
      if (v < 90)                return { urgente: false, msg: `Pressão baixa: ${v}/${v2} mmHg` };
      return null;
    case 'glicemia':
      if (v >= 300) return { urgente: true,  msg: `Glicemia MUITO ALTA: ${v} mg/dL` };
      if (v >= 180) return { urgente: false, msg: `Glicemia alta: ${v} mg/dL` };
      if (v < 70)   return { urgente: true,  msg: `Glicemia BAIXA: ${v} mg/dL — risco de hipoglicemia` };
      return null;
    case 'oximetria':
      if (v < 90) return { urgente: true,  msg: `Oximetria CRÍTICA: ${v}% — procure socorro imediatamente` };
      if (v < 94) return { urgente: false, msg: `Oximetria baixa: ${v}%` };
      return null;
    case 'temperatura':
      if (v >= 39.5) return { urgente: true,  msg: `Febre ALTA: ${v}°C` };
      if (v >= 37.8) return { urgente: false, msg: `Febre: ${v}°C` };
      if (v < 35.5)  return { urgente: false, msg: `Hipotermia: ${v}°C` };
      return null;
    case 'frequencia':
      if (v >= 120 || v < 40) return { urgente: true,  msg: `Frequência cardíaca crítica: ${v} bpm` };
      if (v >= 100 || v < 50) return { urgente: false, msg: `Frequência cardíaca alterada: ${v} bpm` };
      return null;
    case 'peso':
      return null;
    default:
      return null;
  }
}

// Listar sinais de um membro
router.get('/:membro_id', async (req, res) => {
  const { tipo } = req.query;
  try {
    let query = 'SELECT * FROM sinais_vitais WHERE membro_id = $1';
    const params = [req.params.membro_id];
    if (tipo) {
      query += ' AND tipo = $2';
      params.push(tipo);
    }
    query += ' ORDER BY criado_em DESC LIMIT 50';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Registrar sinal vital
router.post('/', async (req, res) => {
  const { membro_id, tipo, valor, valor2, unidade, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO sinais_vitais (membro_id, tipo, valor, valor2, unidade, observacoes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [membro_id, tipo, valor, valor2 === "" ? null : valor2, unidade, observacoes]
    );
    res.json(result.rows[0]);

    // Verificar alerta — não bloqueia a resposta
    const alerta = verificarAlerta(tipo, valor, valor2);
    if (!alerta) return;

    // Buscar nome do membro e familia_id
    const membroRes = await db.query(
      'SELECT nome, familia_id FROM membros WHERE id = $1',
      [membro_id]
    );
    if (!membroRes.rows.length) return;
    const { nome, familia_id } = membroRes.rows[0];

    // Buscar inscrições push da família
    const subsRes = await db.query(
      'SELECT subscription FROM push_subscriptions WHERE familia_id = $1',
      [familia_id]
    );
    if (!subsRes.rows.length) return;

    const titulo = alerta.urgente ? '🚨 Alerta de Saúde' : '⚠️ Atenção — Sinal Vital';
    const corpo  = `${nome}: ${alerta.msg}`;
    const payload = JSON.stringify({ titulo, corpo, url: '/#saude' });

    subsRes.rows.forEach(row => {
      const sub = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : row.subscription;
      webpush.sendNotification(sub, payload).catch(e => console.log("[Push Sinal] Erro:", e.message));
    });

  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir sinal
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM sinais_vitais WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
