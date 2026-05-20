const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/perguntar', async (req, res) => {
  const { pergunta, membro_id, familia_id } = req.body;

  try {
    // Buscar contexto do paciente
    let contexto = '';
    if (membro_id) {
      const meds = await db.query(
        'SELECT nome, dosagem, horarios FROM medicamentos WHERE familia_id = $1',
        [familia_id]
      );
      if (meds.rows.length) {
        contexto = 'Medicamentos em uso: ' + meds.rows.map(m =>
          `${m.nome} ${m.dosagem}`).join(', ') + '. ';
      }
    }

    const prompt = `Você é um assistente de saúde familiar do app AP+ Saúde. 
Responda em português brasileiro, de forma clara e acolhedora.
Sempre termine lembrando que não substitui consulta médica.
${contexto}
Pergunta: ${pergunta}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const resposta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não consegui responder agora.';
    res.json({ resposta });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});


router.post('/resumo-dia', async (req, res) => {
  const { membro_id, familia_id } = req.body;
  try {
    const hoje = new Date().toISOString().split('T')[0];

    const [meds, sinais, humor, hidratacao, sono, perfil] = await Promise.all([
      db.query('SELECT nome, dosagem FROM medicamentos WHERE familia_id=$1 AND membro_id=$2', [familia_id, membro_id]),
      db.query('SELECT tipo, valor, valor2, unidade FROM sinais_vitais WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 5', [membro_id]),
      db.query('SELECT humor FROM cuidados_humor WHERE membro_id=$1 ORDER BY criado_em DESC LIMIT 7', [membro_id]),
      db.query('SELECT copos FROM cuidados_hidratacao WHERE membro_id=$1 AND data=CURRENT_DATE ORDER BY id DESC LIMIT 1', [membro_id]),
      db.query('SELECT inicio, fim FROM cuidados_sono WHERE membro_id=$1 AND DATE(criado_em)=CURRENT_DATE ORDER BY criado_em DESC LIMIT 1', [membro_id]),
      db.query('SELECT nome_completo, meta_agua, meta_sono FROM perfil_idoso WHERE membro_id=$1 LIMIT 1', [membro_id])
    ]);

    const nome = perfil.rows[0] ? perfil.rows[0].nome_completo : 'usuario';
    const metaAgua = perfil.rows[0] ? (perfil.rows[0].meta_agua || 8) : 8;
    const metaSono = perfil.rows[0] ? (perfil.rows[0].meta_sono || 8) : 8;
    const copos = hidratacao.rows[0] ? (hidratacao.rows[0].copos || 0) : 0;

    let horasSono = null;
    if (sono.rows[0] && sono.rows[0].inicio && sono.rows[0].fim) {
      const d = sono.rows[0].inicio.split(':').map(Number);
      const a = sono.rows[0].fim.split(':').map(Number);
      let h = (a[0] - d[0]) + (a[1] - d[1]) / 60;
      if (h < 0) h += 24;
      horasSono = Math.round(h * 10) / 10;
    }

    const emojisHumor = { 1: 'pessimo', 2: 'mal', 3: 'regular', 4: 'bem', 5: 'otimo' };
    const humorTexto = humor.rows.length ? humor.rows.map(function(h) { return emojisHumor[h.humor] || h.humor; }).join(', ') : 'nao registrado';
    const sinaisTexto = sinais.rows.length ? sinais.rows.map(function(s) { return s.tipo + ': ' + s.valor + (s.valor2 ? '/' + s.valor2 : '') + ' ' + (s.unidade || ''); }).join('; ') : 'nenhum registro';
    const medsTexto = meds.rows.length ? meds.rows.map(function(m) { return m.nome + ' ' + (m.dosagem || ''); }).join(', ') : 'nenhum';

    const sonoInfo = horasSono ? (horasSono + 'h dormidas (meta: ' + metaSono + 'h)') : 'nao registrado hoje';

    const idioma = req.body.idioma || 'pt';
    const idiomaTexto = {pt:'portugues brasileiro',en:'English',es:'español',fr:'français',de:'Deutsch'}[idioma] || 'portugues brasileiro';
    const prompt = 'Voce e um assistente de saude do app AP+ Saude. Analise os dados de ' + nome + ' e faca um resumo em ' + idiomaTexto + '. DADOS: Agua: ' + copos + ' copos (meta: ' + metaAgua + '). Sono: ' + sonoInfo + '. Humor recente: ' + humorTexto + '. Sinais vitais: ' + sinaisTexto + '. Medicamentos: ' + medsTexto + '. Responda em 3 blocos curtos: 1. O que esta bem 2. O que precisa de atencao 3. Uma dica pratica e 1 doenca que pode ser evitada. Seja direto e acolhedor. Nao substitui consulta medica.';

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const data = await response.json();
    console.log('Gemini resumo resposta:', JSON.stringify(data).substring(0, 300));
    const resumo = data.candidates && data.candidates[0] ? data.candidates[0].content.parts[0].text : 'Nao consegui gerar analise agora.';
    res.json({ resumo: resumo, dados: { copos: copos, metaAgua: metaAgua, horasSono: horasSono, metaSono: metaSono } });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});


router.get('/resumo-salvo/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM resumo_diario WHERE membro_id = $1 AND data = CURRENT_DATE ORDER BY criado_em DESC LIMIT 1',
      [req.params.membro_id]
    );
    if (!result.rows.length) return res.json({ resumo: null });
    res.json({ resumo: result.rows[0].resumo, dados: result.rows[0].dados });
  } catch (e) {
    res.json({ resumo: null });
  }
});

router.post('/resumo-forcar', async (req, res) => {
  try {
    const { membro_id, idioma } = req.body;
    // Verificar se já gerou hoje
    const jaGerou = await db.query(
      'SELECT id FROM resumo_diario WHERE membro_id = $1 AND data = CURRENT_DATE',
      [membro_id]
    );
    if (jaGerou.rows.length) return res.json({ resumo: null, msg: 'Resumo já gerado hoje. Disponível às 20h.' });
    res.json({ resumo: null, msg: 'Use o resumo das 20h.' });
  } catch (e) {
    res.json({ resumo: null });
  }
});

module.exports = router;
