const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');

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
    doc.fontSize(9).fillColor('#999').text('AP+ Saude | applus-saude.onrender.com | Documento gerado automaticamente', { align: 'center' });

    doc.end();
  } catch (e) {
    console.log('[PDF] Erro:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
