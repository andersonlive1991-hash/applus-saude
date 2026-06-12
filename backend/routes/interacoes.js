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


// Verificar interações entre TODOS os medicamentos ativos do membro
router.post('/verificar-todos', async (req, res) => {
  const { membro_id } = req.body;
  try {
    const result = await db.query(
      'SELECT nome FROM medicamentos WHERE membro_id = $1 ORDER BY nome',
      [membro_id]
    );
    if (result.rows.length < 2) return res.json({ alerta: null, total: result.rows.length });

    const lista = result.rows.map(m => m.nome).join(', ');
    const prompt = 'Você é um farmacêutico especialista. Um paciente usa simultaneamente os seguintes medicamentos: ' + lista + '. Verifique se há interações medicamentosas relevantes entre eles. Responda em português brasileiro, de forma clara para leigos. Se houver interações graves ou moderadas, liste-as brevemente (máximo 4 linhas). Se não houver interações relevantes, responda apenas: SEM_INTERACAO. Não use markdown.';

    const resposta = await chamarGemini(prompt) || '';
    if (resposta && !resposta.includes('SEM_INTERACAO')) {
      return res.json({ alerta: resposta.trim(), total: result.rows.length });
    }
    res.json({ alerta: null, total: result.rows.length });
  } catch (e) {
    console.log('[InteracaoTodos] Erro:', e.message);
    res.json({ alerta: null });
  }
});

module.exports = router;
