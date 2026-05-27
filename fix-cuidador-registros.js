const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `const r = await fetch('/api/cuidados/registros/' + FAMILIA_ID + '?cuidador_id=' + CUIDADOR.id);`,
  `const r = await fetch('/api/cuidados/atividades/' + FAMILIA_ID + '/cuidador/' + CUIDADOR.id);`
);

fs.writeFileSync(path, c);
console.log('✅ Rota corrigida!');
