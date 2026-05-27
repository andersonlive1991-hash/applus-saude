const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Adicionar botão prescrever após card rotina TEA
const oldRotina = `      } else { html += '<div class="vazio">Nenhuma atividade cadastrada</div>'; }
      html += '</div>';

      // Humor TEA`;

const newRotina = `      } else { html += '<div class="vazio">Nenhuma atividade cadastrada</div>'; }
      html += '<button onclick="abrirPrescricaoRotina(' + membro.id + ')" style="width:100%;margin-top:8px;padding:10px;background:#0ea5e9;border:none;border-radius:10px;color:white;font-size:13px;font-weight:700;cursor:pointer">✏️ Prescrever / Editar Rotina</button>';
      html += '</div>';

      // Humor TEA`;

c = c.replace(oldRotina, newRotina);

// 2. Adicionar modal de prescrição antes do </body>
const modal = `
<!-- Modal Prescrição Rotina TEA -->
<div id="modal-prescricao-rotina" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:999;overflow-y:auto;padding:20px">
  <div style="background:white;border-radius:16px;padding:20px;max-width:480px;margin:0 auto">
    <div style="font-size:16px;font-weight:700;color:#0369a1;margin-bottom:16px">✏️ Prescrever Rotina TEA</div>
    <div id="prescricao-lista" style="margin-bottom:16px"></div>
    <div style="background:#f0f9ff;border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;color:#0369a1;margin-bottom:10px">+ Nova atividade</div>
      <input type="text" id="presc-emoji" placeholder="Emoji (ex: 🦷)" style="width:60px;padding:8px;border:1px solid #bae6fd;border-radius:8px;font-size:16px;text-align:center;margin-bottom:8px">
      <input type="text" id="presc-atividade" placeholder="Nome da atividade" style="width:100%;padding:8px;border:1px solid #bae6fd;border-radius:8px;font-size:13px;margin-bottom:8px">
      <input type="time" id="presc-hora" style="width:100%;padding:8px;border:1px solid #bae6fd;border-radius:8px;font-size:13px;margin-bottom:8px">
      <button onclick="adicionarAtividadeRotina()" style="width:100%;padding:10px;background:#0ea5e9;border:none;border-radius:8px;color:white;font-size:13px;font-weight:700;cursor:pointer">+ Adicionar</button>
    </div>
    <button onclick="document.getElementById('modal-prescricao-rotina').style.display='none'" style="width:100%;padding:10px;background:#f3f4f6;border:none;border-radius:8px;font-size:13px;cursor:pointer">Fechar</button>
  </div>
</div>`;

c = c.replace('</body>', modal + '\n</body>');

// 3. Adicionar funções JS
const script = `
<script>
let _prescricaoMembroId = null;

async function abrirPrescricaoRotina(membroId) {
  _prescricaoMembroId = membroId;
  document.getElementById('modal-prescricao-rotina').style.display = 'block';
  await carregarRotinaPrescricao();
}

async function carregarRotinaPrescricao() {
  try {
    const r = await fetch('/api/rotina-tea/' + _prescricaoMembroId);
    const rotina = await r.json();
    const el = document.getElementById('prescricao-lista');
    if (!rotina.length) { el.innerHTML = '<p style="color:#999;font-size:13px;text-align:center">Nenhuma atividade ainda</p>'; return; }
    el.innerHTML = rotina.map(a => \`
      <div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f9fafb;border-radius:8px;margin-bottom:6px">
        <span style="font-size:20px">\${a.emoji || '📌'}</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">\${a.atividade}</div>
          <div style="font-size:11px;color:#6b7280">\${a.hora || 'Sem horário'}</div>
        </div>
        <button onclick="excluirAtividadeRotina(\${a.id})" style="background:#fef2f2;border:none;border-radius:6px;padding:4px 8px;color:#dc2626;font-size:12px;cursor:pointer">✕</button>
      </div>\`).join('');
  } catch(e) { console.log('Erro rotina:', e); }
}

async function adicionarAtividadeRotina() {
  const emoji = document.getElementById('presc-emoji').value.trim() || '📌';
  const atividade = document.getElementById('presc-atividade').value.trim();
  const hora = document.getElementById('presc-hora').value;
  if (!atividade) return alert('Digite o nome da atividade');
  try {
    await fetch('/api/rotina-tea', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ membro_id: _prescricaoMembroId, atividade, emoji, hora, ordem: 0, data: new Date().toISOString().split('T')[0] })
    });
    document.getElementById('presc-emoji').value = '';
    document.getElementById('presc-atividade').value = '';
    document.getElementById('presc-hora').value = '';
    await carregarRotinaPrescricao();
  } catch(e) { alert('Erro ao adicionar: ' + e.message); }
}

async function excluirAtividadeRotina(id) {
  if (!confirm('Remover esta atividade?')) return;
  await fetch('/api/rotina-tea/' + id, { method: 'DELETE' });
  await carregarRotinaPrescricao();
}
</script>`;

c = c.replace('</body>', script + '\n</body>');

fs.writeFileSync(path, c);
console.log('✅ Prescrição de rotina TEA no portal médico!');
