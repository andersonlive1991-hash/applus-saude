const fs = require('fs');

// ── 1. CUIDADOR.HTML — foto no medicamento + corrigir salvar med ──
const pathCuid = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let cuid = fs.readFileSync(pathCuid, 'utf8');

// Adicionar campo foto no modal medicamento
const oldMedModal = `    <div class="form-group"><label class="form-label">Observações</label><textarea id="med-obs" class="form-input" rows="2"></textarea></div>
    <button class="btn-salvar" onclick="salvar('medicamento')">💾 Salvar</button>`;
const newMedModal = `    <div class="form-group"><label class="form-label">Observações</label><textarea id="med-obs" class="form-input" rows="2"></textarea></div>
    <div class="form-group">
      <label class="form-label">📸 Foto evidência (opcional)</label>
      <input type="file" id="med-foto" accept="image/*" capture="camera" style="display:none" onchange="previewFoto('med')">
      <button type="button" onclick="document.getElementById('med-foto').click()" style="width:100%;padding:10px;background:#f0f7ff;border:2px dashed #1a6eb5;border-radius:10px;color:#1a6eb5;font-size:13px;font-weight:600;cursor:pointer;">📷 Tirar foto ou escolher da galeria</button>
      <div id="med-foto-preview" style="margin-top:8px"></div>
    </div>
    <button class="btn-salvar" onclick="salvar('medicamento')">💾 Salvar</button>`;

if (cuid.includes(oldMedModal)) {
  cuid = cuid.replace(oldMedModal, newMedModal);
  console.log('✅ Campo foto medicamento adicionado!');
} else { console.log('❌ Modal medicamento não encontrado'); }

// Corrigir salvar medicamento para capturar foto
const oldMedSalvar = `    } else if (tipo === 'medicamento') {
      const n = document.getElementById('med-nome').value;
      const s = document.getElementById('med-status').value;
      const o = document.getElementById('med-obs').value;
      detalhe = n + ' — ' + s + (o ? '. ' + o : '');
      extra = { hora: document.getElementById('med-hora').value };`;
const newMedSalvar = `    } else if (tipo === 'medicamento') {
      const n = document.getElementById('med-nome').value;
      const s = document.getElementById('med-status').value;
      const o = document.getElementById('med-obs').value;
      detalhe = n + ' — ' + s + (o ? '. ' + o : '');
      const medFoto = await getFotoBase64('med') || null;
      extra = { hora: document.getElementById('med-hora').value, foto: medFoto };`;

if (cuid.includes(oldMedSalvar)) {
  cuid = cuid.replace(oldMedSalvar, newMedSalvar);
  console.log('✅ Salvar medicamento com foto!');
} else { console.log('❌ Salvar medicamento não encontrado'); }

fs.writeFileSync(pathCuid, cuid);

// ── 2. APP.JS — exibir foto nas atividades do app principal ──
const pathApp = '/data/data/com.termux/files/home/applus-saude/frontend/js/app.js';
let app = fs.readFileSync(pathApp, 'utf8');

const oldAtiv = `          <div style="font-size:0.75rem;color:#999">\${a.cuidador_nome || ''}</div>
        </div>
      </div>\`).join('');`;
const newAtiv = `          <div style="font-size:0.75rem;color:#999">\${a.cuidador_nome || ''}</div>
          \${a.foto ? \`<img src="\${a.foto}" style="width:100%;border-radius:8px;margin-top:6px;max-height:160px;object-fit:cover">\` : ''}
        </div>
      </div>\`).join('');`;

if (app.includes(oldAtiv)) {
  app = app.replace(oldAtiv, newAtiv);
  console.log('✅ Foto aparece no app principal!');
} else { console.log('❌ carregarAtividades não encontrado'); }

fs.writeFileSync(pathApp, app);
