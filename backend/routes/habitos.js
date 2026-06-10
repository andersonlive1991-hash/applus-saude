const express = require('express');
const router = express.Router();
const db = require('../db');

// Registrar hábito confirmado via notificação
router.post('/registrar', async (req, res) => {
  const { membro_id, familia_id, categoria, cumprido } = req.body;
  if (!membro_id || !categoria) return res.status(400).json({ erro: 'membro_id e categoria obrigatorios' });
  if (!cumprido) return res.json({ ok: true, msg: 'Nao cumprido' });

  try {
    // Busca membro_id numérico pelo id_pessoal OU usa direto se for numérico
    let memId = membro_id;
    if (isNaN(membro_id)) {
      const mem = await db.query('SELECT id FROM membros WHERE id_pessoal=$1', [membro_id]);
      if (!mem.rows.length) return res.status(404).json({ erro: 'Membro nao encontrado' });
      memId = mem.rows[0].id;
    }

    const hora = new Date().toTimeString().slice(0,5);

    if (categoria === 'agua') {
      const existe = await db.query(
        'SELECT id, copos FROM cuidados_hidratacao WHERE familia_id=$1 AND membro_id=$2 AND data=CURRENT_DATE',
        [familia_id, memId]
      );
      if (existe.rows.length) {
        await db.query('UPDATE cuidados_hidratacao SET copos=$1 WHERE id=$2',
          [existe.rows[0].copos + 1, existe.rows[0].id]);
      } else {
        await db.query('INSERT INTO cuidados_hidratacao (familia_id, membro_id, copos) VALUES ($1,$2,$3)',
          [familia_id, memId, 1]);
      }
    } else if (categoria === 'alimentacao') {
      await db.query(
        'INSERT INTO cuidados_refeicoes (familia_id, membro_id, tipo, quantidade, obs) VALUES ($1,$2,$3,$4,$5)',
        [familia_id, memId, 'refeicao', '1 porção', 'Via hábito']
      );
    } else if (categoria === 'exercicio') {
      const mem = await db.query('SELECT nome FROM membros WHERE id=$1', [memId]);
      await db.query(
        'INSERT INTO cuidados_atividades (familia_id, membro_id, tipo, hora, obs, cuidador_nome) VALUES ($1,$2,$3,$4,$5,$6)',
        [familia_id, memId, 'exercicio', hora, 'Via hábito', mem.rows[0]?.nome || '']
      );
    } else if (categoria === 'sono') {
      await db.query(
        'INSERT INTO cuidados_sono (familia_id, membro_id, inicio, fim, qualidade, obs) VALUES ($1,$2,$3,$4,$5,$6)',
        [familia_id, memId, '22:00', null, 'boa', 'Via hábito']
      );
    } else if (categoria === 'pausa') {
      await db.query(
        'INSERT INTO cuidados_humor (familia_id, membro_id, humor, obs) VALUES ($1,$2,$3,$4)',
        [familia_id, memId, 'bem', 'Pausa mental realizada']
      );
    }

    res.json({ ok: true });
  } catch(e) {
    console.log('[Habito] ERRO:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
