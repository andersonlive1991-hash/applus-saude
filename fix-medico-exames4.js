const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `if (exames && exames.length > 0) {
      html += '<div class="paciente-card"><div class="card-titulo">🔬 Exames (' + exames.length + ')</div>';`,
  `html += '<div class="paciente-card"><div class="card-titulo">🔬 Exames (' + (exames ? exames.length : 0) + ')</div>';
    if (exames && exames.length > 0) {`
);

// Fechar o if corretamente
c = c.replace(
  `      html += '</div>';\n    }\n\n    // Alergias em destaque`,
  `      html += '</div>';\n    } else {\n      html += '<div class="vazio">Nenhum exame cadastrado</div>';\n    }\n    html += '</div>';\n\n    // Alergias em destaque`
);

fs.writeFileSync(path, c);
console.log('✅ Card de exames sempre visível!');
