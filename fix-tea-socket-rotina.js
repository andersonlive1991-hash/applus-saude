const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `  TEA.socket.on('pictos-atualizados', (data) => {
    if (String(data.membroId) === String(TEA.membroId)) carregarPictosNoTEA();
  });
}`,
  `  TEA.socket.on('pictos-atualizados', (data) => {
    if (String(data.membroId) === String(TEA.membroId)) carregarPictosNoTEA();
  });
  TEA.socket.on('rotina-tea-atualizada', (data) => {
    if (String(data.membroId) === String(TEA.membroId)) carregarRotinaVisual();
  });
}`
);

fs.writeFileSync(path, c);
console.log('✅ TEA ouve rotina-tea-atualizada!');
