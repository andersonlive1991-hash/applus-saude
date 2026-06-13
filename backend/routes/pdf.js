const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');
const { decrypt } = require('../crypto');

router.get('/medicamentos/:membro_id', async (req, res) => {
  try {
    const { membro_id } = req.params;

    // Buscar dados do membro
    const memRes = await db.query('SELECT * FROM membros WHERE id = $1', [membro_id]);
    if (!memRes.rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const membro = memRes.rows[0];

    // Buscar medicamentos
    const medsRes = await db.query('SELECT * FROM medicamentos WHERE membro_id = $1 ORDER BY nome', [membro_id]);
    const meds = medsRes.rows;

    // Buscar histórico de aderência dos últimos 30 dias
    const histRes = await db.query(
      'SELECT h.*, m.nome as med_nome FROM historico_meds h JOIN medicamentos m ON m.id = h.med_id WHERE m.membro_id = $1 AND h.criado_em >= NOW() - INTERVAL \'30 days\' ORDER BY h.criado_em DESC',
      [membro_id]
    );
    const hist = histRes.rows;

    // Gerar PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-medicamentos.pdf');
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(22).font('Helvetica-Bold').text('AP+ Saude', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Relatorio de Aderencia de Medicamentos', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text('Gerado em: ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), { align: 'center' });
    doc.moveDown(1);

    // Dados do paciente
    doc.fontSize(14).font('Helvetica-Bold').text('Paciente');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica').text('Nome: ' + membro.nome);
    doc.text('ID: ' + (membro.id_pessoal || membro_id));
    doc.moveDown(1);

    // Medicamentos em uso
    doc.fontSize(14).font('Helvetica-Bold').text('Medicamentos em Uso');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    if (!meds.length) {
      doc.fontSize(11).font('Helvetica').text('Nenhum medicamento cadastrado.');
    } else {
      meds.forEach(med => {
        const horarios = typeof med.horarios === 'string' ? JSON.parse(med.horarios) : med.horarios;
        const tomadas = hist.filter(h => h.med_id === med.id && h.status === 'tomado').length;
        const perdidas = hist.filter(h => h.med_id === med.id && h.status === 'perdido').length;
        const total = tomadas + perdidas;
        const aderencia = total > 0 ? Math.round((tomadas / total) * 100) : null;

        doc.fontSize(12).font('Helvetica-Bold').text(med.nome + (med.dosagem ? ' — ' + med.dosagem : ''));
        doc.fontSize(10).font('Helvetica').text('Via: ' + (med.via || 'Oral') + ' | Horarios: ' + (Array.isArray(horarios) ? horarios.join(', ') : horarios || '-'));
        if (aderencia !== null) {
          doc.text('Aderencia (30 dias): ' + aderencia + '% (' + tomadas + ' tomadas / ' + perdidas + ' perdidas)');
        } else {
          doc.text('Aderencia: Sem registros nos ultimos 30 dias');
        }
        doc.moveDown(0.5);
      });
    }

    doc.moveDown(1);

    // Histórico recente
    doc.fontSize(14).font('Helvetica-Bold').text('Historico Recente (30 dias)');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    if (!hist.length) {
      doc.fontSize(11).font('Helvetica').text('Nenhum registro de aderencia.');
    } else {
      hist.slice(0, 20).forEach(h => {
        const data = new Date(h.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const status = h.status === 'tomado' ? 'Tomado' : 'Perdido';
        doc.fontSize(10).font('Helvetica').text(data + ' — ' + h.med_nome + ' — ' + status);
      });
    }

    // Rodapé
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#999').text('AP+ Saude | applus-saude-production.up.railway.app | Documento gerado automaticamente', { align: 'center' });

    doc.end();
  } catch (e) {
    console.log('[PDF] Erro:', e.message);
    res.status(500).json({ erro: e.message });
  }
});


// ── RELATÓRIO MENSAL DE SAÚDE ──
router.get('/mensal/id/:id_pessoal', async (req, res) => {
  try {
    const { id_pessoal } = req.params;
    const { chamarGemini } = require('../gemini');

    // Buscar membro pelo id_pessoal (permanente)
    const memRes = await db.query('SELECT * FROM membros WHERE id_pessoal = $1', [id_pessoal]);
    if (!memRes.rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const membro = memRes.rows[0];
    const membro_id = membro.id;

    const perfilRes = await db.query('SELECT * FROM perfil_idoso WHERE membro_id = $1', [membro_id]);
    const perfil = perfilRes.rows[0] || {};
    if (perfil.tipo_sanguineo) perfil.tipo_sanguineo = decrypt(perfil.tipo_sanguineo);
    if (perfil.alergias) perfil.alergias = decrypt(perfil.alergias);
    if (perfil.cpf) perfil.cpf = decrypt(perfil.cpf);

    // Período: últimos 30 dias
    const intervalo = "criado_em >= NOW() - INTERVAL '30 days'";
    const intervaloData = "data >= CURRENT_DATE - INTERVAL '30 days'";

    // Sinais vitais
    const sinaisRes = await db.query(
      `SELECT tipo, valor, valor2, criado_em FROM sinais_vitais WHERE membro_id=$1 AND ${intervalo} ORDER BY tipo, criado_em ASC`,
      [membro_id]
    );

    // Medicamentos e aderência
    const medsRes = await db.query('SELECT * FROM medicamentos WHERE membro_id=$1 ORDER BY nome', [membro_id]);
    const histRes = await db.query(
      `SELECT h.status, h.criado_em, m.nome as med_nome FROM historico_meds h JOIN medicamentos m ON m.id = h.med_id WHERE m.membro_id=$1 AND h.criado_em >= NOW() - INTERVAL '30 days'`,
      [membro_id]
    );

    // Hábitos
    const aguaRes = await db.query(`SELECT SUM(copos) as total, COUNT(*) as dias FROM cuidados_hidratacao WHERE membro_id=$1 AND ${intervaloData}`, [membro_id]);
    const sonoRes = await db.query(`SELECT AVG(EXTRACT(EPOCH FROM (fim::time - inicio::time))/3600) as media_h FROM cuidados_sono WHERE membro_id=$1 AND ${intervalo} AND inicio IS NOT NULL AND fim IS NOT NULL`, [membro_id]);
    const humorRes = await db.query(`SELECT humor, COUNT(*) as total FROM cuidados_humor WHERE membro_id=$1 AND ${intervalo} GROUP BY humor ORDER BY total DESC`, [membro_id]);
    const atividadesRes = await db.query(`SELECT COUNT(*) as total FROM cuidados_atividades WHERE membro_id=$1 AND ${intervalo}`, [membro_id]);
    const refeicoesRes = await db.query(`SELECT COUNT(*) as total FROM cuidados_refeicoes WHERE membro_id=$1 AND ${intervalo}`, [membro_id]);

    // Calcular aderência por medicamento
    const meds = medsRes.rows.map(med => {
      const hist = histRes.rows.filter(h => h.med_nome === med.nome);
      const tomados = hist.filter(h => h.status === 'tomado').length;
      const perdidos = hist.filter(h => h.status === 'perdido').length;
      const total = tomados + perdidos;
      return {
        nome: med.nome,
        dosagem: med.dosagem || '',
        aderencia: total > 0 ? Math.round((tomados/total)*100) : null,
        tomados, perdidos, total
      };
    });

    // Agrupar sinais vitais por tipo
    const sinaisPorTipo = {};
    sinaisRes.rows.forEach(s => {
      if (!sinaisPorTipo[s.tipo]) sinaisPorTipo[s.tipo] = [];
      sinaisPorTipo[s.tipo].push(s);
    });

    // Montar resumo para Gemini
    const resumoTexto = [
      `Paciente: ${membro.nome}`,
      `Periodo: ultimos 30 dias`,
      `Sinais vitais registrados: ${sinaisRes.rows.length}`,
      Object.entries(sinaisPorTipo).map(([tipo, vals]) => {
        const ultimo = vals[vals.length-1];
        return `${tipo}: ultimo valor ${ultimo.valor}${ultimo.valor2 ? '/'+ultimo.valor2 : ''}`;
      }).join(', '),
      `Medicamentos: ${meds.map(m => `${m.nome} (aderencia: ${m.aderencia !== null ? m.aderencia+'%' : 'sem dados'})`).join(', ')}`,
      `Agua: media ${aguaRes.rows[0].total ? Math.round(aguaRes.rows[0].total / (aguaRes.rows[0].dias||1)) : 0} copos/dia`,
      `Sono: media ${sonoRes.rows[0].media_h ? parseFloat(sonoRes.rows[0].media_h).toFixed(1) : '?'} horas/noite`,
      `Exercicios: ${atividadesRes.rows[0].total} sessoes`,
      `Refeicoes: ${refeicoesRes.rows[0].total} registradas`,
      `Humor predominante: ${humorRes.rows[0] ? humorRes.rows[0].humor : 'sem dados'}`,
    ].join('\n');

    let resumoIA = '';
    try {
      resumoIA = await chamarGemini(
        `Voce e um assistente medico. Com base nos dados de saude do paciente abaixo, escreva um resumo clinico objetivo e claro em portugues brasileiro, para ser apresentado a um medico. Maximo 8 linhas. Sem markdown, sem asteriscos, sem listas com tracos. Use texto corrido.\n\n${resumoTexto}`
      );
    } catch(e) { resumoIA = 'Resumo por IA indisponivel no momento.'; }

    // Gerar PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio-saude-mensal.pdf');
    doc.pipe(res);

    const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    // Cabeçalho
    doc.fontSize(20).font('Helvetica-Bold').text('AP+ Saude', { align: 'center' });
    doc.fontSize(13).font('Helvetica').text('Relatorio Mensal de Saude — ' + mesAno, { align: 'center' });
    doc.fontSize(9).text('Gerado em: ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1a9e6e').lineWidth(2).stroke();
    doc.moveDown(0.8);

    // Dados do paciente
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a4e9e').text('Paciente');
    doc.fillColor('#000').fontSize(10).font('Helvetica');
    doc.text('Nome: ' + membro.nome);
    doc.text('ID: ' + (membro.id_pessoal || membro_id));
    if (perfil.tipo_sanguineo) doc.text('Tipo sanguineo: ' + perfil.tipo_sanguineo);
    if (perfil.alergias) doc.text('Alergias: ' + perfil.alergias);
    if (perfil.convenio) doc.text('Convenio: ' + perfil.convenio);
    doc.moveDown(0.8);

    // Resumo IA
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a4e9e').text('Resumo Clinico (gerado por IA)');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(0.3);
    doc.fillColor('#333').fontSize(10).font('Helvetica').text(resumoIA, { lineGap: 3 });
    doc.fontSize(8).fillColor('#999').text('* Conteudo gerado por IA. Nao substitui avaliacao medica profissional.');
    doc.fillColor('#000');
    doc.moveDown(0.8);

    // Sinais vitais
    if (Object.keys(sinaisPorTipo).length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a4e9e').text('Sinais Vitais (ultimos 30 dias)');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.3);
      Object.entries(sinaisPorTipo).forEach(([tipo, vals]) => {
        const ultimo = vals[vals.length-1];
        const valStr = ultimo.valor2 ? `${ultimo.valor}/${ultimo.valor2}` : String(ultimo.valor);
        const dt = new Date(ultimo.criado_em).toLocaleDateString('pt-BR');
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)}: `, { continued: true });
        doc.font('Helvetica').text(`${valStr} (ultimo em ${dt}) — ${vals.length} registro(s) no mes`);
      });
      doc.moveDown(0.8);
    }

    // Aderência medicamentos
    if (meds.length > 0) {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a4e9e').text('Aderencia a Medicamentos');
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.moveDown(0.3);
      meds.forEach(med => {
        doc.fillColor('#000').fontSize(10).font('Helvetica-Bold').text(`${med.nome}${med.dosagem ? ' — ' + med.dosagem : ''}`, { continued: true });
        const pct = med.aderencia !== null ? ` ${med.aderencia}% (${med.tomados} tomadas, ${med.perdidos} perdidas)` : ' Sem registros';
        doc.font('Helvetica').fillColor(med.aderencia >= 80 ? '#1a9e6e' : med.aderencia >= 50 ? '#f59e0b' : '#ef4444').text(pct);
        doc.fillColor('#000');
      });
      doc.moveDown(0.8);
    }

    // Hábitos
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a4e9e').text('Habitos de Saude (ultimos 30 dias)');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(0.3);
    doc.fillColor('#000').fontSize(10).font('Helvetica');
    const mediaAgua = aguaRes.rows[0].total ? Math.round(aguaRes.rows[0].total / (aguaRes.rows[0].dias||1)) : 0;
    const mediaSono = sonoRes.rows[0].media_h ? parseFloat(sonoRes.rows[0].media_h).toFixed(1) : '?';
    doc.text(`Hidratacao: media de ${mediaAgua} copos/dia`);
    doc.text(`Sono: media de ${mediaSono} horas/noite`);
    doc.text(`Exercicios: ${atividadesRes.rows[0].total} sessoes registradas`);
    doc.text(`Refeicoes: ${refeicoesRes.rows[0].total} refeicoes registradas`);
    if (humorRes.rows.length > 0) {
      doc.text(`Humor: ${humorRes.rows.map(h => `${h.humor} (${h.total}x)`).join(', ')}`);
    }
    doc.moveDown(1.5);

    // Rodapé
    doc.fontSize(8).fillColor('#999').text('AP+ Saude — Relatorio gerado automaticamente | Periodo: ultimos 30 dias', { align: 'center' });

    doc.end();
  } catch(e) {
    console.log('[PDF Mensal] Erro:', e.stack || e.message);
    if (!res.headersSent) res.status(500).json({ erro: e.message, detalhe: e.stack });
  }
});


module.exports = router;
