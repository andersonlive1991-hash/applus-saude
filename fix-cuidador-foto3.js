const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/cuidador.html';
let c = fs.readFileSync(path, 'utf8');

const old = '        <div class="log-hora">${r.hora||new Date(r.criado_em).toLocaleTimeString(\'pt-BR\',{hour:\'2-digit\',minute:\'2-digit\'})}</div>\n      </div>\n    </div>`).join(\'\');';

const novo = '        <div class="log-hora">${r.hora||new Date(r.criado_em).toLocaleTimeString(\'pt-BR\',{hour:\'2-digit\',minute:\'2-digit\'})}</div>\n        ${r.foto ? `<img src="${r.foto}" style="width:100%;border-radius:8px;margin-top:6px;max-height:160px;object-fit:cover">` : \'\'}\n      </div>\n    </div>`).join(\'\');';

if (c.includes(old)) {
  c = c.replace(old, novo);
  fs.writeFileSync(path, c);
  console.log('✅ Foto no diário!');
} else {
  console.log('❌ Trecho não encontrado');
}
