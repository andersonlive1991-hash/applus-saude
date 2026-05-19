const fs = require('fs');
const path = process.env.HOME + '/applus-saude/frontend/js/modulos.js';
let code = fs.readFileSync(path, 'utf8');

const antiga = `async function salvarPerfil() {
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
}`;

const nova = `async function salvarPerfil() {
  try {
    // Garantir que temos um membroId válido
    let membroId = APP.membroId;
    if (!membroId && APP.idPessoal) {
      // Tentar recuperar pelo ID pessoal
      try {
        const mem = await api('GET', '/api/membros/id/' + APP.idPessoal);
        if (mem && mem.id) {
          membroId = mem.id;
          APP.membroId = mem.id;
          salvarSessaoMembro();
        }
      } catch(e) {}
    }
    if (!membroId) {
      alerta('❌ Sessão inválida. Saia e entre novamente.');
      return;
    }
    const dia = document.getElementById('pf-nasc-dia').value;
    const mes = document.getElementById('pf-nasc-mes').value;
    const ano = document.getElementById('pf-nasc-ano').value;
    const dataNasc = (dia && mes && ano) ? ano + '-' + mes + '-' + dia : '';
    await api('POST', '/api/perfil', {
      membro_id: membroId,
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
}`;

if (code.includes(antiga)) {
  code = code.replace(antiga, nova);
  fs.writeFileSync(path, code);
  console.log('✅ salvarPerfil corrigido com recuperação por idPessoal');
} else {
  console.log('⚠️ Texto não encontrado exato — aplicando via append');
  // Substituição mais flexível
  code = code.replace(/async function salvarPerfil\(\)[\s\S]*?^}/m, nova);
  fs.writeFileSync(path, code);
  console.log('✅ aplicado via regex');
}
