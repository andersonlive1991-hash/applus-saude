const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `fetch(\`/api/medicamentos/\${membro.familia_id}?membro_id=\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/medicamentos/\${membro.familia_id}?membro_id=\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/sinais/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/sinais/\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/vacinas/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/vacinas/\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/eventos/\${membro.familia_id}?membro_id=\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/eventos/\${membro.familia_id}?membro_id=\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/historico/doencas/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/historico/doencas/\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/historico/tratamentos/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/historico/tratamentos/\${membro.id}\`).then(r => r.json()).catch(() => []),`
);
c = c.replace(
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()).catch(() => []),`
);

fs.writeFileSync(path, c);
console.log('✅ Todas as rotas do Promise.all blindadas com catch!');
