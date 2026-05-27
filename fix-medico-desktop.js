const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// Adicionar CSS desktop após o CSS existente (antes do </style>)
const desktopCSS = `
/* ── DESKTOP LAYOUT ── */
@media (min-width: 768px) {
  body { background: #f0f4f8; }
  .container { max-width: 100%; background: transparent; }

  /* Esconder elementos mobile no desktop */
  .portal-header, .curva { display: none !important; }
  .portal-content { padding: 0; background: transparent; }
  .portal.ativo { display: block; }

  /* Layout principal */
  .desktop-wrap {
    display: grid;
    grid-template-columns: 260px 1fr;
    gap: 20px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
  }

  /* Sidebar */
  .desktop-sidebar {
    background: white;
    border-radius: 16px;
    border: 0.5px solid #e5e7eb;
    padding: 16px;
    height: fit-content;
    position: sticky;
    top: 20px;
  }
  .ds-logo {
    display: flex; align-items: center; gap: 10px;
    padding-bottom: 12px;
    border-bottom: 0.5px solid #e5e7eb;
    margin-bottom: 12px;
  }
  .ds-logo-icon {
    width: 36px; height: 36px; background: #1a6eb5;
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  .ds-logo-txt { font-size: 14px; font-weight: 700; color: #1a1f2e; }
  .ds-logo-sub { font-size: 11px; color: #6b7280; }
  .ds-pac {
    background: #f0f4f8; border-radius: 12px; padding: 12px; margin-bottom: 12px;
  }
  .ds-pac-av {
    width: 40px; height: 40px; border-radius: 50%;
    background: #dbeafe; display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; color: #1a6eb5; margin-bottom: 8px;
  }
  .ds-pac-nome { font-size: 14px; font-weight: 600; color: #1a1f2e; }
  .ds-pac-id { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .ds-pac-badge {
    display: inline-block; margin-top: 6px;
    background: #dbeafe; color: #1a6eb5;
    font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  }
  .ds-nav-label {
    font-size: 10px; font-weight: 700; color: #9ca3af;
    text-transform: uppercase; letter-spacing: 0.5px;
    padding: 8px 8px 4px;
  }
  .ds-nav-item {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: 10px;
    font-size: 13px; color: #374151; cursor: pointer;
    transition: background 0.15s;
  }
  .ds-nav-item:hover { background: #f0f4f8; }
  .ds-nav-item.ativo { background: #dbeafe; color: #1a6eb5; font-weight: 600; }
  .ds-nav-item span { font-size: 16px; }

  /* Topbar */
  .desktop-topbar {
    background: white; border-radius: 16px; border: 0.5px solid #e5e7eb;
    padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .dt-medico { display: flex; align-items: center; gap: 10px; }
  .dt-av {
    width: 36px; height: 36px; border-radius: 50%;
    background: #dbeafe; display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .dt-nome { font-size: 14px; font-weight: 600; color: #1a1f2e; }
  .dt-crm { font-size: 11px; color: #6b7280; }
  .dt-acoes { display: flex; gap: 8px; }
  .dt-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 10px;
    font-size: 12px; font-weight: 600; cursor: pointer; border: none;
  }
  .dt-btn-sec { background: #f0f4f8; color: #374151; }
  .dt-btn-pri { background: #1a6eb5; color: white; }

  /* Stats */
  .desktop-stats {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px; margin-bottom: 16px;
  }
  .ds-stat {
    background: white; border-radius: 12px; border: 0.5px solid #e5e7eb;
    padding: 14px;
  }
  .ds-stat-v { font-size: 24px; font-weight: 700; color: #1a1f2e; }
  .ds-stat-l { font-size: 11px; color: #6b7280; margin-top: 3px; }

  /* Cards grid */
  .desktop-cards {
    display: grid; grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .desktop-card-full { grid-column: 1 / -1; }
  .paciente-card {
    border-radius: 14px !important;
    border: 0.5px solid #e5e7eb !important;
    box-shadow: none !important;
    margin-bottom: 0 !important;
  }
  #portal-content {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  #portal-content .paciente-card { margin-bottom: 0; }
  #portal-content .paciente-card:last-child,
  #portal-content .paciente-card.full-width { grid-column: 1 / -1; }
}
`;

c = c.replace('</style>', desktopCSS + '\n</style>');

// Adicionar wrapper desktop no portal
c = c.replace(
  `<div id="portal-content" class="portal-content">`,
  `<div id="desktop-wrap" class="desktop-wrap" style="display:none">
    <div class="desktop-sidebar" id="desktop-sidebar">
      <div class="ds-logo">
        <div class="ds-logo-icon">🏥</div>
        <div>
          <div class="ds-logo-txt">AP+ Saúde</div>
          <div class="ds-logo-sub">Portal Médico</div>
        </div>
      </div>
      <div class="ds-pac" id="ds-pac-info">
        <div class="ds-pac-av" id="ds-pac-av">?</div>
        <div class="ds-pac-nome" id="ds-pac-nome">Paciente</div>
        <div class="ds-pac-id" id="ds-pac-id"></div>
        <div class="ds-pac-badge" id="ds-pac-badge" style="display:none">TEA</div>
      </div>
      <div class="ds-nav-label">Menu</div>
      <div class="ds-nav-item ativo" onclick="desktopScrollTo('dados')"><span>👤</span>Dados</div>
      <div class="ds-nav-item" onclick="desktopScrollTo('meds')"><span>💊</span>Medicamentos</div>
      <div class="ds-nav-item" onclick="desktopScrollTo('sinais')"><span>❤️</span>Sinais vitais</div>
      <div class="ds-nav-item" onclick="desktopScrollTo('exames')"><span>🔬</span>Exames</div>
      <div class="ds-nav-item" onclick="desktopScrollTo('vacinas')"><span>💉</span>Vacinas</div>
      <div class="ds-nav-label">Ações</div>
      <div class="ds-nav-item" onclick="iniciarVideoChamada()"><span>📹</span>Videochamada</div>
      <div class="ds-nav-item" onclick="gerarPDF()"><span>📄</span>Relatório PDF</div>
      <div class="ds-nav-item" onclick="voltarLogin()"><span>🔄</span>Novo paciente</div>
    </div>
    <div style="min-width:0">
      <div class="desktop-topbar">
        <div class="dt-medico">
          <div class="dt-av">👨‍⚕️</div>
          <div>
            <div class="dt-nome" id="dt-nome-medico">Dr(a). —</div>
            <div class="dt-crm" id="dt-crm-medico">CRM —</div>
          </div>
        </div>
        <div class="dt-acoes">
          <button class="dt-btn dt-btn-sec" onclick="iniciarVideoChamada()">📹 Videochamada</button>
          <button class="dt-btn dt-btn-pri" onclick="gerarPDF()">📄 Relatório PDF</button>
        </div>
      </div>
      <div class="desktop-stats" id="desktop-stats" style="display:none">
        <div class="ds-stat"><div class="ds-stat-v" id="dstat-meds">—</div><div class="ds-stat-l">Medicamentos</div></div>
        <div class="ds-stat"><div class="ds-stat-v" id="dstat-ader">—</div><div class="ds-stat-l">Aderência média</div></div>
        <div class="ds-stat"><div class="ds-stat-v" id="dstat-exames">—</div><div class="ds-stat-l">Exames</div></div>
        <div class="ds-stat"><div class="ds-stat-v" id="dstat-vacinas">—</div><div class="ds-stat-l">Vacinas</div></div>
      </div>
      <div id="portal-content" class="portal-content">
      </div>
    </div>
  </div>
  <div id="portal-content-mobile" class="portal-content">`
);

// Fechar o div mobile
c = c.replace(
  `  </div>\n\n  <!-- ── VOZ ──`,
  `  </div>\n  </div>\n\n  <!-- ── VOZ ──`
);

// Adicionar JS para ativar desktop
const desktopJS = `
<script>
function initDesktopLayout() {
  if (window.innerWidth >= 768) {
    const wrap = document.getElementById('desktop-wrap');
    const mobile = document.getElementById('portal-content-mobile');
    if (wrap) wrap.style.display = 'grid';
    if (mobile) mobile.style.display = 'none';
  }
}

function desktopScrollTo(id) {
  const el = document.getElementById('sec-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function atualizarDesktopPaciente(membro, meds, exames, aderencia, vacinas) {
  const av = document.getElementById('ds-pac-av');
  const nome = document.getElementById('ds-pac-nome');
  const id = document.getElementById('ds-pac-id');
  const badge = document.getElementById('ds-pac-badge');
  const stats = document.getElementById('desktop-stats');

  if (av) av.textContent = membro.nome.substring(0,2).toUpperCase();
  if (nome) nome.textContent = membro.nome;
  if (id) id.textContent = 'ID: ' + (membro.id_pessoal || '');
  if (badge && membro.tipo === 'tea') badge.style.display = 'inline-block';
  if (stats) stats.style.display = 'grid';

  const nomeMedico = document.getElementById('dt-nome-medico');
  const crmMedico = document.getElementById('dt-crm-medico');
  if (nomeMedico) nomeMedico.textContent = 'Dr(a). ' + (MEDICO.nome || '');
  if (crmMedico) crmMedico.textContent = MEDICO.crm || '';

  if (meds && document.getElementById('dstat-meds')) {
    document.getElementById('dstat-meds').textContent = meds.length;
  }
  if (exames && document.getElementById('dstat-exames')) {
    document.getElementById('dstat-exames').textContent = exames.length;
  }
  if (vacinas && document.getElementById('dstat-vacinas')) {
    document.getElementById('dstat-vacinas').textContent = vacinas.length;
  }
  if (aderencia && aderencia.length && document.getElementById('dstat-ader')) {
    const media = Math.round(aderencia.reduce((a,b) => a + (b.total > 0 ? (b.tomadas/b.total)*100 : 0), 0) / aderencia.length);
    document.getElementById('dstat-ader').textContent = media + '%';
  }
}

window.addEventListener('resize', initDesktopLayout);
window.addEventListener('DOMContentLoaded', initDesktopLayout);
</script>`;

c = c.replace('</body>', desktopJS + '\n</body>');

fs.writeFileSync(path, c);
console.log('✅ Layout desktop implementado!');
