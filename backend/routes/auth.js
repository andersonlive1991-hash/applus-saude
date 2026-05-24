const express = require('express');
const router = express.Router();
const db = require('../db');

db.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS google_id TEXT').catch(()=>{});
db.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS google_email TEXT').catch(()=>{});
db.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS google_foto TEXT').catch(()=>{});

router.post('/google', async (req, res) => {
  const { userInfo } = req.body;
  if (!userInfo || !userInfo.sub) return res.status(400).json({ erro: 'Dados inválidos' });
  try {
    const { sub: google_id, name, email, picture } = userInfo;
    let membro = await db.query('SELECT * FROM membros WHERE google_id=$1 LIMIT 1', [google_id]);
    if (!membro.rows.length) {
      const codigo = (name||'USER').substring(0,4).toUpperCase() + Math.floor(1000+Math.random()*9000);
      const familia = await db.query(
        'INSERT INTO familias (nome, codigo) VALUES ($1,$2) RETURNING *',
        [(name||'Usuário') + ' Família', codigo]
      );
      const familia_id = familia.rows[0].id;
      const id_pessoal = 'G' + Math.random().toString(36).substring(2,10).toUpperCase();
      membro = await db.query(
        'INSERT INTO membros (familia_id, nome, tipo, google_id, google_email, google_foto, id_pessoal) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [familia_id, name||'Usuário', 'adulto', google_id, email, picture, id_pessoal]
      );
    }
    const m = membro.rows[0];
    db.query('SELECT codigo FROM familias WHERE id=$1', [m.familia_id]).then(f => {
      const codigo = f.rows[0] ? f.rows[0].codigo : '';
      res.json({ ok: true, membroId: m.id, membroNome: m.nome, membroTipo: m.tipo, familiaId: m.familia_id, idPessoal: m.id_pessoal, foto: m.google_foto, codigoFamilia: codigo });
    }).catch(() => res.json({ ok: true, membroId: m.id, membroNome: m.nome, membroTipo: m.tipo, familiaId: m.familia_id, idPessoal: m.id_pessoal, foto: m.google_foto }));
  } catch(e) {
    console.error('Google auth erro:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
