const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

const campoFoto = (id) => `
    <div class="form-group">
      <label class="form-label">📸 Foto evidência (opcional)</label>
      <input type="file" id="${id}-foto" accept="image/*" capture="camera" style="display:none" onchange="previewFoto('${id}')">
      <button type="button" onclick="document.getElementById('${id}-foto').click()" style="width:100%;padding:10px;background:#f0f7ff;border:2px dashed #1a6eb5;border-radius:10px;color:#1a6eb5;font-size:13px;font-weight:600;cursor:pointer;">📷 Tirar foto ou escolher da galeria</button>
      <div id="${id}-foto-preview" style="margin-top:8px"></div>
    </div>`;

// Banho
c = c.replace(
  `<div class="form-group"><label class="form-label">Observações</label><textarea id="banho-obs" class="form-input" rows="2" placeholder="Ex: banho completo, sem intercorrências"></textarea></div>
    <button class="btn-salvar" onclick="salvar('banho')">💾 Salvar</button>`,
  `<div class="form-group"><label class="form-label">Observações</label><textarea id="banho-obs" class="form-input" rows="2" placeholder="Ex: banho completo, sem intercorrências"></textarea></div>
    ${campoFoto('banho')}
    <button class="btn-salvar" onclick="salvar('banho')">💾 Salvar</button>`
);

// Alimentação
c = c.replace(
  `<div class="form-group"><label class="form-label">Observações</label><textarea id="alim-obs" class="form-input" rows="2" placeholder="Ex: comeu bem, sem dificuldade"></textarea></div>
    <button class="btn-salvar" onclick="salvar('alimentacao')">💾 Salvar</button>`,
  `<div class="form-group"><label class="form-label">Observações</label><textarea id="alim-obs" class="form-input" rows="2" placeholder="Ex: comeu bem, sem dificuldade"></textarea></div>
    ${campoFoto('alim')}
    <button class="btn-salvar" onclick="salvar('alimentacao')">💾 Salvar</button>`
);

// Adicionar função previewFoto e capturar foto no salvar
const scriptFoto = `
function previewFoto(id) {
  const input = document.getElementById(id + '-foto');
  const preview = document.getElementById(id + '-foto-preview');
  if (!input || !input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;border-radius:10px;margin-top:4px;max-height:200px;object-fit:cover">';
  };
  reader.readAsDataURL(input.files[0]);
}

async function getFotoBase64(id) {
  const input = document.getElementById(id + '-foto');
  if (!input || !input.files || !input.files[0]) return null;
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = e => res(e.target.result);
    reader.onerror = rej;
    reader.readAsDataURL(input.files[0]);
  });
}
`;

// Adicionar script antes do fechamento do </script> principal
c = c.replace(
  `// Hora do check-in atualiza a cada minuto`,
  scriptFoto + `\n// Hora do check-in atualiza a cada minuto`
);

// Capturar foto no salvar('banho')
c = c.replace(
  `if (tipo === 'banho') {`,
  `if (tipo === 'banho') {
      dados.foto = await getFotoBase64('banho') || null;`
);

// Capturar foto no salvar('alimentacao')
c = c.replace(
  `if (tipo === 'alimentacao') {`,
  `if (tipo === 'alimentacao') {
      dados.foto = await getFotoBase64('alim') || null;`
);

fs.writeFileSync(path, c);
console.log('✅ Evidência fotográfica adicionada no cuidador!');
