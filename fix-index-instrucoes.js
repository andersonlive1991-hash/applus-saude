const fs = require('fs');
const path = '/data/data/com.termux/files/home/applus-saude/frontend/index.html';
let c = fs.readFileSync(path, 'utf8');

// 1. Atualizar onclicks dos botões
c = c.replace(
  `<button class="login-opcao" onclick="abrirModal('modal-entrar')">
        <span class="login-opcao-icone">👨‍👩‍👧</span>
        <div>
          <div class="login-opcao-titulo" data-i18n="login.entrar_familia">Entrar em família</div>
          <div class="login-opcao-sub" data-i18n="login.entrar_sub">Tenho o código da família</div>
        </div>
      </button>`,
  `<button class="login-opcao" onclick="abrirInstrucao('familia')">
        <span class="login-opcao-icone">👨‍👩‍👧</span>
        <div>
          <div class="login-opcao-titulo">Entrar em família / Cuidador</div>
          <div class="login-opcao-sub">Tenho o código da família</div>
        </div>
      </button>`
);

c = c.replace(
  `<button class="login-opcao" onclick="abrirPortal('/medico.html')">
        <span class="login-opcao-icone">🩺</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso Médico</div>            <div class="login-opcao-sub">Portal do profissional de saúde</div>
        </div>                                                       </button>`,
  `<button class="login-opcao" onclick="abrirInstrucao('medico')">
        <span class="login-opcao-icone">🩺</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso Médico</div>
          <div class="login-opcao-sub">Portal do profissional de saúde</div>
        </div>
      </button>`
);

c = c.replace(
  `<button class="login-opcao" onclick="abrirPortal('/baba.html')">
        <span class="login-opcao-icone">👶</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso Babá</div>
          <div class="login-opcao-sub">Portal da babá / nanny</div>
        </div>
      </button>`,
  `<button class="login-opcao" onclick="abrirInstrucao('baba')">
        <span class="login-opcao-icone">👶</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso Babá</div>
          <div class="login-opcao-sub">Portal da babá / nanny</div>
        </div>
      </button>
      <button class="login-opcao" onclick="abrirInstrucao('tea')">
        <span class="login-opcao-icone">🧩</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso TEA</div>
          <div class="login-opcao-sub">Espaço especial para autismo</div>
        </div>
      </button>
      <button class="login-opcao" onclick="abrirInstrucao('kids')">
        <span class="login-opcao-icone">🎮</span>
        <div class="login-opcao-texto">
          <div class="login-opcao-titulo">Acesso Kids</div>
          <div class="login-opcao-sub">Portal infantil divertido</div>
        </div>
      </button>`
);

// 2. Adicionar todos os modais antes do </body>
const modais = `
<!-- Função abrirInstrucao -->
<script>
function abrirInstrucao(tipo) {
  document.getElementById('modal-instrucao-' + tipo).style.display = 'flex';
}
function fecharInstrucao(tipo) {
  document.getElementById('modal-instrucao-' + tipo).style.display = 'none';
}
</script>

<!-- Estilo base dos modais -->
<style>
.instrucao-overlay {
  display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);
  z-index:9999;padding:20px;overflow-y:auto;
  align-items:flex-start;justify-content:center;
}
.instrucao-box {
  background:white;border-radius:24px;padding:24px;
  max-width:480px;width:100%;margin:20px auto;
}
.instrucao-header { text-align:center;margin-bottom:20px; }
.instrucao-emoji { font-size:52px;display:block;margin-bottom:8px; }
.instrucao-titulo { font-size:18px;font-weight:800;color:#1a1f2e; }
.instrucao-sub { font-size:13px;color:#6b7280;margin-top:4px; }
.instrucao-steps { display:flex;flex-direction:column;gap:10px;margin-bottom:16px; }
.instrucao-step {
  display:flex;gap:12px;align-items:flex-start;
  background:#f0f9ff;border-radius:12px;padding:12px;
}
.instrucao-num {
  width:26px;height:26px;border-radius:50%;background:#0ea5e9;
  color:white;font-size:12px;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
}
.instrucao-step-titulo { font-size:13px;font-weight:700;color:#1a1f2e; }
.instrucao-step-desc { font-size:12px;color:#6b7280;margin-top:3px;line-height:1.5; }
.instrucao-dica {
  background:#fef9c3;border-radius:12px;padding:12px;
  margin-bottom:20px;display:flex;gap:10px;align-items:flex-start;
}
.instrucao-dica-txt { font-size:12px;color:#92400e;line-height:1.5; }
.instrucao-btns { display:flex;gap:10px; }
.instrucao-btn-voltar {
  flex:1;padding:13px;background:#f3f4f6;border:none;
  border-radius:14px;font-size:14px;cursor:pointer;font-weight:600;color:#374151;
}
.instrucao-btn-entrar {
  flex:2;padding:13px;background:#0ea5e9;border:none;
  border-radius:14px;color:white;font-size:14px;font-weight:700;cursor:pointer;
}
</style>

<!-- MODAL FAMÍLIA/CUIDADOR -->
<div id="modal-instrucao-familia" class="instrucao-overlay">
  <div class="instrucao-box">
    <div class="instrucao-header">
      <span class="instrucao-emoji">👨‍👩‍👧</span>
      <div class="instrucao-titulo">Entrar em Família / Cuidador</div>
      <div class="instrucao-sub">Para quem já tem o código da família</div>
    </div>
    <div class="instrucao-steps">
      <div class="instrucao-step">
        <div class="instrucao-num">1</div>
        <div>
          <div class="instrucao-step-titulo">O responsável cria a família</div>
          <div class="instrucao-step-desc">Quem criou a conta no app tem o código da família. Peça esse código para ele.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">2</div>
        <div>
          <div class="instrucao-step-titulo">Digite o código da família</div>
          <div class="instrucao-step-desc">Ao clicar em acessar, insira o código recebido para entrar como membro da família ou cuidador.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">3</div>
        <div>
          <div class="instrucao-step-titulo">Escolha seu perfil</div>
          <div class="instrucao-step-desc">Selecione se você é um familiar, cuidador profissional ou outro tipo de membro.</div>
        </div>
      </div>
    </div>
    <div class="instrucao-dica">
      <span style="font-size:20px">💡</span>
      <div class="instrucao-dica-txt">Cuidadores profissionais têm acesso ao painel de cuidados — registram atividades, medicamentos e tudo aparece para a família em tempo real.</div>
    </div>
    <div class="instrucao-btns">
      <button class="instrucao-btn-voltar" onclick="fecharInstrucao('familia')">Voltar</button>
      <button class="instrucao-btn-entrar" onclick="fecharInstrucao('familia');abrirModal('modal-entrar')">Já entendi, acessar →</button>
    </div>
  </div>
</div>

<!-- MODAL MÉDICO -->
<div id="modal-instrucao-medico" class="instrucao-overlay">
  <div class="instrucao-box">
    <div class="instrucao-header">
      <span class="instrucao-emoji">🩺</span>
      <div class="instrucao-titulo">Portal Médico</div>
      <div class="instrucao-sub">Para profissionais de saúde</div>
    </div>
    <div class="instrucao-steps">
      <div class="instrucao-step">
        <div class="instrucao-num">1</div>
        <div>
          <div class="instrucao-step-titulo">O paciente compartilha o ID</div>
          <div class="instrucao-step-desc">O responsável pelo paciente fornece o ID pessoal (ex: AND-QGEKU) para o médico.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">2</div>
        <div>
          <div class="instrucao-step-titulo">Médico acessa com CRM</div>
          <div class="instrucao-step-desc">Informe seu nome, CRM e o ID do paciente para acessar o prontuário completo.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">3</div>
        <div>
          <div class="instrucao-step-titulo">Visualize o histórico completo</div>
          <div class="instrucao-step-desc">Medicamentos, sinais vitais, exames, vacinas, doenças, internações e dados TEA.</div>
        </div>
      </div>
    </div>
    <div class="instrucao-dica">
      <span style="font-size:20px">💡</span>
      <div class="instrucao-dica-txt">O portal médico permite videochamada com o paciente, prescrição de rotina TEA, emissão de relatório PDF e visualização de aderência aos medicamentos.</div>
    </div>
    <div class="instrucao-btns">
      <button class="instrucao-btn-voltar" onclick="fecharInstrucao('medico')">Voltar</button>
      <button class="instrucao-btn-entrar" onclick="fecharInstrucao('medico');abrirPortal('/medico.html')">Já entendi, acessar →</button>
    </div>
  </div>
</div>

<!-- MODAL BABÁ -->
<div id="modal-instrucao-baba" class="instrucao-overlay">
  <div class="instrucao-box">
    <div class="instrucao-header">
      <span class="instrucao-emoji">👶</span>
      <div class="instrucao-titulo">Portal da Babá / Nanny</div>
      <div class="instrucao-sub">Como funciona o acesso</div>
    </div>
    <div class="instrucao-steps">
      <div class="instrucao-step">
        <div class="instrucao-num">1</div>
        <div>
          <div class="instrucao-step-titulo">A família cria o perfil da babá</div>
          <div class="instrucao-step-desc">No app principal, toque no + no canto superior direito → Adicionar membro → escolha "Babá".</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">2</div>
        <div>
          <div class="instrucao-step-titulo">A família compartilha o ID</div>
          <div class="instrucao-step-desc">Um código único é gerado (ex: BAB-XY123). A família envia esse código para a babá.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">3</div>
        <div>
          <div class="instrucao-step-titulo">A babá entra com o ID</div>
          <div class="instrucao-step-desc">Clique em acessar e insira o ID recebido para entrar no portal.</div>
        </div>
      </div>
    </div>
    <div class="instrucao-dica">
      <span style="font-size:20px">💡</span>
      <div class="instrucao-dica-txt">A família vê em tempo real tudo que a babá registra — check-in, refeições, medicamentos, fotos e muito mais.</div>
    </div>
    <div class="instrucao-btns">
      <button class="instrucao-btn-voltar" onclick="fecharInstrucao('baba')">Voltar</button>
      <button class="instrucao-btn-entrar" onclick="fecharInstrucao('baba');abrirPortal('/baba.html')">Já entendi, acessar →</button>
    </div>
  </div>
</div>

<!-- MODAL TEA -->
<div id="modal-instrucao-tea" class="instrucao-overlay">
  <div class="instrucao-box">
    <div class="instrucao-header">
      <span class="instrucao-emoji">🧩</span>
      <div class="instrucao-titulo">Portal TEA</div>
      <div class="instrucao-sub">Espaço especial para autismo</div>
    </div>
    <div class="instrucao-steps">
      <div class="instrucao-step">
        <div class="instrucao-num">1</div>
        <div>
          <div class="instrucao-step-titulo">A família cria o perfil TEA</div>
          <div class="instrucao-step-desc">No app principal, toque no + → Adicionar membro → escolha o tipo "TEA".</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">2</div>
        <div>
          <div class="instrucao-step-titulo">Compartilhe o ID com a criança</div>
          <div class="instrucao-step-desc">Um código único é gerado (ex: TEA-AB123). A criança usa esse código para entrar.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">3</div>
        <div>
          <div class="instrucao-step-titulo">Interface simplificada para a criança</div>
          <div class="instrucao-step-desc">Rotina visual, pictogramas de comunicação, humor, temporizador e botão SOS.</div>
        </div>
      </div>
    </div>
    <div class="instrucao-dica">
      <span style="font-size:20px">💡</span>
      <div class="instrucao-dica-txt">O terapeuta pode prescrever a rotina diretamente pelo portal médico. Tudo que a criança registra aparece para a família e o médico em tempo real.</div>
    </div>
    <div class="instrucao-btns">
      <button class="instrucao-btn-voltar" onclick="fecharInstrucao('tea')">Voltar</button>
      <button class="instrucao-btn-entrar" onclick="fecharInstrucao('tea');abrirPortal('/tea.html')">Já entendi, acessar →</button>
    </div>
  </div>
</div>

<!-- MODAL KIDS -->
<div id="modal-instrucao-kids" class="instrucao-overlay">
  <div class="instrucao-box">
    <div class="instrucao-header">
      <span class="instrucao-emoji">🎮</span>
      <div class="instrucao-titulo">Portal Kids</div>
      <div class="instrucao-sub">Portal infantil divertido</div>
    </div>
    <div class="instrucao-steps">
      <div class="instrucao-step">
        <div class="instrucao-num">1</div>
        <div>
          <div class="instrucao-step-titulo">A família cria o perfil Kids</div>
          <div class="instrucao-step-desc">No app principal, toque no + → Adicionar membro → escolha o tipo "Kids".</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">2</div>
        <div>
          <div class="instrucao-step-titulo">Compartilhe o ID com a criança</div>
          <div class="instrucao-step-desc">Um código único é gerado (ex: KID-CD456). A criança usa esse código para entrar.</div>
        </div>
      </div>
      <div class="instrucao-step">
        <div class="instrucao-num">3</div>
        <div>
          <div class="instrucao-step-titulo">Interface divertida e segura</div>
          <div class="instrucao-step-desc">A criança tem acesso a uma interface colorida e simplificada, com botão SOS para chamar os pais.</div>
        </div>
      </div>
    </div>
    <div class="instrucao-dica">
      <span style="font-size:20px">💡</span>
      <div class="instrucao-dica-txt">Os pais acompanham tudo em tempo real pelo app principal e recebem alertas imediatos se a criança acionar o SOS.</div>
    </div>
    <div class="instrucao-btns">
      <button class="instrucao-btn-voltar" onclick="fecharInstrucao('kids')">Voltar</button>
      <button class="instrucao-btn-entrar" onclick="fecharInstrucao('kids');abrirPortal('/kids.html')">Já entendi, acessar →</button>
    </div>
  </div>
</div>`;

c = c.replace('</body>', modais + '\n</body>');
fs.writeFileSync(path, c);
console.log('✅ Todos os modais de instrução adicionados!');
