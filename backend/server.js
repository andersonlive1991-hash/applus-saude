
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

// ── Rotas admin temporarias ──
app.get('/api/admin/ver-tudo', async (req, res) => {
  try {
    const familias = await pool.query('SELECT id, codigo, nome FROM familias ORDER BY id');
    const membros = await pool.query('SELECT id, familia_id, nome, tipo, id_pessoal FROM membros ORDER BY id');
    const meds = await pool.query('SELECT id, membro_id, nome, dosagem FROM medicamentos ORDER BY id');
    const eventos = await pool.query('SELECT id, familia_id, titulo FROM eventos ORDER BY id');
    const sinais = await pool.query('SELECT id, membro_id, tipo, valor FROM sinais_vitais ORDER BY id');
    const perfis = await pool.query('SELECT id, membro_id, nome_completo, cpf FROM perfil_idoso ORDER BY id');
    const push = await pool.query('SELECT id, membro_id, familia_id FROM push_subscriptions ORDER BY id');
    const hist = await pool.query('SELECT COUNT(*) as total FROM historico_meds');
    const msgs = await pool.query('SELECT COUNT(*) as total FROM mensagens');
    const gastos = await pool.query('SELECT COUNT(*) as total FROM gastos');
    const vacinas = await pool.query('SELECT COUNT(*) as total FROM vacinas');
    res.json({
      familias: familias.rows,
      membros: membros.rows,
      medicamentos: meds.rows,
      eventos: eventos.rows,
      sinais_vitais: sinais.rows,
      perfis: perfis.rows,
      push_subscriptions: push.rows,
      historico_meds: hist.rows[0].total,
      mensagens: msgs.rows[0].total,
      gastos: gastos.rows[0].total,
      vacinas: vacinas.rows[0].total
    });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/admin/zerar-banco', async (req, res) => {
  try {
    const tabelas = [
      'resumo_diario','pictos_tea','cuidados_intercorrencias',
      'cuidados_sono','cuidados_hidratacao','cuidados_refeicoes',
      'cuidados_humor','cuidados_atividades','push_subscriptions',
      'historico_meds','medicamentos','sinais_vitais','vacinas',
      'gastos','mensagens','eventos','checklist','escala',
      'hidratacao','perfil_idoso','perfil_cuidador','membros','familias'
    ];
    for (const t of tabelas) {
      await pool.query('DELETE FROM ' + t).catch(()=>{});
    }
    await pool.query('ALTER SEQUENCE familias_id_seq RESTART WITH 1').catch(()=>{});
    await pool.query('ALTER SEQUENCE membros_id_seq RESTART WITH 1').catch(()=>{});
    res.json({ ok: true, msg: 'Banco zerado com sucesso!' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});

app.post('/api/admin/resetar-sequences', async (req, res) => {
  try {
    const tabelas = [
      'familias','membros','medicamentos','historico_meds',
      'eventos','mensagens','gastos','sinais_vitais','vacinas',
      'push_subscriptions','perfil_idoso','perfil_cuidador',
      'checklist','escala','hidratacao','resumo_diario','pictos_tea'
    ];
    for (const t of tabelas) {
      await pool.query(`ALTER SEQUENCE IF EXISTS ${t}_id_seq RESTART WITH 1`).catch(()=>{});
    }
    res.json({ ok: true, msg: 'Sequences resetadas! Próximo ID será 1.' });
  } catch(e) { res.status(500).json({ erro: e.message }); }
});
