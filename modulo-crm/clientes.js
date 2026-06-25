// ============================================================================
// MÓDULO: CRM - clientes.js (V29 - Multi-Empresas Master + Ajuste Visual Header)
// ============================================================================

let baseLojas = [];
let dadosClientesProcessados = [];
let dicionarioStatus = {};
let empresaId = ""; 

// Estado da Ordenação e Filtros
let sortDetalhadoCol = 'nome'; let sortDetalhadoAsc = true;
let sortResumoCol = 'nome'; let sortResumoAsc = true;
let filtrosMult = { rede: [], loja: [], status: [] };
let opcoesFiltroAtuais = { rede: [], loja: [], status: [] };

// Injeta o CSS para os filtros não desconfigurarem
if (!document.getElementById('css-multi-filtros')) {
    const styleMulti = document.createElement('style'); styleMulti.id = 'css-multi-filtros';
    styleMulti.innerHTML = `details.multi-filtro > summary { list-style: none; user-select: none; outline: none; } details.multi-filtro > summary::-webkit-details-marker { display: none; } .chk-item:hover { background: rgba(128,128,128,0.08); border-radius: 4px; } .chk-item input[type="checkbox"] { margin: 0; margin-top: 2px; width: 14px; height: 14px; flex-shrink: 0; cursor: pointer; }`;
    document.head.appendChild(styleMulti);
}

document.addEventListener('click', function(e) { 
    document.querySelectorAll('details.multi-filtro').forEach(det => { if (!det.contains(e.target)) det.removeAttribute('open'); }); 
});

function avisar(msg, tipo) { 
    if (typeof mostrarToast === 'function') mostrarToast(msg, tipo); 
    else { console.log(`[${tipo.toUpperCase()}] ${msg}`); if (tipo === 'erro') alert(msg); } 
}

// ==========================================
// AUTENTICAÇÃO E GESTÃO DE VISÃO (EMPRESAS)
// ==========================================
window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    const userAuth = firebase.auth().currentUser;
    if (!userAuth) return;

    // 1. Mapeia todas as empresas (Com inteligência para MASTER)
    let listaEmpresasUsuario = [];
    
    if (dadosUsuarioLogado && (dadosUsuarioLogado.perfil === 'master' || dadosUsuarioLogado.acessoTodasEmpresas)) {
        // Se for Master, ignora os vínculos e puxa TODAS as empresas do banco de dados
        try {
            const snapEmpresas = await db.collection("empresas").get();
            snapEmpresas.forEach(doc => listaEmpresasUsuario.push(doc.id));
        } catch (err) {
            console.error("Erro ao buscar lista global de empresas:", err);
        }
    } else {
        // Se for usuário comum, puxa apenas as que ele tem acesso
        if (dadosUsuarioLogado && Array.isArray(dadosUsuarioLogado.empresaId) && dadosUsuarioLogado.empresaId.length > 0) {
            listaEmpresasUsuario = dadosUsuarioLogado.empresaId.map(id => String(id));
        } else if (dadosUsuarioLogado && dadosUsuarioLogado.empresaId && typeof dadosUsuarioLogado.empresaId === 'string') {
            listaEmpresasUsuario = [String(dadosUsuarioLogado.empresaId)];
        }
    }

    // Se por algum motivo falhar, usa o ID do usuário como fallback
    if (listaEmpresasUsuario.length === 0) listaEmpresasUsuario = [String(userAuth.uid)];

    // 2. Verifica a memória para ver qual estava selecionada
    let empresaMemorizada = sessionStorage.getItem('visaoEmpresaAtiva');
    if (!empresaMemorizada || !listaEmpresasUsuario.includes(empresaMemorizada)) {
        empresaMemorizada = listaEmpresasUsuario[0];
        sessionStorage.setItem('visaoEmpresaAtiva', empresaMemorizada);
    }
    
    empresaId = empresaMemorizada;

    const elNome = document.getElementById("nomeUsuario");
    const elCargo = document.getElementById("cargoUsuario");
    const elIniciais = document.getElementById("iniciaisUsuario");
    const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuario";
    if(elNome) elNome.innerText = (dadosUsuarioLogado && dadosUsuarioLogado.nome) ? dadosUsuarioLogado.nome : "Usuário";
    if(elIniciais && elNome) {
        const iniciais = (elNome.innerText || "").trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "--";
        elIniciais.innerText = iniciais;
    }
    if(elCargo) elCargo.innerText = String(perfil).toUpperCase();

    // 3. Constrói o Dropdown
    try {
        await construirSeletorEmpresas(listaEmpresasUsuario, empresaId);
    } catch (err) {
        console.error("Falha ao desenhar seletor de empresas.", err);
    }

    // 4. Carrega os dados da empresa ativa
    await carregarConfiguracoesNuvem();
    await carregarBaseLojas(); 
    await recuperarDadosNuvem();
};

async function construirSeletorEmpresas(listaIds, idAtivo) {
    let opcoesHTML = "";
    try {
        for (let id of listaIds) {
            const docEmp = await db.collection("empresas").doc(id).get();
            let nomeEmpresa = docEmp.exists ? (docEmp.data().nomeFantasia || docEmp.data().razaoSocial || `Empresa ${id.substring(0,4)}...`) : `Empresa Cód. ${id.substring(0,4)}`;
            let isSelected = (id === idAtivo) ? "selected" : "";
            opcoesHTML += `<option value="${id}" ${isSelected}>${nomeEmpresa}</option>`;
        }
    } catch(e) {
        opcoesHTML = `<option value="${idAtivo}">Empresa Ativa</option>`;
    }

    let containerDropdown = document.getElementById("containerSeletorVisaoEmpresa");
    
    // Injeção visual focada no Ícone de Tema
    if (!containerDropdown) {
        containerDropdown = document.createElement("div");
        containerDropdown.id = "containerSeletorVisaoEmpresa";
        containerDropdown.style.marginRight = "10px";
        containerDropdown.style.display = "flex";
        containerDropdown.style.alignItems = "center";
        containerDropdown.style.gap = "8px";

        // Procura o botão de Tema (dark/light)
        let btnTema = null;
        const todosBotoes = document.querySelectorAll('button, .btn-icon, span.material-symbols-rounded');
        for (let i = 0; i < todosBotoes.length; i++) {
            let el = todosBotoes[i];
            let txt = el.innerText || '';
            let func = (el.getAttribute('onclick') || '').toLowerCase();
            if (txt.includes('dark_mode') || txt.includes('light_mode') || func.includes('tema')) {
                // Se for o <span> do icone dentro do button, pega o button inteiro
                btnTema = (el.tagName === 'SPAN' && el.parentElement.tagName === 'BUTTON') ? el.parentElement : el;
                break;
            }
        }

        if (btnTema && btnTema.parentNode) {
            // Se achou o tema, insere à esquerda dele!
            btnTema.parentNode.insertBefore(containerDropdown, btnTema);
        } else {
            // Plano B: insere no começo das ações (antes do tema e do perfil)
            let acoesHeader = document.querySelector('.header-actions') || document.querySelector('.topbar-right');
            if (acoesHeader) acoesHeader.insertBefore(containerDropdown, acoesHeader.firstChild);
        }
    }

    if (containerDropdown) {
        if (listaIds.length > 1) {
            containerDropdown.innerHTML = `
                <span class="material-symbols-rounded" style="color: var(--f1a-blue); font-size: 20px;">domain</span>
                <select onchange="trocarVisaoEmpresa(this.value)" style="background: var(--bg-painel); border: 1px solid var(--borda); color: var(--cor-texto); padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; outline: none;">
                    ${opcoesHTML}
                </select>
            `;
        } else {
            const nomeDaUnicaEmpresa = opcoesHTML.replace(/<[^>]*>?/gm, '');
            containerDropdown.innerHTML = `
                <span class="material-symbols-rounded" style="color: var(--f1a-blue); font-size: 20px;">domain</span>
                <span style="color: var(--cor-texto); font-size: 13px; font-weight: 700;">${nomeDaUnicaEmpresa}</span>
            `;
        }
    }
}

window.trocarVisaoEmpresa = function(novoIdEmpresa) {
    sessionStorage.setItem('visaoEmpresaAtiva', novoIdEmpresa);
    window.location.reload();
}

// ==========================================
// FUNÇÕES DE DADOS (NUVEM E LOJAS)
// ==========================================
async function recuperarDadosNuvem() {
    if (!empresaId) return;
    try {
        const doc = await db.collection("crm_dados_empresa").doc(empresaId).get();
        if (doc.exists) {
            dadosClientesProcessados = doc.data().clientes || [];
            if (typeof cruzarNomesLojas === 'function') cruzarNomesLojas();

            if (dadosClientesProcessados.length > 0) {
                document.getElementById('tabsClientes').style.display = "flex";
                if (typeof gerarMapeamentoInicial === 'function') gerarMapeamentoInicial();
                if (typeof popularFiltrosDropdown === 'function') popularFiltrosDropdown();
                if (typeof atualizarTudo === 'function') atualizarTudo();
                if (typeof mudarAbaClientes === 'function') mudarAbaClientes('resumo');
            }
        }
    } catch (e) { console.error("Erro dados:", e); }
}

async function carregarBaseLojas() {
    try {
        const perfil = dadosUsuarioLogado.perfil;
        let query = (perfil === 'master' || perfil === 'admin') 
                    ? db.collection("crm_lojas").get() 
                    : db.collection("crm_lojas").where("empresaId", "==", empresaId).get();

        const snap = await query;
        baseLojas = [];
        snap.forEach(doc => baseLojas.push(doc.data()));
        
        if (dadosClientesProcessados.length > 0) {
            cruzarNomesLojas();
            atualizarTudo();
        }
    } catch (error) { console.error("Erro lojas:", error); }
}

function cruzarNomesLojas() {
    dadosClientesProcessados = dadosClientesProcessados.filter(c => String(c.origem || '').trim() !== '' && String(c.nome || '').trim() !== '');
    dadosClientesProcessados.forEach(c => {
        const cod = String(c.origem || '').trim();
        const lojaEncontrada = baseLojas.find(l => String(l.codigo).trim() === cod);
        if (lojaEncontrada) { c.lojaNome = lojaEncontrada.nome; c.redeNome = lojaEncontrada.rede; } 
        else { c.lojaNome = `Loja Não Identificada (${cod})`; c.redeNome = `Rede Desconhecida (${cod})`; }
    });
}

function atualizarTudo() { renderizarResumoExpansivel(); filtrarTabelaClientes(); }

// ==========================================
// PROCESSAMENTO DE PLANILHAS (TXT / CSV)
// ==========================================
window.processarPlanilhaClientes = function(input) {
    const file = input.files[0];
    if (!file) return;

    const label = document.getElementById('areaDropClientes');
    if (!label) return; 
    
    const bkp = label.innerHTML;
    label.innerHTML = "<h4><span class='material-symbols-rounded' style='animation: spin 1s linear infinite; vertical-align: middle;'>sync</span> Processando Relatório...</h4>";

    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const linhas = text.split(/\r?\n/);
            let novosDados = [];

            const limpaMoeda = (val) => {
                if (!val) return 0;
                let str = String(val).trim();
                if (str === '') return 0;
                if (str.includes(',') && str.includes('.')) {
                    if (str.lastIndexOf(',') > str.lastIndexOf('.')) str = str.replace(/\./g, '').replace(',', '.');
                    else str = str.replace(/,/g, ''); 
                } else if (str.includes(',')) { str = str.replace(',', '.'); }
                return parseFloat(str) || 0;
            };

            const parseCSVLine = (str) => {
                let cols = []; let inQuote = false; let val = "";
                for (let i = 0; i < str.length; i++) {
                    let char = str[i];
                    if (char === '"') {
                        if (inQuote && str[i+1] === '"') { val += '"'; i++; } else { inQuote = !inQuote; }
                    } else if (char === ',' && !inQuote) { cols.push(val); val = "";
                    } else { val += char; }
                }
                cols.push(val); return cols;
            };

            for (let index = 0; index < linhas.length; index++) {
                const linha = linhas[index];
                if (!linha.trim()) continue;

                let cols = parseCSVLine(linha);
                let startIndex = cols.findIndex(c => c.trim() !== "");
                if (startIndex === -1) continue; 

                let nomeCliente = cols[startIndex].trim();
                if (!nomeCliente || nomeCliente.toLowerCase() === 'cliente' || nomeCliente.toLowerCase().includes('total')) continue;

                let codOrigem = cols[startIndex + 13] ? cols[startIndex + 13].trim() : "";
                if (!codOrigem) continue; 

                let documento = cols[startIndex + 1] ? cols[startIndex + 1].trim() : "N/D";
                let statusOriginal = cols[startIndex + 2] ? cols[startIndex + 2].trim() : "";
                let atraso = limpaMoeda(cols[startIndex + 3]);
                let saldoDevedor = limpaMoeda(cols[startIndex + 4]);
                let totalPagto = limpaMoeda(cols[startIndex + 5]);
                let totalCompra = limpaMoeda(cols[startIndex + 6]);
                let limite = limpaMoeda(cols[startIndex + 12]);
                
                const lj = baseLojas.find(l => String(l.codigo).trim() === codOrigem);

                novosDados.push({
                    nome: nomeCliente, documento: documento, statusOriginal: statusOriginal,
                    atraso: atraso, saldoDevedor: saldoDevedor, limite: limite,
                    totalPagto: totalPagto, totalCompra: totalCompra, origem: codOrigem,
                    lojaNome: lj ? lj.nome : `Loja Não Identificada (${codOrigem})`,
                    redeNome: lj ? lj.rede : `Rede Desconhecida (${codOrigem})`
                });
            }

            if (novosDados.length === 0) throw new Error("Nenhum cliente válido foi encontrado.");

            await db.collection("crm_dados_empresa").doc(empresaId).set({ 
                clientes: novosDados, ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp() 
            });

            dadosClientesProcessados = novosDados; label.innerHTML = bkp;
            document.getElementById('tabsClientes').style.display = "flex";
            if (typeof gerarMapeamentoInicial === 'function') gerarMapeamentoInicial();
            if (typeof popularFiltrosDropdown === 'function') popularFiltrosDropdown();
            if (typeof atualizarTudo === 'function') atualizarTudo();
            if (typeof mudarAbaClientes === 'function') mudarAbaClientes('resumo');
            avisar(`Upload Concluído! ${novosDados.length} clientes importados.`, "sucesso");

        } catch (err) { label.innerHTML = bkp; avisar("Falha: " + err.message, "erro"); }
    };
    reader.readAsText(file, 'windows-1252'); input.value = ""; 
};

// ==========================================
// RENDERIZAÇÃO ABA RESUMO
// ==========================================
window.ordenarResumo = function(coluna) {
    if (sortResumoCol === coluna) sortResumoAsc = !sortResumoAsc; else { sortResumoCol = coluna; sortResumoAsc = true; }
    renderizarResumoExpansivel();
};

function renderizarResumoExpansivel() {
    const hierarquia = {}; let g = { cli: 0, lim: 0, sal: 0, pag: 0, com: 0 };
    dadosClientesProcessados.forEach(c => {
        if (!hierarquia[c.redeNome]) hierarquia[c.redeNome] = { nome: c.redeNome, lojas: {}, total: { cli:0, ativos:0, sem:0, atraso:0, pag:0, com:0, lim:0, sal:0 } };
        const r = hierarquia[c.redeNome];
        if (!r.lojas[c.lojaNome]) r.lojas[c.lojaNome] = { nome: c.lojaNome, cli:0, ativos:0, sem:0, atraso:0, pag:0, com:0, lim:0, sal:0 };
        const l = r.lojas[c.lojaNome];
        [l, r.total].forEach(t => { t.cli++; if(c.totalCompra > 0) t.ativos++; else t.sem++; if(c.atraso > 0) t.atraso++; t.pag += c.totalPagto; t.com += c.totalCompra; t.lim += c.limite; t.sal += c.saldoDevedor; });
        g.cli++; g.lim += c.limite; g.sal += c.saldoDevedor; g.pag += c.totalPagto; g.com += c.totalCompra;
    });

    document.getElementById('kpiGlobalContainer').innerHTML = `
        <div class="kpi-card"><span class="kpi-titulo">Total Clientes</span><span class="kpi-valor">${g.cli}</span></div>
        <div class="kpi-card"><span class="kpi-titulo">Crédito Total</span><span class="kpi-valor">${formataMoeda(g.lim)}</span></div>
        <div class="kpi-card"><span class="kpi-titulo">Compras</span><span class="kpi-valor">${formataMoeda(g.com)}</span></div>
        <div class="kpi-card"><span class="kpi-titulo">Recebido</span><span class="kpi-valor" style="color:#10b981">${formataMoeda(g.pag)}</span></div>
        <div class="kpi-card kpi-gold"><span class="kpi-titulo">Saldo Devedor</span><span class="kpi-valor" style="color:#ef4444">${formataMoeda(g.sal)}</span></div>`;

    let redesArray = Object.values(hierarquia);
    redesArray.sort((a, b) => {
        let vA, vB; const cols = { cli:'cli', ativos:'ativos', sem:'sem', atraso:'atraso', lim:'lim', compra:'com', pagto:'pag', saldo:'sal' };
        if(sortResumoCol === 'nome') { vA = a.nome; vB = b.nome; }
        else if(sortResumoCol === 'perc') { vA = a.total.lim > 0 ? (a.total.sal/a.total.lim) : 0; vB = b.total.lim > 0 ? (b.total.sal/b.total.lim) : 0; }
        else { vA = a.total[cols[sortResumoCol]] || 0; vB = b.total[cols[sortResumoCol]] || 0; }
        if (typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB.toLowerCase(); }
        return sortResumoAsc ? (vA > vB ? 1 : (vA < vB ? -1 : 0)) : (vA < vB ? 1 : (vA > vB ? -1 : 0));
    });

    document.getElementById('tabelaResumoCorpo').innerHTML = redesArray.map((r, i) => {
        const redeId = `rede_${i}`; const pR = r.total.lim > 0 ? (r.total.sal/r.total.lim*100).toFixed(1) : 0;
        let htmlLojas = Object.values(r.lojas).sort((a,b) => a.nome.localeCompare(b.nome)).map(l => `
            <tr class="linha-loja ${redeId}" style="display:none">
                <td style="padding-left:30px; font-size:12px;">↳ ${l.nome}</td>
                <td style="text-align:center">${l.cli}</td><td style="text-align:center; color:#10b981">${l.ativos}</td>
                <td style="text-align:center">${l.sem}</td><td style="text-align:center; color:#ef4444">${l.atraso}</td>
                <td style="text-align:right">${formataMoeda(l.lim)}</td><td style="text-align:right">${formataMoeda(l.com)}</td>
                <td style="text-align:right">${formataMoeda(l.pag)}</td><td style="text-align:right; color:#ef4444">${formataMoeda(l.sal)}</td>
                <td style="text-align:center">${l.lim > 0 ? (l.sal/l.lim*100).toFixed(1) : 0}%</td>
            </tr>`).join('');
        return `<tr class="linha-rede" onclick="toggleRede('${redeId}')">
            <td style="font-weight:800; color:var(--f1a-blue);"><span class="material-symbols-rounded" id="icon_${redeId}" style="vertical-align:middle">add_circle</span> ${r.nome}</td>
            <td style="text-align:center; font-weight:800">${r.total.cli}</td><td style="text-align:center; color:#10b981; font-weight:800">${r.total.ativos}</td>
            <td style="text-align:center">${r.total.sem}</td><td style="text-align:center; color:#ef4444; font-weight:800">${r.total.atraso}</td>
            <td style="text-align:right">${formataMoeda(r.total.lim)}</td><td style="text-align:right; font-weight:800">${formataMoeda(r.total.com)}</td>
            <td style="text-align:right; font-weight:800; color:#10b981">${formataMoeda(r.total.pag)}</td><td style="text-align:right; font-weight:800; color:#ef4444">${formataMoeda(r.total.sal)}</td>
            <td style="text-align:center"><span class="status-badge">${pR}%</span></td>
        </tr>` + htmlLojas;
    }).join('');
}
window.toggleRede = function(id) { const lojas = document.querySelectorAll(`.${id}`); const isE = lojas[0].style.display === "none"; lojas.forEach(l => l.style.display = isE ? "table-row" : "none"); document.getElementById(`icon_${id}`).innerText = isE ? "remove_circle" : "add_circle"; }

// ==========================================
// FILTROS AVANÇADOS (MOTOR INTELIGENTE)
// ==========================================
window.toggleItemFiltro = function(tipo, val) {
    const todasOpcoes = opcoesFiltroAtuais[tipo]; let arr = filtrosMult[tipo];
    if (arr.length === 0) { filtrosMult[tipo] = todasOpcoes.filter(opt => opt !== val); } 
    else {
        const idxNone = arr.indexOf("__NONE__"); if (idxNone > -1) arr.splice(idxNone, 1);
        const idx = arr.indexOf(val);
        if (idx > -1) { arr.splice(idx, 1); if (arr.length === 0) arr.push("__NONE__"); } else { arr.push(val); }
        if (filtrosMult[tipo].length === todasOpcoes.length) { filtrosMult[tipo] = []; }
    }
    popularFiltrosDropdown(); filtrarTabelaClientes();
}
window.toggleTodosFiltro = function(tipo) { if (filtrosMult[tipo].length === 0) { filtrosMult[tipo] = ["__NONE__"]; } else { filtrosMult[tipo] = []; } popularFiltrosDropdown(); filtrarTabelaClientes(); }

function renderizarCaixaMultipla(idOriginal, label, opcoes, selecionados, tipoVar) {
    let selectOri = document.getElementById(idOriginal); if (!selectOri) return;
    let container = document.getElementById(idOriginal + '_details');
    if (!container) {
        container = document.createElement('details'); container.id = idOriginal + '_details'; container.className = "multi-filtro " + selectOri.className;
        container.style.position = 'relative'; container.style.cursor = 'pointer'; container.style.minWidth = '180px';
        selectOri.parentNode.insertBefore(container, selectOri); selectOri.style.display = 'none'; 
    }
    const isOpen = container.hasAttribute('open'); const isTodos = selecionados.length === 0;
    let qtdSelecionados = isTodos ? opcoes.length : (selecionados.includes("__NONE__") ? 0 : selecionados.length);
    const titulo = label + (isTodos ? " (Todos)" : ` (${qtdSelecionados})`); const checkedTodos = isTodos ? 'checked' : '';

    let html = `<summary style="padding:8px 12px; border:1px solid var(--borda); border-radius:6px; background:var(--bg-painel); font-size:12px; font-weight:600; display:flex; justify-content:space-between; align-items:center;">
            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px;">${titulo}</span> <span class="material-symbols-rounded" style="font-size:16px; margin-left:8px;">expand_more</span>
        </summary><div style="position:absolute; top:calc(100% + 4px); left:0; width:max-content; min-width:100%; max-width:320px; background:var(--bg-painel); border:1px solid var(--borda); border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; max-height:260px; overflow-y:auto; display:flex; flex-direction:column; padding:4px;">
            <label class="chk-item" style="display:flex; align-items:center; gap:8px; padding:8px; cursor:pointer; font-size:12px; font-weight:700; color:var(--f1a-blue); border-bottom:1px solid var(--borda); margin:0;">
                <input type="checkbox" onchange="toggleTodosFiltro('${tipoVar}')" ${checkedTodos}><span style="white-space:nowrap;">(TODOS)</span></label>`;
    opcoes.forEach(opt => {
        const isCh = isTodos || selecionados.includes(opt) ? 'checked' : '';
        html += `<label class="chk-item" style="display:flex; align-items:flex-start; gap:8px; padding:8px; cursor:pointer; font-size:11px; font-weight:600; color:var(--cor-texto); margin:0; line-height:1.4;">
                <input type="checkbox" value="${opt.replace(/"/g, '&quot;')}" onchange="toggleItemFiltro('${tipoVar}', this.value)" ${isCh}><span>${opt}</span></label>`;
    });
    html += `</div>`; container.innerHTML = html; if (isOpen) container.setAttribute('open', '');
}

function popularFiltrosDropdown() {
    const todasRedes = [...new Set(dadosClientesProcessados.map(c => c.redeNome))].sort(); opcoesFiltroAtuais.rede = todasRedes;
    let baseLojasF = dadosClientesProcessados; if (filtrosMult.rede.length > 0 && !filtrosMult.rede.includes("__NONE__")) { baseLojasF = dadosClientesProcessados.filter(c => filtrosMult.rede.includes(c.redeNome)); }
    const lojasDisponiveis = [...new Set(baseLojasF.map(c => c.lojaNome))].sort(); opcoesFiltroAtuais.loja = lojasDisponiveis;
    filtrosMult.loja = filtrosMult.loja.filter(l => l === "__NONE__" || lojasDisponiveis.includes(l));
    let baseStatus = baseLojasF; if (filtrosMult.loja.length > 0 && !filtrosMult.loja.includes("__NONE__")) { baseStatus = baseLojasF.filter(c => filtrosMult.loja.includes(c.lojaNome)); }
    const statusDisponiveis = [...new Set(baseStatus.map(c => dicionarioStatus[c.statusOriginal] || c.statusOriginal))].filter(s => s).sort(); opcoesFiltroAtuais.status = statusDisponiveis;
    filtrosMult.status = filtrosMult.status.filter(s => s === "__NONE__" || statusDisponiveis.includes(s));
    renderizarCaixaMultipla('filtroRede', 'Redes', todasRedes, filtrosMult.rede, 'rede');
    renderizarCaixaMultipla('filtroLoja', 'Lojas', lojasDisponiveis, filtrosMult.loja, 'loja');
    renderizarCaixaMultipla('filtroStatus', 'Status', statusDisponiveis, filtrosMult.status, 'status');
}

// ==========================================
// RENDERIZAÇÃO ABA DETALHADA E UTILIDADES
// ==========================================
window.ordenarDetalhado = function(col) { if (sortDetalhadoCol === col) sortDetalhadoAsc = !sortDetalhadoAsc; else { sortDetalhadoCol = col; sortDetalhadoAsc = true; } filtrarTabelaClientes(); }
window.filtrarTabelaClientes = function() {
    const txt = document.getElementById('filtroTexto') ? document.getElementById('filtroTexto').value.toLowerCase() : '';
    const atraso = document.getElementById('filtroAtraso') ? document.getElementById('filtroAtraso').value : '';
    let filtrados = dadosClientesProcessados.filter(c => {
        const sAt = dicionarioStatus[c.statusOriginal] || c.statusOriginal;
        const mTxt = !txt || c.nome.toLowerCase().includes(txt) || c.documento.includes(txt);
        const mRede = filtrosMult.rede.length === 0 || filtrosMult.rede.includes(c.redeNome);
        const mLoja = filtrosMult.loja.length === 0 || filtrosMult.loja.includes(c.lojaNome);
        const mStatus = filtrosMult.status.length === 0 || filtrosMult.status.includes(sAt);
        let mAtr = true; if(atraso === 'em_dia') mAtr = c.atraso === 0; if(atraso === 'em_atraso') mAtr = c.atraso > 0;
        return mTxt && mRede && mLoja && mStatus && mAtr;
    });
    const colMap = { nome:'nome', documento:'documento', redeNome:'redeNome', lojaNome:'lojaNome', statusOriginal:'statusOriginal', totalPagto:'totalPagto', totalCompra:'totalCompra', limite:'limite', saldoDevedor:'saldoDevedor', atraso:'atraso' };
    const col = colMap[sortDetalhadoCol] || 'nome';
    filtrados.sort((a,b) => { let vA = a[col], vB = b[col]; if(col === 'statusOriginal') { vA = dicionarioStatus[a.statusOriginal] || a.statusOriginal; vB = dicionarioStatus[b.statusOriginal] || b.statusOriginal; } if(typeof vA === 'string') { vA = vA.toLowerCase(); vB = vB.toLowerCase(); } return sortDetalhadoAsc ? (vA > vB ? 1 : (vA < vB ? -1 : 0)) : (vA < vB ? 1 : (vA > vB ? -1 : 0)); });
    renderizarTabelaClientes(filtrados);
}

function renderizarTabelaClientes(lista) {
    const tbody = document.getElementById('tabelaClientesBody');
    tbody.innerHTML = lista.slice(0, 300).map(c => `<tr><td style="font-weight:700">${c.nome}</td><td>${c.documento}</td><td style="color:var(--f1a-blue); font-weight:600">${c.redeNome}</td><td style="font-size:12px; color:var(--cor-texto);">${c.lojaNome}</td> <td><span class="status-badge">${dicionarioStatus[c.statusOriginal] || c.statusOriginal}</span></td><td style="text-align:right; color:#10b981; font-weight:600">${formataMoeda(c.totalPagto)}</td><td style="text-align:right; font-weight:600">${formataMoeda(c.totalCompra)}</td><td style="text-align:right;">${formataMoeda(c.limite)}</td><td style="text-align:right; color:#ef4444; font-weight:600">${formataMoeda(c.saldoDevedor)}</td><td style="text-align:center;">${c.atraso > 0 ? c.atraso+'d' : 'Em dia'}</td></tr>`).join('');
}

window.mudarAbaClientes = function(aba) { document.querySelectorAll('.crm-tab-btn').forEach(b => b.classList.remove('ativo')); ['abaResumo', 'abaDetalhado', 'abaSituacoes'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display = 'none'; }); const abaAlvo = document.getElementById(`aba${aba.charAt(0).toUpperCase() + aba.slice(1)}`); if(abaAlvo) abaAlvo.style.display = 'block'; const btn = document.querySelector(`.crm-tab-btn[onclick="mudarAbaClientes('${aba}')"]`); if(btn) btn.classList.add('ativo'); }

async function carregarConfiguracoesNuvem() { if (!empresaId) return; try { const doc = await db.collection("crm_config_empresa").doc(empresaId).get(); if (doc.exists) dicionarioStatus = doc.data().statusMap || {}; } catch (e) {} }

function gerarMapeamentoInicial() { const st = [...new Set(dadosClientesProcessados.map(c => c.statusOriginal))].filter(s => s); document.getElementById('containerMapeamentoStatus').innerHTML = st.map(s => `<div class="row-status-map"><span class="status-code">${s}</span><input type="text" class="input-mapeamento" data-status="${s}" value="${dicionarioStatus[s] || ''}" placeholder="Apelido..."></div>`).join(''); }
window.salvarMapeamentoStatus = async function() { document.querySelectorAll('.input-mapeamento').forEach(i => dicionarioStatus[i.dataset.status] = i.value); await db.collection("crm_config_empresa").doc(empresaId).set({ statusMap: dicionarioStatus }, { merge: true }); avisar("Status Salvos!", "sucesso"); atualizarTudo(); }
function formataMoeda(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

// 🛡️ GARANTIA: O menu do perfil 100% isolado e funcional
window.toggleDropdownPerfil = function(e) { 
    if(e) e.stopPropagation(); 
    const menuPerfil = document.getElementById('dropdownPerfilLocal');
    if (menuPerfil) menuPerfil.classList.toggle('escondido'); 
};