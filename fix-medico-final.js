const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// Blindar todas as rotas sem catch
c = c.replace(
  "fetch(`/api/medicamentos/${membro.familia_id}?membro_id=${membro.id}`).then(r => r.json()),",
  "fetch(`/api/medicamentos/${membro.familia_id}?membro_id=${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/sinais/${membro.id}`).then(r => r.json()),",
  "fetch(`/api/sinais/${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/vacinas/${membro.id}`).then(r => r.json()),",
  "fetch(`/api/vacinas/${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/eventos/${membro.familia_id}?membro_id=${membro.id}`).then(r => r.json()),",
  "fetch(`/api/eventos/${membro.familia_id}?membro_id=${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/historico/doencas/${membro.id}`).then(r => r.json()),",
  "fetch(`/api/historico/doencas/${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/historico/tratamentos/${membro.id}`).then(r => r.json()),",
  "fetch(`/api/historico/tratamentos/${membro.id}`).then(r => r.json()).catch(() => []),"
);
c = c.replace(
  "fetch(`/api/historico/internacoes/${membro.id}`).then(r => r.json()),",
  "fetch(`/api/historico/internacoes/${membro.id}`).then(r => r.json()).catch(() => []),"
);

// Verificar resultado
const linhas = c.split('\n').slice(432, 460);
console.log(linhas.join('\n'));

fs.writeFileSync(path, c);
console.log('\n✅ Todas as rotas blindadas!');
