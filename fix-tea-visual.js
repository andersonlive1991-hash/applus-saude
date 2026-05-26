const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

// ── 1. SUBSTITUIR CSS VISUAL (do <style> até </style>) ──
const novoCSS = `<style>
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
body { font-family: 'Nunito', sans-serif; background: #f0f9ff; min-height: 100vh; }
.app { max-width: 480px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }

/* LOGIN */
.login-tea {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 32px 24px;
  background: linear-gradient(160deg, #0369a1, #0ea5e9, #38bdf8); min-height: 100vh;
}
.tea-logo { font-size: 80px; margin-bottom: 16px; animation: bounce 2s infinite; }
.tea-titulo { font-size: 36px; font-weight: 900; color: white; margin-bottom: 8px; }
.tea-sub { font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 40px; }
.login-box { background: white; border-radius: 24px; padding: 32px 24px; width: 100%; }
.login-box label { display: block; font-size: 14px; font-weight: 700; color: #0ea5e9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.login-box input { width: 100%; padding: 16px; border: 2px solid #bae6fd; border-radius: 16px; font-family: 'Nunito', sans-serif; font-size: 20px; font-weight: 700; text-align: center; text-transform: uppercase; outline: none; margin-bottom: 16px; }
.login-box input:focus { border-color: #0ea5e9; }
.btn-entrar { width: 100%; padding: 18px; background: linear-gradient(135deg, #0ea5e9, #0369a1); color: white; border: none; border-radius: 16px; font-family: 'Nunito', sans-serif; font-size: 18px; font-weight: 800; cursor: pointer; }

/* HEADER */
.tea-home { display: none; flex-direction: column; min-height: 100vh; background: #f0f9ff; }
.tea-header { background: #0ea5e9; padding: 48px 20px 32px; }
.tea-header-row { display: flex; align-items: center; justify-content: space-between; }
.tea-avatar-wrap { display: flex; align-items: center; gap: 12px; }
.tea-avatar { font-size: 44px; }
.tea-ola { font-size: 20px; font-weight: 800; color: white; }
.tea-sub-nome { font-size: 13px; color: rgba(255,255,255,0.75); margin-top: 2px; }
.tea-pts { background: rgba(255,255,255,0.2); border-radius: 20px; padding: 6px 14px; font-size: 14px; color: white; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.tea-curva { width: 100%; height: 24px; background: #f0f9ff; border-radius: 24px 24px 0 0; margin-top: -12px; }
.tea-content { flex: 1; padding: 0 16px 32px; display: flex; flex-direction: column; gap: 12px; }

/* ABAS */
.tea-abas { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 4px 0 8px; }
.tea-aba {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 8px 14px; border-radius: 16px; border: 1.5px solid #bae6fd;
  background: white; font-family: 'Nunito', sans-serif; font-size: 11px;
  font-weight: 800; color: #0369a1; cursor: pointer; white-space: nowrap; min-width: 56px;
  transition: all 0.2s;
}
.tea-aba .aba-icon { font-size: 18px; }
.tea-aba.ativa { background: #0ea5e9; border-color: #0ea5e9; color: white; }

/* ROTINA */
.rotina-lista { display: flex; flex-direction: column; gap: 8px; }
.rotina-item {
  display: flex; align-items: center; gap: 12px; background: white;
  border-radius: 16px; padding: 12px 14px; border: 1.5px solid #e5e7eb;
  transition: all 0.2s;
}
.rotina-item.concluida { background: #f0fdf4; border-color: #86efac; opacity: 0.8; }
.rotina-emoji { font-size: 32px; flex-shrink: 0; }
.rotina-info { flex: 1; }
.rotina-nome { font-size: 15px; font-weight: 800; color: #1a1f2e; }
.rotina-hora { font-size: 12px; color: #6b7280; margin-top: 2px; }
.btn-concluir {
  width: 36px; height: 36px; border-radius: 50%; border: 2px solid #e5e7eb;
  background: white; font-size: 16px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s;
}
.rotina-item.concluida .btn-concluir { background: #22c55e; border-color: #22c55e; color: white; }

/* PICTOGRAMAS */
.pict-grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.pict-btn {
  background: white; border: 2px solid #bae6fd; border-radius: 16px;
  padding: 14px 8px; display: flex; flex-direction: column; align-items: center;
  gap: 6px; cursor: pointer; transition: all 0.15s; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.pict-btn:active { transform: scale(0.94); background: #e0f2fe; border-color: #0ea5e9; }
.pict-emoji { font-size: 38px; }
.pict-texto { font-size: 13px; font-weight: 800; color: #0369a1; text-align: center; }

/* HUMOR */
.humor-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; }
.humor-btn {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: white; border: 2px solid #e5e7eb; border-radius: 16px;
  padding: 12px 4px; cursor: pointer; transition: all 0.15s;
}
.humor-btn:active, .humor-btn.selecionado { border-color: #0ea5e9; background: #e0f2fe; }
.humor-emoji { font-size: 30px; }
.humor-label { font-size: 10px; font-weight: 800; color: #6b7280; text-align: center; }

/* SOS */
.btn-sos-tea {
  background: linear-gradient(135deg, #dc2626, #b91c1c); border: none;
  border-radius: 20px; padding: 20px 24px; display: flex; align-items: center;
  gap: 16px; cursor: pointer; width: 100%;
  box-shadow: 0 6px 24px rgba(220,38,38,0.35); animation: pulse-sos 2s infinite;
}
.btn-sos-tea .sos-icone { font-size: 36px; }
.sos-info { text-align: left; }
.btn-sos-tea .sos-texto { font-size: 20px; font-weight: 900; color: white; letter-spacing: 1px; display: block; }
.btn-sos-tea .sos-sub { font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 700; display: block; margin-top: 2px; }

/* VOZ */
.voz-overlay {
  display: none; position: fixed; inset: 0; background: rgba(3,105,161,0.95);
  z-index: 300; flex-direction: column; align-items: center;
  justify-content: center; text-align: center; padding: 32px;
}
.voz-overlay.ativo { display: flex; }
.voz-emoji { font-size: 80px; margin-bottom: 16px; animation: bounce 0.5s infinite; }
.voz-texto { font-size: 28px; font-weight: 900; color: white; margin-bottom: 32px; }
.btn-fechar-voz { background: white; color: #0369a1; border: none; border-radius: 16px; padding: 16px 32px; font-family: 'Nunito', sans-serif; font-size: 18px; font-weight: 800; cursor: pointer; }

/* SOS OVERLAY */
.sos-overlay {
  display: none; position: fixed; inset: 0; background: rgba(220,38,38,0.95);
  z-index: 300; flex-direction: column; align-items: center;
  justify-content: center; text-align: center; padding: 32px;
}
.sos-overlay.ativo { display: flex; }
.sos-overlay .icone { font-size: 80px; margin-bottom: 16px; animation: bounce 0.5s infinite; }
.sos-overlay h2 { font-size: 28px; font-weight: 900; color: white; margin-bottom: 8px; }
.sos-overlay p { font-size: 16px; color: rgba(255,255,255,0.8); margin-bottom: 32px; }
.sos-overlay button { background: white; color: #dc2626; border: none; border-radius: 16px; padding: 16px 32px; font-family: 'Nunito', sans-serif; font-size: 18px; font-weight: 800; cursor: pointer; }

/* TEMPORIZADOR */
.temporizador-box { margin-top: 16px; background: white; border-radius: 20px; padding: 20px 16px; border: 1.5px solid #e5e7eb; text-align: center; }
.temp-titulo { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
.temp-emoji { font-size: 56px; margin-bottom: 8px; display: block; transition: all 0.3s; }
.temp-tempo { font-size: 44px; font-weight: 900; color: #1e293b; font-family: monospace; margin-bottom: 12px; }
.temp-barra-wrap { width: 100%; height: 20px; background: #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
.temp-barra { height: 100%; border-radius: 10px; width: 100%; background: #22c55e; transition: width 1s linear, background 1s; }
.temp-botoes { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px; }
.temp-btn { background: #e0f2fe; color: #0369a1; border: none; border-radius: 12px; padding: 10px 16px; font-size: 15px; font-weight: 700; cursor: pointer; }
.temp-btn-iniciar { background: #22c55e; color: white; border: none; border-radius: 12px; padding: 12px 32px; font-size: 16px; font-weight: 700; cursor: pointer; width: 100%; }
.temp-btn-parar { background: #ef4444; color: white; border: none; border-radius: 12px; padding: 12px 32px; font-size: 16px; font-weight: 700; cursor: pointer; width: 100%; display: none; }

@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes pulse-sos { 0%, 100% { box-shadow: 0 6px 24px rgba(220,38,38,0.35); } 50% { box-shadow: 0 6px 40px rgba(220,38,38,0.6); transform: scale(1.01); } }
@keyframes pulsar-barra { 0%, 100% { opacity: 1; transform: scaleY(1); } 50% { opacity: 0.6; transform: scaleY(1.15); } }
</style>`;

// Substituir bloco de style
c = c.replace(/<style>[\s\S]*?<\/style>/, novoCSS);

// ── 2. SUBSTITUIR HEADER (tea-header) ──
const oldHeader = `    <div class="tea-header">
      <div class="tea-avatar">🧩</div>
      <div class="tea-ola" id="tea-nome">Olá!</div>
      <div id="tea-estrelas" style="font-size:14px;color:#fbbf24;font-weight:700;margin-top:4px;text-align:center;">⭐ 0</div>
    </div>
    <div class="tea-curva"></div>`;

const newHeader = `    <div class="tea-header">
      <div class="tea-header-row">
        <div class="tea-avatar-wrap">
          <div class="tea-avatar">🧩</div>
          <div>
            <div class="tea-ola" id="tea-nome">Olá!</div>
            <div class="tea-sub-nome">Meu espaço especial</div>
          </div>
        </div>
        <div class="tea-pts" id="tea-estrelas">⭐ 0</div>
      </div>
    </div>
    <div class="tea-curva"></div>`;

c = c.replace(oldHeader, newHeader);

// ── 3. SUBSTITUIR ABAS ──
const oldAbas = `      <div class="tea-abas">
          <button class="tea-aba ativa" onclick="trocarAbaTea('rotina')">📋 Minha Rotina</button>
        <button class="tea-aba" onclick="trocarAbaTea('comunicar')">💬 Comunicar</button>
        <button class="tea-aba" onclick="trocarAbaTea('humor')">😊 Como estou</button>
              <button class="tea-aba" onclick="trocarAbaTea('sos')"> 🆘 Socorro</button>

        <button class="tea-aba" onclick="trocarAbaTea('evolucao')">📊 Evolução</button></div>`;

const newAbas = `      <div class="tea-abas">
        <button class="tea-aba ativa" onclick="trocarAbaTea('rotina')">
          <span class="aba-icon">📋</span><span>Rotina</span>
        </button>
        <button class="tea-aba" onclick="trocarAbaTea('comunicar')">
          <span class="aba-icon">💬</span><span>Comunicar</span>
        </button>
        <button class="tea-aba" onclick="trocarAbaTea('humor')">
          <span class="aba-icon">😊</span><span>Como estou</span>
        </button>
        <button class="tea-aba" onclick="trocarAbaTea('evolucao')">
          <span class="aba-icon">📊</span><span>Evolução</span>
        </button>
        <button class="tea-aba" onclick="trocarAbaTea('sos')">
          <span class="aba-icon">🆘</span><span>Socorro</span>
        </button>
      </div>`;

c = c.replace(oldAbas, newAbas);

// ── 4. NOVO BOTÃO SOS COMPACTO ──
const oldSOS = `        <button class="btn-sos-tea" onclick="enviarSOSTea()">
          <span class="sos-icone">🆘</span>
          <span class="sos-texto">SOCORRO!</span>
          <span class="sos-sub">Toca aqui se precisar de ajuda</span>
        </button>`;

const newSOS = `        <button class="btn-sos-tea" onclick="enviarSOSTea()">
          <span class="sos-icone">🆘</span>
          <div class="sos-info">
            <span class="sos-texto">SOCORRO!</span>
            <span class="sos-sub">Toca aqui se precisar de ajuda</span>
          </div>
        </button>`;

c = c.replace(oldSOS, newSOS);

fs.writeFileSync(path, c);
console.log('✅ Visual TEA atualizado com sucesso!');
