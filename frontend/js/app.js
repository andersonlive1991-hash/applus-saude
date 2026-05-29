
async function loginGoogle() {
  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: '1028956812970-verjkuuuqnn6c8nhafh7kcvgphn1htkj.apps.googleusercontent.com',
      scope: 'openid email profile',
      callback: async (resp) => {
        if (resp.error) return alerta('Erro ao entrar com Google');
        try {
          // Troca o access_token pelo id_token via userinfo
          const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: 'Bearer ' + resp.access_token }
          }).then(r => r.json());

          const res = await api('POST', '/api/auth/google', {
            token: resp.access_token,
            userInfo
          });
          if (res && res.ok) {
            APP.familiaId = String(res.familiaId);
            APP.membroId = res.membroId;
            APP.membroNome = res.membroNome;
            APP.membroTipo = res.membroTipo;
            APP.idPessoal = res.idPessoal;
            APP.membroAtivo = { id: res.membroId, nome: res.membroNome, tipo: res.membroTipo, id_pessoal: res.idPessoal };
            localStorage.setItem('applus_sessao', JSON.stringify({
              familiaId: res.familiaId,
              membroId: res.membroId,
              membroNome: res.membroNome,
              membroTipo: res.membroTipo,
              idPessoal: res.idPessoal,
              codigoFamilia: res.codigoFamilia
            }));
            if (res.foto) localStorage.setItem('applus_foto', res.foto);
            mostrarApp();
            navegarPara('home');
            carregarHome();
            alerta('✅ Bem-vindo, ' + res.membroNome + '!');
          }
        } catch(e) { alerta('Erro ao autenticar: ' + e.message); }
      }
    });
    client.requestAccessToken();
  } catch(e) { alerta('Google não disponível: ' + e.message); }
}
function mostrarToast(msg, duracao) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1D9E75;color:#fff;padding:12px 20px;border-radius:16px;z-index:9999;font-size:14px;font-weight:600;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);max-width:90vw;pointer-events:none;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition='opacity 0.5s'; t.style.opacity='0'; setTimeout(()=>t.remove(),500); }, duracao||3000);
}

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
  medFriendTimer: null,
  alarmeInterval: null
};

// ── RENDER MARKDOWN ──
function renderMarkdown(txt) {
  if (!txt) return "";
  var rBold = new RegExp("\\*\\*(.+?)\\*\\*", "g");
  var rItal = new RegExp("\\*(.+?)\\*", "g");
  var rLine = new RegExp("\\n", "g");
  return txt.replace(rBold, "<strong>$1</strong>")
             .replace(rItal, "<em>$1</em>")
             .replace(rLine, "<br>");
}

// ── INICIALIZAR ──
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
  if (typeof verificarIdioma === 'function') verificarIdioma();
  verificarBoasVindas();
  carregarSessao();
  registrarSW();
});

// ── MODO OFFLINE ──
function atualizarStatusOffline() {
  const bar = document.getElementById("offline-bar");
  if (!bar) return;
  if (!navigator.onLine) {
    bar.style.display = "block";
  } else {
    bar.style.display = "none";
  }
}
window.addEventListener("online", atualizarStatusOffline);
window.addEventListener("offline", atualizarStatusOffline);
window.addEventListener("load", atualizarStatusOffline);


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
    APP.membroAtivo = { id: dados.membroId, nome: dados.membroNome, tipo: dados.membroTipo, id_pessoal: dados.idPessoal };
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
          if (dados && dados.alarme && !dados.medicamento) {
            // Alarme de evento
            dispararAlarmeEvento(dados.eventoNome || dados.titulo || 'Evento', dados.corpo || '');
          }
          if (dados && dados.medicamento) {
            // Aguarda o app carregar completamente antes de disparar
            const tentarDisparar = (tentativas) => {
              if (tentativas <= 0) return;
              if (APP.familiaId && APP.membroId) {
                api('GET', '/api/medicamentos/' + APP.familiaId + '?membro_id=' + APP.membroId)
                  .then(meds => {
                    const med = meds.find(m => (dados.medId && m.id == dados.medId) || (dados.corpo && dados.corpo.includes(m.nome))) || meds[0];
                    const overlay = document.getElementById('alarme-overlay');
                    const jaAtivo = overlay && overlay.classList.contains('ativo');
                    const jaConfirmado = APP.alarmesConfirmados && [...APP.alarmesConfirmados].some(k => k.startsWith(String(med && med.id) + '-'));
                    if (med && !jaAtivo && !jaConfirmado) {
                      navegarPara('remedios');
                      setTimeout(() => { dispararAlarme(med); }, 500);
                    }
                  }).catch(() => {});
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
  APP.membroAtivo = { id, nome, tipo, id_pessoal: idPessoal };
  salvarSessaoMembro();
  iniciarApp();
}

async function adicionarMembro() {
  const nome = document.getElementById('add-mem-nome').value.trim();
  const tipo = document.getElementById('add-mem-tipo').value;
  if (!nome) return alerta('Digite o nome');

  // Se for crianca ou tea, criar direto sem modal intermediario
  if (tipo === 'crianca' || tipo === 'tea') {
    await _salvarMembro(nome, tipo);
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

  // Se for baba, criar e mostrar QR Code para baba.html
  if (tipo === 'baba') {
    fecharModal('modal-add-membro');
    await _criarMembroBaba(nome);
    return;
  }

  await _salvarMembro(nome, tipo);
}

async function _criarMembroBaba(nome) {
  try {
    const mem = await api('POST', '/api/membros', {
      familia_id: APP.familiaId,
      nome, tipo: 'baba', relacao: 'baba'
    });
    const link = 'https://applus-saude-production.up.railway.app/baba.html?id=' + mem.id_pessoal;
    document.getElementById('qr-id-cuidador').textContent = mem.id_pessoal;
    document.getElementById('qr-nome-cuidador') && (document.getElementById('qr-nome-cuidador').textContent = nome);
    abrirModal('modal-qrcode-cuidador');
    try {
      const res = await api('POST', '/api/qrcode', { texto: link });
      const canvas = document.getElementById('qrcode-cuidador-canvas');
      if (canvas) canvas.style.display = 'none';
      const img = document.getElementById('qrcode-cuidador-img') || document.createElement('img');
      img.id = 'qrcode-cuidador-img';
      img.src = res.qrcode;
      img.style.cssText = 'width:200px;height:200px;display:block;margin:0 auto;border-radius:12px;';
      const container = document.getElementById('qrcode-cuidador-canvas');
      if (container && container.parentNode) container.parentNode.insertBefore(img, container);
    } catch(e) {}
    mostrarSelecaoPerfil();
  } catch(e) {
    alerta('Erro ao criar babá: ' + e.message);
  }
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
    fecharModal('modal-add-membro');
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

  // Foto lida do preview (evita await antes do DOM)
  const imgPreview = document.querySelector('#foto-preview-cadastro img');
  const fotoDataUrl = imgPreview ? imgPreview.src : null;

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
    if (fotoDataUrl) { try { await api('PUT', '/api/membros/' + resMem.id + '/foto', { foto: fotoDataUrl }); } catch(e) {} }
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
        
      const respPerfil = await fetch('/api/perfil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosPerfil)
        });
        const jsonPerfil = await respPerfil.json();
        
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
  const link = 'https://applus-saude-production.up.railway.app?familia=' + codigoFamilia + '&cuidador=' + idCuidador;
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
    fecharModal('modal-recuperar');

    // Se for cuidador, entrar direto sem tela de seleção
    if (mem.tipo === 'cuidador') {
      APP.membroId = mem.id;
      APP.membroNome = mem.nome;
      APP.membroTipo = mem.tipo;
      APP.idPessoal = mem.id_pessoal;
      APP.membroAtivo = { id: mem.id, nome: mem.nome, tipo: mem.tipo, id_pessoal: mem.id_pessoal };
      salvarSessaoMembro();
      iniciarApp();
    } else {
      salvarSessaoFamilia();
      mostrarSelecaoPerfil();
    }
  } catch (e) {
    alerta('ID não encontrado');
  }
}

// ── INICIAR APP ──
function iniciarApp() {
  // Verificar PIN antes de entrar
  if (typeof verificarPinAoEntrar === 'function') {
    verificarPinAoEntrar().then(ok => {
      if (!ok) return;
      mostrarApp();
      conectarSocket();
      _continuarIniciarApp();
    });
    return;
  }
  mostrarApp();
  conectarSocket();
  _continuarIniciarApp();
}

function _continuarIniciarApp() {
  iniciarAlarmes();
  if (APP.membroId) api('PUT', '/api/membros/' + APP.membroId + '/acesso', {}).catch(()=>{});
  registrarTokenFCM();
  if (Notification.permission === 'granted') {
    inscreverPush();
  } else if (Notification.permission === 'default') {
    // Pede permissão apenas uma vez por sessão
    if (!sessionStorage.getItem('push_permission_asked')) {
      sessionStorage.setItem('push_permission_asked', '1');
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') inscreverPush();
      });
    }
  }
  atualizarDropdown();
  navegarPara('home');
  if (typeof carregarStatusPin === 'function') carregarStatusPin();
}

// ── NAVEGAÇÃO ──

async function carregarPerfil() {
  try {
    // Gerar anos dinamicamente (ano atual até 1910)
    const selAno = document.getElementById('pf-nasc-ano');
    if (selAno && selAno.options.length <= 1) {
      const anoAtual = new Date().getFullYear() - 1;
      for (let a = anoAtual; a >= 1910; a--) {
        const opt = document.createElement('option');
        opt.value = a; opt.textContent = a;
        selAno.appendChild(opt);
      }
    }
    carregarFotoPerfil();
    const idPessoal = APP.idPessoal || (APP.membroAtivo && APP.membroAtivo.id_pessoal);
    if (!idPessoal) { console.log('sem idPessoal'); return; }
    const mem = await api('GET', '/api/membros/id/' + idPessoal);
    if (!mem || !mem.id) return;
    APP.membroAtivo = mem;
    document.getElementById('pf-nome').value = mem.nome || '';
    const res = await fetch('/api/perfil/' + mem.id);
    if (res.ok) {
      const p = await res.json();
      if (p && !p.erro) {
        document.getElementById('pf-nome').value = p.nome_completo || mem.nome || '';
        if (p.data_nascimento) {
          const d = new Date(p.data_nascimento);
          document.getElementById('pf-nasc-dia').value = String(d.getUTCDate());
          document.getElementById('pf-nasc-mes').value = String(d.getUTCMonth() + 1).padStart(2, '0');
          document.getElementById('pf-nasc-ano').value = String(d.getUTCFullYear());
        }
        document.getElementById('pf-sangue').value = p.tipo_sanguineo || '';
        document.getElementById('pf-alergias').value = p.alergias || '';
        document.getElementById('pf-cpf').value = p.cpf || '';
        document.getElementById('pf-sus').value = p.cartao_sus || '';
        document.getElementById('pf-convenio').value = p.convenio || '';
        document.getElementById('pf-contato').value = p.contato_emergencia || '';
        document.getElementById('pf-tel').value = p.tel_emergencia || '';
      }
    }
  } catch(e) { console.log('carregarPerfil erro:', e.message); }
}

async function salvarPerfil() {
  try {
    const idPessoal = APP.idPessoal || (APP.membroAtivo && APP.membroAtivo.id_pessoal);
    if (!idPessoal) { alerta('Sessao expirada. Saia e entre novamente.'); return; }
    const mem = await api('GET', '/api/membros/id/' + idPessoal);
    if (!mem || !mem.id) { alerta('Nao foi possivel identificar o membro.'); return; }
    const pfDia = document.getElementById('pf-nasc-dia').value;
    const pfMes = document.getElementById('pf-nasc-mes').value;
    const pfAno = document.getElementById('pf-nasc-ano').value;
    const dataNasc = (pfDia && pfMes && pfAno) ? pfAno + '-' + pfMes.padStart(2,'0') + '-' + pfDia.padStart(2,'0') : null;
    const dados = {
      membro_id: mem.id,
      nome_completo: document.getElementById('pf-nome').value.trim() || mem.nome,
      data_nascimento: dataNasc,
      tipo_sanguineo: document.getElementById('pf-sangue').value || null,
      alergias: document.getElementById('pf-alergias').value.trim() || null,
      cpf: document.getElementById('pf-cpf').value.trim() || null,
      cartao_sus: document.getElementById('pf-sus').value.trim() || null,
      convenio: document.getElementById('pf-convenio').value.trim() || null,
      contato_emergencia: document.getElementById('pf-contato').value.trim() || null,
      tel_emergencia: document.getElementById('pf-tel').value.trim() || null
    };
    // Salvar foto se foi alterada
    alerta('Foto: ' + (_fotoPerfil ? 'tem foto ' + _fotoPerfil.length + ' chars' : 'SEM FOTO') + ' | mem.id=' + mem.id);
    if (_fotoPerfil) {
      await api('PUT', '/api/membros/' + mem.id + '/foto', { foto: _fotoPerfil });
      _fotoPerfil = null;
      atualizarDropdown();
    }

    const resp = await fetch('/api/perfil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    const json = await resp.json();
    if (json.erro) {
      alerta('Erro: ' + json.erro);
    } else {
      alerta('Perfil salvo com sucesso!');
    }
  } catch(e) {
    alerta('Erro: ' + e.message);
  }
}

// ── BEM-ESTAR DO CUIDADOR ──
let beHumor = 0;
let beEstresse = 0;
let beTempo = null;

function selecionarHumor(v) {
  beHumor = v;
  document.querySelectorAll('.btn-humor').forEach(function(b) {
    b.classList.toggle('ativo', parseInt(b.dataset.v) === v);
  });
}

function selecionarEstresse(v) {
  beEstresse = v;
  document.querySelectorAll('.btn-estresse').forEach(function(b) {
    b.classList.toggle('ativo', parseInt(b.dataset.v) === v);
  });
}

function selecionarTempo(v) {
  beTempo = v;
  document.getElementById('be-tempo-sim').style.borderColor = v ? '#10b981' : '#e2e8f0';
  document.getElementById('be-tempo-sim').style.background = v ? '#f0fdf4' : 'white';
  document.getElementById('be-tempo-nao').style.borderColor = !v ? '#ef4444' : '#e2e8f0';
  document.getElementById('be-tempo-nao').style.background = !v ? '#fff0f0' : 'white';
}

async function salvarBemEstar() {
  if (!beHumor) return alerta('Selecione seu humor de hoje');
  if (!beEstresse) return alerta('Selecione seu nivel de estresse');
  const dados = {
    membro_id: APP.membroId,
    familia_id: APP.familiaId,
    humor: beHumor,
    estresse: beEstresse,
    sono: parseFloat(document.getElementById('be-sono').value) || null,
    tempo_proprio: beTempo,
    anotacao: document.getElementById('be-anotacao').value.trim() || null
  };
  try {
    await api('POST', '/api/bem-estar', dados);
    alerta('Registro salvo!');
    beHumor = 0; beEstresse = 0; beTempo = null;
    document.querySelectorAll('.btn-humor,.btn-estresse').forEach(function(b) { b.classList.remove('ativo'); });
    document.getElementById('be-sono').value = '';
    document.getElementById('be-anotacao').value = '';
    document.getElementById('be-tempo-sim').style.borderColor = '#e2e8f0';
    document.getElementById('be-tempo-sim').style.background = 'white';
    document.getElementById('be-tempo-nao').style.borderColor = '#e2e8f0';
    document.getElementById('be-tempo-nao').style.background = 'white';
    carregarHistoricoBemEstar();
  } catch(e) { alerta('Erro ao salvar: ' + e.message); }
}

async function carregarHistoricoBemEstar() {
  try {
    const dados = await api('GET', '/api/bem-estar/' + APP.membroId);
    const lista = document.getElementById('lista-bem-estar');
    if (!dados.length) {
      lista.innerHTML = '<p style="text-align:center;color:#6b7280;font-size:14px">Nenhum registro ainda</p>';
      return;
    }
    const emojisHumor = ['','😢','😕','😐','🙂','😄'];
    let html = '';
    dados.forEach(function(d) {
      const data = new Date(d.criado_em).toLocaleDateString('pt-BR');
      const tempoStr = d.tempo_proprio === true ? 'Sim' : d.tempo_proprio === false ? 'Nao' : '-';
      const estresseEmoji = '🔴'.repeat(d.estresse) + '⚪'.repeat(5 - d.estresse);
      html += '<div style="border-bottom:1px solid #f1f5f9;padding:12px 0">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="font-weight:700;color:#1e293b">' + data + '</span>';
      html += '<span style="font-size:24px">' + emojisHumor[d.humor] + '</span>';
      html += '</div>';
      html += '<div style="font-size:13px;color:#6b7280;margin-top:4px">';
      html += 'Estresse: ' + estresseEmoji + ' | Sono: ' + (d.sono || '-') + 'h | Tempo proprio: ' + tempoStr;
      html += '</div>';
      if (d.anotacao) html += '<div style="font-size:13px;color:#374151;margin-top:6px;font-style:italic">' + d.anotacao + '</div>';
      html += '</div>';
    });
    lista.innerHTML = html;
  } catch(e) {}
}

function preencherNomePerfil() {
  const campoNome = document.getElementById('pf-nome');
  if (campoNome && !campoNome.value && APP.membroNome) {
    campoNome.value = APP.membroNome;
  }
}

function navegarPara(pagina) {
  // Empurrar estado no histórico do navegador para o botão voltar do Android funcionar
  if (history.state?.pagina !== pagina) {
    history.pushState({ pagina }, '', '#' + pagina);
  }
  document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));

  const el = document.getElementById(`pag-${pagina}`);
  if (el) el.classList.add('ativa');

  const nav = document.querySelector(`[data-nav="${pagina}"]`);
  if (nav) nav.classList.add('ativo');

  // Carregar dados da página
  if (pagina === 'home') carregarHome();
  if (pagina === 'painel-baba') carregarPainelBaba();
  if (pagina === 'remedios') carregarMedicamentos();
  if (pagina === 'agenda') carregarAgenda();
  if (pagina === 'chat') carregarChat();
  if (pagina === 'exames') carregarExames();
  if (pagina === 'mais') { setTimeout(carregarBabasSalvas, 500); }
  if (pagina === 'mais') carregarMais();
  if (pagina === 'saude') carregarSinais();
  if (pagina === 'perfil') { carregarPerfil(); setTimeout(preencherNomePerfil, 500); }
  if (pagina === 'bem-estar') carregarHistoricoBemEstar();
  if (pagina === 'checklist') carregarChecklist();
  if (pagina === 'escala') carregarEscala();
  if (pagina === 'historico') { carregarDoencas(); }
  if (pagina === 'meu-dia') iniciarMeuDia();
  if (pagina === 'mente-sa') iniciarMenteSa();
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
  if (pagina === 'painel-cuidador') { 
    window._cuidadorFamiliaId = APP.familiaId;
    carregarFeedCuidadorFamilia(); 
    carregarMedsCuidador();
    carregarEventosCuidador();
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
    // Card Cuidados escondido — módulo será recriado futuramente
    const cardCuidados = document.getElementById('card-cuidados');
    if (cardCuidados) cardCuidados.style.display = 'none';
    const temCuidador = membros.some(m => m.tipo === 'cuidador');
    const cardCuidador = document.getElementById('card-cuidador');
    if (cardCuidador) cardCuidador.style.display = temCuidador ? 'flex' : 'none';
    if (temCuidador) {
      const memCuid = membros.find(m => m.tipo === 'cuidador');
      if (memCuid) window._cuidadorId = memCuid.id;
      document.getElementById('cuidador-nome-painel').textContent = membros.find(m=>m.tipo==='cuidador').nome;
    }

    const temBaba = membros.some(m => m.tipo === 'baba');
    const cardBaba = document.getElementById('card-baba');
    if (cardBaba) cardBaba.style.display = temBaba ? 'flex' : 'none';
  } catch(e) {}
  document.getElementById('home-data').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const _agora = new Date();
    const hoje = _agora.getFullYear() + '-' + String(_agora.getMonth()+1).padStart(2,'0') + '-' + String(_agora.getDate()).padStart(2,'0');
    const eventos = await api('GET', `/api/eventos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const eventosHoje = eventos.filter(e => e.data && e.data.startsWith(hoje));

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
  atualizarBadgeRemedios();
  buscarResumoSalvo();
}

function iconeTipoEvento(tipo) {
  const icons = { Consulta: '🏥', Exame: '🔬', Medicamento: '💊', Família: '👨‍👩‍👧', Outro: '📌' };
  return icons[tipo] || '📌';
}

// ── MEDICAMENTOS ──
async function carregarMedicamentos() {
  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    window._listaMedsCache = meds;
    carregarGraficoAderencia();
    carregarStreak();
    const lista = document.getElementById('lista-medicamentos');
    lista.innerHTML = meds.length
      ? meds.map(m => `
        <div class="item-lista">
          <span style="font-size:24px">💊</span>
          <div class="item-info">
            <div class="item-nome">${m.nome} ${m.dosagem || ''}</div>
            <div class="item-sub">${formatarHorarios(m.horarios) || '⚡ Conforme necessario'} · ${m.via || 'Oral'}</div>
          ${(function(){ const h = m.horarios ? (typeof m.horarios === 'string' ? JSON.parse(m.horarios) : m.horarios) : []; return (!h || h.length === 0) ? `<button onclick="registrarDosePRN(${m.id}, '${m.nome}')" style="margin-top:6px;background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer">+ Registrar dose agora</button>` : ''; })()}
          ${m.estoque > 0 ? `<div style="font-size:12px;font-weight:600;margin-top:3px;color:${m.estoque <= 5 ? '#dc2626' : m.estoque <= 10 ? '#f59e0b' : '#6b7280'}">${m.estoque <= 5 ? '⚠️' : '💊'} ${m.estoque} comprimido${m.estoque !== 1 ? 's' : ''}</div>` : ''}
          </div>
          <button onclick="excluirMed(${m.id})" style="background:none;border:none;font-size:18px;cursor:pointer">🗑️</button>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum medicamento cadastrado</p>';
  } catch (e) {
    console.log('Erro meds:', e);
  }
}


async function carregarGraficoAderencia() {
  try {
    const dados = await api("GET", "/api/medicamentos/aderencia/" + APP.membroId);
    const secao = document.getElementById("secao-aderencia");
    const container = document.getElementById("grafico-aderencia");
    if (!dados || !dados.length) { secao.style.display = "none"; return; }
    secao.style.display = "block";
    container.innerHTML = dados.map(m => {
      const total = parseInt(m.total) || 0;
      const tomadas = parseInt(m.tomadas) || 0;
      const pct = total > 0 ? Math.round((tomadas / total) * 100) : 0;
      const cor = pct >= 80 ? "#1a9e6e" : pct >= 50 ? "#f59e0b" : "#dc2626";
      return "<div style='margin-bottom:14px'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px'>" +
        "<span style='font-size:13px;font-weight:600;color:#111827'>" + m.nome + " " + (m.dosagem||"") + "</span>" +
        "<span style='font-size:13px;font-weight:700;color:" + cor + "'>" + pct + "%</span></div>" +
        "<div style='background:#e5e7eb;border-radius:8px;height:10px;overflow:hidden'>" +
        "<div style='width:" + pct + "%;background:" + cor + ";height:100%;border-radius:8px;transition:width 0.5s'></div></div>" +
        "<div style='font-size:11px;color:#6b7280;margin-top:3px'>" + tomadas + " de " + total + " doses confirmadas</div>" +
        "</div>";
    }).join("");
  } catch(e) { console.log("Erro aderencia:", e); }
}

function formatarHorarios(horarios) {
  if (!horarios) return '';
  const h = typeof horarios === 'string' ? JSON.parse(horarios) : horarios;
  return Array.isArray(h) ? h.join(', ') : h;
}


let _cameraStream = null;
let _barcodeInterval = null;

async function lerCodigoBarras() {
  const container = document.getElementById('barras-video-container');
  const video = document.getElementById('barras-video');
  if (!container || !video) return;
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = _cameraStream;
    container.style.display = 'block';
    // Usar BarcodeDetector se disponível
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128'] });
      _barcodeInterval = setInterval(async () => {
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const code = codes[0].rawValue;
            clearInterval(_barcodeInterval);
            pararCamera();
            await buscarMedicamentoANVISA(code);
          }
        } catch(e) {}
      }, 500);
    } else {
      alerta('Seu navegador não suporta leitura automática de código de barras. Digite o código manualmente.');
      pararCamera();
    }
  } catch(e) {
    alerta('Não foi possível acessar a câmera. Verifique as permissões.');
  }
}

function pararCamera() {
  if (_barcodeInterval) { clearInterval(_barcodeInterval); _barcodeInterval = null; }
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
  const container = document.getElementById('barras-video-container');
  if (container) container.style.display = 'none';
}

async function buscarMedicamentoANVISA(codigo) {
  try {
    alerta('🔍 Buscando medicamento...');
    const r = await fetch('/api/anvisa/buscar/' + codigo);
    const data = await r.json();
    if (data && data.encontrado) {
      document.getElementById('med-nome').value = data.nome || '';
      document.getElementById('med-dosagem').value = data.dosagem || '';
      alerta('✅ Medicamento encontrado: ' + (data.nome || codigo) + ' (via ' + (data.fonte === 'cosmos' ? 'Bluesoft' : 'ANVISA') + ')');
    } else {
      document.getElementById('med-nome').value = '';
      alerta('⚠️ Medicamento não encontrado. Digite o nome manualmente.');
    }
  } catch(e) {
    alerta('Erro ao buscar medicamento. Digite o nome manualmente.');
  }
}

async function salvarMedicamento() {
  const nome = document.getElementById('med-nome').value.trim();
  const dosagem = document.getElementById('med-dosagem').value.trim();
  const horarios = document.getElementById('med-horarios').value.split(',').map(h => h.trim()).filter(Boolean);
  const via = document.getElementById('med-via').value;
  const estoque = document.getElementById('med-estoque').value;

  if (!nome) return alerta('Preencha o nome do medicamento');

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
    api('POST', '/api/interacoes/verificar', { membro_id: APP.membroId, nome_novo: nome }).then(r => { if (r && r.alerta) alertaInteracao(r.alerta); }).catch(() => {});
  } catch (e) {
    alerta('Erro ao salvar: ' + e.message);
  }
}

async function excluirMed(id) {
  const card = document.querySelector('[onclick="excluirMed(' + id + ')"]');
  const nome = card ? card.closest('.item-lista')?.querySelector('.item-nome')?.textContent || 'este medicamento' : 'este medicamento';
  if (!confirm('Excluir ' + nome + '?\nEsta ação não pode ser desfeita.')) return;
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
  const prn = document.getElementById('med-prn');
  if (prn) { prn.checked = false; togglePRN(); }
}

// ── ALARMES ──
// Limpar confirmações com mais de 2 horas
const _salvosRaw = JSON.parse(localStorage.getItem('alarmesConfirmados') || '[]');
const _metaRaw = JSON.parse(localStorage.getItem('alarmesConfirmadosMeta') || '{}');
const _agora = Date.now();
const _validos = _salvosRaw.filter(k => !_metaRaw[k] || (_agora - _metaRaw[k] < 7200000));
APP.alarmesConfirmados = new Set(_validos);

function _salvarConfirmados() {
  const lista = [...APP.alarmesConfirmados];
  localStorage.setItem('alarmesConfirmados', JSON.stringify(lista));
  const meta = JSON.parse(localStorage.getItem('alarmesConfirmadosMeta') || '{}');
  lista.forEach(k => { if (!meta[k]) meta[k] = Date.now(); });
  localStorage.setItem('alarmesConfirmadosMeta', JSON.stringify(meta));
}

async function iniciarAlarmes() {
  if (APP.alarmeInterval) clearInterval(APP.alarmeInterval);
  APP.alarmeInterval = setInterval(verificarAlarmes, 30000);

  // Keep-alive externo — evita o Render dormir
  setInterval(() => {
    fetch('/ping').catch(() => {});
  }, 4 * 60 * 1000);
  verificarAlarmes();
}

async function verificarAlarmes() {
  if (APP.alarmeAtivo) return;
  try {
    const meds = await api('GET', `/api/medicamentos/${APP.familiaId}?membro_id=${APP.membroId}`);
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;

    for (const med of meds) {
      const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
      if (!Array.isArray(horarios)) continue;

      for (const horario of horarios) {
        const chave = `${med.id}-${horario}`;
        if (APP.alarmesConfirmados.has(chave)) continue;
        // Verifica horario exato ou ate 30 minutos atrasado
        const [hh, mm] = horario.split(":").map(Number);
        const horarioDate = new Date();
        horarioDate.setHours(hh, mm, 0, 0);
        const diffMin = (agora - horarioDate) / 60000;
        if (diffMin >= 0 && diffMin < 30) {
          med._horarioAtivo = horario; dispararAlarme(med);
          break;
        }
      }
    }
  } catch (e) {
    console.log('Erro alarmes:', e);
  }
}

function dispararAlarmeEvento(titulo, corpo) {
  iniciarSomAlarme();
  falarAlarme('Atenção! ' + titulo + ' em 1 minuto. ' + (corpo || ''));
  // Toast visual
  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1a9e6e;color:white;padding:1rem 1.5rem;border-radius:16px;z-index:9999;font-size:1rem;font-weight:600;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);max-width:90vw';
  toast.innerHTML = '📅 ' + titulo + '<br><span style="font-size:0.85rem;font-weight:400">' + (corpo || '') + '</span>';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 8000);
}

// Listeners dos botões do alarme — compatível com Capacitor
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
  const btnTomado = document.getElementById('btn-tomado');
  const btnLembrar = document.getElementById('btn-lembrar');
  const btnPular = document.getElementById('btn-pular');
  if (btnTomado) {
    btnTomado.addEventListener('touchend', (e) => { e.preventDefault(); confirmarDose('tomado'); });
    btnTomado.addEventListener('click', () => confirmarDose('tomado'));
  }
  if (btnLembrar) {
    btnLembrar.addEventListener('touchend', (e) => { e.preventDefault(); lembrarDepois(); });
    btnLembrar.addEventListener('click', () => lembrarDepois());
  }
  if (btnPular) {
    btnPular.addEventListener('touchend', (e) => { e.preventDefault(); confirmarDose('pulado'); });
    btnPular.addEventListener('click', () => confirmarDose('pulado'));
  }
  }, 1000);
});

function dispararAlarme(med) {
  if (APP.alarmeAtivo) return;
  APP.alarmeAtivo = med.id;
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
  overlay.dataset.horario = med._horarioAtivo || '';

  // MedFriend — se não confirmar em 10 min, avisa família
  if (APP.medFriendTimer) clearTimeout(APP.medFriendTimer);
  APP.medFriendTimer = setTimeout(() => {
    // Só dispara se o alarme ainda estiver ativo (não foi confirmado)
    if (overlay.classList.contains('ativo')) {
      api('POST', '/api/push/enviar-familia', {
        familia_id: APP.familiaId,
        titulo: '⚠️ Dose não confirmada',
        corpo: (APP.membroNome || 'Familiar') + ' não confirmou ' + med.nome + ' há 10 minutos.',
        tipo: 'medfriend'
      }).catch(() => {});
    }
  }, 600000); // 10 minutos
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
  if (APP.medFriendTimer) { clearTimeout(APP.medFriendTimer); APP.medFriendTimer = null; }
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');
  APP.alarmeAtivo = null;
  const _overlay = document.getElementById('alarme-overlay');
  const _chave = (_overlay.dataset.medId || '') + '-' + (_overlay.dataset.horario || '');
  if (_chave !== '-') { APP.alarmesConfirmados.add(_chave); _salvarConfirmados(); }

  await api('POST', '/api/medicamentos/historico', {
    med_id: medId,
    membro_id: APP.membroId,
    status,
    motivo: status === 'pulado' ? 'Usuário pulou' : null
  });
  if (status === 'tomado') {
    api('PUT', '/api/medicamentos/' + medId + '/estoque', {}).catch(() => {});
  }
}

function lembrarDepois() {
  clearInterval(APP.alarmeRepetir);
  if (APP.medFriendTimer) { clearTimeout(APP.medFriendTimer); APP.medFriendTimer = null; }
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
            <div style="display:flex;gap:6px">
              <button onclick="abrirEditarEvento(${e.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:#1a9e6e">✏️</button>
              <button onclick="excluirEvento(${e.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
            </div>
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

  const nome_medico = document.getElementById('ev-medico').value.trim();
  const especialidade = document.getElementById('ev-especialidade').value.trim();
  const observacoes = document.getElementById('ev-obs').value.trim();
  const pediu_exame = document.getElementById('ev-pediu-exame').checked;
  const gerou_receita = document.getElementById('ev-gerou-receita').checked;
  const data_retorno = document.getElementById('ev-retorno').value || null;

  try {
    await api('POST', '/api/eventos', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      titulo, data, hora, tipo, local,
      nome_medico, especialidade, observacoes,
      pediu_exame, gerou_receita, data_retorno
    });
    fecharModal('modal-add-evento');
    carregarAgenda();
  } catch (e) {
    alerta('Erro ao salvar evento: ' + e.message);
  }
}

async function excluirEvento(id) {
  const card = document.querySelector('[onclick="excluirEvento(' + id + ')"]');
  const nome = card ? card.closest('.item-lista')?.querySelector('.item-nome')?.textContent || 'este evento' : 'este evento';
  if (!confirm('Excluir ' + nome + '?\nEsta ação não pode ser desfeita.')) return;
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
  if (typeof registrarEventosVideo === 'function') registrarEventosVideo();

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

  
  APP.socket.on('cuidador-novo-registro', (data) => {
    if (data.familiaId == APP.familiaId) {
      mostrarToast('💚 ' + (data.cuidadorNome||'Cuidador') + ' registrou: ' + (data.registro.tipo||''));
      carregarFeedCuidadorFamilia();
    }
  });

  APP.socket.on('cuidador-online', (data) => {
    const bar = document.getElementById('cuidador-online-bar');
    const txt = document.getElementById('cuidador-status-txt');
    if (bar && txt) {
      bar.style.display = 'block';
      txt.textContent = (data.nome||'Cuidador') + ' está online agora';
    }
  });

  APP.socket.on('baba-novo-registro', (data) => {
    const tipos = {mamada:'🍼',fralda:'🧷',sono:'😴',humor:'😊',marco:'⭐',medicamento:'💊',foto:'📷',atividade:'🎮'};
    const ico = tipos[data.registro.tipo] || '📝';
    const nomes = {mamada:'Mamada',fralda:'Fralda',sono:'Sono',humor:'Humor',marco:'Marco',medicamento:'Medicamento',foto:'Foto',atividade:'Atividade'};
    const nome = nomes[data.registro.tipo] || data.registro.tipo;
    mostrarToast(ico + ' ' + (data.babaNome||'Babá') + ' registrou: ' + nome + (data.registro.quantidade?' — '+data.registro.quantidade:''));
  });

  APP.socket.on('baba-checkin-update', (data) => {
    const msg = data.tipo === 'checkin' ? '✅ ' + (data.nome||'Babá') + ' fez check-in às ' + data.hora : '👋 ' + (data.nome||'Babá') + ' fez check-out';
    mostrarToast(msg);
  });

  APP.socket.on('baba-novo-marco', (data) => {
    mostrarToast('⭐ Marco registrado pela babá: ' + data.descricao);
  });

  APP.socket.on('baba-video-recebendo', (data) => {
    mostrarToast('📹 Babá está iniciando videochamada...');
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
const IA_HISTORICO = [];
async function perguntarIA() {
  const input = document.getElementById('ia-input');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('ia-mensagens');
  input.value = '';

  container.innerHTML += `<div class="ia-msg-user fade-up">${pergunta}</div>`;
  container.innerHTML += `<div class="ia-digitando" id="ia-digitando"><span></span><span></span><span></span></div>`;
  container.scrollTop = container.scrollHeight;

  IA_HISTORICO.push({ role: 'user', content: pergunta });
  if (IA_HISTORICO.length > 20) IA_HISTORICO.splice(0, 2);

  try {
    const res = await api('POST', '/api/ia/perguntar', {
      pergunta,
      historico: IA_HISTORICO.slice(-10),
      membro_id: APP.membroId,
      familia_id: APP.familiaId
    });

    document.getElementById('ia-digitando')?.remove();
    IA_HISTORICO.push({ role: 'assistant', content: res.resposta });
    container.innerHTML += `<div class="ia-msg-bot fade-up">${renderMarkdown(res.resposta)}</div>`;
    container.scrollTop = container.scrollHeight;
  } catch (e) {
    document.getElementById('ia-digitando')?.remove();
    container.innerHTML += `<div class="ia-msg-bot">Erro ao conectar com o assistente.</div>`;
  }
}



// ── PASSAGEM DE PLANTÃO ──
async function salvarPassagemPlantao() {
  const turno = document.getElementById('passagem-turno').value;
  const humor = document.getElementById('passagem-humor').value;
  const resumo = document.getElementById('passagem-resumo').value.trim();
  const intercorrencias = document.getElementById('passagem-intercorrencias').value.trim();
  const medicamentos_ok = document.getElementById('passagem-meds-ok').checked;

  if (!resumo) { alerta('Preencha o resumo do turno'); return; }

  try {
    await api('POST', '/api/passagem-plantao', {
      familia_id: APP.familiaId,
      cuidador_id: APP.membroId,
      cuidador_nome: APP.nomeUsuario || 'Cuidador',
      turno, humor, resumo, intercorrencias, medicamentos_ok
    });
    document.getElementById('passagem-resumo').value = '';
    document.getElementById('passagem-intercorrencias').value = '';
    document.getElementById('passagem-meds-ok').checked = true;
    alerta('✅ Passagem registrada! Família notificada.');
    carregarPassagens();
  } catch(e) { alerta('Erro ao registrar passagem'); }
}

async function carregarPassagens() {
  try {
    const lista = await api('GET', '/api/passagem-plantao/' + APP.familiaId);
    const el = document.getElementById('lista-passagens');
    if (!el) return;
    const humorEmoji = { otimo:'😄', bem:'🙂', regular:'😐', mal:'😔', pessimo:'😢' };
    el.innerHTML = lista.length ? lista.map(p => {
      const dt = new Date(p.criado_em);
      const hora = dt.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      return `<div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);border-left:4px solid #1a9e6e">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
          <span style="font-weight:700;font-size:0.95rem">🔄 ${p.cuidador_nome} — ${p.turno || ''}</span>
          <span style="font-size:0.75rem;color:#666">${hora}</span>
        </div>
        <div style="font-size:0.9rem;color:#444;margin-bottom:0.4rem">Humor: ${humorEmoji[p.humor] || '😐'} ${p.humor || ''}</div>
        <div style="font-size:0.9rem;color:#333;margin-bottom:0.4rem">${p.resumo}</div>
        ${p.intercorrencias ? `<div style="font-size:0.85rem;color:#dc2626;background:#fff5f5;padding:0.5rem;border-radius:8px;margin-bottom:0.4rem">🚨 ${p.intercorrencias}</div>` : ''}
        ${!p.medicamentos_ok ? `<div style="font-size:0.85rem;color:#f59e0b">⚠️ Medicamentos não administrados</div>` : `<div style="font-size:0.85rem;color:#16a34a">✅ Medicamentos ok</div>`}
      </div>`;
    }).join('') : '<p style="color:#999;font-size:0.9rem;text-align:center;padding:1rem">Nenhuma passagem registrada ainda</p>';
  } catch(e) { console.log('Erro passagens:', e); }
}

// ── ESCALA DE DOR ──
async function registrarDor(nivel) {
  const labels = ['Sem dor', 'Leve', 'Moderada', 'Intensa', 'Insuportável'];
  const emojis = ['😊', '😐', '😟', '😣', '😭'];
  try {
    await api('POST', '/api/sinais', {
      membro_id: APP.membroId,
      tipo: 'dor',
      valor: nivel,
      unidade: '/4',
      observacoes: emojis[nivel] + ' ' + labels[nivel]
    });
    fecharModal('modal-dor');
    alerta('Dor registrada: ' + emojis[nivel] + ' ' + labels[nivel]);
    carregarSinais();
    if (nivel >= 3) {
      alerta('⚠️ Dor intensa registrada. A família será notificada.');
    }
  } catch(e) {
    alerta('Erro ao registrar dor');
  }
}


// ── SINAIS VITAIS + GRÁFICO ──
APP._periodoSinais = 7;
APP._tipoSinais = 'pressao';

function mudarPeriodoSinais(dias) {
  APP._periodoSinais = dias;
  ['7','30','90'].forEach(d => {
    const btn = document.getElementById('btn-periodo-' + d);
    if (btn) btn.classList.toggle('ativa', parseInt(d) === dias);
  });
  carregarSinais();
}

function mudarTipoSinais(tipo) {
  APP._tipoSinais = tipo;
  ['pressao','glicemia','peso','oximetria','dor'].forEach(t => {
    const btn = document.getElementById('btn-tipo-' + t);
    if (btn) btn.classList.toggle('ativa', t === tipo);
  });
  carregarSinais();
}

async function carregarSinais() {
  try {
    const tipo = APP._tipoSinais || 'pressao';
    const dias = APP._periodoSinais || 7;
    const todos = await api('GET', '/api/sinais/' + APP.membroId + '?tipo=' + tipo);
    const corte = new Date(); corte.setDate(corte.getDate() - dias);
    const filtrados = todos.filter(s => new Date(s.criado_em) >= corte).reverse();

    // Lista
    const lista = document.getElementById('lista-sinais');
    const unidades = { pressao:'mmHg', glicemia:'mg/dL', peso:'kg', oximetria:'%', dor:'/4' };
    const emojis = { pressao:'🩺', glicemia:'🩸', peso:'⚖️', oximetria:'💨', dor:'🤕' };
    if (lista) {
      lista.innerHTML = filtrados.length ? filtrados.slice().reverse().slice(0,10).map(s => {
        const dt = new Date(s.criado_em);
        const hora = dt.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
        const val = s.valor2 ? s.valor + '/' + s.valor2 : s.valor;
        return `<div style="display:flex;justify-content:space-between;align-items:center;background:white;border-radius:10px;padding:0.75rem 1rem;margin-bottom:0.5rem;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
          <span style="font-size:0.95rem">${emojis[tipo]||'❤️'} ${s.observacoes || (val + ' ' + (unidades[tipo]||''))}</span>
          <span style="font-size:0.75rem;color:#999">${hora}</span>
        </div>`;
      }).join('') : '<p style="color:#999;font-size:0.9rem;text-align:center;padding:1rem">Nenhum registro no período</p>';
    }

    // Gráfico
    const canvas = document.getElementById('grafico-sinais');
    if (!canvas || !filtrados.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 320;
    const H = 160;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const vals = filtrados.map(s => parseFloat(s.valor));
    const vals2 = tipo === 'pressao' ? filtrados.map(s => parseFloat(s.valor2 || 0)) : null;
    const minV = Math.min(...vals) * 0.95;
    const maxV = Math.max(...vals) * 1.05;
    const pad = { t:16, r:16, b:28, l:36 };
    const gW = W - pad.l - pad.r;
    const gH = H - pad.t - pad.b;

    const toX = i => pad.l + (i / (filtrados.length - 1 || 1)) * gW;
    const toY = v => pad.t + gH - ((v - minV) / (maxV - minV || 1)) * gH;

    // Grid
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * gH;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gW, y); ctx.stroke();
      const lbl = (maxV - (i / 4) * (maxV - minV)).toFixed(0);
      ctx.fillStyle = '#9ca3af'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(lbl, pad.l - 4, y + 3);
    }

    // Linha sistólica (ou única)
    ctx.beginPath(); ctx.strokeStyle = '#e53e3e'; ctx.lineWidth = 2;
    filtrados.forEach((s, i) => {
      const x = toX(i); const y = toY(parseFloat(s.valor));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pontos
    filtrados.forEach((s, i) => {
      ctx.beginPath(); ctx.arc(toX(i), toY(parseFloat(s.valor)), 3, 0, Math.PI*2);
      ctx.fillStyle = '#e53e3e'; ctx.fill();
    });

    // Linha diastólica (pressão)
    if (vals2 && vals2.some(v => v > 0)) {
      const minV2 = Math.min(...vals2) * 0.95;
      const toY2 = v => pad.t + gH - ((v - minV2) / (maxV - minV2 || 1)) * gH;
      ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
      filtrados.forEach((s, i) => {
        const x = toX(i); const y = toY2(parseFloat(s.valor2 || 0));
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      filtrados.forEach((s, i) => {
        ctx.beginPath(); ctx.arc(toX(i), toY2(parseFloat(s.valor2||0)), 3, 0, Math.PI*2);
        ctx.fillStyle = '#3b82f6'; ctx.fill();
      });
    }

    // Datas eixo X
    ctx.fillStyle = '#9ca3af'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
    const passo = Math.max(1, Math.floor(filtrados.length / 5));
    filtrados.forEach((s, i) => {
      if (i % passo === 0 || i === filtrados.length - 1) {
        const dt = new Date(s.criado_em);
        const label = dt.getDate() + '/' + (dt.getMonth()+1);
        ctx.fillText(label, toX(i), H - pad.b + 12);
      }
    });

  } catch(e) { console.log('Erro sinais:', e); }
}

// ── MAIS (perfil, sinais, vacinas, etc.) ──
function carregarMais() {
  document.getElementById('mais-nome').textContent = APP.membroNome;
  carregarIdSOS();
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

async function exportarMeusDados() {
  try {
    alerta('⏳ Coletando seus dados...');
    const [perfil, meds, sinais, vacinas, eventos, doencas, tratamentos, internacoes, gastos] = await Promise.all([
      api('GET', '/api/perfil/' + APP.membroId).catch(() => null),
      api('GET', '/api/medicamentos/' + APP.familiaId + '?membro_id=' + APP.membroId).catch(() => []),
      api('GET', '/api/sinais/' + APP.membroId).catch(() => []),
      api('GET', '/api/vacinas/' + APP.membroId).catch(() => []),
      api('GET', '/api/eventos/' + APP.familiaId + '?membro_id=' + APP.membroId).catch(() => []),
      api('GET', '/api/historico/doencas/' + APP.membroId).catch(() => []),
      api('GET', '/api/historico/tratamentos/' + APP.membroId).catch(() => []),
      api('GET', '/api/historico/internacoes/' + APP.membroId).catch(() => []),
      api('GET', '/api/gastos/' + APP.familiaId).catch(() => []),
    ]);

    const dados = {
      exportado_em: new Date().toLocaleString('pt-BR'),
      perfil,
      medicamentos: meds,
      sinais_vitais: sinais,
      vacinas,
      eventos,
      historico: { doencas, tratamentos, internacoes },
      gastos
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'applus-saude-meus-dados-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    alerta('✅ Dados exportados com sucesso!');
  } catch(e) {
    alerta('Erro ao exportar dados: ' + e.message);
  }
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

// Variável de controle da exclusão pendente
let _exclusaoPendente = null;

async function confirmarExcluirMembro(membroId, nome) {
  _exclusaoPendente = { tipo: 'membro', membroId, nome };
  const msg = document.getElementById('msg-confirmar-exclusao');
  const inp = document.getElementById('inp-confirmar-exclusao');
  msg.textContent = 'Você está prestes a excluir o perfil de ' + nome + '. Esta ação não pode ser desfeita.';
  inp.value = '';
  fecharModal('modal-excluir-perfil');
  abrirModal('modal-confirmar-exclusao');
  return;
}

async function executarExclusaoConfirmada() {
  const inp = document.getElementById('inp-confirmar-exclusao');
  if (inp.value.trim().toUpperCase() !== 'EXCLUIR') {
    alerta('Digite EXCLUIR para confirmar.');
    return;
  }
  const { tipo, membroId, nome } = _exclusaoPendente;
  _exclusaoPendente = null;
  fecharModal('modal-confirmar-exclusao');
  try {
    if (tipo === 'todos') {
      await api('DELETE', '/api/familias/' + APP.familiaId);
      sair();
    } else {
      await api('DELETE', '/api/membros/' + membroId);
      if (membroId == APP.membroId) {
        const restantes = await api('GET', '/api/membros/familia/' + APP.familiaId);
        if (restantes && restantes.length > 0) {
          const outro = restantes[0];
          APP.membroId = outro.id;
          APP.membroNome = outro.nome;
          APP.membroTipo = outro.tipo;
          APP.idPessoal = outro.id_pessoal;
          localStorage.removeItem('applus_perfil_original');
          salvarSessaoMembro();
          fecharModal('modal-confirmar-exclusao');
          atualizarDropdown();
          mostrarToast('Perfil de ' + nome + ' excluido!');
          navegarPara('home');
        } else {
          sair();
        }
      } else {
        const original = JSON.parse(localStorage.getItem('applus_perfil_original') || 'null');
        if (original && original.membroId == membroId) {
          localStorage.removeItem('applus_perfil_original');
        }
        fecharModal('modal-confirmar-exclusao');
        atualizarDropdown();
        mostrarToast('Perfil de ' + nome + ' excluido!');
        navegarPara('mais');
      }
    }
  } catch(e) {
    alerta('Erro ao excluir: ' + e.message);
  }
}

async function confirmarExcluirTodos() {
  _exclusaoPendente = { tipo: 'todos' };
  const msg = document.getElementById('msg-confirmar-exclusao');
  const inp = document.getElementById('inp-confirmar-exclusao');
  msg.textContent = 'Você está prestes a excluir TODOS os perfis da família. Esta ação não pode ser desfeita.';
  inp.value = '';
  fecharModal('modal-excluir-perfil');
  abrirModal('modal-confirmar-exclusao');
}

function abrirTrocarIdioma() {
  document.getElementById('idioma-page').style.display = 'flex';
  document.getElementById('app-page').style.display = 'none';
}


function baixarPDFMedicamentos() {
  if (!APP.membroId) return alerta('Faça login primeiro');
  const url = '/api/pdf/medicamentos/' + APP.membroId;
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio-medicamentos.pdf';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function sair() {
  localStorage.clear();
  window.location.href = '/';
}

// ── PUSH ──
async function registrarTokenFCM() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
    const firebaseApp = initializeApp({
      apiKey: "AIzaSyCei4pon-zvFXKYEVBhPC_CqV-PAR1mijo",
      authDomain: "applus-91d09.firebaseapp.com",
      projectId: "applus-91d09",
      storageBucket: "applus-91d09.firebasestorage.app",
      messagingSenderId: "814206937925",
      appId: "1:814206937925:web:9b550986b5e06678532c2c"
    });
    const messaging = getMessaging(firebaseApp);
    const reg = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: 'BFpHhhK6LGFVPakgXU_RYPsMTkmMladUq7GTfVVk7L5iwOkbJ6w2eqOFI5pC2qi2YbYkw4WYF28tQHOvBge8kNc',
      serviceWorkerRegistration: reg
    });
    if (token && APP.membroId) {
      await api('POST', '/api/push/salvar-fcm-token', { membro_id: APP.membroId, fcm_token: token });
      console.log('[FCM] Token registrado:', token.substring(0, 20) + '...');
    }
  } catch(e) {
    console.log('[FCM] Erro ao registrar token:', e.message);
  }
}

async function inscreverPush() {
  if (!('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const VAPID_PUBLIC_KEY = 'BO6JXBRmtjSjiM9OAa7NSy2CtZS6x_caWM582FMie8idIzpapx8McDuQl62PChqMHxQAELiE1ja1kHDmK91nLGE';
    // Sempre re-envia inscricao ao servidor
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      sub = null;
    }
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    console.log('Push: inscricao ok');
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

// ── ID SOS E CONTATOS SOS ──
async function carregarIdSOS() {
  try {
    const r = await api("GET", "/api/sos/meu-id/" + APP.membroId);
    const el = document.getElementById("meu-id-sos");
    if (el) el.textContent = r.id_sos;
    carregarContatosSOS();
  } catch(e) { console.log("Erro ID SOS:", e); }
}

function copiarIdSOS() {
  const el = document.getElementById("meu-id-sos");
  if (!el) return;
  navigator.clipboard.writeText(el.textContent).then(() => {
    alerta("ID SOS copiado!", "ok");
  }).catch(() => {
    alerta("Seu ID SOS: " + el.textContent, "ok");
  });
}

async function carregarContatosSOS() {
  try {
    const lista = await api("GET", "/api/sos/contatos/" + APP.membroId);
    const container = document.getElementById("lista-contatos-sos");
    if (!container) return;
    if (!lista.length) {
      container.innerHTML = '<p style="font-size:12px;color:#6b7280">Nenhum contato SOS cadastrado</p>';
      return;
    }
    container.innerHTML = lista.map(c => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:white;border-radius:8px;margin-bottom:6px;border:1px solid #fca5a5">
        <div>
          <div style="font-size:13px;font-weight:600;color:#111827">${c.nome_contato}</div>
          <div style="font-size:11px;color:#6b7280">${c.id_sos_contato}</div>
        </div>
        <button onclick="removerContatoSOS(${c.id})" style="background:#fee2e2;border:none;border-radius:6px;padding:6px 10px;color:#dc2626;font-size:12px;cursor:pointer">Remover</button>
      </div>
    `).join("");
  } catch(e) { console.log("Erro contatos SOS:", e); }
}

async function adicionarContatoSOS() {
  const input = document.getElementById("input-id-sos");
  const idSos = input.value.trim().toUpperCase();
  if (!idSos) return alerta("Digite o ID SOS do contato");
  try {
    const r = await api("POST", "/api/sos/contatos", { membro_id: APP.membroId, id_sos_contato: idSos });
    input.value = "";
    alerta("Contato " + r.nome + " adicionado!", "ok");
    carregarContatosSOS();
  } catch(e) { alerta("ID SOS não encontrado. Verifique e tente novamente."); }
}

async function removerContatoSOS(id) {
  await api("DELETE", "/api/sos/contatos/" + id);
  carregarContatosSOS();
}

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
    const _ag = new Date(); const hoje = _ag.getFullYear() + '-' + String(_ag.getMonth()+1).padStart(2,'0') + '-' + String(_ag.getDate()).padStart(2,'0');
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
  const card = document.querySelector('[onclick="excluirTarefa(' + id + ')"]');
  const nome = card ? card.closest('.item-lista')?.querySelector('.item-nome')?.textContent || 'esta tarefa' : 'esta tarefa';
  if (!confirm('Excluir ' + nome + '?\nEsta ação não pode ser desfeita.')) return;
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
    const _ag = new Date(); const hoje = _ag.getFullYear() + '-' + String(_ag.getMonth()+1).padStart(2,'0') + '-' + String(_ag.getDate()).padStart(2,'0');
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
  history.pushState({ modal: id, pagina: history.state?.pagina || 'home' }, '', location.href);
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
function alertaInteracao(msg) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.3)';
  box.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><span style="font-size:28px">⚠️</span><strong style="color:#dc2626;font-size:16px">Interação Medicamentosa</strong></div><p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 20px">' + msg + '</p><button id="btn-interacao-ok" style="width:100%;padding:12px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer">Entendi</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  document.getElementById("btn-interacao-ok").addEventListener("click", () => overlay.remove());
}

function alerta(msg, tipo) {
  const div = document.createElement('div');
  const bg = tipo === 'erro' ? '#ef4444' : tipo === 'aviso' ? '#f59e0b' : '#1a9e6e';
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:12px 24px;background:' + bg + ';color:#fff;font-size:14px;font-weight:500;z-index:99999;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center';
  div.textContent = msg;
  document.body.appendChild(div);
  const tempo = Math.max(4000, msg.length * 60);
  setTimeout(() => div.remove(), tempo);
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
    const membros = await api("GET", `/api/membros/familia/${APP.familiaId}`);
    // Verificar tipo original para nao prender admin que trocou para cuidador
    const perfilOriginal = JSON.parse(localStorage.getItem('applus_perfil_original') || 'null');
    const tipoReal = perfilOriginal ? perfilOriginal.membroTipo : APP.membroTipo;
    const ehCuidador = tipoReal === "cuidador";
    const membrosVisiveis = ehCuidador 
      ? membros.filter(m => m.id == APP.membroId) 
      : membros.filter(m => m.tipo !== 'baba');
    let container = document.getElementById("perfis-header");
    if (!container) {
      container = document.createElement("div");
      container.id = "perfis-header";
      container.style.cssText = "display:flex;align-items:center;gap:8px;position:absolute;top:14px;right:16px;z-index:999;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:24px;padding:6px 12px;backdrop-filter:blur(8px)";
      const selector = document.querySelector(".perfil-selector");
      if (selector) selector.replaceWith(container);
    }
    container.innerHTML = membrosVisiveis.map(m => {
      const ativo = m.id == APP.membroId;
      const av = m.foto ? `<img src="${m.foto}" style="width:32px;height:32px;object-fit:cover;border-radius:50%">` : `<span style="font-size:14px">${avatarMembro(m.nome, m.tipo)}</span>`;
      return `<div data-mid="${m.id}" data-nome="${m.nome.split(' ')[0]}" data-tipo="${m.tipo}" data-pid="${m.id_pessoal}" onclick="trocarParaPerfil(parseInt(this.dataset.mid), this.dataset.nome, this.dataset.tipo, this.dataset.pid)" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">
        <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${ativo?'white':'rgba(255,255,255,0.3)'};border:2px solid ${ativo?'white':'transparent'}">${av}</div>
        <span style="font-size:9px;color:${ativo?'white':'rgba(255,255,255,0.7)'};font-weight:${ativo?700:400}">${m.nome.split(' ')[0]}</span>
      </div>`;
    }).join("") + (ehCuidador ? "" : `<div onclick="abrirModal(&quot;modal-add-membro&quot;)" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer"><div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);color:white;font-size:18px">+</div><span style="font-size:9px;color:rgba(255,255,255,0.7)">Novo</span></div>`);
  } catch(e) { console.log("Erro dropdown:", e); }
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
  // Se o perfil original ainda nao foi salvo, salvar agora
  if (!localStorage.getItem('applus_perfil_original')) {
    localStorage.setItem('applus_perfil_original', JSON.stringify({
      membroId: APP.membroId,
      membroNome: APP.membroNome,
      membroTipo: APP.membroTipo,
      idPessoal: APP.idPessoal
    }));
  }
  APP.membroId = id;
  APP.membroNome = nome;
  APP.membroTipo = tipo;
  APP.idPessoal = idPessoal;
  salvarSessaoMembro();
  atualizarDropdown();
  navegarPara('home');
}



async function salvarInstrucoesPais() {
  const texto = document.getElementById('instrucoes-pais-input').value;
  try {
    await api('POST', '/api/baba/instrucoes', { familia_id: APP.familiaId, texto });
    mostrarToast('Instrucoes salvas! A baba ja pode ver.');
  } catch(e) {
    mostrarToast('Erro ao salvar instrucoes');
  }
}

async function carregarPainelBaba() {
  let pagina = document.getElementById('pag-painel-baba');
  if (!pagina) {
    pagina = document.createElement('div');
    pagina.id = 'pag-painel-baba';
    pagina.className = 'pagina';
    const cont = document.querySelector('.conteudo');
    if (cont) cont.appendChild(pagina);
  }
  pagina.classList.add('ativa');
  pagina.innerHTML = '<div style="padding:20px;text-align:center;color:#888;">Carregando...</div>';
  try {
    const fid = APP.familiaId;
    const registros = await api('GET', '/api/baba/registros/' + fid);
    const ckRes = await fetch('/api/baba/checkin-ativo/' + fid + '/' + APP.membroId);
    const checkin = ckRes.ok ? await ckRes.json() : null;
    const estoque = await api('GET', '/api/baba/estoque/' + fid);
    const marcos = await api('GET', '/api/baba/marcos/' + fid);
    const instrRes = await fetch('/api/baba/instrucoes/' + fid);
    const instrucoes = instrRes.ok ? await instrRes.json() : { texto: '' };
    const mamadas = registros.filter(r=>r.tipo==='mamada').length;
    const fraldas = registros.filter(r=>r.tipo==='fralda').length;
    const sonos = registros.filter(r=>r.tipo==='sono').length;
    const ckHtml = checkin
      ? '<div style="background:#e0f5ea;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#0F6E56;">checkmark Check-in as ' + new Date(checkin.checkin_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) + (checkin.gps_checkin?' · GPS OK':'') + '</div>'
      : '<div style="background:#fff3cd;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#856404;">Baba ainda nao fez check-in hoje</div>';
    const estoqueAlerta = estoque.filter(e=>e.quantidade<=e.alerta_em);
    const estoqueHtml = estoqueAlerta.length
      ? '<div style="background:#fdecea;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;color:#c0392b;">Estoque baixo: ' + estoqueAlerta.map(e=>e.item+' ('+e.quantidade+')').join(', ') + '</div>'
      : '';
    const _icos = {mamada:'🍼',fralda:'🧷',sono:'😴',humor:'😊',marco:'⭐',medicamento:'💊',foto:'📷',atividade:'🎮'};
    const _nomes = {mamada:'Mamada',fralda:'Fralda',sono:'Sono',humor:'Humor',marco:'Marco',medicamento:'Medicamento',foto:'Foto',atividade:'Atividade'};
    const logHtml = registros.length ? registros.map(function(r) {
      const h = new Date(r.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
      const ico = _icos[r.tipo] || '📝';
      const nome = _nomes[r.tipo] || r.tipo;
      const qtd = r.quantidade && r.quantidade !== 'undefinedml' ? ' — ' + r.quantidade : '';
      const det = r.detalhe && r.detalhe !== 'undefined' ? r.detalhe : '';
      const hum = r.humor ? ' · ' + r.humor : '';
      const fotoEl = r.foto ? '<div style="margin-top:8px;"><img src="' + r.foto + '" style="width:100%;max-height:200px;border-radius:10px;object-fit:cover;"></div>' : '';
      return '<div style="padding:12px 0;border-bottom:0.5px solid #f0f0f0;">'
        + '<div style="display:flex;align-items:center;gap:8px;">'
        + '<span style="font-size:20px;">' + ico + '</span>'
        + '<div style="flex:1;">'
        + '<span style="font-size:13px;font-weight:600;color:#222;">' + nome + qtd + '</span>'
        + (det||hum ? '<div style="font-size:12px;color:#666;margin-top:1px;">' + det + hum + '</div>' : '')
        + '</div>'
        + '<span style="font-size:11px;color:#999;">' + h + '</span>'
        + '</div>'
        + fotoEl
        + '</div>';
    }).join('') : '<div style="text-align:center;color:#aaa;padding:20px;font-size:13px;">Nenhum registro ainda hoje</div>';
    const marcosHtml = marcos.slice(0,3).map(function(m) {
      return '<div style="background:#fff8e1;border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">⭐ ' + m.descricao + '<span style="color:#999;font-size:11px;margin-left:8px;flex-shrink:0;">' + new Date(m.criado_em).toLocaleDateString('pt-BR') + '</span></div>';
    }).join('');
    await atualizarDropdown();
    pagina.innerHTML =
      '<div style="padding:0">'
      + '<div style="background:#1D9E75;padding:14px 16px 12px;position:relative;min-height:60px;">'
      + '<div id="perfis-header-baba" style="display:flex;align-items:center;gap:8px;position:absolute;top:14px;right:16px;z-index:999;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:24px;padding:6px 12px;"></div>'
      + '<div style="font-size:16px;font-weight:700;color:#fff;padding-right:120px;">👶 ' + APP.membroNome + '</div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,0.85);">Painel da babá — hoje</div>'
      + '</div>'
      + '<div style="padding:16px;">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
      + '<div><div style="font-size:18px;font-weight:700;color:#222;">bebe ' + APP.membroNome + '</div>'
      + '<div style="font-size:12px;color:#888;">Painel da baba — hoje</div></div>'
      + '<button onclick="navegarPara(\"home\")" style="background:#f0f0f0;color:#666;border:none;padding:8px 14px;border-radius:20px;font-size:12px;cursor:pointer;">Voltar</button>'
      + '</div>'
      + ckHtml + estoqueHtml
      + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">'
      + '<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;border:1px solid #e0f0ea;"><div style="font-size:20px;font-weight:700;color:#1D9E75;">' + mamadas + '</div><div style="font-size:10px;color:#888;">Mamadas</div></div>'
      + '<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;border:1px solid #e0f0ea;"><div style="font-size:20px;font-weight:700;color:#1D9E75;">' + fraldas + '</div><div style="font-size:10px;color:#888;">Fraldas</div></div>'
      + '<div style="background:#fff;border-radius:10px;padding:10px;text-align:center;border:1px solid #e0f0ea;"><div style="font-size:20px;font-weight:700;color:#1D9E75;">' + sonos + '</div><div style="font-size:10px;color:#888;">Sonos</div></div>'
      + '</div>'
      + (marcosHtml ? '<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:6px;">Marcos recentes</div>' + marcosHtml + '</div>' : '')
      + '<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px;">Diario de hoje</div>'
      + '<div style="background:#fff;border-radius:12px;padding:0 12px;border:1px solid #e0f0ea;">' + logHtml + '</div>'
      + '<div style="margin-top:16px;">'
      + '<div style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;margin-bottom:8px;">Instrucoes para a baba</div>'
      + '<div style="background:#fff;border-radius:12px;padding:12px;border:1px solid #e0f0ea;">'
      + '<textarea id="instrucoes-pais-input" rows="4" style="width:100%;border:1px solid #e0e0e0;border-radius:8px;padding:10px;font-size:13px;resize:none;" placeholder="Ex: Fraldas no armario azul. Alergia a morango. Pediatra: Dr. Silva 21 99999-0000.">' + (instrucoes.texto || '') + '</textarea>'
      + '<button onclick="salvarInstrucoesPais()" style="width:100%;margin-top:8px;background:#1D9E75;color:#fff;border:none;padding:10px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Salvar instrucoes</button>'
      + '</div></div>'
      + '<button onclick="carregarPainelBaba()" style="width:100%;margin-top:14px;background:#f0faf5;color:#1D9E75;border:1px solid #b8e8d4;padding:10px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">Atualizar</button>'
      + '</div>';
    // Popular dropdown de perfis no header do painel
    try {
      const membros = await api('GET', '/api/membros/familia/' + APP.familiaId);
      const headerBaba = document.getElementById('perfis-header-baba');
      if (headerBaba) {
        headerBaba.innerHTML = membros.map(m => {
          const ativo = m.id == APP.membroId;
          const av = m.foto ? '<img src="' + m.foto + '" style="width:32px;height:32px;object-fit:cover;border-radius:50%">' : '<span style="font-size:14px">' + avatarMembro(m.nome, m.tipo) + '</span>';
          return '<div data-mid="' + m.id + '" data-nome="' + m.nome.split(' ')[0] + '" data-tipo="' + m.tipo + '" data-pid="' + m.id_pessoal + '" onclick="trocarParaPerfil(parseInt(this.dataset.mid),this.dataset.nome,this.dataset.tipo,this.dataset.pid)" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer">'
            + '<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:' + (ativo?'white':'rgba(255,255,255,0.3)') + ';border:2px solid ' + (ativo?'white':'transparent') + '">' + av + '</div>'
            + '<span style="font-size:9px;color:' + (ativo?'white':'rgba(255,255,255,0.7)') + ';font-weight:' + (ativo?700:400) + '">' + m.nome.split(' ')[0] + '</span>'
            + '</div>';
        }).join('') + '<div onclick="abrirModal(&quot;modal-add-membro&quot;)" style="display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer"><div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);color:white;font-size:18px">+</div><span style="font-size:9px;color:rgba(255,255,255,0.7)">Novo</span></div>';
      }
    } catch(e) {}

    if (APP.socket) {
      APP.socket.off('baba-novo-registro');
      APP.socket.on('baba-novo-registro', function() { carregarPainelBaba(); });
      APP.socket.off('baba-checkin-update');
      APP.socket.on('baba-checkin-update', function() { carregarPainelBaba(); });
      APP.socket.off('baba-novo-marco');
      APP.socket.on('baba-novo-marco', function() { carregarPainelBaba(); });
    }
  } catch(e) {
    pagina.innerHTML = '<div style="padding:20px;text-align:center;color:#e74c3c;">Erro: ' + e.message + '</div>';
  }
}

function avatarMembro(nome, tipo) {
  const emojis = {
    administrador: '👤',
    cuidador: '🧑‍⚕️',
    idoso: '🧓',
    crianca: '👶',
    conjuge: '💑',
    baba: '👶',
    mae: '👩',
    pai: '👨',
    irmao: '👦',
    avo: '👴',
    tio: '🧑',
    filho: '👶'
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
  ['atividades','humor','alimentacao','hidratacao','sono','intercorrencias','passagem'].forEach(a => {
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
  if (aba === 'passagem') carregarPassagens();
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
          ${a.foto ? `<img src="${a.foto}" style="width:100%;border-radius:8px;margin-top:6px;max-height:160px;object-fit:cover">` : ''}
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
    const lista = await api('GET', `/api/cuidados/humor/${APP.familiaId}?membro_id=${APP.membroId}`);
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
    atualizarContadoresHome();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarHidratacao() {
  try {
    const dados = await api('GET', `/api/cuidados/hidratacao/${APP.familiaId}?membro_id=${APP.membroId}`);
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
    atualizarContadoresHome();
  } catch(e) { alerta('Erro: ' + e.message); }
}

async function carregarSono() {
  try {
    const lista = await api('GET', `/api/cuidados/sono/${APP.familiaId}?membro_id=${APP.membroId}`);
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
      api('GET', `/api/cuidados/humor/${APP.familiaId}?membro_id=${APP.membroId}`),
      api('GET', `/api/cuidados/refeicoes/${APP.familiaId}`),
      api('GET', `/api/cuidados/intercorrencias/${APP.familiaId}`),
      api('GET', `/api/cuidados/hidratacao/${APP.familiaId}?membro_id=${APP.membroId}`)
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


// ── MEU DIA ──
let meudiaHumorAtual = null;
let meudiaMetaAgua = 8;
let meudiaMetaRefeicoes = 3;
let meudiaMetaSono = 8;
let meudiaMetaAtividades = 1;

function trocarAbaMeuDia(aba) {
  ['agua','refeicao','sono','atividade','humor'].forEach(function(a) {
    document.getElementById('meudia-' + a).style.display = a === aba ? 'block' : 'none';
    var btn = document.getElementById('aba-meudia-' + a);
    if (btn) btn.classList.toggle('ativa', a === aba);
  });
}

function exibirCardMetasMeuDia(metas) {
  const el = document.getElementById('meudia-resumo');
  if (!el || !metas) return;
  const just = metas.justificativas || {};
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,#0f6647,#1a9e6e);border-radius:16px;padding:1.25rem;margin-bottom:1rem;color:white;position:relative;z-index:20">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
        <div style="font-weight:600;font-size:1rem">🤖 Metas personalizadas pela IA</div>
        <button onclick="verJustificativasMetasMeuDia()" style="background:rgba(255,255,255,0.2);border:none;color:white;border-radius:8px;padding:0.25rem 0.75rem;font-size:0.8rem;cursor:pointer">Ver motivos</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:0.6rem;text-align:center">
          <div style="font-size:1.3rem;font-weight:bold">${metas.agua}</div>
          <div style="font-size:0.75rem;opacity:0.85">💧 copos água</div>
        </div>
        <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:0.6rem;text-align:center">
          <div style="font-size:1.3rem;font-weight:bold">${metas.refeicoes}</div>
          <div style="font-size:0.75rem;opacity:0.85">🍽️ refeições</div>
        </div>
        <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:0.6rem;text-align:center">
          <div style="font-size:1.3rem;font-weight:bold">${metas.sono}h</div>
          <div style="font-size:0.75rem;opacity:0.85">😴 sono</div>
        </div>
        <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:0.6rem;text-align:center">
          <div style="font-size:1.3rem;font-weight:bold">${metas.atividades}</div>
          <div style="font-size:0.75rem;opacity:0.85">🏃 atividade</div>
        </div>
      </div>
    </div>
  `;
  // Guardar justificativas para o modal
  window._metasJustificativas = just;
  window._metasValores = metas;
}

function verJustificativasMetasMeuDia() {
  const just = window._metasJustificativas || {};
  const metas = window._metasValores || {};
  const itens = [
    { emoji: '💧', label: 'Água', valor: metas.agua + ' copos', motivo: just.agua },
    { emoji: '🍽️', label: 'Refeições', valor: metas.refeicoes + ' refeições', motivo: just.refeicoes },
    { emoji: '😴', label: 'Sono', valor: metas.sono + 'h', motivo: just.sono },
    { emoji: '🏃', label: 'Atividade', valor: metas.atividades + ' por dia', motivo: just.atividades }
  ];
  const html = itens.map(i => `
    <div style="background:#f0fdf4;border-radius:10px;padding:0.75rem;margin-bottom:0.5rem">
      <div style="font-weight:600;color:#0f6647">${i.emoji} ${i.label} — ${i.valor}</div>
      <div style="font-size:0.85rem;color:#374151;margin-top:0.25rem">${i.motivo || ''}</div>
    </div>
  `).join('');
  const conteudo = document.getElementById('modal-metas-ia-conteudo');
  if (conteudo) conteudo.innerHTML = html;
  abrirModal('modal-metas-ia');
}

async function iniciarMeuDia() {
  try {
    const perfil = await api('GET', '/api/perfil/' + APP.membroId);
    if (perfil && !perfil.erro) {
      if (!perfil.meta_justificativas) {
        try {
          const r = await api('POST', '/api/ia/gerar-metas', {
            membro_id: APP.membroId, familia_id: APP.familiaId
          });
          if (r && r.metas) {
            meudiaMetaAgua = r.metas.agua || 8;
            meudiaMetaRefeicoes = r.metas.refeicoes || 4;
            meudiaMetaSono = r.metas.sono || 8;
            meudiaMetaAtividades = r.metas.atividades || 1;
            // Exibir card de metas no resumo
            exibirCardMetasMeuDia(r.metas);
          }
        } catch(e) {
          meudiaMetaAgua = 8; meudiaMetaRefeicoes = 4;
          meudiaMetaSono = 8; meudiaMetaAtividades = 1;
        }
      } else {
        meudiaMetaAgua = perfil.meta_agua || 8;
        meudiaMetaRefeicoes = perfil.meta_refeicoes || 4;
        meudiaMetaSono = perfil.meta_sono || 8;
        meudiaMetaAtividades = perfil.meta_atividades || 1;
        if (perfil.meta_justificativas) {
          try {
            const just = typeof perfil.meta_justificativas === 'string'
              ? JSON.parse(perfil.meta_justificativas)
              : perfil.meta_justificativas;
            exibirCardMetasMeuDia({
              agua: perfil.meta_agua,
              refeicoes: perfil.meta_refeicoes,
              sono: perfil.meta_sono,
              atividades: perfil.meta_atividades,
              justificativas: just
            });
          } catch(e) {}
        }
      }
    }
  } catch(e) {}

  // Preencher selects de hora do sono
  var opts = '<option value="">Selecione</option>';
  for (var h = 0; h < 24; h++) {
    for (var m = 0; m < 60; m += 30) {
      var hh = String(h).padStart(2,'0');
      var mm = String(m).padStart(2,'0');
      opts += '<option value="' + hh + ':' + mm + '">' + hh + ':' + mm + '</option>';
    }
  }
  document.getElementById('meudia-sono-inicio').innerHTML = opts;
  document.getElementById('meudia-sono-fim').innerHTML = opts;

  document.getElementById('meudia-meta-agua').textContent = meudiaMetaAgua;
  await meudiaCarregarAgua();
  await meudiaCarregarRefeicoes();
  await meudiaCarregarSono();
  await meudiaCarregarAtividades();
  await meudiaCarregarHumor();
}

function meudiaAtualizarBarra(idBarra, idLabel, atual, meta, cor, unidade) {
  var pct = Math.min(100, Math.round((atual / meta) * 100));
  document.getElementById(idBarra).style.width = pct + '%';
  document.getElementById(idBarra).style.background = cor;
  if (idLabel) {
    var label = pct >= 100 ? '✅ Meta atingida!' : atual + ' de ' + meta + ' ' + unidade;
    document.getElementById(idLabel).textContent = label;
  }
}

// ÁGUA
async function meudiaCarregarAgua() {
  try {
    const dados = await api('GET', '/api/cuidados/hidratacao/' + APP.familiaId + '?membro_id=' + APP.membroId);
    var total = dados.total || 0;
    document.getElementById('meudia-total-agua').textContent = total;
    document.getElementById('meudia-meta-agua').textContent = meudiaMetaAgua;
    meudiaAtualizarBarra('meudia-barra-agua', null, total, meudiaMetaAgua, '#2563eb', 'copos');
  } catch(e) {}
}

function atualizarContadoresHome() {
  // Atualiza contadores da home em tempo real sem regenerar o relatório do Gemini
  try {
    const elAgua = document.getElementById('resumo-agua');
    const elSono = document.getElementById('resumo-sono');
    const elHumor = document.getElementById('resumo-humor');
    if (elAgua) {
      api('GET', '/api/cuidados/hidratacao/' + APP.familiaId + '?membro_id=' + APP.membroId).then(d => {
        if (d && elAgua) elAgua.textContent = (d.total || 0) + '/' + meudiaMetaAgua;
      }).catch(()=>{});
    }
    if (elSono) {
      api('GET', '/api/cuidados/sono/' + APP.familiaId + '?membro_id=' + APP.membroId).then(lista => {
        if (!lista || !lista.length) return;
        const s = lista[lista.length-1];
        if (s && s.inicio && s.fim) {
          const d = s.inicio.split(':').map(Number);
          const a = s.fim.split(':').map(Number);
          let h = (a[0]-d[0]) + (a[1]-d[1])/60;
          if (h < 0) h += 24;
          if (elSono) elSono.textContent = Math.round(h*10)/10 + 'h';
        }
      }).catch(()=>{});
    }
    if (elHumor) {
      api('GET', '/api/cuidados/humor/' + APP.familiaId + '?membro_id=' + APP.membroId).then(lista => {
        if (!lista || !lista.length) return;
        const emojis = {1:'😢',2:'😔',3:'😐',4:'🙂',5:'😄'};
        const ultimo = lista[lista.length-1];
        if (ultimo && elHumor) elHumor.textContent = emojis[ultimo.humor] || '😊';
      }).catch(()=>{});
    }
  } catch(e) {}
}

async function meudiaRegistrarAgua(qtd) {
  try {
    var totalAtual = parseInt(document.getElementById('meudia-total-agua').textContent) || 0;
    var novoTotal = Math.max(0, totalAtual + qtd);
    await api('POST', '/api/cuidados/hidratacao', {
      familia_id: APP.familiaId, membro_id: APP.membroId, copos: qtd
    });
    await meudiaCarregarAgua();
    atualizarContadoresHome();
    if (novoTotal >= meudiaMetaAgua) alerta('💧 Meta de hidratação atingida! Parabéns!');
  } catch(e) { alerta('Erro ao registrar água'); }
}

// REFEIÇÕES
async function meudiaCarregarRefeicoes() {
  try {
    const lista = await api('GET', '/api/cuidados/refeicoes/' + APP.familiaId);
    meudiaAtualizarBarra('meudia-barra-refeicao', 'meudia-label-refeicao', lista.length, meudiaMetaRefeicoes, '#10b981', 'refeições');
    var el = document.getElementById('meudia-lista-refeicao');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma refeição registrada hoje.</p>'; return; }
    el.innerHTML = lista.map(function(r) {
      return '<div style="background:white;border-radius:12px;padding:0.75rem;margin-bottom:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
        '<div style="font-weight:600">' + r.tipo + '</div>' +
        '<div style="font-size:0.85rem;color:#666">' + (r.obs || '') + '</div></div>';
    }).join('');
  } catch(e) {}
}

async function meudiaRegistrarRefeicao(tipo) {
  try {
    await api('POST', '/api/cuidados/refeicao', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      tipo: tipo, quantidade: 'Tudo', obs: ''
    });
    alerta('✅ ' + tipo + ' registrado!');
    await meudiaCarregarRefeicoes();
    atualizarContadoresHome();
  } catch(e) { alerta('Erro ao registrar refeição'); }
}

// SONO
async function meudiaCarregarSono() {
  try {
    const lista = await api('GET', '/api/cuidados/sono/' + APP.familiaId + '?membro_id=' + APP.membroId);
    var totalHoras = 0;
    if (lista.length) {
      lista.forEach(function(s) {
        if (s.inicio && s.fim) {
          var ini = s.inicio.split(':');
          var fim = s.fim.split(':');
          var diff = (parseInt(fim[0]) * 60 + parseInt(fim[1])) - (parseInt(ini[0]) * 60 + parseInt(ini[1]));
          if (diff < 0) diff += 24 * 60;
          totalHoras += diff / 60;
        }
      });
    }
    totalHoras = Math.round(totalHoras * 10) / 10;
    meudiaAtualizarBarra('meudia-barra-sono', 'meudia-label-sono', totalHoras, meudiaMetaSono, '#8b5cf6', 'horas dormidas');
    var el = document.getElementById('meudia-lista-sono');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhum sono registrado hoje.</p>'; return; }
    el.innerHTML = lista.map(function(s) {
      return '<div style="background:white;border-radius:12px;padding:0.75rem;margin-bottom:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
        '<div style="font-weight:600">😴 ' + (s.qualidade || '') + '</div>' +
        '<div style="font-size:0.85rem;color:#666">Dormiu: ' + (s.inicio || '--') + ' | Acordou: ' + (s.fim || '--') + '</div></div>';
    }).join('');
  } catch(e) {}
}

async function meudiaRegistrarSono() {
  var inicio = document.getElementById('meudia-sono-inicio').value;
  var fim = document.getElementById('meudia-sono-fim').value;
  var qualidade = document.getElementById('meudia-sono-qualidade').value;
  if (!inicio || !fim) return alerta('Selecione os horários');
  try {
    await api('POST', '/api/cuidados/sono', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      inicio: inicio, fim: fim, qualidade: qualidade, obs: ''
    });
    alerta('✅ Sono registrado!');
    await meudiaCarregarSono();
    atualizarContadoresHome();
  } catch(e) { alerta('Erro ao registrar sono'); }
}

// ATIVIDADE
async function meudiaCarregarAtividades() {
  try {
    const lista = await api('GET', '/api/cuidados/atividades/' + APP.familiaId);
    meudiaAtualizarBarra('meudia-barra-atividade', 'meudia-label-atividade', lista.length, meudiaMetaAtividades, '#f59e0b', 'atividades');
    var el = document.getElementById('meudia-lista-atividade');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma atividade registrada hoje.</p>'; return; }
    el.innerHTML = lista.map(function(a) {
      return '<div style="background:white;border-radius:12px;padding:0.75rem;margin-bottom:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
        '<div style="font-weight:600">' + a.tipo + (a.duracao ? ' — ' + a.duracao + ' min' : '') + '</div>' +
        '<div style="font-size:0.85rem;color:#666">' + (a.obs || '') + '</div></div>';
    }).join('');
  } catch(e) {}
}

async function meudiaRegistrarAtividade() {
  var tipo = document.getElementById('meudia-atv-tipo').value;
  var duracao = document.getElementById('meudia-atv-duracao').value;
  var obs = document.getElementById('meudia-atv-obs').value.trim();
  if (!duracao) return alerta('Informe a duração');
  try {
    await api('POST', '/api/cuidados/atividade', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      tipo: tipo, duracao: duracao, obs: obs, hora: ''
    });
    document.getElementById('meudia-atv-duracao').value = '';
    document.getElementById('meudia-atv-obs').value = '';
    alerta('✅ Atividade registrada!');
    await meudiaCarregarAtividades();
    atualizarContadoresHome();
  } catch(e) { alerta('Erro ao registrar atividade'); }
}

// HUMOR
function meudiaHumor(valor) {
  meudiaHumorAtual = valor;
  document.querySelectorAll('#meudia-humor .emoji-humor').forEach(function(el) {
    el.style.background = el.dataset.valor === valor ? '#e8f5e9' : '';
    el.style.border = el.dataset.valor === valor ? '2px solid #10b981' : '2px solid transparent';
  });
}

async function meudiaRegistrarHumor() {
  if (!meudiaHumorAtual) return alerta('Selecione como você está');
  var obs = document.getElementById('meudia-humor-obs').value.trim();
  try {
    await api('POST', '/api/cuidados/humor', {
      familia_id: APP.familiaId, membro_id: APP.membroId,
      humor: meudiaHumorAtual, obs: obs
    });
    document.getElementById('meudia-humor-obs').value = '';
    meudiaHumorAtual = null;
    document.querySelectorAll('#meudia-humor .emoji-humor').forEach(function(el) {
      el.style.background = '';
      el.style.border = '2px solid transparent';
    });
    alerta('✅ Humor registrado!');
    await meudiaCarregarHumor();
    atualizarContadoresHome();
  } catch(e) { alerta('Erro ao registrar humor'); }
}

async function meudiaCarregarHumor() {
  try {
    const lista = await api('GET', '/api/cuidados/humor/' + APP.familiaId + '?membro_id=' + APP.membroId);
    var el = document.getElementById('meudia-lista-humor');
    var emojis = { otimo:'😄', bem:'🙂', regular:'😐', mal:'😔', pessimo:'😢' };
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhum humor registrado hoje.</p>'; return; }
    el.innerHTML = lista.map(function(h) {
      return '<div style="background:white;border-radius:12px;padding:0.75rem;margin-bottom:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:0.75rem">' +
        '<div style="font-size:2rem">' + (emojis[h.humor] || '😐') + '</div>' +
        '<div><div style="font-weight:600;text-transform:capitalize">' + h.humor + '</div>' +
        '<div style="font-size:0.85rem;color:#666">' + (h.obs || '') + '</div></div></div>';
    }).join('');
  } catch(e) {}
}


// ── MENTE SÃ ──
let msRespTimer = null;
let msRespAtivo = false;
let msHumorSelecionado = null;

function trocarAbaMenteSa(aba) {
  ['respiracao','humor','diario','rotinas'].forEach(function(a) {
    document.getElementById('ms-' + a).style.display = a === aba ? 'block' : 'none';
    var btn = document.getElementById('aba-ms-' + a);
    if (btn) btn.classList.toggle('ativa', a === aba);
  });
  if (aba === 'humor') msCarregarHumor();
  if (aba === 'diario') msCarregarDiario();
  if (aba === 'rotinas') msCarregarRotinas();
}

async function iniciarMenteSa() {
  trocarAbaMenteSa('respiracao');
}

// ── RESPIRAÇÃO GUIADA ──
function iniciarRespiracao(tipo) {
  pararRespiracao();
  msRespAtivo = true;
  var ciclos = {
    '4-7-8': [
      { texto: 'Inspire...', emoji: '😮‍💨', dur: 4, cor: '#667eea' },
      { texto: 'Segure...', emoji: '🤐', dur: 7, cor: '#764ba2' },
      { texto: 'Expire...', emoji: '😌', dur: 8, cor: '#06b6d4' }
    ],
    'box': [
      { texto: 'Inspire...', emoji: '😮‍💨', dur: 4, cor: '#667eea' },
      { texto: 'Segure...', emoji: '🤐', dur: 4, cor: '#764ba2' },
      { texto: 'Expire...', emoji: '😌', dur: 4, cor: '#06b6d4' },
      { texto: 'Segure...', emoji: '🤐', dur: 4, cor: '#f59e0b' }
    ],
    'coerencia': [
      { texto: 'Inspire...', emoji: '😮‍💨', dur: 5, cor: '#10b981' },
      { texto: 'Expire...', emoji: '😌', dur: 5, cor: '#06b6d4' }
    ]
  };

  var fases = ciclos[tipo] || ciclos['4-7-8'];
  var faseAtual = 0;
  var contador = fases[0].dur;

  function executarFase() {
    if (!msRespAtivo) return;
    var fase = fases[faseAtual];
    document.getElementById('ms-resp-emoji').textContent = fase.emoji;
    document.getElementById('ms-resp-texto').textContent = fase.texto;
    document.getElementById('ms-resp-fase').textContent = fase.texto;
    document.getElementById('ms-circulo-resp').style.background = 'linear-gradient(145deg,' + fase.cor + ', #1a1a2e)';
    
    if (fase.texto === 'Inspire...') {
      document.getElementById('ms-circulo-resp').style.transform = 'scale(1.3)';
    } else if (fase.texto === 'Expire...') {
      document.getElementById('ms-circulo-resp').style.transform = 'scale(0.9)';
    } else {
      document.getElementById('ms-circulo-resp').style.transform = 'scale(1.1)';
    }

    contador = fase.dur;
    document.getElementById('ms-resp-contador').textContent = contador + 's';

    msRespTimer = setInterval(function() {
      if (!msRespAtivo) { clearInterval(msRespTimer); return; }
      contador--;
      document.getElementById('ms-resp-contador').textContent = contador + 's';
      if (contador <= 0) {
        clearInterval(msRespTimer);
        faseAtual = (faseAtual + 1) % fases.length;
        executarFase();
      }
    }, 1000);
  }

  executarFase();
}

function pararRespiracao() {
  msRespAtivo = false;
  if (msRespTimer) { clearInterval(msRespTimer); msRespTimer = null; }
  var el = document.getElementById('ms-resp-emoji');
  if (el) el.textContent = '😮‍💨';
  var t = document.getElementById('ms-resp-texto');
  if (t) t.textContent = 'Toque para iniciar';
  var f = document.getElementById('ms-resp-fase');
  if (f) f.textContent = '';
  var cnt = document.getElementById('ms-resp-contador');
  if (cnt) cnt.textContent = '';
  var circ = document.getElementById('ms-circulo-resp');
  if (circ) {
    circ.style.transform = 'scale(1)';
    circ.style.background = 'linear-gradient(145deg,#667eea,#764ba2)';
  }
}

// ── HUMOR ──
async function msRegistrarHumor(valor, label) {
  document.querySelectorAll('.ms-emoji-humor').forEach(function(el) {
    el.style.background = el.dataset.valor === label ? '#e8f5e9' : '';
    el.style.border = el.dataset.valor === label ? '2px solid #10b981' : '2px solid transparent';
    el.style.borderRadius = '8px';
  });
  msHumorSelecionado = { valor: valor, label: label };
}

async function msSalvarHumor() {
  if (!msHumorSelecionado) return alerta('Selecione como você está');
  var obs = document.getElementById('ms-humor-obs').value.trim();
  try {
    await api('POST', '/api/mente-sa/humor', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      humor: msHumorSelecionado.label,
      valor: msHumorSelecionado.valor,
      obs: obs
    });
    document.getElementById('ms-humor-obs').value = '';
    msHumorSelecionado = null;
    document.querySelectorAll('.ms-emoji-humor').forEach(function(el) {
      el.style.background = '';
      el.style.border = '2px solid transparent';
    });
    alerta('✅ Humor registrado!');
    msCarregarHumor();
  } catch(e) { alerta('Erro ao salvar humor: ' + e.message); }
}

async function msCarregarHumor() {
  try {
    const lista = await api('GET', '/api/mente-sa/humor/' + APP.membroId);
    
    // Gráfico semanal
    var dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    var hoje = new Date();
    var grafico = document.getElementById('ms-grafico-humor');
    var labels = document.getElementById('ms-grafico-labels');
    var barras = '';
    var lbls = '';
    
    for (var i = 6; i >= 0; i--) {
      var d = new Date(hoje);
      d.setDate(d.getDate() - i);
      var dataStr = d.toISOString().split('T')[0];
      var diaNome = dias[d.getDay()];
      var registro = lista.find(function(h) { return h.data && h.data.startsWith(dataStr); });
      var valor = registro ? registro.valor : 0;
      var cores = { 5:'#10b981', 4:'#34d399', 3:'#f59e0b', 2:'#f97316', 1:'#ef4444', 0:'#e5e7eb' };
      var cor = cores[valor] || '#e5e7eb';
      var altura = valor ? (valor * 18) + 'px' : '4px';
      var emoji = { 5:'😄', 4:'🙂', 3:'😐', 2:'😔', 1:'😢', 0:'' }[valor] || '';
      
      barras += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">' +
        '<div style="font-size:0.8rem">' + emoji + '</div>' +
        '<div style="width:100%;background:' + cor + ';border-radius:6px 6px 0 0;height:' + altura + ';transition:height 0.5s;min-height:4px"></div>' +
        '</div>';
      lbls += '<div style="flex:1;text-align:center;font-size:0.7rem;color:#999">' + diaNome + '</div>';
    }
    
    grafico.innerHTML = barras;
    labels.innerHTML = lbls;

    // Lista
    var el = document.getElementById('ms-lista-humor');
    var emojis = { otimo:'😄', bem:'🙂', regular:'😐', mal:'😔', pessimo:'😢' };
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhum registro ainda.</p>'; return; }
    el.innerHTML = lista.slice(0,5).map(function(h) {
      return '<div style="background:white;border-radius:12px;padding:0.75rem;margin-bottom:0.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:0.75rem">' +
        '<div style="font-size:2rem">' + (emojis[h.humor] || '😐') + '</div>' +
        '<div><div style="font-weight:600;text-transform:capitalize">' + h.humor + '</div>' +
        '<div style="font-size:0.8rem;color:#666">' + (h.obs || '') + '</div>' +
        '<div style="font-size:0.75rem;color:#999">' + new Date(h.criado_em).toLocaleDateString('pt-BR') + '</div></div></div>';
    }).join('');
  } catch(e) { console.log('Erro humor MS:', e); }
}

// ── DIÁRIO ──
async function msSalvarDiario() {
  var bom = document.getElementById('ms-diario-bom').value.trim();
  var dificil = document.getElementById('ms-diario-dificil').value.trim();
  var sentimento = document.getElementById('ms-diario-sentimento').value.trim();
  if (!bom && !dificil && !sentimento) return alerta('Escreva pelo menos um campo');
  try {
    await api('POST', '/api/mente-sa/diario', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      bom: bom, dificil: dificil, sentimento: sentimento
    });
    document.getElementById('ms-diario-bom').value = '';
    document.getElementById('ms-diario-dificil').value = '';
    document.getElementById('ms-diario-sentimento').value = '';
    alerta('✅ Diário salvo!');
    msCarregarDiario();
  } catch(e) { alerta('Erro ao salvar diário: ' + e.message); }
}

async function msCarregarDiario() {
  try {
    const lista = await api('GET', '/api/mente-sa/diario/' + APP.membroId);
    var el = document.getElementById('ms-lista-diario');
    if (!lista.length) { el.innerHTML = '<p style="color:#999;text-align:center">Nenhuma entrada no diário ainda.</p>'; return; }
    el.innerHTML = lista.slice(0,5).map(function(d) {
      return '<div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
        '<div style="font-size:0.75rem;color:#999;margin-bottom:0.5rem">' + new Date(d.criado_em).toLocaleDateString('pt-BR') + '</div>' +
        (d.bom ? '<div style="margin-bottom:0.5rem"><span style="font-size:0.75rem;color:#10b981;font-weight:600">✅ Bom:</span> <span style="font-size:0.9rem">' + d.bom + '</span></div>' : '') +
        (d.dificil ? '<div style="margin-bottom:0.5rem"><span style="font-size:0.75rem;color:#f59e0b;font-weight:600">💪 Difícil:</span> <span style="font-size:0.9rem">' + d.dificil + '</span></div>' : '') +
        (d.sentimento ? '<div><span style="font-size:0.75rem;color:#667eea;font-weight:600">💙 Sentimento:</span> <span style="font-size:0.9rem">' + d.sentimento + '</span></div>' : '') +
        '</div>';
    }).join('');
  } catch(e) { console.log('Erro diario MS:', e); }
}

// ── ROTINAS ──
async function msCarregarRotinas() {
  try {
    const lista = await api('GET', '/api/mente-sa/rotinas/' + APP.membroId);
    var el = document.getElementById('ms-lista-rotinas');
    var vazio = document.getElementById('ms-rotinas-vazio');
    if (!lista.length) {
      vazio.style.display = 'block';
      el.innerHTML = '';
      return;
    }
    vazio.style.display = 'none';
    el.innerHTML = lista.map(function(r) {
      return '<div style="background:white;border-radius:12px;padding:1rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.06)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">' +
        '<div style="font-weight:600">' + r.titulo + '</div>' +
        '<input type="checkbox" ' + (r.concluido ? 'checked' : '') + ' onchange="msConcluirRotina(' + r.id + ', this.checked)" style="width:20px;height:20px;cursor:pointer"></div>' +
        '<div style="font-size:0.85rem;color:#666;margin-bottom:0.25rem">' + (r.descricao || '') + '</div>' +
        '<div style="font-size:0.75rem;color:#999">👨‍⚕️ ' + (r.especialista || 'Especialista') + '</div>' +
        '</div>';
    }).join('');
  } catch(e) {
    document.getElementById('ms-rotinas-vazio').style.display = 'block';
  }
}

async function msConcluirRotina(id, concluido) {
  try {
    await api('PUT', '/api/mente-sa/rotinas/' + id, { concluido: concluido });
    alerta(concluido ? '✅ Tarefa concluída!' : 'Tarefa desmarcada');
  } catch(e) { alerta('Erro ao atualizar rotina'); }
}

async function atualizarBadgeRemedios() {
  try {
    const meds = await api('GET', '/api/medicamentos/' + APP.membroId);
    const agora = new Date();
    const hora = agora.getHours().toString().padStart(2,'0') + ':' + agora.getMinutes().toString().padStart(2,'0');
    const hoje = agora.toISOString().slice(0,10);
    let pendentes = 0;
    for (const m of meds) {
      if (!m.horarios) continue;
      for (const h of m.horarios) {
        if (h > hora) continue;
        try {
          const hist = await api('GET', '/api/medicamentos/historico/' + m.id);
          const jaConcluido = hist.some(function(r) {
            return (r.status === 'tomado' || r.status === 'pulado') &&
                   r.criado_em && r.criado_em.slice(0,10) === hoje &&
                   r.criado_em.slice(11,16) >= h;
          });
          if (!jaConcluido) pendentes++;
        } catch(e) { pendentes++; }
      }
    }
    const badge = document.getElementById('badge-remedios');
    if (badge) {
      if (pendentes > 0) {
        badge.textContent = pendentes > 9 ? '9+' : pendentes;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch(e) {}
}

window._listaMedsCache = [];
function filtrarMedicamentos(termo) {
  const lista = document.getElementById('lista-medicamentos');
  if (!lista) return;
  const t = termo.toLowerCase().trim();
  const filtrados = t
    ? window._listaMedsCache.filter(m => m.nome.toLowerCase().includes(t))
    : window._listaMedsCache;
  if (!filtrados.length) {
    lista.innerHTML = '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:16px">Nenhum medicamento encontrado</p>';
    return;
  }
  lista.innerHTML = filtrados.map(m => `
    <div class="item-lista">
      <span style="font-size:24px">💊</span>
      <div class="item-info">
        <div class="item-nome">${m.nome} ${m.dosagem || ''}</div>
        <div class="item-sub">${formatarHorarios(m.horarios) || '⚡ Conforme necessario'} · ${m.via || 'Oral'}</div>
          ${(function(){ const h = m.horarios ? (typeof m.horarios === 'string' ? JSON.parse(m.horarios) : m.horarios) : []; return (!h || h.length === 0) ? `<button onclick="registrarDosePRN(${m.id}, '${m.nome}')" style="margin-top:6px;background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:600;cursor:pointer">+ Registrar dose agora</button>` : ''; })()}
      </div>
      <button onclick="excluirMed(${m.id})" style="background:none;border:none;font-size:18px;cursor:pointer">🗑️</button>
    </div>`).join('');
}

async function buscarResumoSalvo() {
  const card = document.getElementById('card-resumo-ia');
  const texto = document.getElementById('resumo-texto');
  if (!card || !texto) return;
  card.style.display = 'block';
  try {
    const r = await api('GET', '/api/ia/resumo-salvo/' + APP.membroId);
    if (r && r.resumo) {
      texto.innerHTML = renderMarkdown(r.resumo);
      document.getElementById('resumo-humor').textContent = '😊';
    } else {
      // Ainda não tem resumo — mostra mensagem e agenda verificação às 20h
      const agora = new Date();
      const hora = agora.getHours();
      const min = agora.getMinutes();
      texto.textContent = 'Resumo disponível às 20h após registrar seus dados do dia.';

      // Agendar verificação automática às 20h
      if (!window._resumo20hAgendado) {
        window._resumo20hAgendado = true;
        const msAte20h = (() => {
          const alvo = new Date();
          alvo.setHours(20, 0, 0, 0);
          if (alvo <= agora) alvo.setDate(alvo.getDate() + 1);
          return alvo - agora;
        })();
        setTimeout(async () => {
          await buscarResumoSalvo();
        }, msAte20h);
      }
    }
  } catch (e) {
    texto.textContent = 'Resumo disponível às 20h.';
  }
}

async function gerarResumoIA() {
  const card = document.getElementById('card-resumo-ia');
  const texto = document.getElementById('resumo-texto');
  if (!card || !APP.membroId) return;

  card.style.display = 'block';
  texto.textContent = 'Analisando seus dados...';
  document.getElementById('resumo-agua').textContent = '--';
  document.getElementById('resumo-sono').textContent = '--';
  document.getElementById('resumo-humor').textContent = '--';

  try {
    const r = await api('POST', '/api/ia/resumo-dia', {
      idioma: localStorage.getItem('applus_idioma') || 'pt',
      membro_id: APP.membroId,
      familia_id: APP.familiaId
    });

    if (r.dados) {
      const agua = r.dados.copos + '/' + r.dados.metaAgua;
      const sono = r.dados.horasSono ? r.dados.horasSono + 'h' : '--';
      document.getElementById('resumo-agua').textContent = agua;
      document.getElementById('resumo-sono').textContent = sono;
    }

    if (r.resumo) {
      texto.innerHTML = renderMarkdown(r.resumo);
      document.getElementById('resumo-humor').textContent = '😊';
    }
  } catch(e) {
    const _errLang = localStorage.getItem('applus_idioma') || 'pt';
      const _errMsg = {pt:'Não foi possível gerar análise agora.',en:'Could not generate analysis now.',es:'No se pudo generar el análisis ahora.',fr:'Impossible de générer une analyse maintenant.',de:'Analyse konnte nicht generiert werden.'}[_errLang] || 'Não foi possível gerar análise agora.';
      texto.textContent = _errMsg;
  }
}

// BOAS VINDAS
let _bvSlideAtual = 0;

function verificarBoasVindas() {
  try {
    const visto = localStorage.getItem('applus_boas_vindas');
    if (!visto) {
      const tela = document.getElementById('tela-boas-vindas');
      if (tela) tela.style.display = 'flex';
    }
  } catch(e) {}
}

function proximoSlide() {
  const slides = document.querySelectorAll('.bv-slide');
  const dots = [
    document.getElementById('bv-dot-0'),
    document.getElementById('bv-dot-1'),
    document.getElementById('bv-dot-2')
  ];
  const btn = document.getElementById('bv-btn-proximo');

  if (_bvSlideAtual < slides.length - 1) {
    slides[_bvSlideAtual].style.transform = 'translateX(-100%)';
    _bvSlideAtual++;
    slides[_bvSlideAtual].style.transform = 'translateX(0)';
    slides[_bvSlideAtual].style.transition = 'transform 0.3s ease';
    dots.forEach(function(d, i) {
      if (d) d.style.background = i === _bvSlideAtual ? '#0f6647' : '#d1d5db';
    });
    if (_bvSlideAtual === slides.length - 1) {
      btn.style.display = 'none';
    }
  }
}

function fecharBoasVindas(abrirCadastro) {
  try { localStorage.setItem('applus_boas_vindas', '1'); } catch(e) {}
  const tela = document.getElementById('tela-boas-vindas');
  if (tela) tela.style.display = 'none';
  if (abrirCadastro) abrirModal('modal-criar');
}

// EDITAR EVENTO
async function abrirEditarEvento(id) {
  try {
    const ev = await api('GET', '/api/eventos/detalhe/' + id);
    document.getElementById('edit-ev-id').value = ev.id;
    document.getElementById('edit-ev-titulo').value = ev.titulo || '';
    document.getElementById('edit-ev-data').value = ev.data ? ev.data.split('T')[0] : '';
    document.getElementById('edit-ev-hora').value = ev.hora ? ev.hora.substring(0,5) : '';
    document.getElementById('edit-ev-tipo').value = ev.tipo || 'Consulta';
    document.getElementById('edit-ev-local').value = ev.local || '';
    document.getElementById('edit-ev-medico').value = ev.nome_medico || '';
    document.getElementById('edit-ev-especialidade').value = ev.especialidade || '';
    document.getElementById('edit-ev-obs').value = ev.observacoes || '';
    document.getElementById('edit-ev-pediu-exame').checked = ev.pediu_exame || false;
    document.getElementById('edit-ev-gerou-receita').checked = ev.gerou_receita || false;
    document.getElementById('edit-ev-retorno').value = ev.data_retorno ? ev.data_retorno.split('T')[0] : '';
    if (ev.foto_exame) {
      document.getElementById('edit-ev-foto-preview').innerHTML = '<img src="' + ev.foto_exame + '" style="width:100%;border-radius:12px;margin-top:8px">';
    } else {
      document.getElementById('edit-ev-foto-preview').innerHTML = '';
    }
    abrirModal('modal-editar-evento');
  } catch(e) { alerta('Erro ao carregar evento: ' + e.message); }
}

async function salvarEdicaoEvento() {
  const id = document.getElementById('edit-ev-id').value;
  const titulo = document.getElementById('edit-ev-titulo').value.trim();
  const data = document.getElementById('edit-ev-data').value;
  const hora = document.getElementById('edit-ev-hora').value;
  const tipo = document.getElementById('edit-ev-tipo').value;
  const local = document.getElementById('edit-ev-local').value;
  const nome_medico = document.getElementById('edit-ev-medico').value;
  const especialidade = document.getElementById('edit-ev-especialidade').value;
  const observacoes = document.getElementById('edit-ev-obs').value;
  const pediu_exame = document.getElementById('edit-ev-pediu-exame').checked;
  const gerou_receita = document.getElementById('edit-ev-gerou-receita').checked;
  const data_retorno = document.getElementById('edit-ev-retorno').value || null;

  if (!titulo || !data) return alerta('Preencha titulo e data');

  let foto_exame = null;
  const fotoInput = document.getElementById('edit-ev-foto');
  if (fotoInput.files && fotoInput.files[0]) {
    foto_exame = await new Promise(function(resolve) {
      const reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.readAsDataURL(fotoInput.files[0]);
    });
  }

  try {
    await api('PUT', '/api/eventos/' + id, {
      titulo, data, hora, tipo, local, observacoes,
      nome_medico, especialidade, pediu_exame, gerou_receita,
      data_retorno, foto_exame
    });
    fecharModal('modal-editar-evento');
    carregarAgenda();
    alerta('Evento atualizado!');
  } catch(e) { alerta('Erro ao salvar: ' + e.message); }
}

async function gerarResumoConsulta() {
  const id = document.getElementById('edit-ev-id').value;
  const titulo = document.getElementById('edit-ev-titulo').value;
  const medico = document.getElementById('edit-ev-medico').value;
  const especialidade = document.getElementById('edit-ev-especialidade').value;
  const obs = document.getElementById('edit-ev-obs').value;
  const pediu = document.getElementById('edit-ev-pediu-exame').checked;
  const receita = document.getElementById('edit-ev-gerou-receita').checked;
  const retorno = document.getElementById('edit-ev-retorno').value;

  if (!obs && !medico) return alerta('Preencha pelo menos as observacoes ou nome do medico para gerar o resumo');

  const _lang = localStorage.getItem('applus_idioma') || 'pt';
  const _langTexto = {pt:'portugues brasileiro',en:'English',es:'español',fr:'français',de:'Deutsch'}[_lang] || 'portugues brasileiro';
  const prompt = 'Faca um resumo medico objetivo desta consulta em ' + _langTexto + '. Consulta: ' + titulo + '. Medico: ' + (medico || 'nao informado') + '. Especialidade: ' + (especialidade || 'nao informada') + '. Observacoes: ' + (obs || 'nenhuma') + '. Pediu exame: ' + (pediu ? 'sim' : 'nao') + '. Gerou receita: ' + (receita ? 'sim' : 'nao') + '. Retorno: ' + (retorno || 'nao agendado') + '. Responda em 3 linhas curtas com os pontos mais importantes.';

  try {
    const r = await api('POST', '/api/ia/perguntar', { pergunta: prompt, membro_id: APP.membroId, familia_id: APP.familiaId });
    if (r.resposta) {
      document.getElementById('edit-ev-obs').value = obs + (obs ? '\n\n' : '') + 'RESUMO IA:\n' + r.resposta;
      alerta('Resumo gerado e salvo!');
    }
  } catch(e) { alerta('Erro ao gerar resumo: ' + e.message); }
}

function mostrarDescricaoPapel(valor) {
  const desc = document.getElementById('desc-papel');
  if (!desc) return;
  const textos = {
    'administrador': '👤 Use esta opcao se voce mesmo vai acompanhar sua saude no app.',
    'cuidador': '💚 Use esta opcao se voce cuida de um idoso, crianca ou familiar.',
    'idoso': '🧓 Use esta opcao se voce e o familiar que sera acompanhado pela familia.'
  };
  desc.textContent = textos[valor] || '';
}

// FOTO DE PERFIL
function previewFotoCadastro(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('foto-preview-cadastro');
    if (preview) {
      preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover">';
    }
  };
  reader.readAsDataURL(input.files[0]);
}

async function getFotoBase64() {
  const input = document.getElementById('inp-foto-cadastro');
  if (!input || !input.files || !input.files[0]) return null;
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function(e) { resolve(e.target.result); };
    reader.readAsDataURL(input.files[0]);
  });
}

async function atualizarAvatarHeader(foto) {
  const avatar = document.getElementById('dropdown-avatar');
  if (!avatar) return;
  if (foto) {
    avatar.innerHTML = '<img src="' + foto + '" style="width:32px;height:32px;object-fit:cover;border-radius:50%">';
  } else {
    avatar.innerHTML = '👤';
  }
}

// ── PIN DE SEGURANÇA ──
let _pinAtual = '';
let _pinModo = 'verificar';
let _pinTemp = '';

async function verificarPinAoEntrar() {
  if (!APP.membroId) return true;
  try {
    const r = await api('GET', '/api/membros/pin/tem/' + APP.membroId);
    if (!r.tem) {
      return new Promise((resolve) => {
        window._pinResolve = resolve;
        _pinModo = "definir";
        _pinAtual = "";
        _pinTemp = "";
        atualizarPontos();
        document.getElementById("pin-entrada-nome").textContent = "Crie seu PIN de seguranca";
        document.getElementById("pin-erro").textContent = "Defina um PIN para proteger seus dados";
        document.getElementById("tela-pin").style.display = "flex";
      });
    }
    return new Promise((resolve) => {
      window._pinResolve = resolve;
      _pinModo = 'verificar';
      _pinAtual = '';
      atualizarPontos();
      document.getElementById('pin-entrada-nome').textContent = APP.membroNome || 'AP+ Saúde';
      document.getElementById('pin-erro').textContent = '';
      document.getElementById('tela-pin').style.display = 'flex';
    });
  } catch(e) { return true; }
}

function pinDigito(d) {
  if (_pinAtual.length >= 4) return;
  _pinAtual += d;
  atualizarPontos();
  if (_pinAtual.length === 4) setTimeout(() => processarPin(), 200);
}

function pinApagar() {
  _pinAtual = _pinAtual.slice(0, -1);
  atualizarPontos();
}

function atualizarPontos() {
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById('pin-dot-' + i);
    if (dot) dot.style.background = i < _pinAtual.length ? 'white' : 'transparent';
  }
}

async function processarPin() {
  if (_pinModo === 'verificar') {
    try {
      const r = await api('POST', '/api/membros/pin/verificar', { membro_id: APP.membroId, pin: _pinAtual });
      if (r.ok) {
        document.getElementById('tela-pin').style.display = 'none';
        if (window._pinResolve) { window._pinResolve(true); window._pinResolve = null; }
      } else {
        document.getElementById('pin-erro').textContent = 'PIN incorreto. Tente novamente.';
        _pinAtual = '';
        atualizarPontos();
      }
    } catch(e) {
      document.getElementById('pin-erro').textContent = 'Erro. Tente novamente.';
      _pinAtual = '';
      atualizarPontos();
    }
  } else if (_pinModo === 'definir') {
    _pinTemp = _pinAtual;
    _pinAtual = '';
    _pinModo = 'confirmar';
    atualizarPontos();
    document.getElementById('pin-erro').textContent = '';
    document.getElementById('pin-entrada-nome').textContent = 'Confirme o PIN';
  } else if (_pinModo === 'confirmar') {
    if (_pinAtual === _pinTemp) {
      try {
        await api('POST', '/api/membros/pin/salvar', { membro_id: APP.membroId, pin: _pinAtual });
        document.getElementById('tela-pin').style.display = 'none';
        fecharModal('modal-config-pin');
        carregarStatusPin();
        alerta('✅ PIN ativado com sucesso!');
        if (window._pinResolve) { window._pinResolve(true); window._pinResolve = null; }
      } catch(e) {
        document.getElementById('pin-erro').textContent = 'Erro ao salvar PIN.';
        _pinAtual = ''; _pinTemp = '';
        atualizarPontos();
      }
    } else {
      document.getElementById('pin-erro').textContent = 'PINs não coincidem. Tente novamente.';
      _pinAtual = ''; _pinTemp = '';
      _pinModo = 'definir';
      atualizarPontos();
      document.getElementById('pin-entrada-nome').textContent = 'Defina seu PIN';
    }
  }
}

async function abrirConfigPin() {
  try {
    const r = await api('GET', '/api/membros/pin/tem/' + APP.membroId).catch(() => ({ tem: false }));
    document.getElementById('config-pin-sem-pin').style.display = r.tem ? 'none' : 'block';
    document.getElementById('config-pin-com-pin').style.display = r.tem ? 'block' : 'none';
    abrirModal('modal-config-pin');
  } catch(e) {
    alerta('Erro: ' + e.message);
  }
}

function iniciarDefinirPin() {
  _pinModo = 'definir';
  _pinAtual = '';
  _pinTemp = '';
  atualizarPontos();
  document.getElementById('pin-entrada-nome').textContent = 'Defina seu PIN';
  document.getElementById('pin-erro').textContent = '';
  fecharModal('modal-config-pin');
  document.getElementById('tela-pin').style.display = 'flex';
}

async function removerPin() {
  try {
    await api('POST', '/api/membros/pin/remover', { membro_id: APP.membroId });
    fecharModal('modal-config-pin');
    carregarStatusPin();
    alerta('PIN removido.');
  } catch(e) { alerta('Erro ao remover PIN.'); }
}

async function carregarStatusPin() {
  try {
    const r = await api('GET', '/api/membros/pin/tem/' + APP.membroId);
    const el = document.getElementById('pin-status-texto');
    if (el) el.textContent = r.tem ? '🔒 Ativo' : '🔓 Desativado';
  } catch(e) {}
}

async function baixarPDFPlantao() {
  const hoje = new Date().toLocaleDateString('sv-SE');
  const url = `/api/pdf/plantao/${APP.membroId}?data=${hoje}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantao-${hoje}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function togglePRN() {
  const prn = document.getElementById('med-prn').checked;
  const campo = document.getElementById('med-horario-novo').closest('div.campo');
  if (prn) {
    document.getElementById('med-horario-novo').closest('div[style]').style.display = 'none';
    document.getElementById('horarios-tags').style.display = 'none';
    document.getElementById('med-horarios').value = '';
    horariosAdicionados = [];
  } else {
    document.getElementById('med-horario-novo').closest('div[style]').style.display = 'flex';
    document.getElementById('horarios-tags').style.display = 'flex';
  }
}

async function registrarDosePRN(medId, medNome) {
  try {
    await api('POST', '/api/medicamentos/historico', {
      med_id: medId,
      membro_id: APP.membroId,
      status: 'tomado',
      motivo: 'PRN - dose manual'
    });
    alerta('Dose de ' + medNome + ' registrada!');
    carregarMedicamentos();
  } catch(e) {
    alerta('Erro ao registrar dose: ' + e.message);
  }
}

async function carregarStreak() {
  try {
    const r = await api('GET', '/api/medicamentos/streak/' + APP.membroId);
    const card = document.getElementById('streak-card');
    const num = document.getElementById('streak-numero');
    const txt = document.getElementById('streak-texto');
    if (!card || !num || !txt) return;
    if (r.streak >= 2) {
      num.textContent = r.streak;
      txt.textContent = r.streak === 1 ? 'dia seguido tomando todos os medicamentos' : 'dias seguidos tomando todos os medicamentos';
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  } catch(e) {
    console.log('Erro streak:', e);
  }
}




function abrirPortal(url) {
  const container = document.getElementById('portal-iframe-container');
  const iframe = document.getElementById('portal-iframe');
  if (!container || !iframe) { window.location.href = url; return; }
  iframe.src = url;
  container.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function fecharPortalIframe() {
  const container = document.getElementById('portal-iframe-container');
  const iframe = document.getElementById('portal-iframe');
  if (!container || !iframe) return;
  container.style.display = 'none';
  iframe.src = '';
  document.body.style.overflow = '';
}

// ── Botão voltar do Android ──
window.addEventListener('popstate', function(e) {
  // Se tem modal aberto, fechar o modal em vez de navegar
  const modalAberto = document.querySelector('.modal-overlay.aberto');
  if (modalAberto) {
    modalAberto.classList.remove('aberto');
    history.pushState(e.state, '', location.href);
    return;
  }
  if (e.state && e.state.pagina) {
    // Navegar para a página anterior sem empurrar novo estado
    const pagina = e.state.pagina;
    document.querySelectorAll('.pagina').forEach(p => p.classList.remove('ativa'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('ativo'));
    const el = document.getElementById('pag-' + pagina);
    if (el) el.classList.add('ativa');
    const nav = document.querySelector('[data-nav="' + pagina + '"]');
    if (nav) nav.classList.add('ativo');
    if (pagina === 'home') carregarHome();
  if (pagina === 'painel-baba') carregarPainelBaba();
    if (pagina === 'remedios') carregarMedicamentos();
    if (pagina === 'agenda') carregarAgenda();
    if (pagina === 'chat') carregarChat();
    if (pagina === 'mais') carregarMais();
    if (pagina === 'saude') carregarSinais();
  } else {
    // Se não tem estado, voltar para home em vez de sair
    if (document.getElementById('pag-home') && !document.getElementById('pag-home').classList.contains('ativa')) {
      history.pushState({ pagina: 'home' }, '', '#home');
      navegarPara('home');
    }
  }
});

let _fotoPerfil = null;

function previewFotoPerfil(input) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    _fotoPerfil = e.target.result;
    const preview = document.getElementById('foto-perfil-preview');
    if (preview) {
      preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    }
  };
  reader.readAsDataURL(input.files[0]);
}

async function carregarFotoPerfil() {
  try {
    const idPessoal = APP.idPessoal || (APP.membroAtivo && APP.membroAtivo.id_pessoal);
    if (!idPessoal) return;
    const membro = await api('GET', '/api/membros/id/' + idPessoal);
    if (!membro) return;
    const preview = document.getElementById('foto-perfil-preview');
    if (!preview) return;
    if (membro.foto) {
      preview.innerHTML = `<img src="${membro.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      preview.dataset.foto = membro.foto;
    } else {
      preview.innerHTML = '👤';
      preview.dataset.foto = '';
    }
  } catch(e) { console.log('Erro foto perfil:', e); }
}

async function carregarBabasSalvas() {
  try {
    if (!APP.familiaId) return;
    const membros = await api('GET', '/api/membros/familia/' + APP.familiaId);
    const babas = (membros || []).filter(m => m.tipo === 'baba' || m.relacao === 'baba' || m.relacao === 'Babá / Nanny');
    const cuidadores = (membros || []).filter(m => m.tipo === 'cuidador' || m.relacao === 'cuidador' || m.relacao === 'Cuidador profissional');
    const el = document.getElementById('lista-babas-salvas');
    if (!el) return;
    let html = '';

    if (babas.length) {
      html += '<div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:0.06em;margin-bottom:6px;">BABÁS</div>';
      html += babas.map(b => {
        const link = 'https://applus-saude-production.up.railway.app/baba.html?id=' + b.id_pessoal;
        return `<div style="background:white;border-radius:12px;padding:12px;margin-bottom:8px;border:0.5px solid #e5e7eb;">
          <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:2px;">👶 ${b.nome}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">ID: <b>${b.id_pessoal}</b></div>
          <div style="font-size:10px;color:#1a9e6e;word-break:break-all;margin-bottom:8px;">${link}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="navigator.clipboard.writeText('${link}').then(()=>alerta('✅ Link copiado!'))" style="flex:1;background:#e8f5e9;color:#0f6647;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;">📋 Copiar link</button>
            <button onclick="navigator.share({title:'AP+ Saúde — Babá',url:'${link}'})" style="flex:1;background:#1a9e6e;color:white;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;">📤 Compartilhar</button>
          </div>
        </div>`;
      }).join('');
    }

    if (cuidadores.length) {
      html += '<div style="font-size:10px;font-weight:700;color:#6b7280;letter-spacing:0.06em;margin:8px 0 6px;">CUIDADORES</div>';
      html += cuidadores.map(b => {
        const link = 'https://applus-saude-production.up.railway.app/cuidador.html?id=' + b.id_pessoal;
        return `<div style="background:white;border-radius:12px;padding:12px;margin-bottom:8px;border:0.5px solid #e5e7eb;">
          <div style="font-size:14px;font-weight:600;color:#111;margin-bottom:2px;">💚 ${b.nome}</div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:2px;">ID: <b>${b.id_pessoal}</b></div>
          <div style="font-size:10px;color:#1a9e6e;word-break:break-all;margin-bottom:8px;">${link}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="navigator.clipboard.writeText('${b.id_pessoal}').then(()=>alerta('✅ ID copiado!'))" style="flex:1;background:#e8f5e9;color:#0f6647;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;">📋 Copiar ID</button>
          </div>
        </div>`;
      }).join('');
    }

    if (!html) html = '<p style="color:#999;font-size:13px;">Nenhuma babá ou cuidador cadastrado.</p>';
    el.innerHTML = html;
  } catch(e) {
    console.log('Erro babas/cuidadores:', e);
    const el = document.getElementById('lista-babas-salvas');
    if (el) el.innerHTML = '<p style="color:#999;font-size:13px;">Nenhuma babá ou cuidador cadastrado.</p>';
  }
}

async function carregarFeedCuidadorFamilia() {
  try {
    if (!window._cuidadorId) return;
    const r = await fetch('/api/cuidados/atividades/' + APP.familiaId + '/cuidador/' + window._cuidadorId);
    const lista = await r.json();
    const feed = document.getElementById('cuidador-feed');
    if (!lista || !lista.length) {
      feed.innerHTML = '<div style="text-align:center;color:#999;font-size:13px;padding:20px;">Nenhum registro hoje ainda.</div>';
      return;
    }
    const icons = {banho:'🛁',alimentacao:'🍽️',medicamento:'💊',humor:'😊',sono:'😴',dor:'🤕',intercorrencia:'⚠️',passagem:'🔄',sos:'🚨'};
    document.getElementById('cuid-count-ativ').textContent = lista.length;
    document.getElementById('cuid-count-meds').textContent = lista.filter(r=>r.tipo==='medicamento').length;
    const humor = lista.find(r=>r.tipo==='humor');
    if (humor) document.getElementById('cuid-humor-atual').textContent = humor.obs ? humor.obs.split(' ')[0] : '--';
    feed.innerHTML = lista.map(r => `
      <div style="background:white;border-radius:10px;padding:10px 12px;margin-bottom:8px;border-left:3px solid #1a6eb5;display:flex;gap:10px;align-items:flex-start;">
        <div style="font-size:20px;flex-shrink:0;">${icons[r.tipo]||'📋'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111;">${r.tipo.charAt(0).toUpperCase()+r.tipo.slice(1)}</div>
          <div style="font-size:12px;color:#555;margin-top:2px;">${r.obs||''}</div>
          <div style="font-size:10px;color:#999;margin-top:3px;">${new Date(r.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
          ${r.foto ? `<img src="${r.foto}" style="width:100%;border-radius:8px;margin-top:6px;max-height:160px;object-fit:cover">` : ''}
        </div>
      </div>`).join('');
  } catch(e) { console.log('Erro feed cuidador:', e); }
}

async function carregarMedsCuidador() {
  try {
    if (!window._cuidadorFamiliaId) return;
    const meds = await api('GET', '/api/medicamentos/' + window._cuidadorFamiliaId);
    const el = document.getElementById('cuid-meds-lista-home');
    if (!el) return;
    if (!meds || !meds.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:13px;padding:10px;">Nenhum medicamento cadastrado.</div>'; return; }
    const agora = new Date();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();
    el.innerHTML = meds.map(m => {
      const horarios = Array.isArray(m.horarios) ? m.horarios : JSON.parse(m.horarios || '[]');
      return horarios.map(h => {
        const [hh, mm] = h.split(':').map(Number);
        const minutos = hh * 60 + mm;
        const passou = minutos < horaAtual;
        const agr = Math.abs(minutos - horaAtual) < 30;
        const cor = agr ? '#dc2626' : passou ? '#6b7280' : '#1a6eb5';
        const bg = agr ? '#fef2f2' : passou ? '#f9f9f9' : '#e8f0fb';
        return `<div style="background:${bg};border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;border-left:3px solid ${cor};">
          <div style="font-size:20px;">💊</div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:#111;">${m.nome}</div>
            <div style="font-size:11px;color:#555;">${m.dosagem || ''}</div>
          </div>
          <div style="font-size:13px;font-weight:700;color:${cor};">${h}${agr?' ⚠️':''}</div>
        </div>`;
      }).join('');
    }).join('');
  } catch(e) { console.log('Erro meds cuidador:', e); }
}

async function carregarEventosCuidador() {
  try {
    if (!window._cuidadorFamiliaId) return;
    const eventos = await api('GET', '/api/eventos/' + window._cuidadorFamiliaId);
    const el = document.getElementById('cuid-eventos-lista-home');
    if (!el) return;
    const _ag = new Date(); const hoje = _ag.getFullYear() + '-' + String(_ag.getMonth()+1).padStart(2,'0') + '-' + String(_ag.getDate()).padStart(2,'0');
    const hojeEvs = (eventos || []).filter(e => e.data && e.data.startsWith(hoje));
    if (!hojeEvs.length) { el.innerHTML = '<div style="text-align:center;color:#999;font-size:13px;padding:10px;">Nenhum evento hoje.</div>'; return; }
    const icons = { Consulta:'🩺', Exame:'🔬', Medicamento:'💊', Família:'👨‍👩‍👧', Outro:'📋' };
    el.innerHTML = hojeEvs.map(e => `
      <div style="background:#f0f9ff;border-radius:10px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;border-left:3px solid #1a6eb5;">
        <div style="font-size:20px;">${icons[e.tipo]||'📋'}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:#111;">${e.titulo}</div>
          <div style="font-size:11px;color:#555;">${e.local||''}${e.medico?' · Dr. '+e.medico:''}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:#1a6eb5;">${e.hora||''}</div>
      </div>`).join('');
  } catch(e) { console.log('Erro eventos cuidador:', e); }
}

// ── EXAMES ──
async function carregarExames() {
  if (!APP.membroId) return;
  try {
    const exames = await api('GET', '/api/exames/' + APP.membroId);
    const el = document.getElementById('exames-lista');
    if (!el) return;
    if (!exames || !exames.length) {
      el.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Nenhum exame cadastrado ainda.</p>';
      return;
    }
    el.innerHTML = exames.map(e => {
      const resultados = Array.isArray(e.resultados) ? e.resultados : JSON.parse(e.resultados || '[]');
      return `<div style="background:white;border-radius:14px;padding:14px;margin-bottom:10px;border:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(0,0,0,0.05)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div>
            <div style="font-size:15px;font-weight:700;color:#111">${e.titulo}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">${e.data_exame ? new Date(e.data_exame).toLocaleDateString('pt-BR') : ''} ${e.laboratorio ? '· ' + e.laboratorio : ''}</div>
          </div>
          <button onclick="excluirExame(${e.id})" style="background:none;border:none;font-size:18px;cursor:pointer;color:#dc2626">🗑️</button>
        </div>
        ${resultados.length ? `<div style="background:#f8fafc;border-radius:8px;padding:8px;margin-top:6px">
          ${resultados.map(r => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #e5e7eb">
            <span style="color:#374151">${r.nome}</span>
            <span style="font-weight:600;color:${r.alterado ? '#dc2626' : '#1a9e6e'}">${r.valor} ${r.unidade || ''}</span>
          </div>`).join('')}
        </div>` : ''}
        ${e.observacoes ? `<div style="font-size:12px;color:#6b7280;margin-top:6px">${e.observacoes}</div>` : ''}
        <div style="font-size:10px;color:#9ca3af;margin-top:6px">via ${e.fonte === 'ia' ? '🤖 IA' : '📝 manual'}</div>
      </div>`;
    }).join('');
  } catch(err) { console.log('Erro exames:', err); }
}

async function excluirExame(id) {
  if (!confirm('Excluir este exame?')) return;
  try {
    await api('DELETE', '/api/exames/' + id);
    carregarExames();
  } catch(e) { alerta('Erro ao excluir exame'); }
}

function abrirImportarExame() {
  abrirModal('modal-importar-exame');
}

async function salvarExame() {
  const titulo = document.getElementById('exame-titulo').value.trim();
  const data = document.getElementById('exame-data').value;
  const lab = document.getElementById('exame-lab').value.trim();
  const medico = document.getElementById('exame-medico').value.trim();
  const obs = document.getElementById('exame-obs').value.trim();
  const pdfInput = document.getElementById('exame-pdf');
  const statusEl = document.getElementById('exame-ia-status');

  if (!titulo) return alerta('Preencha o título do exame');

  let resultados = [];
  let fonte = 'manual';
  let pdfBase64 = null;

  // Se tem PDF, envia para IA extrair resultados
  if (pdfInput.files && pdfInput.files[0]) {
    statusEl.textContent = '🤖 Analisando PDF com IA...';
    try {
      const file = pdfInput.files[0];
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const resp = await api('POST', '/api/ia/extrair-exame', { pdf: base64, titulo });
      if (resp && resp.resultados) {
        resultados = resp.resultados;
        fonte = 'ia';
        statusEl.textContent = '✅ ' + resultados.length + ' resultado(s) extraído(s) pela IA';
      }
      pdfBase64 = 'data:application/pdf;base64,' + base64;
    } catch(e) {
      statusEl.textContent = '⚠️ Não foi possível extrair automaticamente. Salvando sem resultados.';
    }
  }

  try {
    await api('POST', '/api/exames', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      titulo,
      data_exame: data || null,
      laboratorio: lab,
      medico_solicitante: medico,
      resultados,
      observacoes: obs,
      fonte,
      pdf_url: pdfBase64
    });
    fecharModal('modal-importar-exame');
    alerta('✅ Exame salvo!');
    carregarExames();
  } catch(e) {
    alerta('Erro ao salvar exame: ' + e.message);
  }
}
