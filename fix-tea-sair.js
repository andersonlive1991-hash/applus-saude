const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `<button onclick="sairTEA()" style="background:rgba(255,255,255,0.2);border:none;border-radius:50%;width:34px;height:34px;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center" title="Sair">🚪</button>`,
  `<button onclick="sairTEA()" style="background:rgba(255,255,255,0.2);border:none;border-radius:20px;padding:6px 14px;color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Sair</button>`
);

fs.writeFileSync(path, c);
console.log('✅ Botão Sair com texto!');
