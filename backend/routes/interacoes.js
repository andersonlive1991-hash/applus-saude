const { chamarGemini } = require('../gemini');
const express = require('express');
const router = express.Router();
const db = require('../db');

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4
].filter(Boolean);

router.post('/verificar', async (req, res) => {
  const { membro_id, nome_novo } = req.body;
  try {
    const outrosMeds = await db.query(
      'SELECT nome FROM medicamentos WHERE membro_id = $1 AND LOWER(nome) != LOWER($2)',
      [membro_id, nome_novo]
    );
    if (outrosMeds.rows.length === 0) return res.json({ alerta: null });

    const outros = outrosMeds.rows.map(m => m.nome).join(', ');
    const prompt = 'Você é um farmacêutico especialista. Um paciente que já usa: ' + outros + '. Vai começar a usar: ' + nome_novo + '. Verifique se há interações medicamentosas relevantes. Responda em português brasileiro, de forma clara para leigos. Se houver interação grave ou moderada, explique o risco em 2-3 frases. Se não houver interação relevante, responda apenas: SEM_INTERACAO. Não use markdown.';

    const resposta = await chamarGemini(prompt) || '';
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
