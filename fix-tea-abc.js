const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Mudar botões de crise para abrir modal ABC em vez de registrar direto
c = c.replace(
  `<button onclick="registrarComportamento('crise','Crise de choro')" style="background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:#dc2626;cursor:pointer">😢 Crise choro</button>`,
  `<button onclick="abrirModalABC('Crise de choro','😢')" style="background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:#dc2626;cursor:pointer">😢 Crise choro</button>`
);
c = c.replace(
  `<button onclick="registrarComportamento('crise','Crise de agressividade')" style="background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:#dc2626;cursor:pointer">😡 Agressividade</button>`,
  `<button onclick="abrirModalABC('Crise de agressividade','😡')" style="background:#fef2f2;border:2px solid #ef4444;border-radius:12px;padding:12px;font-size:13px;font-weight:600;color:#dc2626;cursor:pointer">😡 Agressividade</button>`
);

// 2. Adicionar modal ABC antes do </div> final do app
const modalABC = `
<!-- Modal ABC Crise -->
<div id="modal-abc" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:999;overflow-y:auto;padding:16px">
  <div style="background:white;border-radius:20px;padding:20px;max-width:480px;margin:0 auto">
    <div style="font-size:16px;font-weight:800;color:#dc2626;margin-bottom:4px" id="abc-titulo">😢 Crise de choro</div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:16px">Modelo ABC — Registro clínico</div>

    <!-- A — Antecedente -->
    <div style="background:#fef9c3;border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:8px">🅐 ANTECEDENTE — O que aconteceu antes?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px" id="abc-antecedentes">
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🔊 Barulho excessivo</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🔄 Mudança de rotina</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">😤 Frustração</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🚫 Negativa/recusa</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">👥 Interação social</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🍽️ Alimentação</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">😴 Cansaço</button>
        <button onclick="toggleABC(this,'ant')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">❓ Desconhecido</button>
      </div>
    </div>

    <!-- B — Comportamento -->
    <div style="background:#fef2f2;border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:#dc2626;margin-bottom:8px">🅑 COMPORTAMENTO — Intensidade e duração</div>
      <div style="margin-bottom:8px">
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Intensidade (1 = leve, 5 = severa)</div>
        <div style="display:flex;gap:6px">
          <button onclick="selecionarIntensidade(1)" id="int-1" style="flex:1;padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;cursor:pointer">1</button>
          <button onclick="selecionarIntensidade(2)" id="int-2" style="flex:1;padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;cursor:pointer">2</button>
          <button onclick="selecionarIntensidade(3)" id="int-3" style="flex:1;padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;cursor:pointer">3</button>
          <button onclick="selecionarIntensidade(4)" id="int-4" style="flex:1;padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;cursor:pointer">4</button>
          <button onclick="selecionarIntensidade(5)" id="int-5" style="flex:1;padding:8px;background:#ef4444;border:1.5px solid #ef4444;border-radius:8px;font-size:13px;cursor:pointer;color:white">5</button>
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Duração aproximada</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button onclick="selecionarDuracao(this,'< 5 min')" style="padding:6px 10px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">< 5 min</button>
          <button onclick="selecionarDuracao(this,'5-10 min')" style="padding:6px 10px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">5-10 min</button>
          <button onclick="selecionarDuracao(this,'10-30 min')" style="padding:6px 10px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">10-30 min</button>
          <button onclick="selecionarDuracao(this,'> 30 min')" style="padding:6px 10px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">> 30 min</button>
        </div>
      </div>
    </div>

    <!-- C — Consequência -->
    <div style="background:#f0fdf4;border-radius:12px;padding:12px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#15803d;margin-bottom:8px">🅒 CONSEQUÊNCIA — O que ajudou a acalmar?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🎵 Música calma</button>
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🤗 Abraço/contato</button>
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🏠 Isolamento/espaço</button>
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">🧸 Objeto favorito</button>
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">💊 Medicação</button>
        <button onclick="toggleABC(this,'cons')" style="padding:8px;background:white;border:1.5px solid #e5e7eb;border-radius:8px;font-size:12px;cursor:pointer">⏳ Passou sozinho</button>
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button onclick="fecharModalABC()" style="flex:1;padding:12px;background:#f3f4f6;border:none;border-radius:12px;font-size:14px;cursor:pointer">Cancelar</button>
      <button onclick="salvarCriseABC()" style="flex:2;padding:12px;background:#dc2626;border:none;border-radius:12px;color:white;font-size:14px;font-weight:700;cursor:pointer">💾 Registrar crise</button>
    </div>
  </div>
</div>`;

c = c.replace('</div>\n\n<script src="https://cdn.socket.io', modalABC + '\n\n</div>\n\n<script src="https://cdn.socket.io');

// 3. Adicionar funções JS do modal ABC
const scriptABC = `
let _abcTipo = '';
let _abcEmoji = '';
let _abcIntensidade = 3;
let _abcDuracao = '< 5 min';
let _abcSel = { ant: [], cons: [] };

function abrirModalABC(tipo, emoji) {
  _abcTipo = tipo;
  _abcEmoji = emoji;
  _abcIntensidade = 3;
  _abcDuracao = '< 5 min';
  _abcSel = { ant: [], cons: [] };
  document.getElementById('abc-titulo').textContent = emoji + ' ' + tipo;
  // Reset botões
  document.querySelectorAll('#modal-abc button').forEach(b => {
    if (!b.onclick || b.onclick.toString().includes('toggleABC') || b.onclick.toString().includes('selecionarIntensidade') || b.onclick.toString().includes('selecionarDuracao')) {
      b.style.background = 'white';
      b.style.borderColor = '#e5e7eb';
      b.style.color = '#1a1f2e';
    }
  });
  selecionarIntensidade(3);
  document.getElementById('modal-abc').style.display = 'block';
}

function fecharModalABC() {
  document.getElementById('modal-abc').style.display = 'none';
}

function toggleABC(btn, grupo) {
  const val = btn.textContent.trim();
  const idx = _abcSel[grupo].indexOf(val);
  if (idx === -1) {
    _abcSel[grupo].push(val);
    btn.style.background = grupo === 'ant' ? '#fef9c3' : '#f0fdf4';
    btn.style.borderColor = grupo === 'ant' ? '#eab308' : '#22c55e';
  } else {
    _abcSel[grupo].splice(idx, 1);
    btn.style.background = 'white';
    btn.style.borderColor = '#e5e7eb';
  }
}

function selecionarIntensidade(n) {
  _abcIntensidade = n;
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('int-' + i);
    if (!btn) continue;
    if (i <= n) {
      btn.style.background = i <= 2 ? '#fef9c3' : i <= 3 ? '#fed7aa' : '#fecaca';
      btn.style.borderColor = i <= 2 ? '#eab308' : i <= 3 ? '#f97316' : '#ef4444';
      btn.style.color = '#1a1f2e';
    } else {
      btn.style.background = 'white';
      btn.style.borderColor = '#e5e7eb';
      btn.style.color = '#1a1f2e';
    }
  }
}

function selecionarDuracao(btn, val) {
  _abcDuracao = val;
  btn.closest('div').querySelectorAll('button').forEach(b => {
    b.style.background = 'white';
    b.style.borderColor = '#e5e7eb';
  });
  btn.style.background = '#fef2f2';
  btn.style.borderColor = '#ef4444';
}

async function salvarCriseABC() {
  try {
    await fetch('/api/comportamentos-tea', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        membro_id: TEA.membroId,
        familia_id: TEA.familiaId,
        tipo: 'crise',
        descricao: _abcTipo,
        abc_antecedente: _abcSel.ant.join(', ') || 'Não informado',
        abc_consequencia: _abcSel.cons.join(', ') || 'Não informado',
        intensidade: _abcIntensidade,
        duracao: _abcDuracao
      })
    });
    fecharModalABC();
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:12px 24px;background:#ef4444;color:#fff;font-size:14px;font-weight:600;z-index:99999;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    d.textContent = '🚨 ' + _abcTipo + ' registrada!';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
    carregarEvolucao();
  } catch(e) { console.log('Erro ABC:', e); }
}`;

c = c.replace(
  'async function registrarComportamento(tipo, descricao) {',
  scriptABC + '\n\nasync function registrarComportamento(tipo, descricao) {'
);

fs.writeFileSync(path, c);
console.log('✅ Modelo ABC implementado no TEA!');
