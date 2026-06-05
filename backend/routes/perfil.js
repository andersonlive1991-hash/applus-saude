const express = require('express');
const router = express.Router();
const db = require('../db');
const { encrypt, decrypt } = require('../crypto');

// Garantir coluna nome_completo em bancos existentes
db.query('ALTER TABLE perfil_idoso ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(200)')
  .catch(e => console.log('ALTER perfil_idoso nome_completo:', e.message));

// Ampliar colunas para suportar dados criptografados
db.query('ALTER TABLE perfil_idoso ADD COLUMN IF NOT EXISTS sexo VARCHAR(20)').catch(()=>{});
db.query('ALTER TABLE perfil_idoso ALTER COLUMN tipo_sanguineo TYPE TEXT')
  .catch(e => console.log('ALTER tipo_sanguineo:', e.message));
db.query('ALTER TABLE perfil_idoso ALTER COLUMN cpf TYPE TEXT')
  .catch(e => console.log('ALTER cpf:', e.message));
db.query('ALTER TABLE perfil_idoso ALTER COLUMN alergias TYPE TEXT')
  .catch(e => console.log('ALTER alergias:', e.message));

// Buscar perfil
router.get('/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM perfil_idoso WHERE membro_id = $1',
      [req.params.membro_id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Perfil nao encontrado' });
    const p = result.rows[0];
    p.cpf = decrypt(p.cpf);
    p.alergias = decrypt(p.alergias);
    p.tipo_sanguineo = decrypt(p.tipo_sanguineo);
    res.json(p);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar ou atualizar perfil
router.post('/', async (req, res) => {
  const {
    membro_id, nome_completo, data_nascimento, tipo_sanguineo,
    alergias, cpf, cartao_sus, convenio,
    contato_emergencia, tel_emergencia, sexo
  } = req.body;

  console.log('[perfil] membro_id:', membro_id, '| nome:', nome_completo);

  if (!membro_id) return res.status(400).json({ erro: 'membro_id obrigatorio' });

  const dataNasc = data_nascimento && data_nascimento.trim() !== '' ? data_nascimento.trim() : null;

  try {
    const result = await db.query(
      `INSERT INTO perfil_idoso
        (membro_id, nome_completo, data_nascimento, tipo_sanguineo, alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia, sexo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        ON CONFLICT (membro_id) DO UPDATE SET
        nome_completo=$2, data_nascimento=$3, tipo_sanguineo=$4,
        alergias=$5, cpf=$6, cartao_sus=$7, convenio=$8,
        contato_emergencia=$9, tel_emergencia=$10,
        sexo=$11, atualizado_em=NOW()
        RETURNING *`,
      [membro_id, nome_completo, dataNasc, encrypt(tipo_sanguineo),
       encrypt(alergias), encrypt(cpf), cartao_sus, convenio, contato_emergencia, tel_emergencia, sexo || null]
    );
    console.log('[perfil] salvo id:', result.rows[0].id);
    const saved = result.rows[0];
    saved.cpf = decrypt(saved.cpf);
    saved.alergias = decrypt(saved.alergias);
    saved.tipo_sanguineo = decrypt(saved.tipo_sanguineo);
    res.json(saved);
  } catch (e) {
    console.log('[perfil] ERRO:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
