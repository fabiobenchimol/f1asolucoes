// ==========================================
// MÓDULO DE PROPOSTAS E CÁLCULOS (propostas.js)
// ==========================================

function formatarMoedaVisual(valorNum) {
    let v = parseFloat(valorNum);
    if (isNaN(v) || v === null) return "R$ 0,00";
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function converterParaFloat(valorStr) {
    if (typeof valorStr === 'number') return valorStr;
    if (!valorStr) return 0;
    let limpo = valorStr.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
}

const formatarMoedaF1A = (val) => "R$ " + parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Correção SaaS: Pegando o nome direto do Cérebro (auth.js)
function criarRegistroHistorico(acaoDetalhe) { 
    const nomeU = (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado) ? dadosUsuarioLogado.nome : "Usuário F1A";
    return { acao: acaoDetalhe, usuario: nomeU, data: new Date().toLocaleString('pt-BR') }; 
}

let isFirstLoad = true;
let todasPropostasGlobal = []; 
let paginaAtualPropostas = 1;
const itensPorPagina = 50;
let redesGlobalMap = {}; 

// ==========================================
// GATILHO DE INICIALIZAÇÃO (Conecta com o auth.js)
// ==========================================
window.posAuthCallback = function() {
    if (document.querySelector('.tabela-dados') && document.getElementById('listaPropostas')) {
        carregarPropostas();
    }
    // Se estivermos na tela de Remessas, tentamos chamar a função dela também!
    if (typeof carregarRemessas === 'function') {
        carregarRemessas();
    }
};

window.carregarPropostas = function() {
    const table = document.querySelector('.tabela-dados');
    if (!table) return;

    try {
        let redesQuery = db.collection("redes");
        if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
            redesQuery = redesQuery.where("empresaId", "==", dadosUsuarioLogado.empresaId);
        }

        redesQuery.onSnapshot((redesSnap) => {
            redesGlobalMap = {};
            redesSnap.forEach(r => { 
                const d = r.data();
                if (perfilUsuario === 'master' && dadosUsuarioLogado.empresaId) {
                    if (d.empresaId !== dadosUsuarioLogado.empresaId) return; 
                }
                redesGlobalMap[r.id] = d; 
            });
            if (todasPropostasGlobal.length > 0) renderizarTabelaPaginada();
        });
    } catch (e) {}

    let query = db.collection("propostas");
    if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) { 
        query = query.where("empresaId", "==", dadosUsuarioLogado.empresaId); 
    }

    query.onSnapshot((snapshot) => {
        try {
            let propostas = [];
            snapshot.forEach(doc => { 
                const d = doc.data();
                if (perfilUsuario === 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
                    if (d.empresaId !== dadosUsuarioLogado.empresaId) return; 
                }
                propostas.push({ id: doc.id, ...d }); 
            });

            // Ordena da mais recente para a mais antiga
            propostas.sort((a, b) => {
                const tA = a.criadoEm && typeof a.criadoEm.toMillis === 'function' ? a.criadoEm.toMillis() : 0;
                const tB = b.criadoEm && typeof b.criadoEm.toMillis === 'function' ? b.criadoEm.toMillis() : 0;
                return tB - tA;
            });

            // --- MASTER VISION: LENDO A MEMÓRIA DO LOBBY ---
            const visaoSimulada = sessionStorage.getItem('f1a_simulated_uid');

            todasPropostasGlobal = propostas.filter((d) => {
                const h = d.hierarquia || {}; 

                // 1. REGRA DO MASTER VISION (Simulação Audível)
                if (perfilUsuario === 'master' && visaoSimulada) {
                    if (h.vendedorId !== visaoSimulada && h.gerenteId !== visaoSimulada && d.criadoPorId !== visaoSimulada) {
                        return false; 
                    }
                }

                // 2. REGRAS NORMAIS DO SISTEMA
                if (perfilUsuario === 'gerente' && (h.gerenteId !== usuarioLogado.uid && d.gerenteId !== usuarioLogado.uid && d.criadoPorId !== usuarioLogado.uid)) return false;
                if (perfilUsuario === 'vendedor' && (h.vendedorId !== usuarioLogado.uid && d.vendedorId !== usuarioLogado.uid && d.criadoPorId !== usuarioLogado.uid)) return false;
                
                return true; // Se passou pelas barreiras, exibe na tabela
            });

            isFirstLoad = false;
            renderizarTabelaPaginada();

        } catch (e) { console.error("Erro na tabela:", e); }
    });
}

function renderizarTabelaPaginada() {
    const table = document.querySelector('.tabela-dados');
    if (!table) return;

    const totalItens = todasPropostasGlobal.length;
    const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;
    if (paginaAtualPropostas > totalPaginas) paginaAtualPropostas = totalPaginas;

    const inicio = (paginaAtualPropostas - 1) * itensPorPagina;
    const propostasDaPagina = todasPropostasGlobal.slice(inicio, inicio + itensPorPagina);

    const checkboxHeader = (perfilUsuario === 'admin' || perfilUsuario === 'gerente' || perfilUsuario === 'master') 
        ? `<th class="col-check" style="width: 30px; text-align: center;"><input type="checkbox" id="checkMarcarTodos" onclick="marcarTodasPropostas(this)" style="cursor: pointer; width: 14px; height: 14px; accent-color: var(--cor-primaria);"></th>` : '';

    let htmlTable = `<thead><tr>${checkboxHeader}<th style="width: 90px;">Data/Hora</th><th>Rede</th><th class="col-codigo" style="font-size: 11px;">Proposta</th><th>Detalhes</th><th class="col-status">Status</th><th>Comissão</th><th class="col-acoes" style="width: 80px;">Ações</th></tr></thead><tbody id="listaPropostas">`;

    if (totalItens === 0) { 
        table.innerHTML = htmlTable + `<tr><td colspan="8" style="text-align:center; padding: 30px;">Nenhuma proposta encontrada neste ambiente.</td></tr></tbody>`; 
        document.getElementById('containerPaginacao')?.remove(); return; 
    }
    
    let linhasHtml = "";
    propostasDaPagina.forEach((d) => {
        const h = d.hierarquia || {}; const badge = `badge-${d.status}`;
        const valorComissao = parseFloat(d.comissao) || parseFloat(h.valorComissao) || parseFloat(d.valor) || 0;
        const comissaoExibicao = formatarMoedaF1A(valorComissao);
        
        let vExibido = "+ " + comissaoExibicao; 
        if(d.status === 'pendente') vExibido = "Em Análise"; 
        if(d.status === 'recusada' || d.status === 'cancelada') vExibido = comissaoExibicao;

        let dataStr = "-";
        if (d.criadoEm && d.criadoEm.toDate) {
            const dataBase = d.criadoEm.toDate();
            dataStr = `${String(dataBase.getDate()).padStart(2, '0')}/${String(dataBase.getMonth() + 1).padStart(2, '0')}/${dataBase.getFullYear()}<br><span style="font-size: 9px; color: var(--cor-texto);">${String(dataBase.getHours()).padStart(2, '0')}:${String(dataBase.getMinutes()).padStart(2, '0')}</span>`;
        }

        let codNumerico = String(d.codigo || '').replace(/\D/g, ''); if (!codNumerico) codNumerico = '0';
        const codFormatado = codNumerico.padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');

        const redeRef = h.redeId ? (redesGlobalMap[h.redeId] || {}) : {};
        const codigoRedeTab = redeRef.codigo ? redeRef.codigo.toUpperCase() : '-';
        const nomeRedeTab = (h.redeNome && h.redeNome !== 'undefined' && h.redeNome !== 'Rede Não Informada') ? h.redeNome.toUpperCase() : 'REDE PENDENTE';

        let acoes = ''; let checkboxStr = '';

        if (perfilUsuario === 'admin' || perfilUsuario === 'gerente' || perfilUsuario === 'master') {
            let botoesAcao = '';
            if (d.status === 'pendente') {
                checkboxStr = `<td class="col-check" style="text-align: center;" onclick="event.stopPropagation();"><input type="checkbox" class="check-massa" value="${d.id}" style="width: 14px; height: 14px; accent-color: var(--cor-primaria);"></td>`;
                botoesAcao += `<button style="color: #10b981;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'aprovada')">✅ Aprovar</button><button style="color: #ef4444;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'recusada')">❌ Recusar</button>`;
            } else if (d.status === 'aprovada') {
                checkboxStr = `<td class="col-check"></td>`;
                botoesAcao += `<button style="color: #8b5cf6;" onclick="event.stopPropagation(); abrirModalAgendamento('${d.id}')">📅 Agendar Pag.</button><button style="color: #10b981;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'paga')">💰 Marcar Pago</button><button style="color: #ef4444;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'cancelada')">🚫 Cancelar</button>`;
            } else if (d.status === 'agendada') {
                checkboxStr = `<td class="col-check"></td>`;
                botoesAcao += `<button style="color: #f59e0b;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'aprovada')">⏪ Desagendar</button>`;
            } else {
                checkboxStr = `<td class="col-check"></td>`;
                botoesAcao += `<button style="color: #3b82f6;" onclick="event.stopPropagation(); alterarStatusDireto('${d.id}', 'pendente')">🔄 Reativar</button>`;
            }
            if (perfilUsuario === 'master') botoesAcao += `<button style="color: #ef4444;" onclick="event.stopPropagation(); excluirPropostaMaster('${d.id}')">🗑️ Excluir Definitivo</button>`;

            acoes = `<div class="dropdown-f1a"><button class="dropbtn-f1a" onclick="toggleDropdownF1A(event, '${d.id}')">Ações <span>▼</span></button><div id="drop-${d.id}" class="dropdown-content-f1a">${botoesAcao}</div></div>`;
        } else if (perfilUsuario === 'vendedor') { acoes = `<span style="font-size: 10px; color: var(--cor-texto);">Sem Ações</span>`; }

        let bordero = d.status === 'agendada' && d.borderoNome ? `<div class="info-bordero" style="margin-top: 2px; font-size: 9px;">${d.borderoNome} | Venc: ${d.dataAgendamento}</div>` : '';
        const nomeLojaTab = (h.lojaNome && h.lojaNome !== 'undefined') ? h.lojaNome : 'Loja Pendente';
        const nomeVendTab = (h.vendedorNome && h.vendedorNome !== 'undefined') ? h.vendedorNome : 'Vend. Pendente';

        linhasHtml += `<tr onclick="abrirDetalhesProposta('${d.id}')" style="cursor:pointer;">
            ${checkboxStr}
            <td style="color: var(--cor-texto); line-height: 1.3;">${dataStr}</td>
            <td style="font-weight: bold; font-size: 10px; color: var(--cor-titulo);"><span style="color: var(--cor-primaria); font-size: 11px;">${codigoRedeTab}</span><br>${nomeRedeTab}</td>
            <td class="col-codigo" style="color: var(--cor-primaria); font-family: monospace; font-size: 12px; font-weight: bold;">${codFormatado}</td>
            <td><div style="font-size: 10px; line-height: 1.3; font-weight: bold;">${d.cliente || '-'}</div><div style="font-size: 9px; line-height: 1.2; margin-top: 2px; color: var(--cor-texto);">🏬 ${nomeLojaTab}<br>👤 ${nomeVendTab}</div></td>
            <td class="col-status"><span class="status-badge ${badge}" style="font-size: 9px; padding: 4px 6px;">${(d.status||'').toUpperCase()}</span></td>
            <td><div class="proposta-valor valor-${d.status}">${vExibido}</div>${bordero}</td>
            <td class="col-acoes" onclick="event.stopPropagation();">${acoes}</td>
        </tr>`;
    });

    htmlTable += linhasHtml + `</tbody>`; table.innerHTML = htmlTable;
    if(typeof verificarCheckboxesSelecionados === 'function') verificarCheckboxesSelecionados(); 
    renderizarControlesPaginacao(totalPaginas);
}

function renderizarControlesPaginacao(totalPaginas) {
    let container = document.getElementById('containerPaginacao');
    const paiTabela = document.querySelector('.tabela-container') ? document.querySelector('.tabela-container').parentElement : null;
    if (!container && paiTabela) { container = document.createElement('div'); container.id = 'containerPaginacao'; container.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px 0; margin-top: 10px; border-top: 1px solid var(--borda);"; paiTabela.appendChild(container); }
    if (totalPaginas <= 1 && container) { container.style.display = 'none'; return; }
    if (container) {
        container.style.display = 'flex';
        container.innerHTML = `<span style="font-size: 13px; color: var(--cor-texto);">Página <strong>${paginaAtualPropostas}</strong> de <strong>${totalPaginas}</strong> (${todasPropostasGlobal.length} propostas)</span><div style="display: flex; gap: 10px;"><button class="btn-salvar" style="margin:0; padding: 6px 12px; background: ${paginaAtualPropostas === 1 ? 'var(--borda)' : 'var(--cor-primaria)'}; cursor: ${paginaAtualPropostas === 1 ? 'not-allowed' : 'pointer'};" onclick="mudarPagina(-1)" ${paginaAtualPropostas === 1 ? 'disabled' : ''}>Anterior</button><button class="btn-salvar" style="margin:0; padding: 6px 12px; background: ${paginaAtualPropostas === totalPaginas ? 'var(--borda)' : 'var(--cor-primaria)'}; cursor: ${paginaAtualPropostas === totalPaginas ? 'not-allowed' : 'pointer'};" onclick="mudarPagina(1)" ${paginaAtualPropostas === totalPaginas ? 'disabled' : ''}>Próxima</button></div>`;
    }
}
window.mudarPagina = function(direcao) { paginaAtualPropostas += direcao; renderizarTabelaPaginada(); document.querySelector('.content-area').scrollTo({ top: 0, behavior: 'smooth' }); }

window.marcarTodasPropostas = function(checkboxGeral) { document.querySelectorAll('.check-massa').forEach(c => c.checked = checkboxGeral.checked); verificarCheckboxesSelecionados(); }
document.addEventListener('change', function(e) { if(e.target && e.target.classList.contains('check-massa')) { verificarCheckboxesSelecionados(); if(!e.target.checked) document.getElementById('checkMarcarTodos').checked = false; }});

function verificarCheckboxesSelecionados() {
    const selecionados = document.querySelectorAll('.check-massa:checked'); let barra = document.getElementById('barraAcoesMassa');
    if(selecionados.length > 0) {
        if(!barra) {
            barra = document.createElement('div'); barra.id = 'barraAcoesMassa'; barra.className = 'barra-acoes-massa';
            barra.innerHTML = `<span id="txtContadorMassa" style="font-weight:bold;">${selecionados.length} selecionadas</span><button class="btn-salvar" style="margin:0; background:#10b981; padding: 6px 15px; font-size:13px;" onclick="acaoEmMassa('aprovada')">✅ Aprovar Todas</button><button class="btn-salvar" style="margin:0; background:#ef4444; padding: 6px 15px; font-size:13px;" onclick="acaoEmMassa('recusada')">❌ Recusar Todas</button>`;
            document.body.appendChild(barra);
        } else { document.getElementById('txtContadorMassa').innerText = `${selecionados.length} selecionadas`; }
    } else if (barra) { barra.remove(); }
}

window.acaoEmMassa = async function(novoStatus) {
    const checks = document.querySelectorAll('.check-massa:checked'); if(checks.length === 0) return;
    const txtAcao = novoStatus === 'aprovada' ? 'APROVAR' : 'RECUSAR';
    if(!confirm(`Confirma ${txtAcao} as ${checks.length} propostas selecionadas?`)) return;
    const batch = db.batch(); let propostasZeradasIgnoradas = 0;
    
    // Fallback caso a função mostrarToast não exista no seu ui.js
    const notificar = typeof mostrarToast === 'function' ? mostrarToast : alert;

    for (let check of checks) {
        const ref = db.collection("propostas").doc(check.value);
        if (novoStatus === 'aprovada') {
            const docSnap = await ref.get(); const d = docSnap.data();
            if ((parseFloat(d.comissao) || parseFloat(d.hierarquia?.valorComissao) || 0) <= 0) { propostasZeradasIgnoradas++; continue; }
        }
        batch.update(ref, { status: novoStatus, historico: firebase.firestore.FieldValue.arrayUnion(criarRegistroHistorico(`Alterada para ${novoStatus.toUpperCase()} (Em Massa)`)) });
    }
    await batch.commit(); document.getElementById('checkMarcarTodos').checked = false; verificarCheckboxesSelecionados();
    if (propostasZeradasIgnoradas > 0) alert(`⚠️ ${propostasZeradasIgnoradas} proposta(s) ignoradas pois a comissão está zerada.`); else notificar(`Processado com sucesso!`);
}

window.abrirModal = function() { 
    document.getElementById("modalNovaProposta").classList.remove("escondido"); 
    carregarSelectsModalProposta(); 
}
window.fecharModal = function() { document.getElementById("modalNovaProposta").classList.add("escondido"); document.getElementById("formProposta").reset(); }

function carregarSelectsModalProposta() {
    const area = document.getElementById("areaSelecaoHierarquia");
    const bGer = document.getElementById("boxGerente");
    const bRede = document.getElementById("boxRede");
    const bLoja = document.getElementById("boxLoja");
    const bVend = document.getElementById("boxVendedor");

    if (!area) return;

    if (perfilUsuario === 'vendedor') {
        area.style.display = "none";
        return;
    }
    
    area.style.display = "block";

    if (perfilUsuario === 'admin' || perfilUsuario === 'master') {
        bGer.classList.remove("escondido");
        bRede.classList.remove("escondido");
        bLoja.classList.remove("escondido");
        bVend.classList.remove("escondido");
        carregarGerentesParaProposta();
    } else if (perfilUsuario === 'gerente') {
        bGer.classList.add("escondido"); 
        bRede.classList.remove("escondido");
        bLoja.classList.remove("escondido");
        bVend.classList.remove("escondido");
        carregarRedesParaProposta(dadosUsuarioLogado.id); 
    }
}

async function carregarGerentesParaProposta() {
    const sel = document.getElementById("propSelectGerente");
    let query = db.collection("usuarios").where("perfil", "==", "gerente");
    if(perfilUsuario !== 'master') query = query.where("empresaId", "==", dadosUsuarioLogado.empresaId);
    const snap = await query.get();
    sel.innerHTML = '<option value="">1. Selecione o Gerente</option>';
    snap.forEach(doc => { sel.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`; });
}

window.carregarRedesParaProposta = async function(gerenteForceId = null) {
    const gerenteId = gerenteForceId || document.getElementById("propSelectGerente").value;
    const sel = document.getElementById("propSelectRede");
    if (!gerenteId) return;
    const snap = await db.collection("redes").where("gerenteId", "==", gerenteId).get();
    sel.innerHTML = `<option value="">${perfilUsuario === 'admin' || perfilUsuario === 'master' ? '2.' : '1.'} Selecione a Rede</option>`;
    snap.forEach(doc => { sel.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`; });
}

window.carregarLojasParaProposta = async function() {
    const redeId = document.getElementById("propSelectRede").value;
    const sel = document.getElementById("propSelectLoja");
    if (!redeId) return;
    const snap = await db.collection("lojas").where("redeId", "==", redeId).get();
    sel.innerHTML = `<option value="">${perfilUsuario === 'admin' || perfilUsuario === 'master' ? '3.' : '2.'} Selecione a Loja</option>`;
    snap.forEach(doc => { sel.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`; });
}

window.carregarVendedoresParaProposta = async function() {
    const lojaId = document.getElementById("propSelectLoja").value;
    const sel = document.getElementById("propSelectVendedor");
    if (!lojaId) return;
    sel.innerHTML = '<option value="">Buscando vendedores...</option>';
    let vendedoresEncontrados = [];
    const snapVendedores = await db.collection("vendedores").get();
    snapVendedores.forEach(doc => { if (doc.data().lojaId == lojaId) vendedoresEncontrados.push({ id: doc.id, ...doc.data() }); });
    if (vendedoresEncontrados.length === 0) { 
        const snapUsuarios = await db.collection("usuarios").where("perfil", "==", "vendedor").get(); 
        snapUsuarios.forEach(doc => { if (doc.data().lojaId == lojaId) vendedoresEncontrados.push({ id: doc.id, ...doc.data() }); }); 
    }
    if (vendedoresEncontrados.length === 0) { sel.innerHTML = '<option value="">Nenhum vendedor nesta loja</option>'; return; }
    sel.innerHTML = `<option value="">${perfilUsuario === 'admin' || perfilUsuario === 'master' ? '4.' : '3.'} Selecione o Vendedor</option>`;
    vendedoresEncontrados.forEach(v => { sel.innerHTML += `<option value="${v.id}" data-empresa-id="${v.empresaId || ''}" data-loja-id="${v.lojaId}" data-loja-nome="${v.lojaNome}" data-rede-id="${v.redeId}" data-rede-nome="${v.redeNome}" data-gerente-id="${v.gerenteId}" data-comissao="${v.valorComissao || v.comissao}">${v.nome}</option>`; });
}

window.salvarNovaProposta = async function(event) {
    event.preventDefault();
    const btnSalvar = document.getElementById("btnSalvarProposta"); btnSalvar.innerText = "Processando..."; btnSalvar.disabled = true;
    const resetarBotao = () => { btnSalvar.innerText = "Salvar Proposta"; btnSalvar.disabled = false; };
    const codigo = document.getElementById("propCodigo").value; const cliente = document.getElementById("propCliente").value; const observacao = document.getElementById("propObservacao") ? document.getElementById("propObservacao").value : "";
    let hierarquia = {}; let idDaEmpresa = ""; 
    
    const notificar = typeof mostrarToast === 'function' ? mostrarToast : alert;

    if (perfilUsuario === 'vendedor') {
        hierarquia = { vendedorId: dadosUsuarioLogado.id, vendedorNome: dadosUsuarioLogado.nome, lojaId: dadosUsuarioLogado.lojaId || 'sem-loja', lojaNome: dadosUsuarioLogado.lojaNome || 'Loja Não Informada', redeId: dadosUsuarioLogado.redeId || 'sem-rede', redeNome: dadosUsuarioLogado.redeNome || 'Rede Não Informada', gerenteId: dadosUsuarioLogado.gerenteId || null, valorComissao: parseFloat(dadosUsuarioLogado.comissao || dadosUsuarioLogado.valorComissao || 0) }; idDaEmpresa = dadosUsuarioLogado.empresaId; 
    } else {
        const selVend = document.getElementById("propSelectVendedor");
        if(!selVend || !selVend.value) { alert("Selecione um vendedor."); resetarBotao(); return; }
        const vendOpt = selVend.options[selVend.selectedIndex];
        hierarquia = { vendedorId: selVend.value, vendedorNome: vendOpt.text, lojaId: vendOpt.dataset.lojaId && vendOpt.dataset.lojaId !== 'undefined' ? vendOpt.dataset.lojaId : 'sem-loja', lojaNome: vendOpt.dataset.lojaNome && vendOpt.dataset.lojaNome !== 'undefined' ? vendOpt.dataset.lojaNome : 'Loja Não Informada', redeId: vendOpt.dataset.redeId && vendOpt.dataset.redeId !== 'undefined' ? vendOpt.dataset.redeId : 'sem-rede', redeNome: vendOpt.dataset.redeNome && vendOpt.dataset.redeNome !== 'undefined' ? vendOpt.dataset.redeNome : 'Rede Não Informada', gerenteId: vendOpt.dataset.gerenteId && vendOpt.dataset.gerenteId !== 'undefined' ? vendOpt.dataset.gerenteId : null, valorComissao: parseFloat(vendOpt.dataset.comissao) || 0 };
        idDaEmpresa = perfilUsuario === 'master' ? (vendOpt.dataset.empresaId || 'sem-empresa') : dadosUsuarioLogado.empresaId;
    }

    let comissaoFinal = parseFloat(hierarquia.valorComissao) || 0;
    if (comissaoFinal <= 0) {
        btnSalvar.innerText = "Buscando comissão...";
        if (hierarquia.lojaId && hierarquia.lojaId !== 'sem-loja') { const lojaDoc = await db.collection("lojas").doc(hierarquia.lojaId).get(); if (lojaDoc.exists && lojaDoc.data().usarComissaoPersonalizada === true && parseFloat(lojaDoc.data().comissao) > 0) comissaoFinal = parseFloat(lojaDoc.data().comissao); }
        if (comissaoFinal <= 0 && hierarquia.redeId && hierarquia.redeId !== 'sem-rede') { const redeDoc = await db.collection("redes").doc(hierarquia.redeId).get(); if (redeDoc.exists && parseFloat(redeDoc.data().comissao) > 0) comissaoFinal = parseFloat(redeDoc.data().comissao); }
        if (comissaoFinal <= 0) {
            const nv = prompt("⚠️ Comissão zerada. Digite o valor para salvar (Ex: 15,50):");
            if (!nv) { alert("Cancelado."); resetarBotao(); return; }
            comissaoFinal = converterParaFloat(nv); if (isNaN(comissaoFinal) || comissaoFinal <= 0) { alert("Inválido."); resetarBotao(); return; }
        }
    }
    hierarquia.valorComissao = comissaoFinal;

    db.collection("propostas").add({ codigo: codigo, cliente: cliente, observacao: observacao, hierarquia: hierarquia, comissao: hierarquia.valorComissao, status: 'pendente', empresaId: idDaEmpresa, criadoPorId: usuarioLogado.uid, criadoEm: firebase.firestore.FieldValue.serverTimestamp(), historico: [criarRegistroHistorico("Proposta Cadastrada")] }).then(() => { fecharModal(); notificar("✅ Proposta salva com sucesso!"); }).catch((e) => { alert("Erro: " + e); }).finally(() => { resetarBotao(); });
}

window.alterarStatusDireto = async function(id, novoStatus) {
    try {
        const notificar = typeof mostrarToast === 'function' ? mostrarToast : alert;
        const docRef = db.collection("propostas").doc(id); const docSnap = await docRef.get(); if (!docSnap.exists) return;
        const d = docSnap.data(); let updates = {}; let logTexto = `Alterada para ${novoStatus.toUpperCase()}`;
        if (novoStatus === 'aprovada') {
            let valComissao = parseFloat(d.comissao) || parseFloat(d.hierarquia?.valorComissao) || 0;
            if (valComissao <= 0) {
                const h = d.hierarquia || {}; notificar("Buscando comissão base...");
                if (h.lojaId && h.lojaId !== 'sem-loja') { const lojaDoc = await db.collection("lojas").doc(h.lojaId).get(); if (lojaDoc.exists && lojaDoc.data().usarComissaoPersonalizada === true && parseFloat(lojaDoc.data().comissao) > 0) { valComissao = parseFloat(lojaDoc.data().comissao); logTexto += ` (Loja: R$ ${valComissao})`; } }
                if (valComissao <= 0 && h.redeId && h.redeId !== 'sem-rede') { const redeDoc = await db.collection("redes").doc(h.redeId).get(); if (redeDoc.exists && parseFloat(redeDoc.data().comissao) > 0) { valComissao = parseFloat(redeDoc.data().comissao); logTexto += ` (Rede: R$ ${valComissao})`; } }
                if (valComissao <= 0) {
                    const nv = prompt("⚠️ Sem comissão. Digite o valor (ex: 150.50):"); if (!nv) return; valComissao = parseFloat(nv.replace("R$", "").replace(".", "").replace(",", "."));
                    if (isNaN(valComissao) || valComissao <= 0) { alert("Inválido."); return; } logTexto += ` (Manual: R$ ${valComissao})`;
                }
                updates.comissao = valComissao; updates['hierarquia.valorComissao'] = valComissao;
            }
        }
        updates.status = novoStatus; updates.historico = firebase.firestore.FieldValue.arrayUnion(criarRegistroHistorico(logTexto));
        
        if (novoStatus === 'agendada') { 
            if(typeof abrirModalAgendamento === 'function') abrirModalAgendamento(id); 
            return; 
        }
        if (novoStatus === 'aprovada' || novoStatus === 'pendente') { updates.borderoId = firebase.firestore.FieldValue.delete(); updates.borderoNome = firebase.firestore.FieldValue.delete(); updates.dataAgendamento = firebase.firestore.FieldValue.delete(); }
        await docRef.update(updates); notificar(`Status atualizado!`);
    } catch (e) { alert("Erro ao alterar o status."); }
}

window.excluirPropostaMaster = async function(id) {
    if (perfilUsuario !== 'master') return;
    if (!confirm("⚠️ CUIDADO: Esta ação apagará permanentemente a proposta. Tem certeza?")) return;
    const notificar = typeof mostrarToast === 'function' ? mostrarToast : alert;
    try { await db.collection("propostas").doc(id).delete(); notificar("🗑️ Proposta apagada."); } catch (e) { alert("Erro ao excluir."); }
}

window.abrirDetalhesProposta = async function(id) {
    const doc = await db.collection("propostas").doc(id).get(); if (!doc.exists) return; const d = doc.data(); const h = d.hierarquia || {};
    let htmlHistorico = `<div style="margin-top:20px; border-top: 1px dashed var(--borda); padding-top: 15px;"><h4 style="margin-bottom: 10px; color: var(--cor-titulo);">Trilha de Auditoria</h4><ul style="list-style:none; padding:0; margin:0; font-size:12px; color:var(--cor-texto);">`;
    if(d.historico && d.historico.length > 0) d.historico.forEach(log => { htmlHistorico += `<li style="margin-bottom: 5px;">📍 <strong>${log.data}</strong> - ${log.acao} por <span style="color:var(--cor-primaria);">${log.usuario}</span></li>`; });
    else htmlHistorico += `<li>Nenhum registro.</li>`; htmlHistorico += `</ul></div>`;
    const valComissao = parseFloat(d.comissao) || parseFloat(h.valorComissao) || 0;
    const renderInfo = (valor) => (!valor || valor === 'undefined' || valor === 'Loja Não Informada' || valor === 'Rede Não Informada') ? '<span style="color:#ef4444; font-size: 12px;">(Dados pendentes)</span>' : valor;
    document.getElementById("conteudoDetalhes").innerHTML = `<div style="font-size: 14px; line-height: 1.6; color: var(--cor-texto);"><p><strong>Código:</strong> #${d.codigo}</p><p><strong>Cliente:</strong> ${d.cliente}</p><p><strong>Vendedor:</strong> ${renderInfo(h.vendedorNome || d.vendedorNome)}</p><p><strong>Loja:</strong> ${renderInfo(h.lojaNome || d.lojaNome)}</p><p><strong>Rede:</strong> ${renderInfo(h.redeNome || d.redeNome)}</p><p><strong>Comissão a Pagar:</strong> ${formatarMoedaVisual(valComissao)}</p><p><strong>Status Atual:</strong> <span class="status-badge badge-${d.status}">${d.status.toUpperCase()}</span></p>${d.borderoNome ? `<p style="color:#ea580c; font-weight:bold; margin-top:10px;">📅 Agendado no Borderô: ${d.borderoNome} (Venc: ${d.dataAgendamento})</p>` : ''}${htmlHistorico}</div>`;
    document.getElementById("modalDetalhesProposta").classList.remove("escondido");
}
window.fecharModalDetalhes = function() { document.getElementById("modalDetalhesProposta").classList.add("escondido"); }