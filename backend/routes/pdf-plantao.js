const express = require('express');
const router = express.Router();
const db = require('../db');
const PDFDocument = require('pdfkit');

router.get('/:membro_id', async (req, res) => {
  const { membro_id } = req.params;
  const data = req.query.data || new Date().toISOString().split('T')[0];

  try {
    const memRes = await db.query(
      `SELECT m.nome, f.nome AS familia_nome
       FROM membros m JOIN familias f ON f.id = m.familia_id
       WHERE m.id = $1`, [membro_id]
    );
    if (!memRes.rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const { nome, familia_nome } = memRes.rows[0];

    const [atividades, humor, refeicoes, hidratacao, sono] = await Promise.all([
      db.query(`SELECT atividade, hora FROM cuidados_atividades WHERE membro_id=$1 AND DATE(hora)=$2 ORDER BY hora`, [membro_id, data]),
      db.query(`SELECT humor, descricao FROM cuidados_humor WHERE membro_id=$1 AND DATE(criado_em)=$2 ORDER BY criado_em`, [membro_id, data]),
      db.query(`SELECT refeicao, quantidade FROM cuidados_refeicoes WHERE membro_id=$1 AND DATE(criado_em)=$2 ORDER BY criado_em`, [membro_id, data]),
      db.query(`SELECT copos FROM cuidados_hidratacao WHERE membro_id=$1 AND DATE(criado_em)=$2`, [membro_id, data]),
      db.query(`SELECT dormiu, acordou, qualidade FROM cuidados_sono WHERE membro_id=$1 AND DATE(criado_em)=$2`, [membro_id, data]),
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="plantao-${data}.pdf"`);
    doc.pipe(res);

    doc.fontSize(22).font('Helvetica-Bold').text('AP+ Saude', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Relatorio de Plantao do Cuidador', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text('Gerado em: ' + new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text('Familia: ' + familia_nome + '  |  Cuidador: ' + nome + '  |  Data: ' + data.split('-').reverse().join('/'), { align: 'center' });
    doc.moveDown(1);

    const secao = (titulo) => {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text(titulo);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);
    };
    const linha = (texto) => {
      doc.fontSize(11).font('Helvetica').fillColor('#333').text('- ' + texto);
    };
    const vazio = () => {
      doc.fontSize(11).font('Helvetica').fillColor('#999').text('Nenhum registro.');
    };

    secao('Sono');
    if (sono.rows.length) {
      const s = sono.rows[0];
      linha('Dormiu: ' + (s.dormiu || '-') + '  |  Acordou: ' + (s.acordou || '-') + '  |  Qualidade: ' + (s.qualidade || '-'));
    } else vazio();
    doc.moveDown(0.8);

    secao('Humor');
    if (humor.rows.length) humor.rows.forEach(h => linha(h.humor + (h.descricao ? ' - ' + h.descricao : '')));
    else vazio();
    doc.moveDown(0.8);

    secao('Refeicoes');
    if (refeicoes.rows.length) refeicoes.rows.forEach(r => linha(r.refeicao + (r.quantidade ? ' (' + r.quantidade + ')' : '')));
    else vazio();
    doc.moveDown(0.8);

    secao('Hidratacao');
    const totalCopos = hidratacao.rows.reduce((s, h) => s + (parseInt(h.copos) || 0), 0);
    if (totalCopos > 0) linha('Total de copos registrados: ' + totalCopos);
    else vazio();
    doc.moveDown(0.8);

    secao('Atividades Realizadas');
    if (atividades.rows.length) {
      atividades.rows.forEach(a => {
        const hora = a.hora ? new Date(a.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        linha((hora ? hora + ' - ' : '') + a.atividade);
      });
    } else vazio();
    doc.moveDown(2);

    doc.fontSize(9).fillColor('#999').text('AP+ Saude | applus-saude.onrender.com | Documento gerado automaticamente', { align: 'center' });
    doc.end();

  } catch (e) {
    console.log('[PDF Plantao] Erro:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
