const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

router.post('/', async (req, res) => {
  try {
    const { texto } = req.body;
    const qrcode = await QRCode.toDataURL(texto, {
      width: 250,
      margin: 2,
      color: { dark: '#1a9e6e', light: '#ffffff' }
    });
    res.json({ qrcode });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
