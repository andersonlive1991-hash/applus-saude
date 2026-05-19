const fs = require('fs');
const path = process.env.HOME + '/applus-saude/frontend/index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Adicionar script translations.js no head
html = html.replace(
  '<script src="/js/app.js"></script>',
  '<script src="/js/translations.js"></script>\n<script src="/js/app.js"></script>'
);

// 2. Adicionar tela de seleção de idioma antes do login-page
const telaIdioma = `<!-- ══ TELA DE IDIOMA ══ -->
<div id="idioma-page" style="display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(160deg,#0f6647,#1a9e6e);padding:32px 24px;text-align:center">
  <div style="font-size:64px;margin-bottom:16px">🌍</div>
  <div style="font-size:32px;font-weight:900;color:white;margin-bottom:8px">AP<span style="color:#4ade80">+</span></div>
  <div style="font-size:18px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:8px" data-i18n="idioma.titulo">Bem-vindo ao AP+ Saúde</div>
  <div style="font-size:15px;color:rgba(255,255,255,0.75);margin-bottom:32px" data-i18n="idioma.sub">Escolha seu idioma</div>
  <div style="display:flex;flex-direction:column;gap:12px;width:100%;max-width:320px">
    <button class="idioma-btn" data-lang="pt" onclick="selecionarIdioma('pt')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:16px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">🇧🇷</span> Português
    </button>
    <button class="idioma-btn" data-lang="en" onclick="selecionarIdioma('en')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:16px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">🇺🇸</span> English
    </button>
    <button class="idioma-btn" data-lang="es" onclick="selecionarIdioma('es')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:16px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">🇪🇸</span> Español
    </button>
    <button class="idioma-btn" data-lang="fr" onclick="selecionarIdioma('fr')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:16px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">🇫🇷</span> Français
    </button>
    <button class="idioma-btn" data-lang="de" onclick="selecionarIdioma('de')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:16px;border:2px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:white;font-size:16px;font-weight:700;cursor:pointer;transition:all 0.2s">
      <span style="font-size:28px">🇩🇪</span> Deutsch
    </button>
  </div>
  <button onclick="confirmarIdioma()" style="margin-top:24px;width:100%;max-width:320px;padding:18px;border-radius:16px;border:none;background:white;color:#0f6647;font-size:18px;font-weight:900;cursor:pointer" data-i18n="idioma.continuar">Continuar</button>
</div>

`;

html = html.replace('<!-- ══ TELA DE LOGIN ══ -->', telaIdioma + '<!-- ══ TELA DE LOGIN ══ -->');

// 3. Adicionar data-i18n nos textos principais do login
html = html.replace(
  '<div class="login-sub">Saúde Familiar</div>',
  '<div class="login-sub" data-i18n="login.titulo">Saúde Familiar</div>'
);
html = html.replace(
  '<h2>Como deseja entrar?</h2>',
  '<h2 data-i18n="login.como_entrar">Como deseja entrar?</h2>'
);
html = html.replace(
  '<div class="login-opcao-titulo">Criar perfil</div>',
  '<div class="login-opcao-titulo" data-i18n="login.criar_perfil">Criar perfil</div>'
);
html = html.replace(
  '<div class="login-opcao-sub">Primeira vez usando o app</div>',
  '<div class="login-opcao-sub" data-i18n="login.criar_sub">Primeira vez usando o app</div>'
);
html = html.replace(
  '<div class="login-opcao-titulo">Entrar em família</div>',
  '<div class="login-opcao-titulo" data-i18n="login.entrar_familia">Entrar em família</div>'
);
html = html.replace(
  '<div class="login-opcao-sub">Tenho o código da família</div>',
  '<div class="login-opcao-sub" data-i18n="login.entrar_sub">Tenho o código da família</div>'
);
html = html.replace(
  '<div class="login-opcao-titulo">Já tenho ID</div>',
  '<div class="login-opcao-titulo" data-i18n="login.ja_tenho_id">Já tenho ID</div>'
);
html = html.replace(
  '<div class="login-opcao-sub">Recuperar acesso em novo celular</div>',
  '<div class="login-opcao-sub" data-i18n="login.ja_tenho_sub">Recuperar acesso em novo celular</div>'
);

// 4. Navbar
html = html.replace('>Início<', ' data-i18n="nav.inicio">Início<');
html = html.replace('>Remédios<', ' data-i18n="nav.remedios">Remédios<');
html = html.replace('>Saúde<', ' data-i18n="nav.saude">Saúde<');
html = html.replace('>Família<', ' data-i18n="nav.familia">Família<');
html = html.replace('>Mais<', ' data-i18n="nav.mais">Mais<');

// 5. SOS
html = html.replace(
  'SOS — Emergência',
  '<span data-i18n="home.sos">SOS — Emergência</span>'
);

// 6. Meu Perfil labels
html = html.replace(
  '<label>Nome completo</label>',
  '<label data-i18n="meu_perfil.nome">Nome completo</label>'
);
html = html.replace(
  '<label>Data de nascimento</label>',
  '<label data-i18n="meu_perfil.nascimento">Data de nascimento</label>'
);
html = html.replace(
  '<label>Tipo sanguíneo</label>',
  '<label data-i18n="meu_perfil.sangue">Tipo sanguíneo</label>'
);
html = html.replace(
  '<label>Alergias</label>',
  '<label data-i18n="meu_perfil.alergias">Alergias</label>'
);
html = html.replace(
  '<label>Convênio</label>',
  '<label data-i18n="meu_perfil.convenio">Convênio</label>'
);
html = html.replace(
  '<label>Contato de emergência</label>',
  '<label data-i18n="meu_perfil.contato">Contato de emergência</label>'
);
html = html.replace(
  '<label>Telefone de emergência</label>',
  '<label data-i18n="meu_perfil.tel">Telefone de emergência</label>'
);

fs.writeFileSync(path, html);
console.log('✅ index.html atualizado com sistema de idiomas');
