// ── VACINAS ──
async function carregarVacinas() {
  try {
    const vacinas = await api('GET', `/api/vacinas/${APP.membroId}`);
    const lista = document.getElementById('lista-vacinas');
    lista.innerHTML = vacinas.length
      ? vacinas.map(v => `
        <div class="item-lista">
          <span style="font-size:24px">💉</span>
          <div class="item-info">
            <div class="item-nome">${v.nome}</div>
            <div class="item-sub">${formatarData(v.data)} · ${v.doses_tomadas}/${v.doses_total} doses</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge ${v.status === 'Completo' ? 'badge-ok' : v.status === 'Incompleto' ? 'badge-pendente' : 'badge-atrasado'}">${v.status}</span>
            <button onclick="excluirVacina(${v.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma vacina cadastrada</p>';
  } catch (e) {
    console.log('Erro vacinas:', e);
  }
}

async function salvarVacina() {
  const nome = document.getElementById('vac-nome').value.trim();
  const data = document.getElementById('vac-data').value;
  const doses_total = document.getElementById('vac-doses-total').value;
  const doses_tomadas = document.getElementById('vac-doses-tomadas').value;
  const status = document.getElementById('vac-status').value;
  if (!nome) return alerta('Informe o nome da vacina');
  try {
    await api('POST', '/api/vacinas', {
      membro_id: APP.membroId,
      nome, data, doses_total, doses_tomadas, status
    });
    fecharModal('modal-add-vacina');
    carregarVacinas();
  } catch (e) {
    alerta('Erro ao salvar vacina');
  }
}

async function excluirVacina(id) {
  if (!confirm('Excluir vacina?')) return;
  await api('DELETE', `/api/vacinas/${id}`);
  carregarVacinas();
}

// ── FINANCEIRO ──
async function carregarFinanceiro() {
  try {
    const gastos = await api('GET', `/api/gastos/${APP.familiaId}`);
    const lista = document.getElementById('lista-gastos');
    const total = gastos.reduce((s, g) => s + parseFloat(g.valor), 0);

    lista.innerHTML = `
      <div style="background:var(--cinza-claro);border-radius:14px;padding:16px;margin-bottom:12px;text-align:center">
        <div style="font-size:12px;color:var(--cinza);text-transform:uppercase;letter-spacing:1px">Total gasto</div>
        <div style="font-family:'Sora',sans-serif;font-size:28px;font-weight:700;color:var(--texto)">R$ ${total.toFixed(2)}</div>
      </div>
      ${gastos.length
        ? gastos.map(g => `
          <div class="item-lista">
            <span style="font-size:24px">${iconeCategoria(g.categoria)}</span>
            <div class="item-info">
              <div class="item-nome">${g.descricao}</div>
              <div class="item-sub">${g.categoria} · ${g.responsavel || ''} · ${formatarData(g.criado_em)}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
              <span style="font-family:'Sora',sans-serif;font-weight:700;color:var(--texto)">R$ ${parseFloat(g.valor).toFixed(2)}</span>
              <button onclick="excluirGasto(${g.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
            </div>
          </div>`).join('')
        : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum gasto registrado</p>'
      }`;
  } catch (e) {
    console.log('Erro financeiro:', e);
  }
}

function iconeCategoria(cat) {
  const icons = {
    Medicamentos: '💊', Consultas: '🏥', Exames: '🔬',
    Cuidador: '👨‍⚕️', Equipamentos: '🛠️', Outros: '📦'
  };
  return icons[cat] || '📦';
}

async function salvarGasto() {
  const descricao = document.getElementById('gas-desc').value.trim();
  const valor = document.getElementById('gas-valor').value;
  const categoria = document.getElementById('gas-cat').value;
  const responsavel = document.getElementById('gas-resp').value.trim();
  if (!descricao || !valor) return alerta('Preencha descrição e valor');
  try {
    await api('POST', '/api/gastos', {
      familia_id: APP.familiaId,
      descricao, valor, categoria, responsavel
    });
    fecharModal('modal-add-gasto');
    carregarFinanceiro();
  } catch (e) {
    alerta('Erro ao salvar gasto');
  }
}

async function excluirGasto(id) {
  if (!confirm('Excluir gasto?')) return;
  await api('DELETE', `/api/gastos/${id}`);
  carregarFinanceiro();
}

// ── CHECKLIST ──
async function carregarChecklist() {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const res = await api('GET', `/api/checklist/${APP.familiaId}?data=${hoje}`);
    const lista = document.getElementById('lista-checklist');
    lista.innerHTML = res.length
      ? res.map(t => `
        <div class="item-lista" style="${t.concluida ? 'opacity:0.6' : ''}">
          <input type="checkbox" ${t.concluida ? 'checked' : ''} onchange="toggleTarefa(${t.id}, this.checked)"
            style="width:20px;height:20px;accent-color:var(--verde);cursor:pointer">
          <div class="item-info">
            <div class="item-nome" style="${t.concluida ? 'text-decoration:line-through' : ''}">${t.tarefa}</div>
          </div>
          <button onclick="excluirTarefa(${t.id})" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--cinza)">🗑️</button>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma tarefa para hoje</p>';
  } catch (e) {
    console.log('Erro checklist:', e);
  }
}

async function salvarTarefa() {
  const tarefa = document.getElementById('tar-nome').value.trim();
  if (!tarefa) return alerta('Digite a tarefa');
  try {
    await api('POST', '/api/checklist', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      tarefa
    });
    fecharModal('modal-add-tarefa');
    document.getElementById('tar-nome').value = '';
    carregarChecklist();
  } catch (e) {
    alerta('Erro ao salvar tarefa');
  }
}

async function toggleTarefa(id, concluida) {
  await api('PUT', `/api/checklist/${id}`, { concluida });
}

async function excluirTarefa(id) {
  if (!confirm('Excluir tarefa?')) return;
  await api('DELETE', `/api/checklist/${id}`);
  carregarChecklist();
}

// ── ESCALA ──
async function carregarEscala() {
  try {
    const res = await api('GET', `/api/escala/${APP.familiaId}`);
    const lista = document.getElementById('lista-escala');
    const dias = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];
    lista.innerHTML = res.length
      ? dias.map(dia => {
          const turnos = res.filter(e => e.dia_semana === dia);
          if (!turnos.length) return '';
          return `
            <div style="margin-bottom:12px">
              <div style="font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--cinza);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${dia}</div>
              ${turnos.map(t => `
                <div class="item-lista">
                  <span style="font-size:24px">${iconeTurno(t.turno)}</span>
                  <div class="item-info">
                    <div class="item-nome">${t.turno}</div>
                    <div class="item-sub">${t.tarefas || ''}</div>
                  </div>
                  <button onclick="excluirEscala(${t.id})" style="background:none;border:none;font-size:16px;cursor:pointer;color:var(--cinza)">🗑️</button>
                </div>`).join('')}
            </div>`;
        }).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum turno cadastrado</p>';
  } catch (e) {
    console.log('Erro escala:', e);
  }
}

function iconeTurno(turno) {
  return { Manhã: '🌅', Tarde: '☀️', Noite: '🌙' }[turno] || '📋';
}

async function salvarEscala() {
  const dia_semana = document.getElementById('esc-dia').value;
  const turno = document.getElementById('esc-turno').value;
  const tarefas = document.getElementById('esc-tarefas').value.trim();
  try {
    await api('POST', '/api/escala', {
      familia_id: APP.familiaId,
      membro_id: APP.membroId,
      dia_semana, turno, tarefas
    });
    fecharModal('modal-add-escala');
    carregarEscala();
  } catch (e) {
    alerta('Erro ao salvar escala');
  }
}

async function excluirEscala(id) {
  if (!confirm('Excluir turno?')) return;
  await api('DELETE', `/api/escala/${id}`);
  carregarEscala();
}

// ── SINAIS VITAIS ──
async function salvarSinal(tipo, idValor, idValor2, unidade, idObs) {
  const valor = document.getElementById(idValor).value;
  const valor2 = document.getElementById(idValor2).value;
  const obs = document.getElementById(idObs)?.value || '';
  if (!valor || !valor2) return alerta('Preencha os valores');
  try {
    await api('POST', '/api/sinais', {
      membro_id: APP.membroId,
      tipo, valor, valor2, unidade,
      observacoes: obs
    });
    fecharModal(`modal-${tipo}`);
    carregarSinais();
  } catch (e) {
    alerta('Erro ao salvar');
  }
}

async function salvarSinalSimples(tipo, idValor, unidade) {
  const valor = document.getElementById(idValor).value;
  if (!valor) return alerta('Preencha o valor');
  try {
    await api('POST', '/api/sinais', {
      membro_id: APP.membroId,
      tipo, valor, unidade
    });
    fecharModal(`modal-${tipo}`);
    carregarSinais();
  } catch (e) {
    alerta('Erro ao salvar');
  }
}

async function carregarSinais() {
  try {
    const sinais = await api('GET', `/api/sinais/${APP.membroId}`);
    const lista = document.getElementById('lista-sinais');
    if (!lista) return;
    lista.innerHTML = sinais.length
      ? sinais.map(s => `
        <div class="item-lista">
          <span style="font-size:24px">${iconeSinal(s.tipo)}</span>
          <div class="item-info">
            <div class="item-nome">${nomeSinal(s.tipo)}: ${s.valor}${s.valor2 ? '/' + s.valor2 : ''} ${s.unidade || ''}</div>
            <div class="item-sub">${formatarHora(s.criado_em)}</div>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum registro ainda</p>';
  } catch (e) {
    console.log('Erro sinais:', e);
  }
}

function iconeSinal(tipo) {
  const icons = { pressao: '🩺', glicemia: '🩸', peso: '⚖️', oximetria: '💨', temperatura: '🌡️' };
  return icons[tipo] || '📊';
}

function nomeSinal(tipo) {
  const nomes = { pressao: 'Pressão', glicemia: 'Glicemia', peso: 'Peso', oximetria: 'Saturação', temperatura: 'Temperatura' };
  return nomes[tipo] || tipo;
}

// ── PERFIL IDOSO ──
async function carregarPerfil() {
  try {
    const res = await api('GET', `/api/perfil/${APP.membroId}`);
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
}

async function salvarPerfil() {
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
}

// ── COMPARTILHAR CÓDIGO ──
function compartilharCodigo() {
  const texto = `Olá! Estou usando o AP+ Saúde para organizar nosso cuidado familiar.\n\nCódigo da família: *${APP.codigoFamilia}*\n\nBaixe o app e entre com esse código: ${window.location.origin}`;
  if (navigator.share) {
    navigator.share({ title: 'AP+ Saúde', text: texto });
  } else {
    navigator.clipboard.writeText(texto);
    alerta('Código copiado!');
  }
}

// ── NAVEGAÇÃO ESTENDIDA ──
const _navegarOriginal = navegarPara;
window.navegarPara = function(pagina) {
  _navegarOriginal(pagina);
  if (pagina === 'vacinas') carregarVacinas();
  if (pagina === 'financeiro') carregarFinanceiro();
  if (pagina === 'checklist') carregarChecklist();
  if (pagina === 'escala') carregarEscala();
  if (pagina === 'saude') carregarSinais();
  if (pagina === 'perfil') carregarPerfil();
};

// ── HISTÓRICO DE SAÚDE ──
function trocarAba(aba) {
  ['doencas','tratamentos','internacoes'].forEach(a => {
    document.getElementById(`conteudo-${a}`).style.display = a === aba ? 'block' : 'none';
    document.getElementById(`aba-${a}`).classList.toggle('ativa', a === aba);
  });
  if (aba === 'doencas') carregarDoencas();
  if (aba === 'tratamentos') carregarTratamentos();
  if (aba === 'internacoes') carregarInternacoes();
}

async function carregarDoencas() {
  try {
    const res = await api('GET', `/api/historico/doencas/${APP.membroId}`);
    const lista = document.getElementById('lista-doencas');
    lista.innerHTML = res.length
      ? res.map(d => `
        <div class="item-lista">
          <span style="font-size:24px">🦠</span>
          <div class="item-info">
            <div class="item-nome">${d.nome} ${d.cid ? `<span style="font-size:11px;color:var(--cinza)">(${d.cid})</span>` : ''}</div>
            <div class="item-sub">${d.data_diagnostico ? formatarData(d.data_diagnostico) : ''} ${d.observacoes ? '· ' + d.observacoes : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge ${d.status === 'Curado' ? 'badge-ok' : d.status === 'Controlado' ? 'badge-pendente' : 'badge-atrasado'}">${d.status}</span>
            <button onclick="excluirDoenca(${d.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma doença registrada</p>';
  } catch (e) { console.log('Erro doenças:', e); }
}

async function salvarDoenca() {
  const nome = document.getElementById('doe-nome').value.trim();
  if (!nome) return alerta('Digite o nome da doença');
  try {
    await api('POST', '/api/historico/doencas', {
      membro_id: APP.membroId,
      nome,
      cid: document.getElementById('doe-cid').value.trim(),
      data_diagnostico: document.getElementById('doe-data').value,
      status: document.getElementById('doe-status').value,
      observacoes: document.getElementById('doe-obs').value.trim()
    });
    fecharModal('modal-add-doenca');
    ['doe-nome','doe-cid','doe-data','doe-obs'].forEach(id => document.getElementById(id).value = '');
    carregarDoencas();
  } catch (e) { alerta('Erro ao salvar'); }
}

async function excluirDoenca(id) {
  if (!confirm('Excluir doença?')) return;
  await api('DELETE', `/api/historico/doencas/${id}`);
  carregarDoencas();
}

async function carregarTratamentos() {
  try {
    const res = await api('GET', `/api/historico/tratamentos/${APP.membroId}`);
    const lista = document.getElementById('lista-tratamentos');
    lista.innerHTML = res.length
      ? res.map(t => `
        <div class="item-lista">
          <span style="font-size:24px">💉</span>
          <div class="item-info">
            <div class="item-nome">${t.descricao}</div>
            <div class="item-sub">${t.tipo} ${t.data_inicio ? '· ' + formatarData(t.data_inicio) : ''} ${t.doenca_nome ? '· ' + t.doenca_nome : ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge ${t.status === 'Concluído' ? 'badge-ok' : t.status === 'Suspenso' ? 'badge-atrasado' : 'badge-pendente'}">${t.status}</span>
            <button onclick="excluirTratamento(${t.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum tratamento registrado</p>';
  } catch (e) { console.log('Erro tratamentos:', e); }
}

async function salvarTratamento() {
  const desc = document.getElementById('tra-desc').value.trim();
  if (!desc) return alerta('Digite a descrição do tratamento');
  try {
    await api('POST', '/api/historico/tratamentos', {
      membro_id: APP.membroId,
      tipo: document.getElementById('tra-tipo').value,
      descricao: desc,
      data_inicio: document.getElementById('tra-inicio').value,
      data_fim: document.getElementById('tra-fim').value,
      status: document.getElementById('tra-status').value,
      observacoes: document.getElementById('tra-obs').value.trim()
    });
    fecharModal('modal-add-tratamento');
    ['tra-desc','tra-inicio','tra-fim','tra-obs'].forEach(id => document.getElementById(id).value = '');
    carregarTratamentos();
  } catch (e) { alerta('Erro ao salvar'); }
}

async function excluirTratamento(id) {
  if (!confirm('Excluir tratamento?')) return;
  await api('DELETE', `/api/historico/tratamentos/${id}`);
  carregarTratamentos();
}

async function carregarInternacoes() {
  try {
    const res = await api('GET', `/api/historico/internacoes/${APP.membroId}`);
    const lista = document.getElementById('lista-internacoes');
    lista.innerHTML = res.length
      ? res.map(i => `
        <div class="item-lista" style="flex-direction:column;align-items:flex-start;gap:10px">
          <div style="display:flex;align-items:center;gap:12px;width:100%">
            <span style="font-size:24px">🏨</span>
            <div class="item-info">
              <div class="item-nome">${i.hospital || 'Hospital não informado'}</div>
              <div class="item-sub">${i.motivo || ''} ${i.data_entrada ? '· ' + formatarData(i.data_entrada) : ''} ${i.data_saida ? '→ ' + formatarData(i.data_saida) : ''}</div>
            </div>
            <button onclick="excluirInternacao(${i.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza);flex-shrink:0">🗑️</button>
          </div>
          <button onclick="abrirProntuarios(${i.id})" style="background:#e8f7f1;border:none;border-radius:10px;padding:8px 14px;font-family:'Sora',sans-serif;font-size:12px;font-weight:700;color:var(--verde-escuro);cursor:pointer;width:100%">📋 Ver/Anexar Prontuários</button>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma internação registrada</p>';
  } catch (e) { console.log('Erro internações:', e); }
}

let fotosInternacaoPendentes = [];

function previewFotosInternacao(input) {
  fotosInternacaoPendentes = [];
  const preview = document.getElementById('int-fotos-preview');
  preview.innerHTML = '';
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      fotosInternacaoPendentes.push({ dados: e.target.result, nome: file.name, tipo: file.type });
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:64px;height:64px;object-fit:cover;border-radius:10px;border:2px solid var(--verde)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

async function salvarInternacao() {
  const hospital = document.getElementById('int-hospital').value.trim();
  if (!hospital) return alerta('Digite o nome do hospital');
  try {
    const internacao = await api('POST', '/api/historico/internacoes', {
      membro_id: APP.membroId,
      hospital,
      motivo: document.getElementById('int-motivo').value.trim(),
      data_entrada: document.getElementById('int-entrada').value,
      data_saida: document.getElementById('int-saida').value,
      observacoes: document.getElementById('int-obs').value.trim()
    });
    if (fotosInternacaoPendentes.length > 0) {
      for (const foto of fotosInternacaoPendentes) {
        await api('POST', '/api/prontuarios', {
          internacao_id: internacao.id,
          membro_id: APP.membroId,
          nome_arquivo: foto.nome,
          dados: foto.dados,
          tipo: foto.tipo
        });
      }
      fotosInternacaoPendentes = [];
    }
    fecharModal('modal-add-internacao');
    ['int-hospital','int-motivo','int-entrada','int-saida','int-obs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('int-fotos-preview').innerHTML = '';
    document.getElementById('int-fotos').value = '';
    carregarInternacoes();
  } catch (e) { alerta('Erro ao salvar: ' + e.message); }
}

async function excluirInternacao(id) {
  if (!confirm('Excluir internação?')) return;
  await api('DELETE', `/api/historico/internacoes/${id}`);
  carregarInternacoes();
}

// ── PRONTUÁRIOS ──
let prontuariosInternacaoId = null;
let prontuariosParaSalvar = [];

async function abrirProntuarios(internacaoId) {
  prontuariosInternacaoId = internacaoId;
  prontuariosParaSalvar = [];
  document.getElementById('pront-preview').innerHTML = '';
  document.getElementById('btn-salvar-pront').style.display = 'none';
  document.getElementById('pront-input').value = '';

  const lista = document.getElementById('prontuarios-lista');
  lista.innerHTML = '<p style="color:var(--cinza);font-size:13px">Carregando...</p>';

  try {
    const res = await api('GET', `/api/prontuarios/${internacaoId}`);
    if (res.length) {
      lista.innerHTML = res.map(p => `
        <div style="position:relative;width:80px;height:80px">
          <img src="#" data-id="${p.id}" onclick="verProntuario(${p.id})"
            style="width:80px;height:80px;object-fit:cover;border-radius:10px;cursor:pointer;background:#f0ede7"
            onload="this.style.background='transparent'">
          <button onclick="excluirProntuario(${p.id})" style="position:absolute;top:-6px;right:-6px;background:#e53e3e;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>
        </div>`).join('');

      // Carregar miniaturas
      res.forEach(async p => {
        try {
          const img = await api('GET', `/api/prontuarios/imagem/${p.id}`);
          const el = lista.querySelector(`img[data-id="${p.id}"]`);
          if (el) el.src = img.dados;
        } catch(e) {}
      });
    } else {
      lista.innerHTML = '<p style="color:var(--cinza);font-size:13px">Nenhum prontuário anexado</p>';
    }
  } catch (e) {
    lista.innerHTML = '<p style="color:var(--cinza);font-size:13px">Nenhum prontuário ainda</p>';
  }

  abrirModal('modal-prontuarios');
}

function previewProntuarios(input) {
  const preview = document.getElementById('pront-preview');
  preview.innerHTML = '';
  prontuariosParaSalvar = [];

  const files = Array.from(input.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      prontuariosParaSalvar.push({ dados: e.target.result, nome: file.name, tipo: file.type });
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width:70px;height:70px;object-fit:cover;border-radius:10px;border:2px solid var(--verde)';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-salvar-pront').style.display = files.length ? 'flex' : 'none';
}

async function salvarProntuarios() {
  if (!prontuariosParaSalvar.length) return;
  const btn = document.getElementById('btn-salvar-pront');
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  try {
    for (const p of prontuariosParaSalvar) {
      await api('POST', '/api/prontuarios', {
        internacao_id: prontuariosInternacaoId,
        membro_id: APP.membroId,
        nome_arquivo: p.nome,
        dados: p.dados,
        tipo: p.tipo
      });
    }
    prontuariosParaSalvar = [];
    document.getElementById('pront-preview').innerHTML = '';
    document.getElementById('pront-input').value = '';
    btn.style.display = 'none';
    btn.textContent = '📤 Enviar fotos';
    btn.disabled = false;
    await abrirProntuarios(prontuariosInternacaoId);
  } catch (e) {
    alerta('Erro ao salvar prontuários');
    btn.textContent = '📤 Enviar fotos';
    btn.disabled = false;
  }
}

async function verProntuario(id) {
  try {
    const res = await api('GET', `/api/prontuarios/imagem/${id}`);
    const win = window.open('', '_blank');
    win.document.write(`<img src="${res.dados}" style="max-width:100%;height:auto">`);
  } catch (e) {
    alerta('Erro ao abrir prontuário');
  }
}

async function excluirProntuario(id) {
  if (!confirm('Excluir este prontuário?')) return;
  await api('DELETE', `/api/prontuarios/${id}`);
  await abrirProntuarios(prontuariosInternacaoId);
}

// ── MÓDULO TEA ADMIN ──
let membroTEAId = null;
Object.defineProperty(window, "membroTEAId", { get: () => membroTEAId, set: v => { membroTEAId = v; } });

function trocarAbaTEAAdmin(aba) {
  ['rotina','humor','crises'].forEach(a => {
    document.getElementById(`tea-admin-${a}`).style.display = a === aba ? 'block' : 'none';
    document.getElementById(`aba-tea-${a}`).classList.toggle('ativa', a === aba);
  });
  if (aba === 'rotina') carregarRotinaAdmin();
  if (aba === 'humor') carregarHumorTEA();
  if (aba === 'crises') carregarCrisesTEA();
}

async function carregarRotinaAdmin() {
  const id = membroTEAId || APP.membroId;
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const res = await api('GET', `/api/rotina-tea/${id}?data=${hoje}`);
    const lista = document.getElementById('lista-rotina-admin');
    lista.innerHTML = res.length
      ? res.map(r => `
        <div class="item-lista">
          <span style="font-size:28px">${r.emoji || '📌'}</span>
          <div class="item-info">
            <div class="item-nome">${r.atividade}</div>
            <div class="item-sub">${r.hora || ''} · Ordem: ${r.ordem}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span class="badge ${r.concluida ? 'badge-ok' : 'badge-pendente'}">${r.concluida ? '✓ Feito' : 'Pendente'}</span>
            <button onclick="excluirRotinaItem(${r.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma atividade cadastrada</p>';
  } catch(e) { console.log('Erro rotina:', e); }
}

async function salvarRotinaTEA() {
  const atividade = document.getElementById('rot-atividade').value.trim();
  if (!atividade) return alerta('Digite a atividade');
  const id = membroTEAId || APP.membroId;
  try {
    await api('POST', '/api/rotina-tea', {
      membro_id: id,
      atividade,
      emoji: document.getElementById('rot-emoji').value.trim() || '📌',
      hora: document.getElementById('rot-hora').value,
      ordem: document.getElementById('rot-ordem').value || 0,
      data: new Date().toISOString().split('T')[0]
    });
    fecharModal('modal-add-rotina');
    ['rot-emoji','rot-atividade','rot-hora','rot-ordem'].forEach(i => document.getElementById(i).value = '');
    carregarRotinaAdmin();
  } catch(e) { alerta('Erro ao salvar'); }
}

async function excluirRotinaItem(id) {
  if (!confirm('Excluir atividade?')) return;
  await api('DELETE', `/api/rotina-tea/${id}`);
  carregarRotinaAdmin();
}

async function carregarHumorTEA() {
  const id = membroTEAId || APP.membroId;
  try {
    const res = await api('GET', `/api/sinais/${id}?tipo=humor_tea`);
    const lista = document.getElementById('lista-humor-tea');
    lista.innerHTML = res.length
      ? res.slice(0,10).map(s => `
        <div class="item-lista">
          <span style="font-size:32px">${s.unidade || '😐'}</span>
          <div class="item-info">
            <div class="item-nome">${s.observacoes || 'Humor registrado'}</div>
            <div class="item-sub">${formatarHora(s.criado_em)}</div>
          </div>
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhum humor registrado</p>';
  } catch(e) { console.log('Erro humor:', e); }
}

async function carregarCrisesTEA() {
  const id = membroTEAId || APP.membroId;
  try {
    const res = await api('GET', `/api/rotina-tea/crises/${id}`);
    const lista = document.getElementById('lista-crises-tea');
    lista.innerHTML = res.length
      ? res.map(c => `
        <div class="item-lista" style="flex-direction:column;align-items:flex-start;gap:8px">
          <div style="display:flex;align-items:center;gap:12px;width:100%">
            <span style="font-size:24px">⚡</span>
            <div class="item-info">
              <div class="item-nome">${c.gatilho || 'Crise registrada'}</div>
              <div class="item-sub">${c.data_hora ? formatarDataHoraTEA(c.data_hora) : ''} ${c.duracao_min ? '· '+c.duracao_min+' min' : ''}</div>
            </div>
            <button onclick="excluirCrise(${c.id})" style="background:none;border:none;font-size:14px;cursor:pointer;color:var(--cinza)">🗑️</button>
          </div>
          ${c.ajudou ? `<div style="font-size:12px;color:var(--verde);padding-left:36px">💡 ${c.ajudou}</div>` : ''}
        </div>`).join('')
      : '<p style="color:var(--cinza);font-size:14px;text-align:center;padding:24px">Nenhuma crise registrada</p>';
  } catch(e) { console.log('Erro crises:', e); }
}

async function salvarCriseTEA() {
  const id = membroTEAId || APP.membroId;
  try {
    await api('POST', '/api/rotina-tea/crises', {
      membro_id: id,
      data_hora: document.getElementById('crise-data').value,
      duracao_min: document.getElementById('crise-duracao').value,
      gatilho: document.getElementById('crise-gatilho').value.trim(),
      ajudou: document.getElementById('crise-ajudou').value.trim(),
      observacoes: document.getElementById('crise-obs').value.trim()
    });
    fecharModal('modal-add-crise');
    ['crise-data','crise-duracao','crise-gatilho','crise-ajudou','crise-obs'].forEach(i => document.getElementById(i).value = '');
    carregarCrisesTEA();
  } catch(e) { alerta('Erro ao salvar'); }
}

async function excluirCrise(id) {
  if (!confirm('Excluir registro?')) return;
  await api('DELETE', `/api/rotina-tea/crises/${id}`);
  carregarCrisesTEA();
}

function formatarDataHoraTEA(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

// ── CHAMADA SOS WEBRTC ──
let _sosPC = null;
let _sosStream = null;
let _sosTimer = null;
let _sosChamando = false;

async function iniciarChamadaSOS() {
  try {
    _sosStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _sosPC = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    _sosStream.getTracks().forEach(t => _sosPC.addTrack(t, _sosStream));
    _sosPC.onicecandidate = (e) => {
      if (e.candidate) APP.socket.emit('sos-ice', { familiaId: APP.familiaId, candidate: e.candidate });
    };
    _sosPC.ontrack = (e) => {
      const audio = document.getElementById('audio-remoto');
      audio.srcObject = e.streams[0];
      audio.play().catch(err => console.log('audio play erro:', err));
    };
    const offer = await _sosPC.createOffer();
    await _sosPC.setLocalDescription(offer);
    APP.socket.emit('sos-chamar', { familiaId: APP.familiaId, nome: APP.membroNome, offer });
    mostrarTelaChamada('chamando');
    _sosChamando = true;
  } catch(e) {
    alerta('Erro ao acessar microfone: ' + e.message);
  }
}

async function atenderChamadaSOS() {
  try {
    _sosStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _sosStream.getTracks().forEach(t => _sosPC.addTrack(t, _sosStream));
    _sosPC.ontrack = (e) => {
      const audio = document.getElementById('audio-remoto');
      if (e.streams && e.streams[0]) {
        audio.srcObject = e.streams[0];
        audio.play().catch(err => console.log('audio play erro:', err));
      }
    };
    const answer = await _sosPC.createAnswer();
    await _sosPC.setLocalDescription(answer);
    APP.socket.emit('sos-answer', { familiaId: APP.familiaId, answer });
    mostrarTelaChamada('conectado');
    iniciarTimerChamada();
  } catch(e) {
    alerta('Erro ao atender: ' + e.message);
  }
}

function encerrarChamadaSOS() {
  if (!_sosPC && !_sosStream) { fecharTelaChamada(); return; }
  if (_sosPC) { _sosPC.close(); _sosPC = null; }
  if (_sosStream) { _sosStream.getTracks().forEach(t => t.stop()); _sosStream = null; }
  if (_sosTimer) { clearInterval(_sosTimer); _sosTimer = null; }
  APP.socket.emit('sos-encerrar', { familiaId: APP.familiaId });
  fecharTelaChamada();
  _sosChamando = false;
}

function mostrarTelaChamada(estado) {
  const tela = document.getElementById('tela-chamada-sos');
  tela.style.display = 'flex';
  if (estado === 'chamando') {
    document.getElementById('chamada-titulo').textContent = '🚨 Chamada SOS';
    document.getElementById('chamada-sub').textContent = 'Chamando familiares...';
    document.getElementById('btn-atender').style.display = 'none';
  } else if (estado === 'recebendo') {
    document.getElementById('chamada-titulo').textContent = '🚨 SOS de ' + (window._sosNomeQuemChamou || 'familiar');
    document.getElementById('chamada-sub').textContent = 'Toque para atender';
    document.getElementById('btn-atender').style.display = 'flex';
  } else if (estado === 'conectado') {
    document.getElementById('chamada-titulo').textContent = '📞 Chamada ativa';
    document.getElementById('chamada-sub').textContent = 'Conectado';
    document.getElementById('btn-atender').style.display = 'none';
  }
}

function fecharTelaChamada() {
  document.getElementById('tela-chamada-sos').style.display = 'none';
  document.getElementById('chamada-timer').textContent = '';
}

function iniciarTimerChamada() {
  let seg = 0;
  _sosTimer = setInterval(() => {
    seg++;
    const m = String(Math.floor(seg/60)).padStart(2,'0');
    const s = String(seg%60).padStart(2,'0');
    document.getElementById('chamada-timer').textContent = m + ':' + s;
  }, 1000);
}

// Eventos Socket.io para chamada SOS
function registrarEventosSOS() {
  APP.socket.on('sos-recebendo', async (data) => {
    window._sosNomeQuemChamou = data.nome;
    _sosPC = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    _sosPC.onicecandidate = (e) => {
      if (e.candidate) APP.socket.emit('sos-ice', { familiaId: APP.familiaId, candidate: e.candidate });
    };
    _sosPC.ontrack = (e) => {
      const audio = document.getElementById('audio-remoto');
      if (e.streams && e.streams[0]) {
        audio.srcObject = e.streams[0];
        audio.play().catch(err => console.log('audio play erro:', err));
      }
    };
    await _sosPC.setRemoteDescription(new RTCSessionDescription(data.offer));
    mostrarTelaChamada('recebendo');
  });
  APP.socket.on('sos-answer', async (data) => {
    if (_sosPC) {
      await _sosPC.setRemoteDescription(new RTCSessionDescription(data.answer));
      mostrarTelaChamada('conectado');
      iniciarTimerChamada();
    }
  });
  APP.socket.on('sos-ice', async (data) => {
    if (_sosPC && data.candidate) {
      await _sosPC.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });
  APP.socket.on('sos-encerrado', () => {
    if (_sosPC) { _sosPC.close(); _sosPC = null; }
    if (_sosStream) { _sosStream.getTracks().forEach(t => t.stop()); _sosStream = null; }
    if (_sosTimer) { clearInterval(_sosTimer); _sosTimer = null; }
    fecharTelaChamada();
    _sosChamando = false;
  });
}

// ── SOS COMPLETO — um toque dispara tudo ──
async function iniciarSOSCompleto() {
  // 1. Dispara alerta para família
  if (APP.socket) {
    APP.socket.emit('emergencia', {
      familiaId: APP.familiaId,
      nome: APP.membroNome || 'Familiar',
      tipo: 'SOS',
      mensagem: '🚨 EMERGÊNCIA! ' + (APP.membroNome || 'Familiar') + ' precisa de ajuda!'
    });
  }
  // 2. Envia push para família
  try {
    await api('POST', '/api/push/enviar-familia', {
      familia_id: APP.familiaId,
      titulo: '🚨 EMERGÊNCIA!',
      corpo: (APP.membroNome || 'Familiar') + ' precisa de ajuda imediata!',
      url: '/#emergencia'
    });
  } catch(e) { console.log('Push erro:', e); }
  // 3. Inicia chamada de voz automaticamente
  await iniciarChamadaSOS();
}
