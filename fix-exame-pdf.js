const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/js/app.js';
let c = fs.readFileSync(path, 'utf8');

// Salvar o base64 do PDF na variável para enviar junto ao banco
c = c.replace(
  `      const resp = await api('POST', '/api/ia/extrair-exame', { pdf: base64, titulo });
      if (resp && resp.resultados) {
        resultados = resp.resultados;
        fonte = 'ia';
        statusEl.textContent = '✅ ' + resultados.length + ' resultado(s) extraído(s) pela IA';
      }`,
  `      const resp = await api('POST', '/api/ia/extrair-exame', { pdf: base64, titulo });
      if (resp && resp.resultados) {
        resultados = resp.resultados;
        fonte = 'ia';
        statusEl.textContent = '✅ ' + resultados.length + ' resultado(s) extraído(s) pela IA';
      }
      pdfBase64 = 'data:application/pdf;base64,' + base64;`
);

// Declarar pdfBase64 antes do if
c = c.replace(
  `  let resultados = [];
  let fonte = 'manual';`,
  `  let resultados = [];
  let fonte = 'manual';
  let pdfBase64 = null;`
);

// Enviar pdfBase64 junto ao POST
c = c.replace(
  `    await api('POST', '/api/exames', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      titulo,
      data_exame: data || null,
      laboratorio: lab,
      medico_solicitante: medico,
      resultados,
      observacoes: obs,
      fonte
    });`,
  `    await api('POST', '/api/exames', {
      membro_id: APP.membroId,
      familia_id: APP.familiaId,
      titulo,
      data_exame: data || null,
      laboratorio: lab,
      medico_solicitante: medico,
      resultados,
      observacoes: obs,
      fonte,
      pdf_url: pdfBase64
    });`
);

fs.writeFileSync(path, c);
console.log('✅ PDF sendo salvo junto ao exame!');
