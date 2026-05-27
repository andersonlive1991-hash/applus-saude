const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/js/app.js';
let c = fs.readFileSync(path, 'utf8');

const old = `          <div style="font-size:10px;color:#999;margin-top:3px;">\${new Date(r.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>\`).join('');`;

const novo = `          <div style="font-size:10px;color:#999;margin-top:3px;">\${new Date(r.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
          \${r.foto ? \`<img src="\${r.foto}" style="width:100%;border-radius:8px;margin-top:6px;max-height:160px;object-fit:cover">\` : ''}
        </div>
      </div>\`).join('');`;

if (c.includes(old)) {
  c = c.replace(old, novo);
  fs.writeFileSync(path, c);
  console.log('✅ Foto no feed do app principal!');
} else {
  console.log('❌ Trecho não encontrado');
}
