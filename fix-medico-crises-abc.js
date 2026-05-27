const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

const oldCrises = `      // Crises TEA
      html += '<div class="paciente-card"><div class="card-titulo">⚡ Crises TEA</div>';
      if (crises && crises.length) {
        html += crises.slice(0,10).map(cr => '<div class="info-row"><div><div style="font-size:13px;font-weight:600">' + (cr.descricao || 'Crise registrada') + '</div><div style="font-size:11px;color:#6b7280">' + new Date(cr.criado_em).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'}) + '</div></div></div>').join('');
      } else { html += '<div class="vazio">Nenhuma crise registrada</div>'; }
      html += '</div>';`;

const newCrises = `      // Crises TEA com modelo ABC
      const crisesBehavior = comportamentos ? comportamentos.filter(b => b.tipo === 'crise') : [];
      html += '<div class="paciente-card"><div class="card-titulo">⚡ Crises TEA — Modelo ABC</div>';
      if (crisesBehavior.length) {
        html += crisesBehavior.slice(0,5).map(cr => {
          const data = new Date(cr.data).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
          const intBars = cr.intensidade ? '🔴'.repeat(cr.intensidade) + '⚫'.repeat(5 - cr.intensidade) : '—';
          return '<div style="border:1px solid #fecaca;border-radius:10px;padding:12px;margin-bottom:8px">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="font-size:13px;font-weight:700;color:#dc2626">' + (cr.descricao || 'Crise') + '</div>' +
            '<div style="font-size:11px;color:#6b7280">' + data + '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;margin-bottom:8px">' +
            '<span style="background:#fef9c3;color:#92400e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">⏱ ' + (cr.duracao || 'Duração não informada') + '</span>' +
            '<span style="background:#fef2f2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px">Intensidade: ' + (cr.intensidade || '—') + '/5</span>' +
            '</div>' +
            (cr.abc_antecedente ? '<div style="font-size:11px;margin-bottom:4px"><span style="font-weight:700;color:#92400e">🅐 Antecedente:</span> ' + cr.abc_antecedente + '</div>' : '') +
            (cr.abc_consequencia ? '<div style="font-size:11px"><span style="font-weight:700;color:#15803d">🅒 O que ajudou:</span> ' + cr.abc_consequencia + '</div>' : '') +
            '</div>';
        }).join('');
      } else { html += '<div class="vazio">Nenhuma crise registrada com modelo ABC</div>'; }
      html += '</div>';`;

if (c.includes(oldCrises)) {
  c = c.replace(oldCrises, newCrises);
  fs.writeFileSync(path, c);
  console.log('✅ Card Crises TEA com modelo ABC!');
} else {
  console.log('❌ Trecho não encontrado');
}
