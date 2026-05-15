const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/verificar', async (req, res) => {
  const { membro_id, nome_novo } = req.body;
  try {
    const outrosMeds = await db.query(
      'SELECT nome FROM medicamentos WHERE membro_id = $1',
      [membro_id]
    );
    if (outrosMeds.rows.length === 0) return res.json({ alerta: null });

    const outros = outrosMeds.rows.map(m => m.nome).join(', ');
    const prompt = 'Você é um farmacêutico especialista. Um paciente que já usa: ' + outros + '. Vai começar a usar: ' + nome_novo + '. Verifique se há interações medicamentosas relevantes. Responda em português brasileiro, de forma clara para leigos. Se houver interação grave ou moderada, explique o risco em 2-3 frases. Se não houver interação relevante, responda apenas: SEM_INTERACAO. Não use markdown.';

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    const geminiData = await geminiRes.json();
    const resposta = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (resposta && !resposta.includes('SEM_INTERACAO')) {
      return res.json({ alerta: resposta.trim() });
    }
    res.json({ alerta: null });
  } catch (e) {
    console.log('[Interacao] Erro:', e.message);
    res.json({ alerta: null });
  }
});

module.exports = router;
