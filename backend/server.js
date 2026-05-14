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
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas
app.use('/api/familias', require('./routes/familias'));
app.use('/api/membros', require('./routes/membros'));
app.use('/api/medicamentos', require('./routes/medicamentos'));
app.use('/api/eventos', require('./routes/eventos'));
app.use('/api/sinais', require('./routes/sinais'));
app.use('/api/vacinas', require('./routes/vacinas'));
app.use('/api/mensagens', require('./routes/mensagens'));
app.use('/api/gastos', require('./routes/gastos'));
app.use('/api/push', require('./routes/push'));
app.use('/api/ia', require('./routes/ia'));
app.use('/api/escala', require('./routes/escala'));
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
  socket.on('mensagem', (data) => {
    const sala = String(data.familiaId || data.familia_id);
    io.to(sala).emit('nova-mensagem', data);
  });
});

const PORT = process.env.PORT || 10000;

app.get("/ping", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) + "s", hora: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) });
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
