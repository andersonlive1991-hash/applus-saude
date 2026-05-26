const fs = require('fs');

const VAPID = 'BO6JXBRmtjSjiM9OAa7NSy2CtZS6x_caWM582FMie8idIzpapx8McDuQl62PChqMHxQAELiE1ja1kHDmK91nLGE';

const pushScript = (membroIdVar, familiaIdVar) => `
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function registrarPush() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.register('/sw2.js');
    await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    let sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('${VAPID}')
    });
    await fetch('/api/push/inscrever', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membro_id: ${membroIdVar}, familia_id: ${familiaIdVar}, subscription: sub })
    });
  } catch(e) { console.log('Push erro:', e.message); }
}
`;

// ── TEA ──
const teaPath = '/data/data/com.termux/files/home/applus-saude/frontend/tea.html';
let tea = fs.readFileSync(teaPath, 'utf8');

const teaPush = pushScript('TEA.membroId', 'TEA.familiaId');

// Adicionar função antes de trocarAbaTea
tea = tea.replace(
  'function sairTEA()',
  teaPush + '\nfunction sairTEA()'
);

// Chamar registrarPush() após login bem-sucedido
tea = tea.replace(
  `document.getElementById('login-tea').style.display = 'none';
    document.getElementById('tea-home').style.display = 'flex';
    document.getElementById('tea-nome').textContent = 'Olá, ' + s.membroNome.split(' ')[0] + '! 👋';
    conectarSocketTEA();`,
  `document.getElementById('login-tea').style.display = 'none';
    document.getElementById('tea-home').style.display = 'flex';
    document.getElementById('tea-nome').textContent = 'Olá, ' + s.membroNome.split(' ')[0] + '! 👋';
    conectarSocketTEA();
    setTimeout(registrarPush, 1500);`
);

fs.writeFileSync(teaPath, tea);
console.log('✅ Push TEA adicionado!');

// ── BABÁ ──
const babaPath = '/data/data/com.termux/files/home/applus-saude/frontend/baba.html';
let baba = fs.readFileSync(babaPath, 'utf8');

const babaPush = pushScript('FAMILIA_ID', 'FAMILIA_ID');

// Adicionar antes do fechamento do </script> final
baba = baba.replace(
  '</body>',
  `<script>
${babaPush}
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(registrarPush, 2000);
});
</script>
</body>`
);

fs.writeFileSync(babaPath, baba);
console.log('✅ Push Babá adicionado!');

// ── KIDS ──
const kidsPath = '/data/data/com.termux/files/home/applus-saude/frontend/kids.html';
let kids = fs.readFileSync(kidsPath, 'utf8');

const kidsPush = pushScript('KIDS.membroId', 'KIDS.familiaId');

kids = kids.replace(
  '</body>',
  `<script>
${kidsPush}
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(registrarPush, 2000);
});
</script>
</body>`
);

fs.writeFileSync(kidsPath, kids);
console.log('✅ Push Kids adicionado!');
