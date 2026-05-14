// ── ESTADO GLOBAL ──
const APP = {
  familiaId: null,
  membroId: null,
  membroNome: null,
  membroTipo: null,
  idPessoal: null,
  codigoFamilia: null,
  socket: null,
  alarmeAtivo: null,
  alarmeInterval: null
};

// ── INICIALIZAR ──
document.addEventListener('DOMContentLoaded', () => {
  carregarSessao();
  registrarSW();
});

function salvarSessaoFamilia() {
  localStorage.setItem('applus_familia', JSON.stringify({
    familiaId: APP.familiaId,
    codigoFamilia: APP.codigoFamilia,
    nomeFamilia: APP.nomeFamilia
  }));
}

function salvarSessaoMembro() {
  localStorage.setItem('applus_sessao', JSON.stringify({
    familiaId: APP.familiaId,
    membroId: APP.membroId,
    membroNome: APP.membroNome,
    membroTipo: APP.membroTipo,
    idPessoal: APP.idPessoal,
    codigoFamilia: APP.codigoFamilia,
    nomeFamilia: APP.nomeFamilia
  }));
}

function carregarSessao() {
  const sessao = localStorage.getItem('applus_sessao');
  const familia = localStorage.getItem('applus_familia');

  if (sessao) {
    const dados = JSON.parse(sessao);
    APP.familiaId = String(dados.familiaId);
    APP.codigoFamilia = dados.codigoFamilia;
    APP.nomeFamilia = dados.nomeFamilia;
    APP.membroId = dados.membroId;
    APP.membroNome = dados.membroNome;
    APP.membroTipo = dados.membroTipo;
    APP.idPessoal = dados.idPessoal;
    iniciarApp();
  } else if (familia) {
    const dados = JSON.parse(familia);
    APP.familiaId = String(dados.familiaId);
    APP.codigoFamilia = dados.codigoFamilia;
    APP.nomeFamilia = dados.nomeFamilia;
    mostrarSelecaoPerfil();
  } else {
    mostrarLogin();
  }
}

function salvarSessao() {
  localStorage.setItem('applus_sessao', JSON.stringify({
    familiaId: APP.familiaId,
    membroId: APP.membroId,
    membroNome: APP.membroNome,
    membroTipo: APP.membroTipo,
    idPessoal: APP.idPessoal,
    codigoFamilia: APP.codigoFamilia
  }));
}

// ── SERVICE WORKER ──
async function registrarSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('SW registrado');
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data && e.data.tipo === 'tocar-alarme') iniciarSomAlarme();
        if (e.data && e.data.tipo === 'parar-alarme') pararSomAlarme();
        if (e.data && e.data.tipo === 'alarme-push') {
          const dados = e.data.dados;
          if (dados && dados.medicamento) {
            // Aguarda o app carregar completamente antes de disparar
            const tentarDisparar = (tentativas) => {
              if (tentativas <= 0) return;
              if (APP.familiaId && APP.membroId) {
                api('GET', '/api/medicamentos/' + APP.familiaId + '?membro_id=' + APP.membroId)
                  .then(meds => {
                    const med = meds.find(m => (dados.medId && m.id == dados.medId) || (dados.corpo && dados.corpo.includes(m.nome))) || meds[0];
                    if (med) {
                      navegarPara('remedios');
                      setTimeout(() => {
                        dispararAlarme(med);
                      }, 500);
                    }
                  }).catch(() => {});
              } else {
                setTimeout(() => tentarDisparar(tentativas - 1), 500);
              }
            };
            tentarDisparar(10);
          }
        }
      });
    } catch (e) { console.log('SW erro:', e); }
  }
}

// ── SOM DO ALARME ──
let _alarmeAudioCtx = null;
let _alarmeLoopTimer = null;

function iniciarSomAlarme() {
  pararSomAlarme();
  const freqs = [440, 523, 659, 784, 880];
  function tocarBeep() {
    try {
      _alarmeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = _alarmeAudioCtx.createOscillator();
      const gain = _alarmeAudioCtx.createGain();
      osc.connect(gain);
      gain.connect(_alarmeAudioCtx.destination);
      osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)];
      osc.type = 'square';
      gain.gain.setValueAtTime(1, _alarmeAudioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _alarmeAudioCtx.currentTime + 0.8);
      osc.start(_alarmeAudioCtx.currentTime);
      osc.stop(_alarmeAudioCtx.currentTime + 0.8);
    } catch(err) { console.warn('Erro som:', err); }
  }
  tocarBeep();
  _alarmeLoopTimer = setInterval(tocarBeep, 1200);
}

function pararSomAlarme() {
  if (_alarmeLoopTimer) { clearInterval(_alarmeLoopTimer); _alarmeLoopTimer = null; }
  if (_alarmeAudioCtx) { _alarmeAudioCtx.close().catch(() => {}); _alarmeAudioCtx = null; }
}

// ── LOGIN ──
function mostrarLogin() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('perfil-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'none';
}

function mostrarSelecaoPerfil() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('perfil-page').style.display = 'flex';
  document.getElementById('app-page').style.display = 'none';
  carregarPerfisDisponiveis();
}

function mostrarApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('perfil-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'flex';
}

async function carregarPerfisDisponiveis() {
  try {
    const membros = await api('GET', `/api/membros/familia/${APP.familiaId}`);
    const container = document.getElementById('lista-perfis');
    const titulo = document.getElementById('perfil-familia-nome');
    if (titulo) titulo.textContent = APP.nomeFamilia || 'Família';

    container.innerHTML = membros.map(m => `
      <div class="perfil-card" onclick="selecionarPerfil(${m.id}, '${m.nome.replace(/'/g,"\'")}', '${m.tipo}', '${m.id_pessoal}')">
        <div class="perfil-avatar">${avatarMembro(m.nome, m.tipo)}</div>
        <div class="perfil-nome">${m.nome.split(' ')[0]}</div>
        <div class="perfil-tipo">${m.tipo}</div>
      </div>`).join('') + `
      <div class="perfil-card perfil-add" onclick="abrirModal('modal-add-membro')">
        <div class="perfil-avatar" style="background:var(--cinza-claro);color:var(--cinza);border:2px dashed #ccc;box-shadow:none;font-size:32px">+</div>
        <div class="perfil-nome">Adicionar</div>
        <div class="perfil-tipo">novo membro</div>
      </div>`;
  } catch (e) {
    console.log('Erro perfis:', e);
  }
}

function selecionarPerfil(id, nome, tipo, idPessoal) {
  APP.membroId = id;
  APP.membroNome = nome;
  APP.membroTipo = tipo;
  APP.idPessoal = idPessoal;
  salvarSessaoMembro();
  iniciarApp();
}

async function adicionarMembro() {
  const nome = document.getElementById('add-mem-nome').value.trim();
  const tipo = document.getElementById('add-mem-tipo').value;
  if (!nome) return alerta('Digite o nome');

  // Se for criança, perguntar se é autista
  if (tipo === 'crianca') {
    APP._membroNomePendente = nome;
    fecharModal('modal-add-membro');
    abrirModal('modal-autismo');
    return;
  }

  await _salvarMembro(nome, tipo);
}

async function confirmarTipoCrianca(tipo) {
  fecharModal('modal-autismo');
  const nome = APP._membroNomePendente;
  if (!nome) return;
  await _salvarMembro(nome, tipo);
}

async function _salvarMembro(nome, tipo) {
  try {
    await api('POST', '/api/membros', {
      familia_id: APP.familiaId,
      nome, tipo, relacao: tipo
    });
    document.getElementById('add-mem-nome').value = '';
    APP._membroNomePendente = null;
    mostrarSelecaoPerfil();
  } catch (e) {
    alerta('Erro ao adicionar membro');
  }
}

async function criarFamilia() {
  const nome = document.getElementById('inp-nome-familia').value.trim();
  const sobrenome = document.getElementById('inp-nome-membro').value.trim();
  const membro = nome + ' ' + sobrenome;
  const tipo = document.getElementById('inp-tipo-membro').value;
  if (!nome || !sobrenome) return alerta('Preencha nome e sobrenome');

  try {
    const resFam = await api('POST', '/api/familias', { nome });
    const resMem = await api('POST', '/api/membros', {
      familia_id: resFam.id,
      nome: membro,
      tipo,
      relacao: tipo
    });
    APP.familiaId = String(resFam.id);
    APP.codigoFamilia = resFam.codigo;
    APP.nomeFamilia = resFam.nome;
    salvarSessaoFamilia();
    fecharModal('modal-criar');
    verificarPerfilCuidador(tipo, resMem.id);
  } catch (e) {
    alerta('Erro ao criar família: ' + e.message);
  }
}

async function salvarPerfilCuidador() {
  const dados = {
    membro_id: APP.membroAtivo?.id,
    cpf: document.getElementById('cuid-cpf').value.trim(),
    data_nascimento: document.getElementById('cuid-nascimento').value,
    telefone: document.getElementById('cuid-telefone').value.trim(),
    tipo_cuidador: document.getElementById('cuid-tipo').value,
    experiencia: document.getElementById('cuid-experiencia').value,
    especialidades: document.getElementById('cuid-especialidades').value,
    turno: document.getElementById('cuid-turno').value,
    observacoes: document.getElementById('cuid-observacoes').value.trim()
  };
  try {
    await api('POST', '/api/perfil-cuidador/salvar', dados);
    fecharModal('modal-perfil-cuidador');
    mostrarSelecaoPerfil();
  } catch (e) {
    alerta('Erro ao salvar perfil: ' + e.message);
  }
}

function verificarPerfilCuidador(tipo, membroId) {
  if (tipo === 'cuidador') {
    APP.membroAtivo = { id: membroId };
    abrirModal('modal-perfil-cuidador');
  } else {
    mostrarSelecaoPerfil();
  }
}

async function entrarFamilia() {
  const codigo = document.getElementById('inp-codigo-familia').value.trim().toUpperCase();
  const membro = document.getElementById('inp-nome-entrar').value.trim();
  const tipo = document.getElementById('inp-tipo-entrar').value;
  if (!codigo || !membro) return alerta('Preencha todos os campos');

  try {
    const fam = await api('GET', `/api/familias/${codigo}`);
    const mem = await api('POST', '/api/membros', {
      familia_id: fam.id,
      nome: membro,
      tipo,
      relacao: tipo
    });
    APP.familiaId = String(fam.id);
    APP.codigoFamilia = fam.codigo;
    APP.nomeFamilia = fam.nome;
    salvarSessaoFamilia();
    fecharModal('modal-entrar');
    verificarPerfilCuidador(tipo, mem.id);
  } catch (e) {
    alerta('Família não encontrada');
  }
}

async function recuperarAcesso() {
  const id = document.getElementById('inp-id-pessoal').value.trim().toUpperCase();
  if (!id) return alerta('Digite seu ID pessoal');

  try {
    const mem = await api('GET', `/api/membros/id/${id}`);
    APP.familiaId = String(mem.familia_id);
    APP.codigoFamilia = mem.codigo_familia;
    APP.nomeFamilia = mem.nome_familia;
    salvarSessaoFamilia();
    fecharModal('modal-recuperar');
    mostrarSelecaoPerfil();
  } catch (e) {
    alerta('ID não encontrado');
  }
}

// ── INICIAR APP ──
function iniciarApp() {
  mostrarApp();
  conectarSocket();
  iniciarAlarmes();
  inscreverPush();
  atualizarDropdown();
  navegarPara('home');
}

// ── NAVEGAÇÃO ──
function navegarPara(pagina) {
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));

  const el = document.getElementById(`pag-${pagina}`);
  if (el) el.classList.add('ativa');

  const nav = document.querySelector(`[data-nav="${pagina}"]`);
  if (nav) nav.classList.add('ativo');

  // Carregar dados da página
  if (pagina === 'home') carregarHome();
  if (pagina === 'remedios') carregarMedicamentos();
  if (pagina === 'agenda') carregarAgenda();
  if (pagina === 'chat') carregarChat();
  if (pagina === 'mais') carregarMais();
  if (pagina === 'historico') { carregarDoencas(); }
  if (pagina === 'tea') {
    // Buscar membro TEA da família
    api('GET', `/api/membros/familia/${APP.familiaId}`).then(membros => {
      const memTEA = membros.find(m => m.tipo === 'tea');
      if (memTEA) {
        if (typeof membroTEAId !== 'undefined') window.membroTEAId = memTEA.id;
      }
      carregarRotinaAdmin();
    });
  }
}

// ── API ──
async function api(metodo, url, corpo) {
  const opts = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' }
  };
  if (corpo) opts.body = JSON.stringify(corpo);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.erro || 'Erro na requisição');
  }
  return res.json();
}

// ── HOME ──
async function carregarHome() {
  document.getElementById('home-nome').textContent = `Olá, ${APP.membroNome.split(' ')[0]} 👋`;

  // Mostrar card TEA se família tem membro TEA
  try {
    const membros = await api('GET', `/api/membros/familia/${APP.familiaId}`);
    const temTEA = membros.some(m => m.tipo === 'tea');
    const cardTEA = document.getElementById('card-tea');
    if (cardTEA) cardTEA.style.display = temTEA ? 'flex' : 'none';
    if (temTEA) {
      const memTEA = membros.find(m => m.tipo === 'tea');
      if (memTEA) window._membroTEAId = memTEA.id;
    }
  } catch(e) {}
  document.getElementById('home-data').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const hoje = new Date().toISOString().split('T')[0];
    const eventos = await api('GET', `/api/eventos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const eventosHoje = eventos.filter(e => e.data === hoje);

    document.getElementById('home-status').textContent =
      `${meds.length} medicamento(s) · ${eventosHoje.length} evento(s) hoje`;

    const listaEventos = document.getElementById('home-eventos');
    listaEventos.innerHTML = eventosHoje.length
      ? eventosHoje.map(e => `
        <div class="item-lista">
          <span style="font-size:20px">${iconeTipoEvento(e.tipo)}</span>
          <div class="item-info">
            <div class="item-nome">${e.titulo}</div>
            <div class="item-sub">${e.hora || ''} ${e.local ? '· ' + e.local : ''}</div>
          </div>
          <span class="badge badge-info">${e.tipo}</span>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:16px">Nenhum evento hoje</p>';
  } catch (e) {
    console.log('Erro home:', e);
  }
}

function iconeTipoEvento(tipo) {
  const icons = { Consulta: '🏥', Exame: '🔬', Medicamento: '💊', Família: '👨‍👩‍👧', Outro: '📌' };
  return icons[tipo] || '📌';
}

// ── MEDICAMENTOS ──
async function carregarMedicamentos() {
  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const lista = document.getElementById('lista-medicamentos');
    lista.innerHTML = meds.length
      ? meds.map(m => `
        <div class="item-lista">
          <span style="font-size:24px">💊</span>
          <div class="item-info">
            <div class="item-nome">${m.nome} ${m.dosagem || ''}</div>
            <div class="item-sub">${formatarHorarios(m.horarios)} · ${m.via || 'Oral'}</div>
          </div>
          <button onclick="excluirMed(${m.id})" style="background:none;border:none;font-size:18px;cursor:pointer">🗑️</button>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum medicamento cadastrado</p>';
  } catch (e) {
    console.log('Erro meds:', e);
  }
}

function formatarHorarios(horarios) {
  if (!horarios) return '';
  const h = typeof horarios === 'string' ? JSON.parse(horarios) : horarios;
  return Array.isArray(h) ? h.join(', ') : h;
}

async function salvarMedicamento() {
  const nome = document.getElementById('med-nome').value.trim();
  const dosagem = document.getElementById('med-dosagem').value.trim();
  const horarios = document.getElementById('med-horarios').value.split(',').map(h => h.trim()).filter(Boolean);
  const via = document.getElementById('med-via').value;
  const estoque = document.getElementById('med-estoque').value;

  if (!nome || !horarios.length) return alerta('Preencha nome e horários');

  try {
    await api('POST', '/api/medicamentos', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      nome, dosagem, horarios, via,
      estoque: estoque || 0
    });
    fecharModal('modal-add-med');
    limparFormMed();
    carregarMedicamentos();
    iniciarAlarmes();
  } catch (e) {
    alerta('Erro ao salvar: ' + e.message);
  }
}

async function excluirMed(id) {
  if (!confirm('Excluir medicamento?')) return;
  await api('DELETE', `/api/medicamentos/${id}`);
  carregarMedicamentos();
}

let horariosAdicionados = [];

function adicionarHorarioMed() {
  const input = document.getElementById('med-horario-novo');
  const horario = input.value;
  if (!horario) return alerta('Selecione um horário');
  if (horariosAdicionados.includes(horario)) return alerta('Horário já adicionado');

  horariosAdicionados.push(horario);
  horariosAdicionados.sort();
  atualizarTagsHorario();
  input.value = '';
}

function removerHorario(horario) {
  horariosAdicionados = horariosAdicionados.filter(h => h !== horario);
  atualizarTagsHorario();
}

function atualizarTagsHorario() {
  const container = document.getElementById('horarios-tags');
  container.innerHTML = horariosAdicionados.map(h => `
    <div style="display:flex;align-items:center;gap:6px;background:var(--verde);color:white;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600">
      ⏰ ${h}
      <button onclick="removerHorario('${h}')" style="background:none;border:none;color:white;font-size:16px;cursor:pointer;padding:0;line-height:1">×</button>
    </div>`).join('');
  document.getElementById('med-horarios').value = horariosAdicionados.join(', ');
}

function limparFormMed() {
  ['med-nome','med-dosagem','med-horarios','med-estoque'].forEach(id => {
    document.getElementById(id).value = '';
  });
  horariosAdicionados = [];
  atualizarTagsHorario();
}

// ── ALARMES ──
APP.alarmesConfirmados = APP.alarmesConfirmados || new Set();

async function iniciarAlarmes() {
  if (APP.alarmeInterval) clearInterval(APP.alarmeInterval);
  APP.alarmeInterval = setInterval(verificarAlarmes, 30000);
  verificarAlarmes();
}

async function verificarAlarmes() {
  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

    for (const med of meds) {
      const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
      if (!Array.isArray(horarios)) continue;

      for (const horario of horarios) {
        const chave = `${med.id}-${horario}-${horaAtual}`;
        if (horario === horaAtual && !APP.alarmesConfirmados.has(chave)) {
          APP.alarmesConfirmados.add(chave);
          dispararAlarme(med);
          break;
        }
      }
    }
  } catch (e) {
    console.log('Erro alarmes:', e);
  }
}

function dispararAlarme(med) {
  const overlay = document.getElementById('alarme-overlay');
  document.getElementById('alarme-nome').textContent = med.nome;
  document.getElementById('alarme-dose').textContent = med.dosagem || '';
  overlay.classList.add('ativo');
  iniciarSomAlarme();

  // Voz
  falarAlarme(`Atenção! Está na hora de tomar ${med.nome}. A dose é ${med.dosagem || 'conforme prescrito'}. Por favor tome o seu medicamento agora.`);

  // Repetir a cada 2 min
  APP.alarmeRepetir = setInterval(() => {
    falarAlarme(`Atenção! Está na hora de tomar ${med.nome}.`);
  }, 120000);

  overlay.dataset.medId = med.id;
}

function falarAlarme(texto) {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }
}

async function confirmarDose(status) {
  const medId = document.getElementById('alarme-overlay').dataset.medId;
  clearInterval(APP.alarmeRepetir);
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');
  APP.alarmeAtivo = null;

  await api('POST', '/api/medicamentos/historico', {
    med_id: medId,
    membro_id: APP.membroId,
    status,
    motivo: status === 'pulado' ? 'Usuário pulou' : null
  });
}

function lembrarDepois() {
  clearInterval(APP.alarmeRepetir);
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');
  setTimeout(() => {
    const medId = document.getElementById('alarme-overlay').dataset.medId;
    api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`).then(meds => {
      const med = meds.find(m => m.id == medId);
      if (med) dispararAlarme(med);
    });
  }, 900000); // 15 min
}

// ── AGENDA ──
async function carregarAgenda() {
  try {
    const eventos = await api('GET', `/api/eventos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const lista = document.getElementById('lista-eventos');
    lista.innerHTML = eventos.length
      ? eventos.map(e => `
        <div class="item-lista">
          <span style="font-size:24px">${iconeTipoEvento(e.tipo)}</span>
          <div class="item-info">
            <div class="item-nome">${e.titulo}</div>
            <div class="item-sub">${formatarData(e.data)} ${e.hora || ''} ${e.local ? '· ' + e.local : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge badge-info">${e.tipo}</span>
            <button onclick="excluirEvento(${e.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum evento cadastrado</p>';
  } catch (e) {
    console.log('Erro agenda:', e);
  }
}

async function salvarEvento() {
  const titulo = document.getElementById('ev-titulo').value.trim();
  const data = document.getElementById('ev-data').value;
  const hora = document.getElementById('ev-hora').value;
  const tipo = document.getElementById('ev-tipo').value;
  const local = document.getElementById('ev-local').value.trim();

  if (!titulo || !data) return alerta('Preencha título e data');

  try {
    await api('POST', '/api/eventos', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      titulo, data, hora, tipo, local
    });
    fecharModal('modal-add-evento');
    carregarAgenda();
  } catch (e) {
    alerta('Erro ao salvar evento: ' + e.message);
  }
}

async function excluirEvento(id) {
  if (!confirm('Excluir evento?')) return;
  await api('DELETE', `/api/eventos/${id}`);
  carregarAgenda();
}

// ── CHAT ──
let socketChat = null;

function conectarSocket() {
  if (typeof io === 'undefined') return;
  APP.socket = io();
  APP.socket.emit('entrar-familia', APP.familiaId);

  APP.socket.on('nova-mensagem', (msg) => {
    if (msg.autor_id !== APP.idPessoal) {
      adicionarMensagemChat(msg, false);
    }
  });

  APP.socket.on('alerta-emergencia', (data) => {
    mostrarAlertaEmergencia(data);
  });
}

async function carregarChat() {
  try {
    const msgs = await api('GET', `/api/mensagens/${APP.familiaId}`);
    const container = document.getElementById('chat-mensagens');
    container.innerHTML = msgs.map(m => mensagemHTML(m)).join('');
    container.scrollTop = container.scrollHeight;
  } catch (e) {
    console.log('Erro chat:', e);
  }
}

function mensagemHTML(msg) {
  const propria = (msg.autor_id && msg.autor_id === APP.idPessoal) || (!msg.autor_id && msg.autor === APP.membroNome);
  return `
    <div class="msg ${propria ? 'propria' : 'outra'}">
      ${!propria ? `<div class="msg-autor">${msg.autor}</div>` : ''}
      ${msg.texto}
      <div class="msg-hora">${formatarHora(msg.criado_em)}</div>
    </div>`;
}

async function enviarMensagem() {
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if (!texto) return;

  const msg = {
    familia_id: APP.familiaId,
    autor: APP.membroNome,
    autor_id: APP.idPessoal,
    texto,
    categoria: 'Geral'
  };

  input.value = '';
  adicionarMensagemChat(msg, true);

  await api('POST', '/api/mensagens', msg);
  if (APP.socket) APP.socket.emit('mensagem', msg);
}

function adicionarMensagemChat(msg, propria) {
  const container = document.getElementById('chat-mensagens');
  const div = document.createElement('div');
  div.className = `msg ${propria ? 'propria' : 'outra'}`;
  div.innerHTML = `
    ${!propria ? `<div class="msg-autor">${msg.autor}</div>` : ''}
    ${msg.texto}
    <div class="msg-hora">${formatarHora(msg.criado_em || new Date())}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// ── EMERGÊNCIA ──
async function dispararEmergencia(tipo) {
  const data = {
    familiaId: APP.familiaId,
    autor: APP.membroNome,
    tipo,
    hora: new Date().toLocaleTimeString('pt-BR')
  };

  if (APP.socket) APP.socket.emit('emergencia', data);

  await api('POST', '/api/push/enviar-familia', {
    familia_id: APP.familiaId,
    titulo: `🚨 EMERGÊNCIA — ${APP.membroNome}`,
    corpo: `${tipo} reportado às ${data.hora}`,
    url: '/'
  });

  alerta(`Alerta de ${tipo} enviado para toda a família!`);
}

function mostrarAlertaEmergencia(data) {
  const msg = `🚨 EMERGÊNCIA!\n${data.autor} reportou: ${data.tipo}\nÀs ${data.hora}`;
  alert(msg);
}

// ── ASSISTENTE IA ──
async function perguntarIA() {
  const input = document.getElementById('ia-input');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('ia-mensagens');
  input.value = '';

  container.innerHTML += `<div class="ia-msg-user fade-up">${pergunta}</div>`;
  container.innerHTML += `<div class="ia-digitando" id="ia-digitando"><span></span><span></span><span></span></div>`;
  container.scrollTop = container.scrollHeight;

  try {
    const res = await api('POST', '/api/ia/perguntar', {
      pergunta,
      membro_id: APP.membroId,
      familia_id: APP.familiaId
    });

    document.getElementById('ia-digitando')?.remove();
    container.innerHTML += `<div class="ia-msg-bot fade-up">${res.resposta}</div>`;
    container.scrollTop = container.scrollHeight;
  } catch (e) {
    document.getElementById('ia-digitando')?.remove();
    container.innerHTML += `<div class="ia-msg-bot">Erro ao conectar com o assistente.</div>`;
  }
}

// ── MAIS (perfil, sinais, vacinas, etc.) ──
function carregarMais() {
  document.getElementById('mais-nome').textContent = APP.membroNome;
  document.getElementById('mais-id').textContent = APP.idPessoal;
  document.getElementById('mais-familia').textContent = APP.codigoFamilia;

  const qrSection = document.getElementById('kids-qr-section');
  if (qrSection) {
    if (APP.membroTipo === 'crianca') {
      qrSection.style.display = 'block';
      document.getElementById('kids-qr-section').style.background = '#fff8f0';
      document.getElementById('kids-qr-section').style.borderColor = '#fed7aa';
      document.querySelector('#kids-qr-section [style*="color:#f97316"]').textContent = '📱 Acesso Kids';
      gerarQRCodeKids(APP.idPessoal);
    } else if (APP.membroTipo === 'tea') {
      qrSection.style.display = 'block';
      qrSection.style.background = '#f0f9ff';
      qrSection.style.borderColor = '#7dd3fc';
      document.querySelector('#kids-qr-section [style*="color:#f97316"]').textContent = '🧩 Acesso TEA';
      gerarQRCodeTEA(APP.idPessoal);
    } else {
      qrSection.style.display = 'none';
    }
  }
}

function gerarQRCodeKids(idPessoal) {
  const url = `${window.location.origin}/kids.html?id=${idPessoal}`;
  const img = document.getElementById('kids-qr-canvas');
  const idEl = document.getElementById('kids-qr-id');
  if (img) img.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&color=f97316&bgcolor=fff8f0`;
  if (idEl) idEl.textContent = idPessoal;
}

function compartilharKids() {
  const url = `${window.location.origin}/kids.html?id=${APP.idPessoal}`;
  const texto = `Olá! Este é o link do AP+ Kids:
${url}

Seu ID: ${APP.idPessoal}`;
  if (navigator.share) {
    navigator.share({ title: 'AP+ Kids', text: texto });
  } else {
    navigator.clipboard.writeText(url);
    alerta('Link copiado!');
  }
}

function trocarPerfil() {
  APP.membroId = null;
  APP.membroNome = null;
  APP.membroTipo = null;
  APP.idPessoal = null;
  localStorage.removeItem('applus_sessao');
  mostrarSelecaoPerfil();
}

function sair() {
  localStorage.clear();
  window.location.href = '/';
}

// ── PUSH ──
async function inscreverPush() {
  if (!('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;

    // Usar a chave pública fixa do servidor
    const VAPID_PUBLIC_KEY = 'BO6JXBRmtjSjiM9OAa7NSy2CtZS6x_caWM582FMie8idIzpapx8McDuQl62PChqMHxQAELiE1ja1kHDmK91nLGE';

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await api('POST', '/api/push/inscrever', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      subscription: sub
    });
    console.log('Push inscrito com sucesso!');
  } catch (e) {
    console.log('Push não disponível:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ── MODAIS ──
function abrirModal(id) {
  document.getElementById(id).classList.add('aberto');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('aberto');
}

// ── UTILITÁRIOS ──
function alerta(msg) {
  alert(msg);
}

function formatarData(data) {
  if (!data) return '';
  const d = data.includes('T') ? data.split('T')[0] : data;
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

function formatarHora(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Enter no chat
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.id === 'chat-input') enviarMensagem();
  if (e.key === 'Enter' && document.activeElement.id === 'ia-input') perguntarIA();
});

// ── DROPDOWN TROCA DE PERFIL ──
async function atualizarDropdown() {
  try {
    const membros = await api('GET', `/api/membros/familia/${APP.familiaId}`);
    const lista = document.getElementById('dropdown-lista');
    const avatar = document.getElementById('dropdown-avatar');
    const nomeEl = document.getElementById('dropdown-nome');

    if (avatar) avatar.textContent = avatarMembro(APP.membroNome, APP.membroTipo);
    if (nomeEl) nomeEl.textContent = APP.membroNome.split(' ')[0];

    if (lista) {
      lista.innerHTML = membros.map(m => `
        <button class="dropdown-item ${m.id == APP.membroId ? 'ativo' : ''}"
          onclick="trocarParaPerfil(${m.id}, '${m.nome}', '${m.tipo}', '${m.id_pessoal}')">
          <div class="av">${avatarMembro(m.nome, m.tipo)}</div>
          <div class="dropdown-item-info">
            <div class="dn">${m.nome.split(' ')[0]}</div>
            <div class="dt">${m.tipo}</div>
          </div>
          ${m.id == APP.membroId ? '<span style="color:var(--verde);font-size:14px">✓</span>' : ''}
        </button>`).join('');
    }
  } catch (e) {
    console.log('Erro dropdown:', e);
  }
}

function toggleDropdown() {
  const dropdown = document.getElementById('perfil-dropdown');
  dropdown.classList.toggle('aberto');
}

function fecharDropdown() {
  const dropdown = document.getElementById('perfil-dropdown');
  dropdown.classList.remove('aberto');
}

function trocarParaPerfil(id, nome, tipo, idPessoal) {
  fecharDropdown();
  APP.membroId = id;
  APP.membroNome = nome;
  APP.membroTipo = tipo;
  APP.idPessoal = idPessoal;
  salvarSessaoMembro();
  atualizarDropdown();
  navegarPara('home');
}

function avatarMembro(nome, tipo) {
  const emojis = {
    administrador: '👤',
    cuidador: '🧑‍⚕️',
    idoso: '🧓',
    crianca: '👶'
  };
  return emojis[tipo] || nome.charAt(0).toUpperCase();
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
  const selector = document.querySelector('.perfil-selector');
  if (selector && !selector.contains(e.target)) fecharDropdown();
});

// ── QR CODE TEA ──
function gerarQRCodeTEA(idPessoal) {
  const url = `${window.location.origin}/tea.html?id=${idPessoal}`;
  const img = document.getElementById('kids-qr-canvas');
  const idEl = document.getElementById('kids-qr-id');
  if (img) img.src = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&color=0ea5e9&bgcolor=f0f9ff`;
  if (idEl) idEl.textContent = idPessoal;
}
