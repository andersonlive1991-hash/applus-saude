const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/backend/routes/cuidados.js';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `}).then(() => console.log('✅ Tabelas cuidados OK')).catch(e => console.log('Cuidados:', e.message));`,
  `}).then(() => {
  console.log('✅ Tabelas cuidados OK');
  db.query('ALTER TABLE cuidados_atividades ADD COLUMN IF NOT EXISTS foto TEXT').then(() => console.log('✅ Coluna foto OK')).catch(e => console.log('Alter foto:', e.message));
}).catch(e => console.log('Cuidados:', e.message));`
);

fs.writeFileSync(path, c);
console.log('✅ ALTER TABLE adicionado!');
