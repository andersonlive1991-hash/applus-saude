const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  `const resultados = ex.resultados ? JSON.parse(ex.resultados) : [];`,
  `let resultados = [];
        try { if (ex.resultados) { const r = typeof ex.resultados === 'string' ? JSON.parse(ex.resultados) : ex.resultados; resultados = Array.isArray(r) ? r : (r.resultados || []); } } catch(e) { resultados = []; }`
);

fs.writeFileSync(path, c);
console.log('✅ JSON.parse seguro!');
