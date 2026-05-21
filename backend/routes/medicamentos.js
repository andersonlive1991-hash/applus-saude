const express = require('express');
const router = express.Router();
const db = require('../db');

// Confirmar dose (rota fixa — deve vir antes de /:familia_id)
router.post('/historico', async (req, res) => {
  const { med_id, status, motivo, membro_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO historico_meds (med_id, status, motivo, membro_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [med_id, status, motivo, membro_id]
    );
    // Se dose pulada, avisar família
    if (status === "pulado") {
      try {
        const memRes = await db.query("SELECT familia_id, nome FROM membros WHERE id=$1", [membro_id]);
        if (memRes.rows.length) {
          const { familia_id, nome } = memRes.rows[0];
          const medRes = await db.query("SELECT nome FROM medicamentos WHERE id=$1", [med_id]);
          const medNome = medRes.rows.length ? medRes.rows[0].nome : "medicamento";
          const subs = await db.query(
            "SELECT membro_id, subscription FROM push_subscriptions WHERE familia_id=$1 AND membro_id!=$2",
            [familia_id, membro_id]
          );
          const payload = JSON.stringify({
            titulo: "⚠️ Dose pulada",
            corpo: nome + " pulou " + medNome,
            url: "/#remedios",
            medicamento: false
          });
          for (const row of subs.rows) {
            const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
            webpush.sendNotification(sub, payload).catch(e => {
              if (e.statusCode === 410 || e.statusCode === 404) {
                db.query("DELETE FROM push_subscriptions WHERE membro_id=$1", [row.membro_id]).catch(()=>{});
              }
            });
          }
        }
      } catch(ep) { console.log("Erro push dose pulada:", ep.message); }
    }
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Histórico de um medicamento (rota fixa — deve vir antes de /:familia_id)
router.get('/historico/:med_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM historico_meds WHERE med_id = $1 ORDER BY criado_em DESC LIMIT 30',
      [req.params.med_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Listar medicamentos da família filtrado por membro
router.get('/:familia_id', async (req, res) => {
  const { membro_id } = req.query;
  try {
    let query = 'SELECT * FROM medicamentos WHERE familia_id = $1';
    const params = [req.params.familia_id];
    if (membro_id) {
      query += ' AND membro_id = $2';
      params.push(membro_id);
    }
    query += ' ORDER BY nome';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Cadastrar medicamento
router.post('/', async (req, res) => {
  const { familia_id, membro_id, nome, dosagem, horarios, via, estoque, validade, observacoes } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO medicamentos (familia_id, membro_id, nome, dosagem, horarios, via, estoque, validade, observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [familia_id, membro_id, nome, dosagem, JSON.stringify(horarios), via, estoque, validade, observacoes]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Excluir medicamento
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM medicamentos WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});


router.get('/aderencia/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.nome, m.dosagem,
        COUNT(h.id) FILTER (WHERE h.status = 'tomado') as tomadas,
        COUNT(h.id) as total
       FROM medicamentos m
       LEFT JOIN historico_meds h ON h.med_id = m.id
         AND h.criado_em >= NOW() - INTERVAL '30 days'
       WHERE m.membro_id = $1
       GROUP BY m.id, m.nome, m.dosagem`,
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;

// ── AGENDADOR PUSH MEDICAMENTOS ──
const webpush = require('web-push');
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@applus.saude',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function dispararPushMedicamentos() {
  try {
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
    const meds = await db.query('SELECT * FROM medicamentos');
    for (const med of meds.rows) {
      const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
      if (!Array.isArray(horarios) || !horarios.includes(horaAtual)) continue;
      const subRes = await db.query('SELECT subscription FROM push_subscriptions WHERE membro_id = $1', [med.membro_id]);
      if (!subRes.rows.length) continue;
      const sub = typeof subRes.rows[0].subscription === 'string' ? JSON.parse(subRes.rows[0].subscription) : subRes.rows[0].subscription;
      const payload = JSON.stringify({
        titulo: '💊 Hora do medicamento!',
        corpo: `${med.nome}${med.dosagem ? ' — ' + med.dosagem : ''} · ${horaAtual}`,
        url: '/#remedios',
        medicamento: true,
        medId: med.id,
        medNome: med.nome
      });
      webpush.sendNotification(sub, payload).catch(() => {});
    }
  } catch (e) {
    console.error('Erro agendador:', e.message);
  }
}
setInterval(dispararPushMedicamentos, 60000);
