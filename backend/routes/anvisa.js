const express = require('express');
const router = express.Router();

const COSMOS_TOKEN = '-2WOoIHz4Sxd1Bq87AQU4w';

router.get('/buscar/:codigo', async (req, res) => {
  const codigo = req.params.codigo;

  // EAN (13 dígitos começando com 789) → Bluesoft Cosmos
  if (/^\d{13}$/.test(codigo) && codigo.startsWith('78')) {
    try {
      const r = await fetch('https://api.cosmos.bluesoft.com.br/gtins/' + codigo, {
        headers: {
          'X-Cosmos-Token': COSMOS_TOKEN,
          'User-Agent': 'Cosmos-API-Request',
          'Content-Type': 'application/json'
        }
      });
      if (r.ok) {
        const data = await r.json();
        return res.json({
          encontrado: true,
          fonte: 'cosmos',
          nome: data.description || data.brand?.name || '',
          dosagem: data.net_weight ? data.net_weight + ' ' + (data.measurement_unit || '') : '',
          raw: data
        });
      }
    } catch(e) {
      console.log('Erro Cosmos:', e.message);
    }
  }

  // Código ANVISA → API ANVISA
  try {
    const r = await fetch(`https://consultas.anvisa.gov.br/api/consulta/medicamentos/produtos/?count=5&filter%5BnumeroRegistro%5D=${codigo}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });
    const data = await r.json();
    if (data && data.content && data.content.length > 0) {
      const med = data.content[0];
      return res.json({
        encontrado: true,
        fonte: 'anvisa',
        nome: med.nomeProduto || '',
        dosagem: med.apresentacao || '',
        raw: med
      });
    }
  } catch(e) {
    console.log('Erro ANVISA:', e.message);
  }

  res.json({ encontrado: false });
});

module.exports = router;
