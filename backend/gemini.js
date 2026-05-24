const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5
].filter(Boolean);

async function chamarGemini(prompt) {
  for (const key of GEMINI_KEYS) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await res.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (texto) return texto;
    } catch(e) {
      console.log('[Gemini] Chave falhou, tentando proxima:', e.message);
      continue;
    }
  }
  throw new Error('Todas as chaves Gemini falharam');
}

module.exports = { chamarGemini };
