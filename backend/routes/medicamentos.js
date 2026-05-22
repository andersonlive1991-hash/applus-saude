const express = require('express');
const router = express.Router();
const webpush = require("web-push");
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:contato@applus.saude", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}
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


// Decrementar estoque ao confirmar dose

router.get('/streak/:membro_id', async (req, res) => {
  try {
    const { membro_id } = req.params;
    const result = await db.query(
      `SELECT DATE(criado_em AT TIME ZONE 'America/Sao_Paulo') as dia,
              COUNT(*) FILTER (WHERE status = 'tomado') as tomadas,
              COUNT(*) as total
       FROM historico_meds
       WHERE membro_id = $1
         AND criado_em >= NOW() - INTERVAL '30 days'
       GROUP BY dia
       ORDER BY dia DESC`,
      [membro_id]
    );
    const rows = result.rows;
    let streak = 0;
    const hoje = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dia = rows.find(r => r.dia === dStr);
      if (dia && parseInt(dia.tomadas) > 0 && parseInt(dia.tomadas) >= parseInt(dia.total)) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    res.json({ streak });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

router.put('/:id/estoque', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE medicamentos SET estoque = GREATEST(estoque - 1, 0) WHERE id = $1 AND estoque > 0 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return res.json({ ok: true, estoque: 0 });
    const med = result.rows[0];
    if (med.estoque <= 5) {
      try {
        const subRes = await db.query('SELECT subscription FROM push_subscriptions WHERE membro_id = $1', [med.membro_id]);
        if (subRes.rows.length) {
          const sub = typeof subRes.rows[0].subscription === 'string' ? JSON.parse(subRes.rows[0].subscription) : subRes.rows[0].subscription;
          const payload = JSON.stringify({
            titulo: '💊 Estoque baixo',
            corpo: med.nome + ' — restam apenas ' + med.estoque + ' comprimido(s). Hora de comprar!',
            url: '/#remedios',
            medicamento: false
          });
          webpush.sendNotification(sub, payload).catch(e => {
            if (e.statusCode === 410 || e.statusCode === 404) {
              db.query('DELETE FROM push_subscriptions WHERE membro_id=$1', [med.membro_id]).catch(()=>{});
            }
          });
        }
      } catch(ep) { console.log('Erro push estoque:', ep.message); }
    }
    res.json({ ok: true, estoque: med.estoque });
  } catch(e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;