const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/backend/routes/cuidados.js';
let c = fs.readFileSync(path, 'utf8');

// 1. Adicionar coluna foto na tabela
c = c.replace(
  `    tipo VARCHAR(50), hora TIME, obs TEXT,
    cuidador_nome VARCHAR(100),
    criado_em TIMESTAMP DEFAULT NOW()`,
  `    tipo VARCHAR(50), hora TIME, obs TEXT,
    cuidador_nome VARCHAR(100), foto TEXT,
    criado_em TIMESTAMP DEFAULT NOW()`
);

// Adicionar ALTER TABLE para banco já existente
c = c.replace(
  `}).then(() => console.log('✅ Tabelas cuidados OK')).catch(e => console.log('Cuidados:', e.message));`,
  `}).then(() => {
  console.log('✅ Tabelas cuidados OK');
  db.query('ALTER TABLE cuidados_atividades ADD COLUMN IF NOT EXISTS foto TEXT').catch(() => {});
}).catch(e => console.log('Cuidados:', e.message));`
);

// 2. Incluir foto no INSERT
c = c.replace(
  `const { familia_id, membro_id, tipo, hora, obs } = req.body;
  try {
    const mem = await db.query('SELECT nome FROM membros WHERE id=$1', [membro_id]);
    const nome = mem.rows[0]?.nome || '';
    await db.query('INSERT INTO cuidados_atividades (familia_id, membro_id, tipo, hora, obs, cuidador_nome) VALUES ($1,$2,$3,$4,$5,$6)',
      [familia_id, membro_id, tipo, hora || null, obs, nome]);`,
  `const { familia_id, membro_id, tipo, hora, obs, foto } = req.body;
  try {
    const mem = await db.query('SELECT nome FROM membros WHERE id=$1', [membro_id]);
    const nome = mem.rows[0]?.nome || '';
    await db.query('INSERT INTO cuidados_atividades (familia_id, membro_id, tipo, hora, obs, cuidador_nome, foto) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [familia_id, membro_id, tipo, hora || null, obs, nome, foto || null]);`
);

fs.writeFileSync(path, c);
console.log('✅ Backend atualizado com foto!');

// 3. Incluir foto no POST do cuidador.html
const pathCuid = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let cuid = fs.readFileSync(pathCuid, 'utf8');

cuid = cuid.replace(
  `body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual(), foto: extra.foto || null })`,
  `body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual(), foto: extra.foto || null, cuidador_nome: CUIDADOR.nome })`
);

fs.writeFileSync(pathCuid, cuid);
console.log('✅ Frontend enviando foto ao backend!');
