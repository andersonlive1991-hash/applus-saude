const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Adicionar exames no Promise.all antes do dadosTEA
c = c.replace(
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()).catch(() => []),`,
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()).catch(() => []),
      fetch(\`/api/exames/\${membro.id}\`).then(r => r.ok ? r.json() : []).catch(() => []),`
);

// 2. Atualizar destructuring
c = c.replace(
  `const [perfil, meds, aderencia, sinais, vacinas, eventos, doencas, tratamentos, internacoes, dadosTEA] = await Promise.all([`,
  `const [perfil, meds, aderencia, sinais, vacinas, eventos, doencas, tratamentos, internacoes, exames, dadosTEA] = await Promise.all([`
);

// 3. Adicionar card de exames no HTML — localizar onde começa o bloco de alergias e inserir antes
c = c.replace(
  `// Alergias em destaque`,
  `// Exames
    if (exames && exames.length > 0) {
      html += '<div class="paciente-card"><div class="card-titulo">🔬 Exames (' + exames.length + ')</div>';
      exames.forEach(function(ex) {
        let resultados = [];
        try {
          if (ex.resultados) {
            const r = typeof ex.resultados === 'string' ? JSON.parse(ex.resultados) : ex.resultados;
            resultados = Array.isArray(r) ? r : (r.resultados || []);
          }
        } catch(e) { resultados = []; }
        const alterados = resultados.filter(function(r){ return r.alterado; }).length;
        html += '<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
        html += '<div style="font-weight:600;font-size:14px;color:#1a1f2e">' + (ex.titulo || 'Exame') + '</div>';
        html += alterados > 0
          ? '<span style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">' + alterados + ' alterado(s)</span>'
          : '<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">Normal</span>';
        html += '</div>';
        html += '<div style="font-size:12px;color:#6b7280;margin-bottom:6px">'
          + (ex.data_exame ? formatarData(ex.data_exame) : '—')
          + (ex.laboratorio ? ' · ' + ex.laboratorio : '')
          + (ex.medico_solicitante ? ' · Dr(a). ' + ex.medico_solicitante : '')
          + '</div>';
        if (resultados.length > 0) {
          html += '<div style="display:flex;flex-direction:column;gap:4px">';
          resultados.slice(0,5).forEach(function(r) {
            html += '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 8px;background:' + (r.alterado ? '#fef2f2' : '#f9fafb') + ';border-radius:6px">'
              + '<span style="color:#374151">' + (r.nome || '') + '</span>'
              + '<span style="font-weight:600;color:' + (r.alterado ? '#dc2626' : '#16a34a') + '">' + (r.valor || '') + ' ' + (r.unidade || '') + '</span>'
              + '</div>';
          });
          if (resultados.length > 5) html += '<div style="font-size:11px;color:#6b7280;text-align:center;margin-top:2px">+' + (resultados.length - 5) + ' resultado(s)</div>';
          html += '</div>';
        }
        if (ex.pdf_url) html += '<a href="' + ex.pdf_url + '" target="_blank" style="display:inline-block;margin-top:8px;font-size:12px;color:#1a6eb5;font-weight:600">📄 Ver PDF</a>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Alergias em destaque`
);

fs.writeFileSync(path, c);
console.log('✅ Exames adicionados no portal médico com segurança!');
