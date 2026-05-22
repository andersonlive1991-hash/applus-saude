// ═══════════════════════════════════════
// AP+ Saúde — Sidebar Desktop
// ═══════════════════════════════════════

function initDesktop() {
  if (window.innerWidth < 768) return;

  // Cria sidebar se ainda não existe
  if (document.getElementById('desk-sidebar')) return;

  const sidebar = document.createElement('div');
  sidebar.id = 'desk-sidebar';
  sidebar.innerHTML = `
    <div class="sb-logo">
      <div class="sb-logo-icon">🌿</div>
      <div class="sb-logo-text">
        <div class="ap">AP<span>+</span></div>
        <div class="sub">SAÚDE</div>
      </div>
    </div>
    <div class="sb-perfis">
      <div class="sb-perfis-label">Família</div>
      <div id="sb-lista-membros"></div>
    </div>
    <nav class="sb-nav">
      <div class="sb-group">
        <div class="sb-group-label">Principal</div>
        <button class="sb-link ativo" onclick="navegarPara('home');sbAtivar(this)">
          <span class="sb-icon">🏠</span> Início
        </button>
        <button class="sb-link" onclick="navegarPara('remedios');sbAtivar(this)" style="position:relative">
          <span class="sb-icon">💊</span> Medicamentos
          <span id="sb-badge-med" class="sb-badge" style="display:none">!</span>
        </button>
        <button class="sb-link" onclick="navegarPara('agenda');sbAtivar(this)">
          <span class="sb-icon">📅</span> Agenda
        </button>
        <button class="sb-link" onclick="navegarPara('saude');sbAtivar(this)">
          <span class="sb-icon">❤️</span> Sinais Vitais
        </button>
        <button class="sb-link" onclick="navegarPara('ia');sbAtivar(this)">
          <span class="sb-icon">🤖</span> Assistente IA
        </button>
      </div>
      <div class="sb-group">
        <div class="sb-group-label">Família</div>
        <button class="sb-link" onclick="navegarPara('chat');sbAtivar(this)">
          <span class="sb-icon">💬</span> Chat
        </button>
        <button class="sb-link" onclick="navegarPara('cuidados');sbAtivar(this)">
          <span class="sb-icon">📋</span> Cuidados
        </button>
        <button class="sb-link" onclick="navegarPara('financeiro');sbAtivar(this)">
          <span class="sb-icon">💰</span> Financeiro
        </button>
        <button class="sb-link" onclick="navegarPara('escala');sbAtivar(this)">
          <span class="sb-icon">🗓️</span> Escala
        </button>
      </div>
      <div class="sb-group">
        <div class="sb-group-label">Saúde</div>
        <button class="sb-link" onclick="navegarPara('historico');sbAtivar(this)">
          <span class="sb-icon">🏥</span> Histórico
        </button>
        <button class="sb-link" onclick="navegarPara('vacinas');sbAtivar(this)">
          <span class="sb-icon">💉</span> Vacinas
        </button>
        <button class="sb-link" onclick="navegarPara('checklist');sbAtivar(this)">
          <span class="sb-icon">✅</span> Checklist
        </button>
        <button class="sb-link" onclick="navegarPara('meu-dia');sbAtivar(this)">
          <span class="sb-icon">💚</span> Meu Dia
        </button>
      </div>
    </nav>
    <div class="sb-bottom">
      <button class="sb-link" onclick="navegarPara('mais');sbAtivar(this)">
        <span class="sb-icon">⚙️</span> Configurações
      </button>
    </div>
  `;
  document.body.appendChild(sidebar);

  // Topbar
  const topbar = document.createElement('div');
  topbar.id = 'desk-topbar';
  topbar.innerHTML = `
    <div class="tb-titulo" id="tb-titulo-texto">AP+ Saúde</div>
    <div class="tb-data" id="tb-data-texto"></div>
    <button class="tb-sos" onclick="iniciarSOSCompleto()">🚨 SOS</button>
    <button class="tb-btn" onclick="navegarPara('chat')" title="Chat familiar">💬</button>
    <button class="tb-btn" onclick="abrirModalVideo()" title="Videochamada">📹</button>
    <button class="tb-btn" onclick="navegarPara('mais')" title="Configurações">⚙️</button>
  `;
  document.body.appendChild(topbar);

  // Data no topbar
  const hoje = new Date();
  const opts = { weekday:'short', day:'numeric', month:'short', year:'numeric' };
  document.getElementById('tb-data-texto').textContent = hoje.toLocaleDateString('pt-BR', opts);

  // Sincroniza membros da família com a sidebar
  sbSincronizarMembros();
}

function sbAtivar(el) {
  document.querySelectorAll('#desk-sidebar .sb-link').forEach(l => l.classList.remove('ativo'));
  el.classList.add('ativo');
  // Atualiza título do topbar
  const titulo = el.textContent.trim();
  const tb = document.getElementById('tb-titulo-texto');
  if (tb) tb.textContent = titulo;
}

function sbSincronizarMembros() {
  const lista = document.getElementById('sb-lista-membros');
  if (!lista) return;

  // Pega membros do dropdown existente
  const dropdownItems = document.querySelectorAll('#dropdown-lista .dropdown-item');
  if (!dropdownItems.length) {
    // Tenta novamente em 1s se ainda não carregou
    setTimeout(sbSincronizarMembros, 1000);
    return;
  }

  lista.innerHTML = '';
  dropdownItems.forEach(item => {
    const av = item.querySelector('.av')?.innerHTML || '👤';
    const nome = item.querySelector('.dn')?.textContent || '';
    const tipo = item.querySelector('.dt')?.textContent || '';
    const isAtivo = item.classList.contains('ativo');

    const div = document.createElement('div');
    div.className = 'sb-membro' + (isAtivo ? ' ativo' : '');
    div.innerHTML = `
      <div class="sb-av">${av}</div>
      <div class="sb-mem-info">
        <div class="sb-mem-nome">${nome}</div>
        <div class="sb-mem-tipo">${tipo}</div>
      </div>
      ${isAtivo ? '<div class="sb-mem-dot"></div>' : ''}
    `;
    // Clique usa o mesmo onclick do dropdown
    const origOnclick = item.getAttribute('onclick');
    if (origOnclick) div.setAttribute('onclick', origOnclick + ';sbSincronizarMembros()');
    lista.appendChild(div);
  });

  // Sincroniza badge de medicamentos
  const badgeMed = document.getElementById('badge-remedios');
  const sbBadge = document.getElementById('sb-badge-med');
  if (badgeMed && sbBadge) {
    if (badgeMed.style.display !== 'none') {
      sbBadge.style.display = 'inline';
      sbBadge.textContent = badgeMed.textContent;
    }
  }
}

// Inicia quando o app principal já está pronto
document.addEventListener('DOMContentLoaded', () => {
  // Aguarda o app carregar o perfil antes de montar a sidebar
  setTimeout(initDesktop, 800);
});

// Re-sincroniza membros quando o perfil muda
window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && !document.getElementById('desk-sidebar')) {
    initDesktop();
  }
});

// Observa mudanças no dropdown para atualizar sidebar
const observer = new MutationObserver(() => sbSincronizarMembros());
setTimeout(() => {
  const dropdown = document.getElementById('dropdown-lista');
  if (dropdown) observer.observe(dropdown, { childList: true, subtree: true });
}, 1500);
