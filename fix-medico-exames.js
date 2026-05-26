const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Adicionar exames no Promise.all
c = c.replace(
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()),`,
  `fetch(\`/api/historico/internacoes/\${membro.id}\`).then(r => r.json()),
      fetch(\`/api/exames/\${membro.id}\`).then(r => r.ok ? r.json() : []).catch(() => []),`
);

// 2. Adicionar exames na desestruturação
c = c.replace(
  `const [perfil, meds, aderencia, sinais, vacinas, eventos, doencas, tratamentos, internacoes, dadosTEA] = await Promise.all([`,
  `const [perfil, meds, aderencia, sinais, vacinas, eventos, doencas, tratamentos, internacoes, exames, dadosTEA] = await Promise.all([`
);

// 3. Adicionar card de exames no HTML — antes do fechamento do html final
c = c.replace(
  `// Alergias em destaque`,
  `// Exames
    if (exames && exames.length > 0) {
      html += \`<div class="paciente-card">
        <div class="card-titulo">🔬 Exames (\${exames.length})</div>\`;
      exames.forEach(ex => {
        const resultados = ex.resultados ? JSON.parse(ex.resultados) : [];
        const alterados = resultados.filter ? resultados.filter(r => r.alterado).length : 0;
        html += \`<div style="border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-weight:600;font-size:14px;color:#1a1f2e">\${ex.titulo || 'Exame'}</div>
            \${alterados > 0 ? \`<span style="background:#fef2f2;color:#dc2626;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">\${alterados} alterado\${alterados > 1 ? 's' : ''}</span>\` : '<span style="background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px">Normal</span>'}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">
            \${ex.data_exame ? formatarData(ex.data_exame) : '—'} \${ex.laboratorio ? '· ' + ex.laboratorio : ''} \${ex.medico_solicitante ? '· Dr(a). ' + ex.medico_solicitante : ''}
          </div>
          \${resultados.length > 0 ? \`<div style="display:flex;flex-direction:column;gap:4px">\${resultados.slice(0,5).map(r => \`
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 8px;background:\${r.alterado ? '#fef2f2' : '#f9fafb'};border-radius:6px">
              <span style="color:#374151">\${r.nome}</span>
              <span style="font-weight:600;color:\${r.alterado ? '#dc2626' : '#16a34a'}">\${r.valor} \${r.unidade || ''}</span>
            </div>\`).join('')}
            \${resultados.length > 5 ? \`<div style="font-size:11px;color:#6b7280;text-align:center;margin-top:2px">+\${resultados.length - 5} resultado(s)</div>\` : ''}
          </div>\` : ''}
          \${ex.pdf_url ? \`<a href="\${ex.pdf_url}" target="_blank" style="display:inline-block;margin-top:8px;font-size:12px;color:#1a6eb5;font-weight:600">📄 Ver PDF</a>\` : ''}
        </div>\`;
      });
      html += '</div>';
    }

    // Alergias em destaque`
);

fs.writeFileSync(path, c);
console.log('✅ Exames visíveis no portal médico!');
