const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/dashboard/:membro_id?periodo=dia|semana|mes|ano
router.get('/:membro_id', async (req, res) => {
  const { membro_id } = req.params;
  const periodo = req.query.periodo || 'dia';

  // Definir intervalo de datas conforme período
  let intervalo;
  if (periodo === 'dia')    intervalo = "DATE(criado_em) = CURRENT_DATE";
  if (periodo === 'semana') intervalo = "criado_em >= NOW() - INTERVAL '7 days'";
  if (periodo === 'mes')    intervalo = "criado_em >= NOW() - INTERVAL '30 days'";
  if (periodo === 'ano')    intervalo = "criado_em >= NOW() - INTERVAL '365 days'";

  let intervaloData;
  if (periodo === 'dia')    intervaloData = "data = CURRENT_DATE";
  if (periodo === 'semana') intervaloData = "data >= CURRENT_DATE - INTERVAL '7 days'";
  if (periodo === 'mes')    intervaloData = "data >= CURRENT_DATE - INTERVAL '30 days'";
  if (periodo === 'ano')    intervaloData = "data >= CURRENT_DATE - INTERVAL '365 days'";

  try {
    // 1. Hidratação — copos por dia no período
    const hidratacao = await db.query(
      `SELECT data::text, SUM(copos) as copos
       FROM cuidados_hidratacao
       WHERE membro_id = $1 AND ${intervaloData}
       GROUP BY data ORDER BY data ASC`,
      [membro_id]
    );

    // 2. Sono — horas por dia no período
    const sono = await db.query(
      `SELECT DATE(criado_em)::text as data,
              AVG(CASE
                WHEN inicio IS NOT NULL AND fim IS NOT NULL
                THEN EXTRACT(EPOCH FROM (fim::time - inicio::time))/3600
                ELSE NULL
              END) as horas
       FROM cuidados_sono
       WHERE membro_id = $1 AND ${intervalo}
       GROUP BY DATE(criado_em) ORDER BY DATE(criado_em) ASC`,
      [membro_id]
    );

    // 3. Humor — registros por dia
    const humor = await db.query(
      `SELECT DATE(criado_em)::text as data, humor
       FROM cuidados_humor
       WHERE membro_id = $1 AND ${intervalo}
       ORDER BY criado_em ASC`,
      [membro_id]
    );

    // 4. Atividades físicas — count por dia
    const atividades = await db.query(
      `SELECT DATE(criado_em)::text as data, COUNT(*) as total
       FROM cuidados_atividades
       WHERE membro_id = $1 AND ${intervalo}
       GROUP BY DATE(criado_em) ORDER BY DATE(criado_em) ASC`,
      [membro_id]
    );

    // 5. Refeições — count por dia
    const refeicoes = await db.query(
      `SELECT DATE(criado_em)::text as data, COUNT(*) as total
       FROM cuidados_refeicoes
       WHERE membro_id = $1 AND ${intervalo}
       GROUP BY DATE(criado_em) ORDER BY DATE(criado_em) ASC`,
      [membro_id]
    );

    // 6. Sinais vitais — últimos registros por tipo
    const sinais = await db.query(
      `SELECT tipo, valor, valor2, criado_em::text
       FROM sinais_vitais
       WHERE membro_id = $1 AND ${intervalo}
       ORDER BY criado_em ASC`,
      [membro_id]
    );

    // 7. Medicamentos — aderência (tomado vs total esperado)
    const meds = await db.query(
      `SELECT DATE(criado_em)::text as data,
              COUNT(*) FILTER (WHERE status = 'tomado') as tomados,
              COUNT(*) as total
       FROM historico_meds
       WHERE membro_id = $1 AND ${intervalo}
       GROUP BY DATE(criado_em) ORDER BY DATE(criado_em) ASC`,
      [membro_id]
    );

    // 8. Próximos eventos (agenda) — sempre dos próximos 7 dias
    const eventos = await db.query(
      `SELECT titulo, data::text, hora::text, tipo
       FROM eventos
       WHERE membro_id = $1 AND data >= CURRENT_DATE AND data <= CURRENT_DATE + INTERVAL '7 days'
       ORDER BY data ASC, hora ASC LIMIT 5`,
      [membro_id]
    );

    // 9. Resumos IA do período — tabela pode não existir ainda
    let resumos = { rows: [] };
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS resumo_diario (
        id SERIAL PRIMARY KEY,
        membro_id INTEGER,
        data DATE DEFAULT CURRENT_DATE,
        resumo TEXT,
        dados JSONB,
        criado_em TIMESTAMP DEFAULT NOW()
      )`);
      resumos = await db.query(
        `SELECT data::text, resumo
         FROM resumo_diario
         WHERE membro_id = $1 AND ${intervaloData}
         ORDER BY data DESC LIMIT 7`,
        [membro_id]
      );
    } catch(e2) { console.log('[Dashboard] resumo_diario:', e2.message); }

    // 10. Ciclo menstrual — sintomas no período
    let cicloSintomas = { rows: [] };
    try {
      cicloSintomas = await db.query(
        `SELECT DATE(criado_em)::text as data, dor, humor as humor_ciclo, fluxo
         FROM ciclo_sintomas
         WHERE membro_id = $1 AND ${intervalo}
         ORDER BY criado_em ASC`,
        [membro_id]
      );
    } catch(e3) { console.log('[Dashboard] ciclo_sintomas:', e3.message); }

    res.json({
      periodo,
      hidratacao: hidratacao.rows,
      sono: sono.rows,
      humor: humor.rows,
      atividades: atividades.rows,
      refeicoes: refeicoes.rows,
      sinais: sinais.rows,
      meds: meds.rows,
      eventos: eventos.rows,
      resumos: resumos.rows,
      cicloSintomas: cicloSintomas.rows
    });

  } catch (e) {
    console.log('[Dashboard] Erro:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
