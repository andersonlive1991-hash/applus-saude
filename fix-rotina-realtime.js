const fs = require('fs');

// ── 1. MEDICO.HTML — emitir evento ao adicionar/excluir atividade ──
const pathMedico = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let medico = fs.readFileSync(pathMedico, 'utf8');

// Emitir após adicionar atividade
medico = medico.replace(
  `    document.getElementById('presc-emoji').value = '';
    document.getElementById('presc-atividade').value = '';
    document.getElementById('presc-hora').value = '';
    await carregarRotinaPrescricao();`,
  `    document.getElementById('presc-emoji').value = '';
    document.getElementById('presc-atividade').value = '';
    document.getElementById('presc-hora').value = '';
    await carregarRotinaPrescricao();
    if (typeof _medicoSocket !== 'undefined' && _medicoSocket) {
      _medicoSocket.emit('rotina-tea-atualizada', { membroId: _prescricaoMembroId });
    }`
);

// Emitir após excluir atividade
medico = medico.replace(
  `  await fetch('/api/rotina-tea/' + id, { method: 'DELETE' });
  await carregarRotinaPrescricao();`,
  `  await fetch('/api/rotina-tea/' + id, { method: 'DELETE' });
  await carregarRotinaPrescricao();
  if (typeof _medicoSocket !== 'undefined' && _medicoSocket) {
    _medicoSocket.emit('rotina-tea-atualizada', { membroId: _prescricaoMembroId });
  }`
);

fs.writeFileSync(pathMedico, medico);
console.log('✅ Medico emite rotina-tea-atualizada!');

// ── 2. TEA.HTML — ouvir evento e recarregar rotina ──
const pathTea = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let tea = fs.readFileSync(pathTea, 'utf8');

// Adicionar listener no socket TEA
tea = tea.replace(
  `function conectarSocketTEA() {`,
  `function conectarSocketTEA() {`
);

// Localizar onde o socket é configurado e adicionar listener
tea = tea.replace(
  `TEA.socket.on('tea-voz', (data) => {`,
  `TEA.socket.on('rotina-tea-atualizada', (data) => {
    if (data.membroId == TEA.membroId) {
      carregarRotinaVisual();
    }
  });

  TEA.socket.on('tea-voz', (data) => {`
);

fs.writeFileSync(pathTea, tea);
console.log('✅ TEA ouve rotina-tea-atualizada!');
