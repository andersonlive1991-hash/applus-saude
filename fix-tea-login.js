const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Salvar sessão após login bem-sucedido
// Procura onde o login é confirmado e adiciona o localStorage.setItem
c = c.replace(
  `TEA.membroId = mem.id;
    TEA.membroNome = mem.nome;
    TEA.familiaId = mem.familia_id;
    TEA.idPessoal = id;`,
  `TEA.membroId = mem.id;
    TEA.membroNome = mem.nome;
    TEA.familiaId = mem.familia_id;
    TEA.idPessoal = id;
    localStorage.setItem('tea_sessao', JSON.stringify({
      membroId: mem.id,
      membroNome: mem.nome,
      familiaId: mem.familia_id,
      idPessoal: id
    }));`
);

// 2. Adicionar botão Sair no header (ao lado dos pontos)
c = c.replace(
  `<div class="tea-pts" id="tea-estrelas">⭐ 0</div>`,
  `<div style="display:flex;align-items:center;gap:8px">
          <div class="tea-pts" id="tea-estrelas">⭐ 0</div>
          <button onclick="sairTEA()" style="background:rgba(255,255,255,0.2);border:none;border-radius:50%;width:34px;height:34px;color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center" title="Sair">🚪</button>
        </div>`
);

// 3. Adicionar função sairTEA() antes do fechamento do script principal
c = c.replace(
  `function trocarAbaTea(aba) {`,
  `function sairTEA() {
  localStorage.removeItem('tea_sessao');
  TEA.membroId = null;
  TEA.membroNome = null;
  TEA.familiaId = null;
  TEA.idPessoal = null;
  if (TEA.socket) TEA.socket.disconnect();
  document.getElementById('tea-home').style.display = 'none';
  document.getElementById('login-tea').style.display = 'flex';
  document.getElementById('tea-id-input').value = '';
}

function trocarAbaTea(aba) {`
);

fs.writeFileSync(path, c);
console.log('✅ Login persistente e botão Sair adicionados!');
