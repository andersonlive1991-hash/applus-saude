const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Corrigir captura da foto — usar variável local em vez de dados.foto
c = c.replace(
  `if (tipo === 'banho') {
      dados.foto = await getFotoBase64('banho') || null;`,
  `if (tipo === 'banho') {
      extra.foto = await getFotoBase64('banho') || null;`
);

c = c.replace(
  `if (tipo === 'alimentacao') {
      dados.foto = await getFotoBase64('alim') || null;`,
  `if (tipo === 'alimentacao') {
      extra.foto = await getFotoBase64('alim') || null;`
);

// 2. Incluir foto no reg enviado ao backend e socket
c = c.replace(
  `const reg = { familia_id: FAMILIA_ID, cuidador_id: CUIDADOR.id, tipo, detalhe, hora: horaAtual(), ...extra };

    // Salva no banco via rota de cuidados
    await fetch('/api/cuidados/atividade', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual() })
    }).catch(() => {});`,
  `const reg = { familia_id: FAMILIA_ID, cuidador_id: CUIDADOR.id, tipo, detalhe, hora: horaAtual(), ...extra };

    // Salva no banco via rota de cuidados
    await fetch('/api/cuidados/atividade', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ familia_id: FAMILIA_ID, membro_id: CUIDADOR.id, tipo, obs: detalhe, hora: extra.hora || horaAtual(), foto: extra.foto || null })
    }).catch(() => {});`
);

// 3. Mostrar foto no diário (renderizarLog)
c = c.replace(
  `registros.unshift({ ...reg, criado_em: new Date().toISOString() });`,
  `registros.unshift({ ...reg, foto: extra.foto || null, criado_em: new Date().toISOString() });`
);

fs.writeFileSync(path, c);
console.log('✅ Foto sendo salva e enviada corretamente!');
