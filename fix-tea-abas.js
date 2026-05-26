const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

// 1. ABAS — substituir bloco inteiro
const oldAbas = c.match(/<div class="tea-abas">[\s\S]*?<\/div>/)[0];
const newAbas = `<div class="tea-abas">
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

// 2. HUMOR — remover parágrafo título e melhorar cards
c = c.replace(
  `<p style="font-size:16px;font-weight:800;color:#0369a1;margin-bottom:12px;text-align:center">Como você está se sentindo agora?</p>`,
  `<p style="font-size:13px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Como você está?</p>`
);

// 3. EVOLUÇÃO — remover parágrafo título
c = c.replace(
  `<p style="font-size:16px;font-weight:800;color:#0369a1;margin-bottom:12px;text-align:center">📊 Minha Evolução</p>`,
  `<p style="font-size:13px;font-weight:700;color:#6b7280;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Evolução</p>`
);

// 4. BARRA DE FRASE — fundo escuro → claro
c = c.replace(
  `background:#1e3a5f;border-radius:16px;padding:12px;margin-bottom:12px;min-height:60px;display:flex;flex-direction:column;gap:8px`,
  `background:#e0f2fe;border-radius:16px;padding:12px;margin-bottom:12px;min-height:60px;display:flex;flex-direction:column;gap:8px`
);
c = c.replace(
  `<span style="color:#64748b;font-size:13px;font-style:italic">Toque nos pictogramas para montar uma frase...</span>`,
  `<span style="color:#0369a1;font-size:13px;font-style:italic">Toque nos pictogramas para montar uma frase...</span>`
);

// 5. EVOLUÇÃO — cards de resumo antes dos botões de comportamento
const oldEvolDiv = `<div style="background:white;border-radius:16px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <div style="font-size:14px;font-weight:700;color:#374151;margin-bottom:10px">Registrar comportamento</div>`;
const newEvolDiv = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div style="background:white;border-radius:14px;padding:12px;border:1.5px solid #e5e7eb">
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Esta semana</div>
            <div id="evol-total" style="font-size:22px;font-weight:800;color:#1a1f2e">—</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">comportamentos</div>
          </div>
          <div style="background:white;border-radius:14px;padding:12px;border:1.5px solid #e5e7eb">
            <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Rotina concluída</div>
            <div id="evol-rotina" style="font-size:22px;font-weight:800;color:#1a1f2e">—</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">dias esta semana</div>
          </div>
        </div>
        <div style="background:white;border-radius:16px;padding:14px;margin-bottom:12px;border:1.5px solid #e5e7eb">
          <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">Registrar comportamento</div>`;
c = c.replace(oldEvolDiv, newEvolDiv);

// fechar o div extra que abrimos
c = c.replace(
  `</div>\n        </div>\n\n        <div style="background:white;border-radius:16px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">`,
  `</div>\n        </div>\n\n        <div style="background:white;border-radius:16px;padding:14px;border:1.5px solid #e5e7eb">`
);

fs.writeFileSync(path, c);
console.log('✅ Abas, humor, evolução e frase atualizados!');
