const fs = require('fs');

// ── 1. Corrigir modulos.js ──
const modulosPath = process.env.HOME + '/applus-saude/frontend/js/modulos.js';
let modulos = fs.readFileSync(modulosPath, 'utf8');

// Substituir carregarPerfil
modulos = modulos.replace(
`async function carregarPerfil() {
  try {
    const res = await api('GET', \`/api/perfil/\${APP.membroId}\`);
    if (res) {
      document.getElementById('pf-nome').value = res.nome_completo || '';
      document.getElementById('pf-nascimento').value = res.data_nascimento || '';
      document.getElementById('pf-sangue').value = res.tipo_sanguineo || '';
      document.getElementById('pf-alergias').value = res.alergias || '';
      document.getElementById('pf-cpf').value = res.cpf || '';
      document.getElementById('pf-sus').value = res.cartao_sus || '';
      document.getElementById('pf-convenio').value = res.convenio || '';
      document.getElementById('pf-contato').value = res.contato_emergencia || '';
      document.getElementById('pf-tel').value = res.tel_emergencia || '';
    }
  } catch (e) {
    console.log('Perfil ainda não cadastrado');
  }
}`,
`async function carregarPerfil() {
  try {
    const res = await api('GET', \`/api/perfil/\${APP.membroId}\`);
    if (res) {
      document.getElementById('pf-nome').value = res.nome_completo || '';
      if (res.data_nascimento) {
        const d = res.data_nascimento.substring(0,10).split('-');
        document.getElementById('pf-nasc-ano').value = d[0] || '';
        document.getElementById('pf-nasc-mes').value = d[1] || '';
        document.getElementById('pf-nasc-dia').value = d[2] || '';
      }
      document.getElementById('pf-sangue').value = res.tipo_sanguineo || '';
      document.getElementById('pf-alergias').value = res.alergias || '';
      document.getElementById('pf-cpf').value = res.cpf || '';
      document.getElementById('pf-sus').value = res.cartao_sus || '';
      document.getElementById('pf-convenio').value = res.convenio || '';
      document.getElementById('pf-contato').value = res.contato_emergencia || '';
      document.getElementById('pf-tel').value = res.tel_emergencia || '';
    }
  } catch (e) {
    console.log('Perfil ainda não cadastrado');
  }
}`
);

// Substituir salvarPerfil
modulos = modulos.replace(
`async function salvarPerfil() {
  try {
    await api('POST', '/api/perfil', {
      membro_id: APP.membroId,
      nome_completo: document.getElementById('pf-nome').value,
      data_nascimento: document.getElementById('pf-nascimento').value,
      tipo_sanguineo: document.getElementById('pf-sangue').value,
      alergias: document.getElementById('pf-alergias').value,
      cpf: document.getElementById('pf-cpf').value,
      cartao_sus: document.getElementById('pf-sus').value,
      convenio: document.getElementById('pf-convenio').value,
      contato_emergencia: document.getElementById('pf-contato').value,
      tel_emergencia: document.getElementById('pf-tel').value
    });
    alerta('✅ Perfil salvo com sucesso!');
  } catch (e) {
    alerta('Erro ao salvar perfil');
  }
}`,
`async function salvarPerfil() {
  try {
    if (!APP.membroId) { alerta('❌ Sessão inválida. Saia e entre novamente.'); return; }
    const dia = document.getElementById('pf-nasc-dia').value;
    const mes = document.getElementById('pf-nasc-mes').value;
    const ano = document.getElementById('pf-nasc-ano').value;
    const dataNasc = (dia && mes && ano) ? ano + '-' + mes + '-' + dia : '';
    await api('POST', '/api/perfil', {
      membro_id: APP.membroId,
      nome_completo: document.getElementById('pf-nome').value,
      data_nascimento: dataNasc,
      tipo_sanguineo: document.getElementById('pf-sangue').value,
      alergias: document.getElementById('pf-alergias').value,
      cpf: document.getElementById('pf-cpf').value,
      cartao_sus: document.getElementById('pf-sus').value,
      convenio: document.getElementById('pf-convenio').value,
      contato_emergencia: document.getElementById('pf-contato').value,
      tel_emergencia: document.getElementById('pf-tel').value
    });
    alerta('✅ Perfil salvo com sucesso!');
  } catch (e) {
    alerta('❌ Erro ao salvar perfil: ' + e.message);
  }
}`
);

fs.writeFileSync(modulosPath, modulos);
console.log('✅ modulos.js corrigido');

// ── 2. Corrigir perfil.js — adicionar nome_completo e log ──
const perfilPath = process.env.HOME + '/applus-saude/backend/routes/perfil.js';
const novoConteudo = `const express = require('express');
const router = express.Router();
const db = require('../db');

// Garantir coluna nome_completo em bancos existentes
db.query('ALTER TABLE perfil_idoso ADD COLUMN IF NOT EXISTS nome_completo VARCHAR(200)')
  .catch(e => console.log('ALTER perfil_idoso nome_completo:', e.message));

// Buscar perfil
router.get('/:membro_id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM perfil_idoso WHERE membro_id = $1',
      [req.params.membro_id]
    );
    if (!result.rows.length) return res.status(404).json({ erro: 'Perfil nao encontrado' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Criar ou atualizar perfil
router.post('/', async (req, res) => {
  const {
    membro_id, nome_completo, data_nascimento, tipo_sanguineo,
    alergias, cpf, cartao_sus, convenio,
    contato_emergencia, tel_emergencia
  } = req.body;

  console.log('[perfil] membro_id:', membro_id, '| nome:', nome_completo);

  if (!membro_id) return res.status(400).json({ erro: 'membro_id obrigatorio' });

  const dataNasc = data_nascimento && data_nascimento.trim() !== '' ? data_nascimento.trim() : null;

  try {
    const result = await db.query(
      \`INSERT INTO perfil_idoso
        (membro_id, nome_completo, data_nascimento, tipo_sanguineo, alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (membro_id) DO UPDATE SET
        nome_completo=$2, data_nascimento=$3, tipo_sanguineo=$4,
        alergias=$5, cpf=$6, cartao_sus=$7, convenio=$8,
        contato_emergencia=$9, tel_emergencia=$10,
        atualizado_em=NOW()
        RETURNING *\`,
      [membro_id, nome_completo, dataNasc, tipo_sanguineo,
       alergias, cpf, cartao_sus, convenio, contato_emergencia, tel_emergencia]
    );
    console.log('[perfil] salvo id:', result.rows[0].id);
    res.json(result.rows[0]);
  } catch (e) {
    console.log('[perfil] ERRO:', e.message);
    res.status(500).json({ erro: e.message });
  }
});

module.exports = router;
`;

fs.writeFileSync(perfilPath, novoConteudo);
console.log('✅ perfil.js corrigido');
