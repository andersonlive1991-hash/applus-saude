const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

const old = `body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual() })`;
const novo = `body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual(), foto: extra.foto || null, cuidador_nome: CUIDADOR.nome })`;

if (c.includes(old)) {
  c = c.replace(old, novo);
  fs.writeFileSync(path, c);
  console.log('✅ POST incluindo foto e cuidador_nome!');
} else {
  console.log('❌ Trecho não encontrado');
  const idx = c.indexOf('api/cuidados/atividade');
  console.log(c.substring(idx, idx + 300));
}
