
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const pool = require('./db');

// ── Firebase Admin (FCM) ──
const admin = require('firebase-admin');
try {
  if (process.env.FIREBASE_CREDENTIALS) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[FCM] Firebase Admin inicializado via env');
  } else {
    try {
      const serviceAccount = require('./firebase-credentials.json');
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('[FCM] Firebase Admin inicializado via arquivo');
    } catch(e2) {
      console.log('[FCM] firebase-credentials.json nao encontrado - FCM desativado');
    }
  }
} catch(e) {
  console.log('[FCM] Erro ao inicializar Firebase:', e.message);
}

// ── Helper: enviar push via FCM + VAPID em paralelo ──
async function enviarPushCompleto(membro_id, titulo, corpo, url, urgente) {
  try {
    const subRes = await pool.query(
      'SELECT subscription, fcm_token FROM push_subscriptions WHERE membro_id=$1',
      [membro_id]
    );
    if (!subRes.rows.length) return;
    const { subscription, fcm_token } = subRes.rows[0];
    const payload = JSON.stringify({ titulo, corpo, url: url || '/', urgente: urgente || false });

    // VAPID (web-push) — funciona com app aberto/minimizado
    if (subscription) {
      try {
        const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
        await webpush.sendNotification(sub, payload);
      } catch(e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          pool.query('DELETE FROM push_subscriptions WHERE membro_id=$1', [membro_id]).catch(()=>{});
        }
      }
    }

    // FCM — funciona com tela desligada
    if (fcm_token && admin.apps.length) {
      try {
        await admin.messaging().send({
          token: fcm_token,
          notification: { title: titulo, body: corpo },
          data: { url: url || '/', urgente: String(urgente || false) },
          android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'applus_alarmes' }
          }
        });
      } catch(e) {
        console.log('[FCM] Erro envio:', e.message);
        if (e.code === 'messaging/registration-token-not-registered') {
          pool.query('UPDATE push_subscriptions SET fcm_token=NULL WHERE membro_id=$1', [membro_id]).catch(()=>{});
        }
      }
    }
  } catch(e) {
    console.log('[Push Completo] Erro:', e.message);
  }
}

// Criar tabela perfil_cuidador se não existir
pool.query(`
  CREATE TABLE IF NOT EXISTS perfil_cuidador (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER UNIQUE REFERENCES membros(id) ON DELETE CASCADE,
    cpf VARCHAR(20),
    data_nascimento DATE,
    telefone VARCHAR(20),
    tipo_cuidador VARCHAR(50),
    experiencia VARCHAR(50),
    especialidades TEXT,
    turno VARCHAR(50),
    dias_disponiveis TEXT,
    observacoes TEXT,
    atualizado_em TIMESTAMP DEFAULT NOW()
  );
`).then(() => console.log('✅ Tabela perfil_cuidador OK')).catch(e => console.log('Tabela perfil_cuidador:', e.message));

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use('/.well-known', express.static(path.join(__dirname, '../frontend/.well-known'), {
  setHeaders: (res) => { res.setHeader('Content-Type', 'application/json'); }
}));
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: function(res, filePath) {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Rotas
app.use('/api/familias', require('./routes/familias'));
app.use('/api/membros', require('./routes/membros'));
app.use('/api/medicamentos', require('./routes/medicamentos'));
app.use('/api/interacoes', require('./routes/interacoes'));
app.use('/api/checklist', require('./routes/checklist'));
app.use('/api/historico-tea', require('./routes/historico-tea'));
app.use('/api/pdf', require('./routes/pdf'));




app.use('/api/eventos', require('./routes/eventos'));
app.use('/api/sinais', require('./routes/sinais'));
app.use('/api/vacinas', require('./routes/vacinas'));
app.use('/api/mensagens', require('./routes/mensagens'));
app.use('/api/gastos', require('./routes/gastos'));
app.use('/api/push', require('./routes/push'));
app.use('/api/ia', require('./routes/ia'));
app.use('/api/escala', require('./routes/escala'));
app.use('/api/mente-sa', require('./routes/mente-sa'));
const rateLimit = require('express-rate-limit');

app.set('trust proxy', 1);

// Rate limiting — proteção contra força bruta
const limiterGeral = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { erro: 'Muitas requisições. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const limiterBuscarId = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { erro: 'Muitas tentativas. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

app.use('/api', limiterGeral);
app.use('/api/membros/id', limiterBuscarId);

app.use('/api/bem-estar', require('./routes/bem_estar'));
app.use('/api/perfil', require('./routes/perfil'));
app.use('/api/pdf/plantao', require('./routes/pdf-plantao'));
app.use('/api/passagem-plantao', require('./routes/passagem-plantao'));
app.use('/api/prescricoes', require('./routes/prescricoes'));
app.use('/api/perfil-cuidador', require('./routes/perfil_cuidador'));
app.use('/api/qrcode', require('./routes/qrcode'));
app.use('/api/cuidados', require('./routes/cuidados'));
app.use('/api/historico', require('./routes/saude_historico'));
app.use('/api/prontuarios', require('./routes/prontuarios'));
app.use('/api/rotina-tea', require('./routes/rotina_tea'));

// Socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  socket.on('entrar-familia', (familiaId) => {
    familiaId = String(familiaId);
    console.log('Entrou na sala:', familiaId);
    socket.join(familiaId);
    // Avisar medico que paciente entrou na sala
    socket.to(familiaId).emit('paciente-online', { familiaId });
  });
  socket.on('emergencia', (data) => {
    io.to(data.familiaId).emit('alerta-emergencia', data);
  });
  // WebRTC — sinalização de chamada SOS
  socket.on('sos-chamar', async (data) => {
    socket.to(String(data.familiaId)).emit('sos-recebendo', data);
    // Push notification para toda a família
    try {
      const subs = await pool.query(
        'SELECT subscription FROM push_subscriptions WHERE familia_id = $1',
        [data.familiaId]
      );
      const payload = JSON.stringify({
        titulo: '🚨 EMERGÊNCIA — Chamada SOS!',
        corpo: (data.nome || 'Familiar') + ' está ligando agora. Toque para atender!',
        url: '/#emergencia',
        urgente: true
      });
      for (const row of subs.rows) {
        const sub = typeof row.subscription === 'string' ? JSON.parse(row.subscription) : row.subscription;
        webpush.sendNotification(sub, payload).catch(e => console.log('Push SOS erro:', e.message));
      }
    // Push para contatos SOS externos
    try {
      if (data.membroId) {
        const contatos = await pool.query("SELECT id_sos_contato FROM contatos_sos WHERE membro_id=$1", [data.membroId]);
        for (const c of contatos.rows) {
          const memRes = await pool.query("SELECT id FROM membros WHERE id_sos=$1", [c.id_sos_contato]);
          if (!memRes.rows.length) continue;
          const subRes = await pool.query("SELECT subscription FROM push_subscriptions WHERE membro_id=$1", [memRes.rows[0].id]);
          for (const row of subRes.rows) {
            const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
            const payloadSOS = JSON.stringify({
              titulo: "🚨 EMERGÊNCIA EXTERNA — SOS!",
              corpo: (data.nome || "Alguém") + " está em emergência e precisa de ajuda!",
              url: "/",
              urgente: true
            });
            webpush.sendNotification(sub, payloadSOS).catch(e => console.log("Push SOS externo erro:", e.message));
          }
        }
      }
    } catch(e) { console.log("Erro push SOS extatos:", e.message); }
    } catch(e) { console.log('Erro push SOS:', e.message); }
  });
  socket.on('sos-offer', (data) => {
    socket.to(String(data.familiaId)).emit('sos-offer', data);
  });
  socket.on('sos-answer', (data) => {
    socket.to(String(data.familiaId)).emit('sos-answer', data);
  });
  socket.on('sos-ice', (data) => {
    socket.to(String(data.familiaId)).emit('sos-ice', data);
  });
  
  // ── Videochamada entre membros ──
  socket.on('video-chamar', (data) => {
    socket.to(String(data.familiaId)).emit('video-recebendo', {
      offer: data.offer,
      nome: data.nome,
      membroId: data.membroId,
      familiaId: data.familiaId
    });
  });
  socket.on('video-answer', (data) => {
    socket.to(String(data.familiaId)).emit('video-answer', { answer: data.answer });
  });
  socket.on('video-ice', (data) => {
    socket.to(String(data.familiaId)).emit('video-ice', { candidate: data.candidate });
  });
  socket.on('video-encerrar', (data) => {
    socket.to(String(data.familiaId)).emit('video-encerrado');
  });

  socket.on('sos-encerrar', (data) => {
    socket.to(String(data.familiaId)).emit('sos-encerrado', data);
  });

  socket.on('pictos-atualizados', (data) => {
    io.to(String(data.familiaId)).emit('pictos-atualizados', data);
  });
  socket.on('familia-frase-tea', (data) => {
    io.to(String(data.familiaId)).emit('familia-frase-tea', data);
  });
  socket.on('tea-comunicou', (data) => {
    io.to(String(data.familiaId)).emit('tea-comunicou', data);
  });
  socket.on('mensagem', (data) => {
    const sala = String(data.familiaId || data.familia_id);
    io.to(sala).emit('nova-mensagem', data);
  });
});

const PORT = process.env.PORT || 10000;

app.get("/ping", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) + "s", hora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
});


// Autoping — mantém o servidor acordado
setInterval(async () => {
  try {
    const http = require("http");
    http.get("http://localhost:" + (process.env.PORT || 3000) + "/ping", (r) => {
      console.log("[Keep-alive] ping ok -", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }));
    });
  } catch(e) { console.log("[Keep-alive] erro:", e.message); }
}, 4 * 60 * 1000);

// ── PICTOGRAMAS PERSONALIZADOS TEA ──
pool.query(`
  CREATE TABLE IF NOT EXISTS pictos_tea (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER,
    familia_id INTEGER,
    emoji TEXT,
    texto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log('Tabela pictos_tea:', e.message));

// ── ID SOS E CONTATOS SOS ──
pool.query(`ALTER TABLE membros ADD COLUMN IF NOT EXISTS id_sos VARCHAR(20) UNIQUE`).catch(()=>{});
pool.query(`ALTER TABLE membros ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP`).catch(()=>{});
pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS fcm_token TEXT`).catch(()=>{});

pool.query(`
  CREATE TABLE IF NOT EXISTS contatos_sos (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER REFERENCES membros(id) ON DELETE CASCADE,
    id_sos_contato VARCHAR(20),
    nome_contato VARCHAR(100),
    criado_em TIMESTAMP DEFAULT NOW()
  )
`).catch(e => console.log("Tabela contatos_sos:", e.message));

// Gerar ID SOS único
function gerarIdSOS() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "SOS-";
  for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// Buscar ou criar ID SOS do membro
app.get("/api/sos/meu-id/:membro_id", async (req, res) => {
  try {
    const r = await pool.query("SELECT id_sos FROM membros WHERE id=$1", [req.params.membro_id]);
    if (!r.rows.length) return res.status(404).json({ erro: "Membro não encontrado" });
    let idSos = r.rows[0].id_sos;
    if (!idSos) {
      // Gerar novo ID SOS único
      let novo, existe = true;
      while (existe) {
        novo = gerarIdSOS();
        const check = await pool.query("SELECT id FROM membros WHERE id_sos=$1", [novo]);
        existe = check.rows.length > 0;
      }
      await pool.query("UPDATE membros SET id_sos=$1 WHERE id=$2", [novo, req.params.membro_id]);
      idSos = novo;
    }
    res.json({ id_sos: idSos });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Listar contatos SOS do membro
app.get("/api/sos/contatos/:membro_id", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM contatos_sos WHERE membro_id=$1 ORDER BY criado_em", [req.params.membro_id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Adicionar contato SOS
app.post("/api/sos/contatos", async (req, res) => {
  const { membro_id, id_sos_contato } = req.body;
  try {
    // Verificar se o ID SOS existe
    const check = await pool.query("SELECT id, nome FROM membros WHERE id_sos=$1", [id_sos_contato]);
    if (!check.rows.length) return res.status(404).json({ erro: "ID SOS não encontrado" });
    const nome_contato = check.rows[0].nome;
    const r = await pool.query(
      "INSERT INTO contatos_sos (membro_id, id_sos_contato, nome_contato) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *",
      [membro_id, id_sos_contato, nome_contato]
    );
    res.json({ ok: true, nome: nome_contato });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

// Remover contato SOS
app.delete("/api/sos/contatos/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM contatos_sos WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});


app.get('/api/pictos-tea/:membro_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pictos_tea WHERE membro_id = $1 ORDER BY criado_em ASC',
      [req.params.membro_id]
    );
    res.json(result.rows);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/pictos-tea', async (req, res) => {
  const { membro_id, familia_id, emoji, texto } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO pictos_tea (membro_id, familia_id, emoji, texto) VALUES ($1,$2,$3,$4) RETURNING *',
      [membro_id, familia_id, emoji, texto]
    );
    res.json(result.rows[0]);
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

app.delete('/api/pictos-tea/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pictos_tea WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

server.listen(PORT, () => console.log(`AP+ Saúde rodando na porta ${PORT}`));

// ── VERIFICAR HORÁRIOS DE MEDICAMENTOS A CADA MINUTO ──
const webpush = require('web-push');
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@applus.saude',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

setInterval(async () => {
  try {
    const agora = new Date();
    const horaBrasil = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaAtual = `${String(horaBrasil.getHours()).padStart(2,'0')}:${String(horaBrasil.getMinutes()).padStart(2,'0')}`;

    console.log('[Agendador] Verificando:', horaAtual);
    const meds = await pool.query('SELECT * FROM medicamentos WHERE horarios IS NOT NULL');
    console.log('[Agendador] Meds encontrados:', meds.rows.length);

    for (const med of meds.rows) {
      const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
      console.log('[Agendador] Med:', med.nome, '| horarios:', JSON.stringify(horarios), '| horaAtual:', horaAtual, '| match:', horarios.includes(horaAtual));
      if (!Array.isArray(horarios) || !horarios.includes(horaAtual)) continue;

      const subRes = await pool.query('SELECT subscription FROM push_subscriptions WHERE membro_id = $1', [med.membro_id]);
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
      webpush.sendNotification(sub, payload).then(() => console.log('[Push OK] membro', med.membro_id)).catch(e => { console.log('[Push ERRO]', e.statusCode, e.message); if(e.statusCode===410||e.statusCode===404){pool.query('DELETE FROM push_subscriptions WHERE membro_id=$1',[med.membro_id]).catch(()=>{}); } });
    }
  } catch(e) {
    console.log('Erro agendador:', e.message);
  }
}, 60000);

// ── AGENDADOR DOSE PERDIDA — avisa família após 30min sem confirmação ──
setInterval(async () => {
  try {
    const agora = new Date();
    const horaBrasil = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const horaAtual = String(horaBrasil.getHours()).padStart(2,"0") + ":" + String(horaBrasil.getMinutes()).padStart(2,"0");
    // Horário de 30 minutos atrás
    const antes = new Date(horaBrasil.getTime() - 30 * 60000);
    const horaAntes = String(antes.getHours()).padStart(2,"0") + ":" + String(antes.getMinutes()).padStart(2,"0");
    const meds = await pool.query("SELECT * FROM medicamentos WHERE horarios IS NOT NULL");
    for (const med of meds.rows) {
      const horarios = typeof med.horarios === "string" ? JSON.parse(med.horarios) : med.horarios;
      if (!Array.isArray(horarios) || !horarios.includes(horaAntes)) continue;
      // Verificar se foi confirmado
      const hoje = horaBrasil.toISOString().split("T")[0];
      const conf = await pool.query(
        "SELECT id FROM historico_meds WHERE med_id=$1 AND membro_id=$2 AND DATE(criado_em AT TIME ZONE 'America/Sao_Paulo')=$3 AND status='tomado'",
        [med.id, med.membro_id, hoje]
      );
      if (conf.rows.length > 0) continue; // Já confirmado
      // Buscar familia do membro
      const membroRes = await pool.query("SELECT familia_id, nome FROM membros WHERE id=$1", [med.membro_id]);
      if (!membroRes.rows.length) continue;
      const { familia_id, nome } = membroRes.rows[0];
      // Buscar inscrições de OUTROS membros da família
      const subs = await pool.query(
        "SELECT membro_id, subscription FROM push_subscriptions WHERE familia_id=$1 AND membro_id!=$2",
        [familia_id, med.membro_id]
      );
      if (!subs.rows.length) continue;
      const payload = JSON.stringify({
        titulo: "⚠️ Dose não confirmada",
        corpo: nome + " não confirmou " + med.nome + " às " + horaAntes,
        url: "/#remedios",
        medicamento: false
      });
      for (const row of subs.rows) {
        const sub = typeof row.subscription === "string" ? JSON.parse(row.subscription) : row.subscription;
        webpush.sendNotification(sub, payload).catch(e => {
          if (e.statusCode === 410 || e.statusCode === 404) {
            pool.query("DELETE FROM push_subscriptions WHERE membro_id=$1", [row.membro_id]).catch(()=>{});
          }
        });
      }
      console.log("[Dose perdida] " + nome + " nao confirmou " + med.nome + " as " + horaAntes);
    }
  } catch(e) { console.log("Erro agendador dose perdida:", e.message); }
}, 5 * 60000); // a cada 5 minutos


// ── AGENDADOR DE EVENTOS ──
setInterval(async () => {
  try {
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaAtual = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
    const dataAtual = agora.toISOString().split('T')[0];

    // 1 hora antes
    const proximoMinuto = new Date(agora.getTime() + 60 * 60000);
    const horaProxima = String(proximoMinuto.getHours()).padStart(2,'0') + ':' + String(proximoMinuto.getMinutes()).padStart(2,'0');

    console.log('Agendador eventos — data:', dataAtual, 'horaProxima:', horaProxima);
    const eventos = await pool.query(
      `SELECT e.*, m.nome as membro_nome FROM eventos e
       JOIN membros m ON m.id = e.membro_id
       WHERE e.data = $1 AND TO_CHAR(e.hora, 'HH24:MI') = $2`,
      [dataAtual, horaProxima]
    );
    console.log('Eventos encontrados:', eventos.rows.length);

    for (const ev of eventos.rows) {
      const subRes = await pool.query('SELECT subscription FROM push_subscriptions WHERE membro_id = $1', [ev.membro_id]);
      if (!subRes.rows.length) continue;
      const sub = typeof subRes.rows[0].subscription === 'string' ? JSON.parse(subRes.rows[0].subscription) : subRes.rows[0].subscription;
      const payload = JSON.stringify({
        titulo: '📅 Evento em 1 hora!',
        corpo: `${ev.titulo}${ev.local ? ' — ' + ev.local : ''} · ${horaProxima}`,
        url: '/#agenda',
        alarme: true,
        eventoNome: ev.titulo
      });
      webpush.sendNotification(sub, payload).catch(e => console.log('Erro push evento:', e.message));
    }
  } catch(e) {
    console.log('Erro agendador eventos:', e.message);
  }
}, 60000);


// ── Agendador resumo diário às 20:00 (Brasília) ──
setInterval(async () => {
  try {
    const agora = new Date();
    const horaBrasil = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const hora = horaBrasil.getHours();
    const minuto = horaBrasil.getMinutes();
    if (hora !== 20 || minuto !== 0) return;

    console.log('[Resumo Diário] Gerando resumos das 20h...');
    const membros = await pool.query('SELECT DISTINCT membro_id FROM push_subscriptions');
    
    for (const row of membros.rows) {
      const membro_id = row.membro_id;
      try {
        // Verificar se já gerou hoje
        const jaGerou = await pool.query(
          'SELECT id FROM resumo_diario WHERE membro_id = $1 AND data = CURRENT_DATE',
          [membro_id]
        );
        if (jaGerou.rows.length) continue;

        // Buscar dados do membro
        const memRes = await pool.query('SELECT nome FROM membros WHERE id = $1', [membro_id]);
        if (!memRes.rows.length) continue;
        const nome = memRes.rows[0].nome;

        // Buscar dados do dia
        const hoje = new Date().toISOString().split('T')[0];
        const hidRes = await pool.query('SELECT COALESCE(SUM(quantidade_ml)/250,0) as copos, MAX(meta_ml)/250 as meta FROM hidratacao WHERE membro_id=$1 AND data=CURRENT_DATE', [membro_id]);
        const copos = Math.round(hidRes.rows[0].copos || 0);
        const metaAgua = Math.round(hidRes.rows[0].meta || 8);

        const sonoRes = await pool.query('SELECT * FROM cuidados_sono WHERE membro_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC LIMIT 1', [membro_id]);
        const sonoInfo = sonoRes.rows.length ? (sonoRes.rows[0].qualidade || 'registrado') : 'nao registrado';

        const humorRes = await pool.query('SELECT humor FROM cuidados_humor WHERE membro_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC LIMIT 1', [membro_id]);
        const humorTexto = humorRes.rows.length ? humorRes.rows[0].humor : 'nao registrado';

        const sinaisRes = await pool.query('SELECT tipo, valor FROM sinais_vitais WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 3', [membro_id]);
        const sinaisTexto = sinaisRes.rows.length ? sinaisRes.rows.map(s => s.tipo+': '+s.valor).join(', ') : 'nenhum';

        const medsRes = await pool.query('SELECT nome FROM medicamentos WHERE membro_id=$1 AND ativo=true', [membro_id]);
        const medsTexto = medsRes.rows.length ? medsRes.rows.map(m => m.nome).join(', ') : 'nenhum';

        const prompt = 'Voce e um assistente de saude do app AP+ Saude. Analise os dados de ' + nome + ' e faca um resumo em portugues brasileiro. DADOS: Agua: ' + copos + ' copos (meta: ' + metaAgua + '). Sono: ' + sonoInfo + '. Humor: ' + humorTexto + '. Sinais vitais: ' + sinaisTexto + '. Medicamentos: ' + medsTexto + '. Responda em 3 blocos curtos: 1. O que esta bem 2. O que precisa de atencao 3. Uma dica pratica. Seja direto e acolhedor.';

        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
        );
        const geminiData = await geminiRes.json();
        const resumo = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Nao foi possivel gerar analise.';

        await pool.query(
          'INSERT INTO resumo_diario (membro_id, data, resumo, dados) VALUES ($1, CURRENT_DATE, $2, $3)',
          [membro_id, resumo, JSON.stringify({ copos, metaAgua, sonoInfo, humorTexto })]
        );
        console.log('[Resumo Diário] Gerado para membro', membro_id);
      } catch (e) {
        console.log('[Resumo Diário] Erro membro', membro_id, e.message);
      }
    }
  } catch (e) {
    console.log('[Resumo Diário] Erro geral:', e.message);
  }
}, 60000);


// ── Agendador inatividade do idoso ──
setInterval(async () => {
  try {
    const horasLimite = 6;
    const idosos = await pool.query(
      `SELECT m.id, m.nome, m.familia_id, m.ultimo_acesso
       FROM membros m
       WHERE m.tipo = 'idoso'
         AND m.ultimo_acesso IS NOT NULL
         AND m.ultimo_acesso < NOW() - INTERVAL '${horasLimite} hours'`
    );
    for (const idoso of idosos.rows) {
      const familiares = await pool.query(
        `SELECT ps.subscription FROM push_subscriptions ps
         JOIN membros m ON m.id = ps.membro_id
         WHERE m.familia_id = $1 AND m.id != $2`,
        [idoso.familia_id, idoso.id]
      );
      for (const f of familiares.rows) {
        try {
          const sub = typeof f.subscription === 'string' ? JSON.parse(f.subscription) : f.subscription;
          const payload = JSON.stringify({
            titulo: '⚠️ Inatividade detectada',
            corpo: `${idoso.nome} nao abre o app ha mais de ${horasLimite} horas.`,
            url: '/'
          });
          webpush.sendNotification(sub, payload).catch(() => {});
        } catch(e) {}
      }
    }
  } catch(e) {
    console.log('[Inatividade] Erro:', e.message);
  }
}, 3600000);

// ── Agendador push médico — 3 doses puladas seguidas ──
setInterval(async () => {
  try {
    const resultado = await pool.query(
      `SELECT m.membro_id, m.nome as med_nome, mb.nome as paciente_nome,
              COUNT(*) as doses_puladas
       FROM historico_meds m
       JOIN medicamentos med ON med.id = m.med_id
       JOIN membros mb ON mb.id = m.membro_id
       WHERE m.status = 'pulado'
         AND m.criado_em >= NOW() - INTERVAL '24 hours'
       GROUP BY m.membro_id, m.nome, mb.nome
       HAVING COUNT(*) >= 3`
    );
    for (const row of resultado.rows) {
      const prescRes = await pool.query(
        'SELECT DISTINCT medico_crm FROM prescricoes WHERE membro_id=$1 AND medico_crm IS NOT NULL',
        [row.membro_id]
      );
      for (const presc of prescRes.rows) {
        const subRes = await pool.query(
          'SELECT subscription FROM push_medicos WHERE crm=$1',
          [presc.medico_crm]
        );
        if (!subRes.rows.length) continue;
        const sub = typeof subRes.rows[0].subscription === 'string'
          ? JSON.parse(subRes.rows[0].subscription)
          : subRes.rows[0].subscription;
        const payload = JSON.stringify({
          titulo: '⚠️ Paciente pulou doses',
          corpo: `${row.paciente_nome} pulou ${row.doses_puladas} doses nas ultimas 24h.`,
          url: '/medico.html'
        });
        webpush.sendNotification(sub, payload).catch(() => {});
      }
    }
  } catch(e) {
    console.log('[Push Medico Doses] Erro:', e.message);
  }
}, 3600000);
