const express = require('express');
const router = express.Router();

router.get('/buscar/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const r = await fetch(`https://consultas.anvisa.gov.br/api/consulta/medicamentos/produtos/?count=5&filter%5BnumeroRegistro%5D=${codigo}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    res.json(data);
  } catch(e) {
    // Tentar segunda API
    try {
      const r2 = await fetch(`https://consultas.anvisa.gov.br/api/consulta/medicamentos/produtos/?count=5&filter%5BcodBarras%5D=${req.params.codigo}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
      });
      const data2 = await r2.json();
      res.json(data2);
    } catch(e2) {
      res.status(500).json({ erro: e.message });
    }
  }
});

module.exports = router;
