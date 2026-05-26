const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

const oldAbas = `<div class="tea-abas">
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
        <button class="tea-aba" onclick="trocarAbaTea('sos')">
          <span class="aba-icon">🆘</span><span>Socorro</span>
        </button>
        <button class="tea-aba" onclick="trocarAbaTea('evolucao')">
          <span class="aba-icon">📊</span><span>Evolução</span>
        </button>
      </div>`;

c = c.replace(oldAbas, newAbas);
fs.writeFileSync(path, c);
console.log('✅ Ordem das abas corrigida!');
