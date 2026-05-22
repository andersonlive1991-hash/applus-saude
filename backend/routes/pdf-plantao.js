const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

router.get('/:membro_id', async (req, res) => {
  const { membro_id } = req.params;
  const data = req.query.data || new Date().toISOString().split('T')[0];

  try {
    const membro = await pool.query(
      `SELECT m.nome, m.tipo, f.nome AS familia_nome
       FROM membros m JOIN familias f ON f.id = m.familia_id
       WHERE m.id = $1`, [membro_id]
    );
    if (!membro.rows.length) return res.status(404).json({ erro: 'Membro não encontrado' });
    const { nome, familia_nome } = membro.rows[0];

    const [atividades, humor, refeicoes, hidratacao, sono] = await Promise.all([
      pool.query(`SELECT atividade, hora FROM cuidados_atividades WHERE membro_id=$1 AND DATE(hora)=$2 ORDER BY hora`, [membro_id, data]),
      pool.query(`SELECT humor, descricao, criado_em FROM cuidados_humor WHERE membro_id=$1 AND DATE(criado_em)=$2 ORDER BY criado_em`, [membro_id, data]),
      pool.query(`SELECT refeicao, quantidade, criado_em FROM cuidados_refeicoes WHERE membro_id=$1 AND DATE(criado_em)=$2 ORDER BY criado_em`, [membro_id, data]),
      pool.query(`SELECT copos, criado_em FROM cuidados_hidratacao WHERE membro_id=$1 AND DATE(criado_em)=$2 ORDER BY criado_em`, [membro_id, data]),
      pool.query(`SELECT dormiu, acordou, qualidade FROM cuidados_sono WHERE membro_id=$1 AND DATE(criado_em)=$2`, [membro_id, data]),
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="plantao-${data}.pdf"`);
    doc.pipe(res);

    // Cabeçalho
    doc.fontSize(20).font('Helvetica-Bold').text('AP+ Saúde', { align: 'center' });
    doc.fontSize(13).font('Helvetica').text('Relatório de Plantão do Cuidador', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Família: ${familia_nome}`, { align: 'center' });
    doc.text(`Cuidador: ${nome}`, { align: 'center' });
    doc.text(`Data: ${data.split('-').reverse().join('/')}`, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    const secao = (titulo) => {
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a').text(titulo);
      doc.moveDown(0.4);
    };
    const linha = (texto) => {
      doc.fontSize(11).font('Helvetica').fillColor('#333').text(`• ${texto}`);
    };
    const vazio = () => {
      doc.fontSize(11).font('Helvetica').fillColor('#999').text('Nenhum registro.');
    };

    // Sono
    secao('Sono');
    if (sono.rows.length) {
      const s = sono.rows[0];
      linha(`Dormiu: ${s.dormiu || '—'}  |  Acordou: ${s.acordou || '—'}  |  Qualidade: ${s.qualidade || '—'}`);
    } else vazio();
    doc.moveDown(0.8);

    // Humor
    secao('Humor');
    if (humor.rows.length) humor.rows.forEach(h => linha(`${h.humor}${h.descricao ? ' — ' + h.descricao : ''}`));
    else vazio();
    doc.moveDown(0.8);

    // Refeições
    secao('Refeições');
    if (refeicoes.rows.length) refeicoes.rows.forEach(r => linha(`${r.refeicao}${r.quantidade ? ' (' + r.quantidade + ')' : ''}`));
    else vazio();
    doc.moveDown(0.8);

    // Hidratação
    secao('Hidratação');
    const totalCopos = hidratacao.rows.reduce((s, h) => s + (parseInt(h.copos) || 0), 0);
    if (totalCopos > 0) linha(`Total de copos registrados: ${totalCopos}`);
    else vazio();
    doc.moveDown(0.8);

    // Atividades
    secao('Atividades Realizadas');
    if (atividades.rows.length) {
      atividades.rows.forEach(a => {
        const hora = a.hora ? new Date(a.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
        linha(`${hora ? hora + ' — ' : ''}${a.atividade}`);
      });
    } else vazio();
    doc.moveDown(1.5);

    // Rodapé
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#999').text('Gerado por AP+ Saúde · applus-saude.onrender.com', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Erro PDF plantão:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF' });
  }
});

module.exports = router;
