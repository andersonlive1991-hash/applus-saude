const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/js/app.js';
let c = fs.readFileSync(path, 'utf8');

// 1. Adicionar timer MedFriend no dispararAlarme
c = c.replace(
  `  overlay.dataset.medId = med.id;
  overlay.dataset.horario = med._horarioAtivo || '';
}`,
  `  overlay.dataset.medId = med.id;
  overlay.dataset.horario = med._horarioAtivo || '';

  // MedFriend — se não confirmar em 10 min, avisa família
  if (APP.medFriendTimer) clearTimeout(APP.medFriendTimer);
  APP.medFriendTimer = setTimeout(() => {
    // Só dispara se o alarme ainda estiver ativo (não foi confirmado)
    if (overlay.classList.contains('ativo')) {
      api('POST', '/api/push/enviar-familia', {
        familia_id: APP.familiaId,
        titulo: '⚠️ Dose não confirmada',
        corpo: (APP.membroNome || 'Familiar') + ' não confirmou ' + med.nome + ' há 10 minutos.',
        tipo: 'medfriend'
      }).catch(() => {});
    }
  }, 600000); // 10 minutos
}`
);

// 2. Limpar timer MedFriend quando dose for confirmada
c = c.replace(
  `  clearInterval(APP.alarmeRepetir);
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');
  APP.alarmeAtivo = null;`,
  `  clearInterval(APP.alarmeRepetir);
  if (APP.medFriendTimer) { clearTimeout(APP.medFriendTimer); APP.medFriendTimer = null; }
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');
  APP.alarmeAtivo = null;`
);

// 3. Também limpar no lembrarDepois
c = c.replace(
  `function lembrarDepois() {
  clearInterval(APP.alarmeRepetir);
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');`,
  `function lembrarDepois() {
  clearInterval(APP.alarmeRepetir);
  if (APP.medFriendTimer) { clearTimeout(APP.medFriendTimer); APP.medFriendTimer = null; }
  speechSynthesis.cancel();
  pararSomAlarme();
  document.getElementById('alarme-overlay').classList.remove('ativo');`
);

// 4. Inicializar medFriendTimer no objeto APP
c = c.replace(
  `  alarmeAtivo: null,`,
  `  alarmeAtivo: null,
  medFriendTimer: null,`
);

fs.writeFileSync(path, c);
console.log('✅ MedFriend implementado — 10 min sem confirmar notifica família!');
