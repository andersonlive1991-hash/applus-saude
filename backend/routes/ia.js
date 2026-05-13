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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

module.exports = router;
