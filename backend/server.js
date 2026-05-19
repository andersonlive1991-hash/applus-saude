
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const pool = require('./db');

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

app.get('/api/fix-perfil-89', async (req, res) => {
  try {
    const origem = await pool.query('SELECT * FROM perfil_idoso WHERE membro_id = 91');
    if (!origem.rows.length) return res.json({ erro: 'perfil 91 nao encontrado' });
    const p = origem.rows[0];
    await pool.query(
      'INSERT INTO perfil_idoso (membro_id, nome_completo, data_nascimento, tipo_sanguineo, alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (membro_id) DO UPDATE SET nome_completo=$2, tipo_sanguineo=$4, alergias=$5, cpf=$6, cartao_sus=$7, convenio=$8, contato_emergencia=$9, tel_emergencia=$10',
      [89, p.nome_completo, p.data_nascimento, p.tipo_sanguineo, p.alergias, p.cpf, p.cartao_sus, p.convenio, p.contato_emergencia, p.tel_emergencia]
    );
    res.json({ ok: true, mensagem: 'Perfil copiado do ID 91 para o ID 89' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

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

    for (const med of meds.rows) {
      const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
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
      webpush.sendNotification(sub, payload).catch(e => console.log('Erro push:', e.message));
    }
  } catch(e) {
    console.log('Erro agendador:', e.message);
  }
}, 60000);

// ── AGENDADOR DE EVENTOS ──
setInterval(async () => {
  try {
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horaAtual = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
    const dataAtual = agora.toISOString().split('T')[0];

    // 1 minuto antes
    const proximoMinuto = new Date(agora.getTime() + 60000);
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
        titulo: '📅 Evento em 1 minuto!',
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

