const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/medico.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Atualizar formulário de login — adicionar UF + especialidade + termos
c = c.replace(
  `      <div class="campo">
        <label>CRM</label>
        <input id="med-crm" type="text" placeholder="Ex: CRM-SP 123456">
      </div>
      <div class="campo">
        <label>ID do Paciente</label>
        <input id="med-id-paciente" type="text" placeholder="Ex: AND-GCBU7" style="text-transform:uppercase">
      </div>
      <button class="btn-azul" onclick="acessarPortal()">Acessar Histórico 🔍</button>`,
  `      <div class="campo">
        <label>CRM (somente números)</label>
        <div style="display:flex;gap:8px">
          <select id="med-uf" style="width:90px;padding:14px 8px;border:1.5px solid #e5e7eb;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1a1f2e;outline:none">
            <option value="">UF</option>
            <option>AC</option><option>AL</option><option>AP</option><option>AM</option>
            <option>BA</option><option>CE</option><option>DF</option><option>ES</option>
            <option>GO</option><option>MA</option><option>MT</option><option>MS</option>
            <option>MG</option><option>PA</option><option>PB</option><option>PR</option>
            <option>PE</option><option>PI</option><option>RJ</option><option>RN</option>
            <option>RS</option><option>RO</option><option>RR</option><option>SC</option>
            <option selected>SP</option><option>SE</option><option>TO</option>
          </select>
          <input id="med-crm" type="number" placeholder="Ex: 123456" style="flex:1" min="1" max="9999999">
        </div>
      </div>
      <div class="campo">
        <label>Especialidade</label>
        <select id="med-especialidade" style="width:100%;padding:14px 16px;border:1.5px solid #e5e7eb;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1a1f2e;outline:none">
          <option value="">Selecione...</option>
          <option>Clínica Médica</option><option>Pediatria</option><option>Neurologia</option>
          <option>Psiquiatria</option><option>Geriatria</option><option>Cardiologia</option>
          <option>Endocrinologia</option><option>Ortopedia</option><option>Dermatologia</option>
          <option>Ginecologia</option><option>Oftalmologia</option><option>Otorrinolaringologia</option>
          <option>Urologia</option><option>Oncologia</option><option>Terapia Ocupacional</option>
          <option>Fonoaudiologia</option><option>Psicologia</option><option>Fisioterapia</option>
          <option>Nutrição</option><option>Outra</option>
        </select>
      </div>
      <div class="campo">
        <label>ID do Paciente</label>
        <input id="med-id-paciente" type="text" placeholder="Ex: AND-GCBU7" style="text-transform:uppercase">
      </div>
      <div style="background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:12px;display:flex;gap:10px;align-items:flex-start">
        <input type="checkbox" id="med-termos" style="margin-top:3px;width:16px;height:16px;flex-shrink:0">
        <label for="med-termos" style="font-size:12px;color:#374151;line-height:1.5;cursor:pointer">
          Declaro que sou profissional de saúde habilitado, que os dados informados são verdadeiros e que estou ciente que este acesso é registrado com data, hora e CRM para fins de auditoria.
        </label>
      </div>
      <button class="btn-azul" onclick="acessarPortalValidado()">Acessar Histórico 🔍</button>`
);

// 2. Adicionar função acessarPortalValidado + log de acesso
const validacaoJS = `
async function acessarPortalValidado() {
  const nome = document.getElementById('med-nome').value.trim();
  const crm = document.getElementById('med-crm').value.trim();
  const uf = document.getElementById('med-uf').value;
  const especialidade = document.getElementById('med-especialidade').value;
  const idPaciente = document.getElementById('med-id-paciente').value.trim().toUpperCase();
  const termos = document.getElementById('med-termos').checked;

  if (!nome) return mostrarAlerta('Informe seu nome completo');
  if (!crm || !/^\\d{4,7}$/.test(crm)) return mostrarAlerta('CRM inválido — digite somente números (4 a 7 dígitos)');
  if (!uf) return mostrarAlerta('Selecione a UF do seu CRM');
  if (!especialidade) return mostrarAlerta('Selecione sua especialidade');
  if (!idPaciente) return mostrarAlerta('Informe o ID do paciente');
  if (!termos) return mostrarAlerta('Aceite os termos para continuar');

  const crmFormatado = 'CRM-' + uf + ' ' + crm;

  // Salvar log de acesso no backend
  try {
    await fetch('/api/medicos/log-acesso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medico_nome: nome,
        medico_crm: crmFormatado,
        especialidade,
        paciente_id: idPaciente,
        data_acesso: new Date().toISOString()
      })
    });
  } catch(e) { console.log('Log acesso:', e); }

  // Mostrar modal de confirmação
  document.getElementById('confirm-medico-nome').textContent = nome;
  document.getElementById('confirm-medico-crm').textContent = crmFormatado;
  document.getElementById('confirm-medico-esp').textContent = especialidade;
  document.getElementById('confirm-paciente-id').textContent = idPaciente;
  document.getElementById('modal-confirmar-acesso').style.display = 'flex';
  
  // Guardar dados temporários
  window._medicoTemp = { nome, crm: crmFormatado, especialidade, idPaciente };
}

function confirmarAcessoMedico() {
  document.getElementById('modal-confirmar-acesso').style.display = 'none';
  const d = window._medicoTemp;
  // Chamar função original com os dados validados
  document.getElementById('med-crm').value = d.crm;
  document.getElementById('med-id-paciente').value = d.idPaciente;
  acessarPortal();
}

function mostrarAlerta(msg) {
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:12px 24px;background:#f59e0b;color:#fff;font-size:14px;font-weight:500;z-index:99999;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:90%;text-align:center';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}
`;

// 3. Modal de confirmação de dados
const modalConfirmacao = `
<!-- Modal Confirmar Acesso Médico -->
<div id="modal-confirmar-acesso" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;padding:20px;align-items:center;justify-content:center">
  <div style="background:white;border-radius:20px;padding:24px;max-width:400px;width:100%">
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:48px;margin-bottom:8px">🩺</div>
      <div style="font-size:16px;font-weight:700;color:#1a1f2e">Confirme seus dados</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px">Verifique antes de acessar o prontuário</div>
    </div>
    <div style="background:#f0f9ff;border-radius:12px;padding:14px;margin-bottom:16px;display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:#6b7280">Nome</span>
        <span style="font-weight:600;color:#1a1f2e" id="confirm-medico-nome">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:#6b7280">CRM</span>
        <span style="font-weight:600;color:#1a6eb5" id="confirm-medico-crm">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:#6b7280">Especialidade</span>
        <span style="font-weight:600;color:#1a1f2e" id="confirm-medico-esp">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px">
        <span style="color:#6b7280">Paciente</span>
        <span style="font-weight:600;color:#1a1f2e" id="confirm-paciente-id">—</span>
      </div>
    </div>
    <div style="background:#fef9c3;border-radius:10px;padding:10px;margin-bottom:16px;font-size:12px;color:#92400e">
      ⚠️ Este acesso está sendo registrado com data, hora e CRM para fins de auditoria e segurança.
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="document.getElementById('modal-confirmar-acesso').style.display='none'" style="flex:1;padding:12px;background:#f3f4f6;border:none;border-radius:12px;font-size:14px;cursor:pointer">Corrigir</button>
      <button onclick="confirmarAcessoMedico()" style="flex:2;padding:12px;background:#1a6eb5;border:none;border-radius:12px;color:white;font-size:14px;font-weight:700;cursor:pointer">✅ Confirmar e Acessar</button>
    </div>
  </div>
</div>`;

c = c.replace('</body>', modalConfirmacao + '\n<script>' + validacaoJS + '</script>\n</body>');

fs.writeFileSync(path, c);
console.log('✅ Validação CRM implementada!');
