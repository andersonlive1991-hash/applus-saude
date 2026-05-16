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

  // Se for cuidador, abrir perfil do cuidador
  if (tipo === 'cuidador') {
    APP._membroNomePendente = nome;
    APP._membroTipoPendente = tipo;
    fecharModal('modal-add-membro');
    await _criarMembroCuidador(nome, tipo);
    return;
  }

  await _salvarMembro(nome, tipo);
}

async function _criarMembroCuidador(nome, tipo) {
  try {
    const mem = await api('POST', '/api/membros', {
      familia_id: APP.familiaId,
      nome, tipo, relacao: tipo
    });
    APP.membroAtivo = mem;
    abrirModal('modal-perfil-cuidador');
  } catch(e) {
    alerta('Erro ao criar cuidador: ' + e.message);
  }
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

  // Ler DOM antes de qualquer await
  const dia = document.getElementById('inp-data-dia')?.value || '';
  const mes = document.getElementById('inp-data-mes')?.value || '';
  const ano = document.getElementById('inp-data-ano')?.value || '';
  const dataNasc = (dia && mes && ano) ? ano + '-' + mes + '-' + dia : '';
  const tipoSangue = document.getElementById('inp-tipo-sangue')?.value || '';
  const alergias = document.getElementById('inp-alergias')?.value.trim() || '';
  const cpf = document.getElementById('inp-cpf')?.value.trim() || '';
  const cartaoSus = document.getElementById('inp-cartao-sus')?.value.trim() || '';
  const convenio = document.getElementById('inp-convenio')?.value.trim() || '';
  const contatoEmerg = document.getElementById('inp-contato-emerg')?.value.trim() || '';
  const telEmerg = document.getElementById('inp-tel-emerg')?.value.trim() || '';


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

    

    const temDados = dataNasc || tipoSangue || alergias || cpf || cartaoSus || convenio || contatoEmerg || telEmerg;
    if (temDados) {
      const membroId = resMem.id;
      const dadosPerfil = {
        membro_id: membroId,
        nome_completo: membro,
        data_nascimento: dataNasc !== '' ? dataNasc : null,
        tipo_sanguineo: tipoSangue !== '' ? tipoSangue : null,
        alergias: alergias !== '' ? alergias : null,
        cpf: cpf !== '' ? cpf : null,
        cartao_sus: cartaoSus !== '' ? cartaoSus : null,
        convenio: convenio !== '' ? convenio : null,
        contato_emergencia: contatoEmerg !== '' ? contatoEmerg : null,
        tel_emergencia: telEmerg !== '' ? telEmerg : null
      };
      try {
        alerta('Enviando: ' + JSON.stringify(dadosPerfil).substring(0, 100));
      const respPerfil = await fetch('/api/perfil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosPerfil)
        });
        const jsonPerfil = await respPerfil.json();
        alerta('Resposta: ' + JSON.stringify(jsonPerfil).substring(0, 100));
      } catch(ep) {
        console.log('Erro perfil:', ep.message);
      }
    }

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
    mostrarQRCodeCuidador();
  } catch (e) {
    alerta('Erro ao salvar perfil: ' + e.message);
  }
}

async function mostrarQRCodeCuidador() {
  const codigoFamilia = APP.codigoFamilia;
  const idCuidador = APP.membroAtivo?.id_pessoal || '';
  const link = 'https://applus-saude.onrender.com?familia=' + codigoFamilia + '&cuidador=' + idCuidador;
  document.getElementById('qr-codigo-familia').textContent = codigoFamilia;
  document.getElementById('qr-id-cuidador').textContent = idCuidador;
  abrirModal('modal-qrcode-cuidador');
  // Gerar QR Code via API do servidor
  try {
    const res = await api('POST', '/api/qrcode', { texto: link });
    const canvas = document.getElementById('qrcode-cuidador-canvas');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
    };
    img.src = res.qrcode;
  } catch (e) {
    console.log('QR Code erro:', e);
  }
}

async function verificarPerfilCuidador(tipo, membroId) {
  if (tipo === 'cuidador') {
    try {
      const membros = await api('GET', '/api/membros/' + APP.familiaId);
      const mem = membros.find(m => m.id === membroId) || { id: membroId };
      APP.membroAtivo = mem;
    } catch(e) {
      APP.membroAtivo = { id: membroId };
    }
    abrirModal('modal-perfil-cuidador');
  } else {
    mostrarSelecaoPerfil();
  }
}

function trocarAbaEntrar(aba) {
  const familiar = document.getElementById('form-entrar-familiar');
  const cuidador = document.getElementById('form-entrar-cuidador');
  const btnFamiliar = document.getElementById('aba-familiar');
  const btnCuidador = document.getElementById('aba-cuidador');
  if (aba === 'familiar') {
    familiar.style.display = 'block';
    cuidador.style.display = 'none';
    btnFamiliar.style.background = '#1a9e6e';
    btnFamiliar.style.color = 'white';
    btnCuidador.style.background = 'white';
    btnCuidador.style.color = '#1a9e6e';
  } else {
    familiar.style.display = 'none';
    cuidador.style.display = 'block';
    btnCuidador.style.background = '#1a9e6e';
    btnCuidador.style.color = 'white';
    btnFamiliar.style.background = 'white';
    btnFamiliar.style.color = '#1a9e6e';
  }
}

async function entrarComoCuidador() {
  const codigo = document.getElementById('inp-codigo-cuidador').value.trim().toUpperCase();
  const idCuidador = document.getElementById('inp-id-cuidador').value.trim().toUpperCase();
  if (!codigo || !idCuidador) return alerta('Preencha o código da família e o ID do cuidador');
  try {
    const fam = await api('GET', '/api/familias/' + codigo);
    const mem = await api('GET', '/api/membros/id/' + idCuidador);
    if (String(mem.familia_id) !== String(fam.id)) return alerta('ID do cuidador não pertence a esta família');
    if (mem.tipo !== 'cuidador') return alerta('Este ID não é de um cuidador');
    APP.familiaId = String(fam.id);
    APP.codigoFamilia = fam.codigo;
    APP.nomeFamilia = fam.nome;
    APP.membroId = mem.id;
    APP.membroNome = mem.nome;
    APP.membroTipo = mem.tipo;
    APP.idPessoal = mem.id_pessoal;
    localStorage.setItem('membroAtivoId', mem.id_pessoal);
    salvarSessaoMembro();
    fecharModal('modal-entrar');
    iniciarApp();
  } catch(e) {
    alerta('Família ou ID do cuidador não encontrado');
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
  if (Notification.permission === 'granted') {
    inscreverPush();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') inscreverPush();
    });
  }
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
  if (pagina === 'checklist') carregarChecklist();
  if (pagina === 'escala') carregarEscala();
  if (pagina === 'historico') { carregarDoencas(); }
  if (pagina === 'cuidados') {
    if (APP.membroTipo === 'cuidador') {
      // Cuidador vê formulários para registrar
      document.getElementById('cuidados-view-cuidador').style.display = 'block';
      document.getElementById('cuidados-view-familia').style.display = 'none';
      trocarAbaCuidados('atividades');
    } else {
      // Família vê feed em tempo real
      document.getElementById('cuidados-view-cuidador').style.display = 'none';
      document.getElementById('cuidados-view-familia').style.display = 'block';
      carregarFeedCuidados();
    }
  }
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
    api('POST', '/api/interacoes/verificar', { membro_id: APP.membroId, nome_novo: nome }).then(r => { if (r && r.alerta) alert('⚠️ Interação\n\n' + r.alerta); }).catch(() => {});
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
  registrarEventosSOS();

  APP.socket.on('nova-mensagem', (msg) => {
    if (msg.autor_id !== APP.idPessoal) {
      adicionarMensagemChat(msg, false);
    }
  });

  APP.socket.on('tea-comunicou', (data) => {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:16px 24px;background:#0ea5e9;color:#fff;font-size:15px;font-weight:600;z-index:99999;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center';
    div.innerHTML = data.emoji + ' <b>' + data.nome + '</b> disse: ' + data.texto + '<br><small>' + data.hora + '</small>';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 8000);
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(data.nome + ' disse: ' + data.texto);
      u.lang = 'pt-BR';
      speechSynthesis.speak(u);
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
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;top:0;left:0;width:100%;padding:20px;background:#ef4444;color:#fff;font-size:16px;font-weight:700;z-index:99999;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
  div.innerHTML = '🚨 EMERGÊNCIA! ' + (data.autor || 'Familiar') + ' precisa de ajuda!';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 8000);
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

async function excluirPerfil() {
  try {
    const membros = await api('GET', `/api/membros/familia/${APP.familiaId}`);
    const lista = document.getElementById('lista-excluir-perfis');
    lista.innerHTML = membros.map(m => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem;border:1px solid #eee;border-radius:8px;margin-bottom:0.5rem">
        <div>
          <strong>${m.nome.split(' ')[0]}</strong>
          <span style="font-size:0.8rem;color:#999;margin-left:0.5rem">${m.tipo}</span>
        </div>
        <button onclick="confirmarExcluirMembro(${m.id}, '${m.nome.split(' ')[0]}')"
          style="background:#fff0f0;color:#e74c3c;border:1px solid #e74c3c;border-radius:6px;padding:0.3rem 0.7rem;cursor:pointer">
          Excluir
        </button>
      </div>`).join('');
    abrirModal('modal-excluir-perfil');
  } catch(e) {
    alerta('Erro ao carregar perfis');
  }
}

async function confirmarExcluirMembro(membroId, nome) {
  if (!confirm('Tem certeza que deseja excluir o perfil de ' + nome + '? Esta ação não pode ser desfeita.')) return;
  try {
    await api('DELETE', '/api/membros/' + membroId);
    fecharModal('modal-excluir-perfil');
    alerta('Perfil de ' + nome + ' excluído com sucesso!');
    // Se excluiu o próprio perfil, sair
    if (membroId == APP.membroId) {
      sair();
    }
  } catch(e) {
    alerta('Erro ao excluir perfil: ' + e.message);
  }
}

async function confirmarExcluirTodos() {
  if (!confirm('Tem certeza que deseja excluir TODOS os perfis da família? Esta ação não pode ser desfeita.')) return;
  try {
    await api('DELETE', '/api/familias/' + APP.familiaId);
    fecharModal('modal-excluir-perfil');
    sair();
  } catch(e) {
    alerta('Erro ao excluir família: ' + e.message);
  }
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
    const VAPID_PUBLIC_KEY = 'BO6JXBRmtjSjiM9OAa7NSy2CtZS6x_caWM582FMie8idIzpapx8McDuQl62PChqMHxQAELiE1ja1kHDmK91nLGE';
    // Reutilizar inscrição existente — não recriar a cada carregamento
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('Push: nova inscrição criada');
    } else {
      console.log('Push: inscrição existente reutilizada');
    }
    await api('POST', '/api/push/inscrever', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      subscription: sub
    });
  } catch (e) {
    console.log('Push não disponível:', e); try { await api("POST", "/api/push/erro-log", { erro: e.message, membro_id: APP.membroId, familia_id: APP.familiaId }); } catch(_) {}
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}


// ── ATIVAR PUSH MANUALMENTE ──
async function ativarNotificacoes() {
  if (Notification.permission === 'granted') {
    await inscreverPush();
    alerta('Notificações já estão ativas!', 'ok');
    return;
  }
  if (Notification.permission === 'denied') {
    alerta('Notificações bloqueadas. Libere nas configurações do Chrome.', 'erro');
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    await inscreverPush();
    alerta('Notificações ativadas com sucesso!', 'ok');
  } else {
    alerta('Permissão negada. As notificações não funcionarão.', 'erro');
  }
}


// ── CHECKLIST ──
async function carregarChecklist() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const tarefas = await api('GET', '/api/checklist/' + APP.familiaId + '?data=' + hoje);
    const lista = document.getElementById('lista-checklist');
    if (!lista) return;
    if (!tarefas.length) {
      lista.innerHTML = '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma tarefa para hoje</p>';
      return;
    }
    lista.innerHTML = tarefas.map(t => '<div class="item-lista" style="display:flex;align-items:center;gap:12px;opacity:' + (t.concluida ? 0.5 : 1) + '"><input type="checkbox" ' + (t.concluida ? 'checked' : '') + ' onchange="toggleTarefa(' + t.id + ', this.checked)" style="width:20px;height:20px;cursor:pointer"><div class="item-info" style="flex:1;text-decoration:' + (t.concluida ? 'line-through' : 'none') + '"><div class="item-nome">' + t.tarefa + '</div></div><button onclick="excluirTarefa(' + t.id + ')" style="background:none;border:none;font-size:18px;cursor:pointer;color:#ef4444">🗑</button></div>').join('');
  } catch (e) { console.log('Erro checklist:', e); }
}

async function salvarTarefa() {
  const tarefa = document.getElementById('tar-nome').value.trim();
  if (!tarefa) return alerta('Digite a tarefa');
  try {
    await api('POST', '/api/checklist', { familia_id: APP.familiaId, membro_id: APP.membroId, tarefa });
    document.getElementById('tar-nome').value = '';
    fecharModal('modal-add-tarefa');
    carregarChecklist();
  } catch (e) { alerta('Erro ao salvar tarefa'); }
}

async function toggleTarefa(id, concluida) {
  try {
    await api('PUT', '/api/checklist/' + id, { concluida });
    carregarChecklist();
  } catch (e) { alerta('Erro ao atualizar tarefa'); }
}

async function excluirTarefa(id) {
  await api('DELETE', '/api/checklist/' + id);
  carregarChecklist();
}


// ── ESCALA DE CUIDADO ──
async function carregarEscala() {
  try {
    const turnos = await api('GET', '/api/escala/' + APP.familiaId);
    const lista = document.getElementById('lista-escala');
    if (!lista) return;
    if (!turnos.length) {
      lista.innerHTML = '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum turno cadastrado</p>';
      return;
    }
    const dias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
    let html = '';
    dias.forEach(dia => {
      const dodia = turnos.filter(t => t.dia_semana === dia);
      if (!dodia.length) return;
      html += '<div style="font-weight:600;color:var(--verde);padding:8px 0 4px">' + dia + '</div>';
      dodia.forEach(t => {
        html += '<div class="item-lista" style="display:flex;align-items:flex-start;gap:12px">' +
          '<div style="font-size:22px">' + (t.turno === 'Manhã' ? '🌅' : t.turno === 'Tarde' ? '☀️' : '🌙') + '</div>' +
          '<div class="item-info" style="flex:1">' +
          '<div class="item-nome">' + t.turno + ' — ' + (t.membro_nome || 'Sem responsável') + '</div>' +
          '<div style="font-size:12px;color:var(--cinza);margin-top:2px">' + (t.tarefas || '') + '</div>' +
          '</div>' +
          '<button onclick="excluirTurno(' + t.id + ')" style="background:none;border:none;font-size:18px;cursor:pointer;color:#ef4444">🗑</button>' +
          '</div>';
      });
    });
    lista.innerHTML = html;
  } catch (e) { console.log('Erro escala:', e); }
}

async function salvarEscala() {
  const dia_semana = document.getElementById('esc-dia').value;
  const turno = document.getElementById('esc-turno').value;
  const tarefas = document.getElementById('esc-tarefas').value.trim();
  try {
    await api('POST', '/api/escala', { familia_id: APP.familiaId, membro_id: APP.membroId, dia_semana, turno, tarefas });
    document.getElementById('esc-tarefas').value = '';
    fecharModal('modal-add-escala');
    carregarEscala();
  } catch (e) { alerta('Erro ao salvar turno'); }
}

async function excluirTurno(id) {
  if (!confirm('Excluir turno?')) return;
  await api('DELETE', '/api/escala/' + id);
  carregarEscala();
}


// ── HISTÓRICO TEA ──
async function carregarHistoricoTEA() {
  const lista = document.getElementById('lista-historico-tea');
  if (!lista) return;
  try {
    const membros = await api('GET', '/api/membros/familia/' + APP.familiaId);
    const memTEA = membros.filter(m => m.tipo === 'tea');
    if (!memTEA.length) {
      lista.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:24px">Nenhum membro TEA cadastrado</p>';
      return;
    }
    const hoje = new Date().toISOString().split('T')[0];
    let html = '';
    for (const mem of memTEA) {
      const hist = await api('GET', '/api/historico-tea/' + mem.id + '?data=' + hoje);
      html += '<div style="font-weight:600;color:#0ea5e9;padding:8px 0 4px">' + mem.nome + ' — hoje</div>';
      if (!hist.length) {
        html += '<p style="color:#999;font-size:13px;padding:8px 0">Nenhuma comunicação hoje</p>';
      } else {
        hist.forEach(h => {
          const hora = new Date(h.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
          html += '<div class="item-lista" style="display:flex;align-items:center;gap:12px">' +
            '<div style="font-size:28px">' + (h.emoji || '💬') + '</div>' +
            '<div class="item-info" style="flex:1">' +
            '<div class="item-nome">' + h.frase + '</div>' +
            '<div style="font-size:12px;color:#999">' + hora + '</div>' +
            '</div></div>';
        });
      }
    }
    lista.innerHTML = html;
  } catch (e) { lista.innerHTML = '<p style="color:#999;font-size:13px;text-align:center;padding:24px">Erro ao carregar histórico</p>'; }
}

// ── MODAIS ──
function mostrarIdPessoal() {
  document.getElementById("escolha-acesso").style.display = "none";
  document.getElementById("form-id-pessoal").style.display = "block";
}

function voltarEscolhaAcesso() {
  document.getElementById("form-id-pessoal").style.display = "none";
  document.getElementById("escolha-acesso").style.display = "block";
}

function abrirModal(id) {
  document.getElementById(id).classList.add('aberto');
}

function fecharModal(id) {
  document.getElementById(id).classList.remove('aberto');
  if (id === 'modal-recuperar') {
    const e = document.getElementById('escolha-acesso');
    const f = document.getElementById('form-id-pessoal');
    if (e) e.style.display = 'block';
    if (f) f.style.display = 'none';
  }
}

// ── UTILITÁRIOS ──
function alerta(msg, tipo) {
  const div = document.createElement('div');
  const bg = tipo === 'erro' ? '#ef4444' : tipo === 'aviso' ? '#f59e0b' : '#1a9e6e';
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:12px 24px;background:' + bg + ';color:#fff;font-size:14px;font-weight:500;z-index:99999;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
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
      const ehCuidador = APP.membroTipo === 'cuidador';
      const membrosVisiveis = ehCuidador ? membros.filter(m => m.id == APP.membroId) : membros;

      lista.innerHTML = membrosVisiveis.map(m => `
        <button class="dropdown-item ${m.id == APP.membroId ? 'ativo' : ''}"
          onclick="trocarParaPerfil(${m.id}, '${m.nome}', '${m.tipo}', '${m.id_pessoal}')">
          <div class="av">${avatarMembro(m.nome, m.tipo)}</div>
          <div class="dropdown-item-info">
            <div class="dn">${m.nome.split(' ')[0]}</div>
            <div class="dt">${m.tipo}</div>
          </div>
          ${m.id == APP.membroId ? '<span style="color:var(--verde);font-size:14px">✓</span>' : ''}
        </button>`).join('') + (ehCuidador ? '' : `
        <button class="dropdown-item" onclick="fecharDropdown();abrirModal('modal-add-membro')">
          <div class="av" style="background:var(--cinza-claro);color:var(--cinza);font-size:20px">+</div>
          <div class="dropdown-item-info">
            <div class="dn">Adicionar membro</div>
          </div>
        </button>`);
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
// ── CUIDADOS ──

function trocarAbaCuidados(aba) {
  ['atividades','humor','alimentacao','hidratacao','sono','intercorrencias'].forEach(a => {
    document.getElementById('cuid-' + a).style.display = a === aba ? 'block' : 'none';
    const btn = document.getElementById('aba-cuid-' + a);
    if (btn) btn.classList.toggle('ativa', a === aba);
  });
  if (aba === 'atividades') carregarAtividades();
  if (aba === 'humor') carregarHumorIdoso();
  if (aba === 'alimentacao') carregarRefeicoes();
  if (aba === 'hidratacao') carregarHidratacao();
  if (aba === 'sono') carregarSono();
  if (aba === 'intercorrencias') carregarIntercorrencias();
}

// ATIVIDADES
async function salvarAtividade() {
  const tipo = document.getElementById('ativ-tipo').value;
  const hora = document.getElementById('ativ-hora').value;
  const obs = document.getElementById('ativ-obs').value.trim();
  try {
    await api('POST', '/api/cuidados/atividade', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      tipo, hora, obs
    });
    fecharModal('modal-nova-atividade');
    carregarAtividades();
    // Alertar familia via socket
    if (window.socket) socket.emit('cuidado-registrado', {
      familia_id: APP.familiaId,
      cuidador: APP.membroNome,
      tipo, hora
    });
  } catch(e) { alerta('Erro ao salvar: ' + e.message); }
}

async function carregarAtividades() {
  try {
    const lista = await api('GET', `/api/cuidados/atividades/${APP.familiaId}`);
    const el = document.getElementById('lista-atividades');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma atividade registrada hoje.</p>'; return; }
    el.innerHTML = lista.map(a => `
      <div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:0.75rem">
        <div style="font-size:2rem">${iconeAtividade(a.tipo)}</div>
        <div style="flex:1">
          <div style="font-weight:600">${a.tipo}</div>
          <div style="font-size:0.85rem;color:#666">${a.hora || ''} ${a.obs ? '— ' + a.obs : ''}</div>
          <div style="font-size:0.75rem;color:#999">${a.cuidador_nome || ''}</div>
        </div>
      </div>`).join('');
  } catch(e) { console.log('Erro atividades:', e); }
}

function iconeAtividade(tipo) {
  const icones = { 'Banho':'🛁','Alimentação':'🍽️','Medicamento':'💊','Fisioterapia':'🏃','Passeio':'🌳','Consulta':'🏥','Higiene':'🧹' };
  return icones[tipo] || '📌';
}

// HUMOR
let humorSelecionado = null;
function selecionarHumorIdoso(valor) {
  humorSelecionado = valor;
  document.querySelectorAll('.emoji-humor').forEach(el => {
    el.style.background = el.dataset.valor === valor ? '#e8f5e9' : '';
    el.style.border = el.dataset.valor === valor ? '2px solid #1a9e6e' : '2px solid transparent';
  });
}

async function salvarHumorIdoso() {
  if (!humorSelecionado) return alerta('Selecione o humor do idoso');
  const obs = document.getElementById('obs-humor-idoso').value.trim();
  try {
    await api('POST', '/api/cuidados/humor', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      humor: humorSelecionado, obs
    });
    alerta('Humor registrado!');
    carregarHumorIdoso();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarHumorIdoso() {
  try {
    const lista = await api('GET', `/api/cuidados/humor/${APP.familiaId}`);
    const el = document.getElementById('lista-humor-idoso');
    const emojis = { otimo:'😄', bem:'🙂', regular:'😐', mal:'😔', pessimo:'😢' };
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhum humor registrado.</p>'; return; }
    el.innerHTML = lista.map(h => `
      <div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:0.75rem">
        <div style="font-size:2.5rem">${emojis[h.humor] || '😐'}</div>
        <div>
          <div style="font-weight:600;text-transform:capitalize">${h.humor}</div>
          <div style="font-size:0.85rem;color:#666">${h.obs || ''}</div>
          <div style="font-size:0.75rem;color:#999">${new Date(h.criado_em).toLocaleString('pt-BR')}</div>
        </div>
      </div>`).join('');
  } catch(e) { console.log('Erro humor:', e); }
}

// ALIMENTAÇÃO
async function salvarRefeicao() {
  const tipo = document.getElementById('ref-tipo').value;
  const quantidade = document.getElementById('ref-quantidade').value;
  const obs = document.getElementById('ref-obs').value.trim();
  try {
    await api('POST', '/api/cuidados/refeicao', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      tipo, quantidade, obs
    });
    fecharModal('modal-nova-refeicao');
    carregarRefeicoes();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarRefeicoes() {
  try {
    const lista = await api('GET', `/api/cuidados/refeicoes/${APP.familiaId}`);
    const el = document.getElementById('lista-refeicoes');
    const cores = { 'Tudo':'#e8f5e9', 'Metade':'#fff8e1', 'Pouco':'#fff3e0', 'Recusou':'#fff0f0' };
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma refeição registrada hoje.</p>'; return; }
    el.innerHTML = lista.map(r => `
      <div style="background:${cores[r.quantidade]||'white'};border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="font-weight:600">${r.tipo} — ${r.quantidade}</div>
        <div style="font-size:0.85rem;color:#666">${r.obs || ''}</div>
        <div style="font-size:0.75rem;color:#999">${new Date(r.criado_em).toLocaleString('pt-BR')}</div>
      </div>`).join('');
  } catch(e) { console.log('Erro refeicoes:', e); }
}

// HIDRATAÇÃO
async function registrarAgua(copos) {
  try {
    await api('POST', '/api/cuidados/hidratacao', {
      familia_id: APP.familiaId, membro_id: APP.membroId, copos
    });
    carregarHidratacao();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarHidratacao() {
  try {
    const dados = await api('GET', `/api/cuidados/hidratacao/${APP.familiaId}`);
    document.getElementById('total-hidratacao').textContent = dados.total || 0;
  } catch(e) { console.log('Erro hidratacao:', e); }
}

// SONO
async function salvarSono() {
  const inicio = document.getElementById('sono-inicio').value;
  const fim = document.getElementById('sono-fim').value;
  const qualidade = document.getElementById('sono-qualidade').value;
  const obs = document.getElementById('sono-obs').value.trim();
  try {
    await api('POST', '/api/cuidados/sono', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      inicio, fim, qualidade, obs
    });
    fecharModal('modal-novo-sono');
    carregarSono();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarSono() {
  try {
    const lista = await api('GET', `/api/cuidados/sono/${APP.familiaId}`);
    const el = document.getElementById('lista-sono');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhum sono registrado.</p>'; return; }
    el.innerHTML = lista.map(s => `
      <div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="font-weight:600">😴 ${s.qualidade}</div>
        <div style="font-size:0.85rem;color:#666">Dormiu: ${s.inicio || '--'} | Acordou: ${s.fim || '--'}</div>
        <div style="font-size:0.85rem;color:#666">${s.obs || ''}</div>
      </div>`).join('');
  } catch(e) { console.log('Erro sono:', e); }
}

// INTERCORRÊNCIAS
async function salvarIntercorrencia() {
  const tipo = document.getElementById('inter-tipo').value;
  const hora = document.getElementById('inter-hora').value;
  const obs = document.getElementById('inter-obs').value.trim();
  if (!obs) return alerta('Descreva o que aconteceu');
  try {
    await api('POST', '/api/cuidados/intercorrencia', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      tipo, hora, obs
    });
    fecharModal('modal-nova-intercorrencia');
    carregarIntercorrencias();
    // Alertar família imediatamente
    if (window.socket) socket.emit('emergencia', {
      familia_id: APP.familiaId,
      tipo: 'Intercorrência: ' + tipo,
      mensagem: obs
    });
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarIntercorrencias() {
  try {
    const lista = await api('GET', `/api/cuidados/intercorrencias/${APP.familiaId}`);
    const el = document.getElementById('lista-intercorrencias');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma intercorrência registrada.</p>'; return; }
    el.innerHTML = lista.map(i => `
      <div style="background:#fff0f0;border-radius:12px;padding:1rem;margin-bottom:0.75rem;border-left:4px solid #e74c3c">
        <div style="font-weight:600;color:#e74c3c">🚨 ${i.tipo}</div>
        <div style="font-size:0.85rem;color:#666">${i.hora || ''} — ${i.obs}</div>
        <div style="font-size:0.75rem;color:#999">${new Date(i.criado_em).toLocaleString('pt-BR')}</div>
      </div>`).join('');
  } catch(e) { console.log('Erro intercorrencias:', e); }
}

// ── FEED CUIDADOS — Visão da família ──
async function carregarFeedCuidados() {
  const el = document.getElementById('feed-cuidados');
  el.innerHTML = '<p style="text-align:center;color:#999">Carregando...</p>';
  try {
    const [atividades, humor, refeicoes, intercorrencias, hidratacao] = await Promise.all([
      api('GET', `/api/cuidados/atividades/${APP.familiaId}`),
      api('GET', `/api/cuidados/humor/${APP.familiaId}`),
      api('GET', `/api/cuidados/refeicoes/${APP.familiaId}`),
      api('GET', `/api/cuidados/intercorrencias/${APP.familiaId}`),
      api('GET', `/api/cuidados/hidratacao/${APP.familiaId}`)
    ]);

    let html = '';

    // Intercorrências primeiro — mais urgente
    if (intercorrencias.length) {
      html += `<div style="background:#fff0f0;border-radius:16px;padding:1rem;margin-bottom:1rem;border-left:4px solid #e74c3c">
        <div style="font-weight:700;color:#e74c3c;margin-bottom:0.5rem">🚨 Intercorrências</div>
        ${intercorrencias.slice(0,3).map(i => `
          <div style="margin-bottom:0.5rem;padding-bottom:0.5rem;border-bottom:1px solid #fecaca">
            <div style="font-weight:600">${i.tipo} ${i.hora ? '— ' + i.hora : ''}</div>
            <div style="font-size:0.85rem;color:#666">${i.obs}</div>
            <div style="font-size:0.75rem;color:#999">${new Date(i.criado_em).toLocaleString('pt-BR')}</div>
          </div>`).join('')}
      </div>`;
    }

    // Hidratação
    html += `<div style="background:white;border-radius:16px;padding:1rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:1rem">
      <div style="font-size:2.5rem">💧</div>
      <div>
        <div style="font-weight:600">Hidratação hoje</div>
        <div style="font-size:1.5rem;font-weight:bold;color:#2563eb">${hidratacao.total || 0} copos</div>
      </div>
    </div>`;

    // Humor
    if (humor.length) {
      const emojis = { otimo:'😄', bem:'🙂', regular:'😐', mal:'😔', pessimo:'😢' };
      const h = humor[0];
      html += `<div style="background:white;border-radius:16px;padding:1rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:1rem">
        <div style="font-size:2.5rem">${emojis[h.humor] || '😐'}</div>
        <div>
          <div style="font-weight:600">Humor do idoso</div>
          <div style="text-transform:capitalize;color:#1a9e6e;font-weight:600">${h.humor}</div>
          <div style="font-size:0.85rem;color:#666">${h.obs || ''}</div>
        </div>
      </div>`;
    }

    // Atividades
    if (atividades.length) {
      html += `<div style="background:white;border-radius:16px;padding:1rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="font-weight:700;margin-bottom:0.75rem">📝 Atividades de hoje</div>
        ${atividades.map(a => `
          <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid #f5f5f5">
            <div style="font-size:1.5rem">${iconeAtividade(a.tipo)}</div>
            <div>
              <div style="font-weight:600">${a.tipo} ${a.hora ? '— ' + a.hora : ''}</div>
              <div style="font-size:0.8rem;color:#666">${a.obs || ''}</div>
              <div style="font-size:0.75rem;color:#999">${a.cuidador_nome || ''}</div>
            </div>
          </div>`).join('')}
      </div>`;
    }

    // Refeições
    if (refeicoes.length) {
      const cores = { 'Tudo':'#e8f5e9','Metade':'#fff8e1','Pouco':'#fff3e0','Recusou':'#fff0f0' };
      html += `<div style="background:white;border-radius:16px;padding:1rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <div style="font-weight:700;margin-bottom:0.75rem">🍽️ Refeições de hoje</div>
        ${refeicoes.map(r => `
          <div style="background:${cores[r.quantidade]||'#f9f9f9'};border-radius:8px;padding:0.5rem;margin-bottom:0.5rem">
            <div style="font-weight:600">${r.tipo} — ${r.quantidade}</div>
            <div style="font-size:0.85rem;color:#666">${r.obs || ''}</div>
          </div>`).join('')}
      </div>`;
    }

    if (!html) {
      html = '<div style="text-align:center;padding:2rem;color:#999"><div style="font-size:3rem">📋</div><p>Nenhum registro hoje ainda.</p><p style="font-size:0.85rem">O cuidador ainda não registrou atividades.</p></div>';
    }

    el.innerHTML = html;

    // Atualizar em tempo real via Socket.io
    if (window.socket) {
      socket.off('cuidado-registrado');
      socket.on('cuidado-registrado', (dados) => {
        if (String(dados.familia_id) === String(APP.familiaId)) {
          carregarFeedCuidados();
        }
      });
    }
  } catch(e) {
    el.innerHTML = '<p style="text-align:center;color:#999">Erro ao carregar registros.</p>';
  }
}
