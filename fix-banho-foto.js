const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

const old = `    if (tipo === 'banho') {
      extra.foto = await getFotoBase64('banho') || null;
      detalhe = document.getElementById('banho-obs').value || 'Banho realizado';
      extra = { hora: document.getElementById('banho-hora').value };`;

const novo = `    if (tipo === 'banho') {
      const banhoFoto = await getFotoBase64('banho') || null;
      detalhe = document.getElementById('banho-obs').value || 'Banho realizado';
      extra = { hora: document.getElementById('banho-hora').value, foto: banhoFoto };`;

if (c.includes(old)) {
  c = c.replace(old, novo);
  fs.writeFileSync(path, c);
  console.log('✅ Bug do banho corrigido!');
} else {
  console.log('❌ Trecho não encontrado');
}
