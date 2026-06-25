// ==========================================
// MÓDULO: ADM CARTÃO - LOGÍSTICA DE REMESSAS (V3 - Cruzamento com Banco de Lojas)
// ==========================================

let arquivosParaUpload = [];
let remessaAtualEditando = null;
let remessaAtualData = {};
let empresaId = "";
let clientesAuditoria = [];
let despachosRemessa = [];
let baseLojas = [];
let baseRedes = [];

window.mostrarToast = function(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toastContainer');
    if(!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${tipo}`;
    const icone = tipo === 'erro' ? 'error' : 'check_circle'; const cor = tipo === 'erro' ? '#ef4444' : '#10b981';
    toast.innerHTML = `<span class="material-symbols-rounded" style="color: ${cor};">${icone}</span> <strong>${mensagem}</strong>`;
    container.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}

// ==========================================
// AUTENTICAÇÃO E CARREGAMENTO INICIAL
// ==========================================
window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    const userAuth = firebase.auth().currentUser;
    if (!userAuth) return;

    let listaEmpresasUsuario = [];
    if (dadosUsuarioLogado && (dadosUsuarioLogado.perfil === 'master' || dadosUsuarioLogado.acessoTodasEmpresas)) {
        try {
            const snapEmpresas = await db.collection("empresas").get();
            snapEmpresas.forEach(doc => listaEmpresasUsuario.push(doc.id));
        } catch (err) { console.error("Erro master:", err); }
    } else {
        if (dadosUsuarioLogado && Array.isArray(dadosUsuarioLogado.empresaId) && dadosUsuarioLogado.empresaId.length > 0) {
            listaEmpresasUsuario = dadosUsuarioLogado.empresaId.map(id => String(id));
        } else if (dadosUsuarioLogado && dadosUsuarioLogado.empresaId && typeof dadosUsuarioLogado.empresaId === 'string') {
            listaEmpresasUsuario = [String(dadosUsuarioLogado.empresaId)];
        }
    }
    if (listaEmpresasUsuario.length === 0) listaEmpresasUsuario = [String(userAuth.uid)];

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

    try { await construirSeletorEmpresas(listaEmpresasUsuario, empresaId); } catch (err) {}

    await carregarBaseLojas(); 
    carregarGridRemessas();
};

async function carregarBaseLojas(empresaFiltro) {
    try {
        const perfil = dadosUsuarioLogado?.perfil;
        const idEmpresa = String(empresaFiltro || empresaId);
        const verTodas = (perfil === 'master' || perfil === 'admin') && !empresaFiltro;

        const [redesSnap, lojasSnap] = await Promise.all([
            verTodas
                ? db.collection("redes").get()
                : db.collection("redes").where("empresaId", "==", idEmpresa).get(),
            verTodas
                ? db.collection("lojas").get()
                : db.collection("lojas").where("empresaId", "==", idEmpresa).get()
        ]);

        const gerenteIds = new Set();
        redesSnap.forEach(doc => {
            const gid = doc.data().gerenteId;
            if (gid) gerenteIds.add(gid);
        });

        const mapaGerentes = {};
        await Promise.all([...gerenteIds].map(async (gid) => {
            try {
                const uSnap = await db.collection('usuarios').doc(gid).get();
                if (uSnap.exists) mapaGerentes[gid] = uSnap.data().nome || '-';
            } catch (e) { /* silencioso */ }
        }));

        const mapaNomesRedes = {};
        baseRedes = [];
        redesSnap.forEach(doc => {
            const d = doc.data();
            const nome = d.nome || '';
            mapaNomesRedes[doc.id] = nome;
            baseRedes.push({
                id: doc.id,
                nome,
                codigo: d.codigo || '',
                gerenteId: d.gerenteId || '',
                gerenteNome: mapaGerentes[d.gerenteId] || '-'
            });
        });
        baseRedes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        baseLojas = [];
        lojasSnap.forEach(doc => {
            const d = doc.data();
            baseLojas.push({
                codigo: d.codigo,
                nome: d.nome,
                rede: mapaNomesRedes[d.redeId] || '',
                redeId: d.redeId || '',
                lojaId: doc.id,
                cnpj: d.cnpj || '',
                cidade: d.cidade || '',
                bairro: d.bairro || ''
            });
        });
    } catch (error) { console.error("Erro ao carregar lojas:", error); }
}

function buscarLojaNaBase(codigoLoja) {
    const cod = String(codigoLoja || '').trim();
    if (!cod) return null;
    return baseLojas.find(l => String(l.codigo).trim() === cod)
        || baseLojas.find(l => String(l.cnpj || '').trim() === cod);
}

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

    if (!containerDropdown) {
        containerDropdown = document.createElement("div");
        containerDropdown.id = "containerSeletorVisaoEmpresa";
        containerDropdown.style.marginRight = "10px";
        containerDropdown.style.display = "flex";
        containerDropdown.style.alignItems = "center";
        containerDropdown.style.gap = "8px";

        let btnTema = null;
        const todosBotoes = document.querySelectorAll('button, .btn-icon, span.material-symbols-rounded');
        for (let i = 0; i < todosBotoes.length; i++) {
            let el = todosBotoes[i];
            let txt = el.innerText || '';
            let func = (el.getAttribute('onclick') || '').toLowerCase();
            if (txt.includes('dark_mode') || txt.includes('light_mode') || func.includes('tema')) {
                btnTema = (el.tagName === 'SPAN' && el.parentElement.tagName === 'BUTTON') ? el.parentElement : el;
                break;
            }
        }

        if (btnTema && btnTema.parentNode) {
            btnTema.parentNode.insertBefore(containerDropdown, btnTema);
        } else {
            let acoesHeader = document.querySelector('.header-actions') || document.querySelector('.topbar-right') || document.querySelector('.header-right');
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

window.toggleDropdownPerfil = function(e) {
    if(e) e.stopPropagation();
    const menuPerfil = document.getElementById('dropdownPerfilLocal');
    if (menuPerfil) menuPerfil.classList.toggle('escondido');
};

// ==========================================
// NAVEGAÇÃO DE TELAS E SELEÇÃO DE ARQUIVOS
// ==========================================
function mostrarTela(idTela) {
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('ativo'));
    document.getElementById(idTela).classList.add('ativo');
}

window.voltarParaGrid = function() { mostrarTela('viewGrid'); carregarGridRemessas(); }

window.abrirNovaRemessa = function() {
    arquivosParaUpload = [];
    document.getElementById('remDescricao').value = '';
    document.getElementById('remData').value = new Date().toISOString().split('T')[0];
    document.getElementById('listaArquivosUpload').innerHTML = '';
    document.getElementById('barraProgressoCont').style.display = 'none';
    mostrarTela('viewNovaRemessa');
}

const dropZone = document.getElementById('dropZone');
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); window.adicionarArquivosLote({ target: { files: e.dataTransfer.files } }); });

window.adicionarArquivosLote = function(event) {
    const files = Array.from(event.target.files);
    const regex = /^Emb-Rede(\d+)-Loja(\d+)-Lote(\d+)\s+(.+)\.txt$/i;

    files.forEach(file => {
        if (!file.name.toLowerCase().endsWith('.txt')) return mostrarToast(`Ignorado (${file.name}): Apenas .txt`, "erro");
        if (!file.name.match(regex)) return mostrarToast(`Ignorado (${file.name}): Nome fora do padrão.`, "erro");
        if (!arquivosParaUpload.some(a => a.name === file.name)) arquivosParaUpload.push(file);
    });

    renderizarListaArquivosUpload();
    document.getElementById('inputFiles').value = ""; 
}

function removerArquivoLista(index) { arquivosParaUpload.splice(index, 1); renderizarListaArquivosUpload(); }
function renderizarListaArquivosUpload() {
    const div = document.getElementById('listaArquivosUpload'); div.innerHTML = '';
    arquivosParaUpload.forEach((file, index) => {
        div.innerHTML += `<div class="file-item"><span><span class="material-symbols-rounded" style="vertical-align: middle; color:var(--f1a-blue); font-size:18px; margin-right:5px;">draft</span> ${file.name}</span><span class="material-symbols-rounded" style="color:#ef4444; cursor:pointer; font-size:18px;" onclick="removerArquivoLista(${index})">close</span></div>`;
    });
}

// ==========================================
// PROCESSAMENTO EM LOTE E SALVAMENTO BATCH
// ==========================================
window.processarESalvarRemessa = async function() {
    const descricao = document.getElementById('remDescricao').value.trim();
    const dataRef = document.getElementById('remData').value;
    
    if (!descricao || !dataRef) return mostrarToast("Preencha a Descrição e a Data.", "erro");
    if (arquivosParaUpload.length === 0) return mostrarToast("Adicione pelo menos um arquivo.", "erro");

    const btn = document.getElementById('btnSalvarRemessa');
    btn.disabled = true; btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Extraindo...';
    
    const barraCont = document.getElementById('barraProgressoCont'); const barra = document.getElementById('barraProgresso');
    barraCont.style.display = 'block'; barra.style.width = '10%';

    try {
        const remessaRef = db.collection("remessas").doc();
        let totalCartoesRemessa = 0; let arquivosSalvosInfo = []; let todosOsClientes = [];

        for (let i = 0; i < arquivosParaUpload.length; i++) {
            const file = arquivosParaUpload[i];
            const match = file.name.match(/^Emb-Rede(\d+)-Loja(\d+)-Lote(\d+)\s+(.+)\.txt$/i);
            const rRede = match[1], rLoja = match[2], rLote = match[3], rNome = match[4].trim();

            arquivosSalvosInfo.push({ nome: file.name, loja: rLoja, lote: rLote });

            const texto = await file.text();
            const linhas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
            
            for (let j = 1; j < linhas.length; j++) {
                const cols = linhas[j].split(',');
                if (cols.length >= 2) {
                    const numCartao = cols[0].trim();
                    const nomeCliente = cols[1].trim();
                    if(numCartao && nomeCliente) {
                        totalCartoesRemessa++;
                        todosOsClientes.push({
                            idRef: db.collection(`remessas/${remessaRef.id}/clientes`).doc(),
                            cartao: numCartao, nome: nomeCliente, rede: rRede, loja: rLoja, lote: rLote, nomeLoja: rNome, status: 'pendente' 
                        });
                    }
                }
            }
            barra.style.width = `${10 + ((i+1)/arquivosParaUpload.length)*40}%`; 
        }

        let loteDeGravacao = db.batch(); let contadorLote = 0;
        for (let k = 0; k < todosOsClientes.length; k++) {
            const cli = todosOsClientes[k];
            loteDeGravacao.set(cli.idRef, {
                cartao: cli.cartao, nome: cli.nome, rede: cli.rede, loja: cli.loja, lote: cli.lote, lojaNome: cli.nomeLoja, status: cli.status
            });
            contadorLote++;
            if (contadorLote === 400 || k === todosOsClientes.length - 1) {
                await loteDeGravacao.commit(); loteDeGravacao = db.batch(); contadorLote = 0;
            }
        }
        barra.style.width = '80%';

        await remessaRef.set({
            descricao: descricao, dataRef: dataRef, arquivos: arquivosSalvosInfo, qtdArquivos: arquivosSalvosInfo.length,
            totalCartoes: totalCartoesRemessa, recebidos: 0, problemas: 0, pendentes: totalCartoesRemessa,
            statusLogistico: 'Aguardando Recebimento',
            empresaId: empresaId,
            criadoPorId: firebase.auth().currentUser.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        barra.style.width = '100%';
        mostrarToast("Remessa criada com sucesso!", "sucesso");
        setTimeout(voltarParaGrid, 1000);

    } catch(err) { console.error(err); mostrarToast("Erro: " + err.message, "erro"); } 
    finally { btn.disabled = false; btn.innerHTML = `<span class="material-symbols-rounded">cloud_upload</span> Processar e Salvar Lote`; }
}

// ==========================================
// GRID PRINCIPAL DE REMESSAS (Com Histórico)
// ==========================================
window.filtrarGrid = function() {
    const textoBusca = document.getElementById("inputBusca").value.toLowerCase(); 
    document.querySelectorAll("#corpoGridRemessas tr").forEach(linha => { 
        const textoLinha = linha.innerText.toLowerCase();
        linha.style.display = textoLinha.includes(textoBusca) ? "" : "none"; 
    }); 
}

window.carregarGridRemessas = async function() {
    if (!empresaId || typeof dadosUsuarioLogado === 'undefined') { setTimeout(carregarGridRemessas, 200); return; }

    const tbody = document.getElementById("corpoGridRemessas");
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--f1a-blue);"><span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Carregando...</td></tr>';

    try {
        let snap;
        const isMaster = (dadosUsuarioLogado.perfil === 'master' || dadosUsuarioLogado.acessoTodasEmpresas);
        
        if (isMaster) snap = await db.collection("remessas").get();
        else snap = await db.collection("remessas").where("empresaId", "==", String(empresaId)).get();

        let remessasArray = [];
        snap.forEach(doc => {
            const d = doc.data();
            if (isMaster) {
                const idBanco = Array.isArray(d.empresaId) ? String(d.empresaId[0]) : String(d.empresaId);
                const pertence = (idBanco === String(empresaId));
                const antigo = (!d.empresaId || idBanco === 'MASTER');
                if (!pertence && !antigo) return; 
            }
            remessasArray.push({ id: doc.id, ...d });
        });

        if(remessasArray.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhuma remessa encontrada nesta empresa.</td></tr>'; return; }

        remessasArray.sort((a, b) => {
            const tA = a.criadoEm ? a.criadoEm.toMillis() : 0; const tB = b.criadoEm ? b.criadoEm.toMillis() : 0;
            return tB - tA; 
        });

        tbody.innerHTML = '';
        remessasArray.forEach(d => {
            let pctRecebido = (d.totalCartoes > 0) ? Math.round((d.recebidos / d.totalCartoes) * 100) : 0;
            let statusBadge = '';
            if (d.pendentes === 0 && d.problemas === 0) statusBadge = `<span class="status-recebido" style="padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold;">100% CONCLUÍDO</span>`;
            else if (d.pendentes === d.totalCartoes) statusBadge = `<span class="status-pendente" style="padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold;">AGUARDANDO CHEGADA</span>`;
            else statusBadge = `<span style="background:rgba(0,71,255,0.1); color:var(--f1a-blue); border:1px solid rgba(0,71,255,0.3); padding:4px 8px; border-radius:6px; font-size:10px; font-weight:bold;">AUDITORIA: ${pctRecebido}%</span>`;

            let dataSplit = d.dataRef ? d.dataRef.split('-') : ['','',''];
            let dataFormatada = dataSplit.length === 3 ? `${dataSplit[2]}/${dataSplit[1]}/${dataSplit[0]}` : '-';

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight:bold; color:var(--cor-titulo);">${dataFormatada}</td>
                    <td><strong style="color:var(--f1a-blue);">${d.descricao}</strong></td>
                    <td>${d.qtdArquivos} arquivo(s)</td>
                    <td><strong>${d.totalCartoes}</strong> cartões</td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="acoes-horizontais">
                            <button class="btn-icon" style="color:var(--f1a-blue);" onclick="abrirAuditoria('${d.id}')" title="Auditar"><span class="material-symbols-rounded">checklist</span></button>
                            <button class="btn-icon" style="color:#ef4444;" onclick="excluirRemessa('${d.id}')" title="Excluir"><span class="material-symbols-rounded">delete</span></button>
                        </div>
                    </td>
                </tr>
            `;
        });

    } catch (err) { console.error(err); tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444;">Erro: ${err.message}</td></tr>`; }
}

// ==========================================
// TELA DE AUDITORIA (Filtros Avançados, Multi-Seleção e Cascata)
// ==========================================

let filtrosAuditoria = { rede: [], loja: [], status: [] };
let sortCol = 'nome'; 
let sortAsc = true;
let descricaoRemessaAtual = '';

function escaparHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function coletarFiltrosDropdownAbertos() {
    const abertos = [];
    document.querySelectorAll('[data-filtro-tipo]').forEach(el => {
        const menu = el.querySelector('.dropdown-menu-custom');
        if (menu && menu.style.display === 'flex') abertos.push(el.getAttribute('data-filtro-tipo'));
    });
    return abertos;
}

function restaurarFiltrosDropdownAbertos(tipos) {
    tipos.forEach(tipo => {
        const el = document.querySelector(`[data-filtro-tipo="${tipo}"]`);
        if (!el) return;
        const menu = el.querySelector('.dropdown-menu-custom');
        if (menu) menu.style.display = 'flex';
    });
}

function escaparAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function aplicarFiltrosAuditoria() {
    renderizarFiltrosAuditoria();
    filtrarListaAuditoria();
}

// Função de Ordenação ao Clicar na Coluna
window.sortTable = function(col) {
    if (sortCol === col) sortAsc = !sortAsc;
    else { sortCol = col; sortAsc = true; }
    filtrarListaAuditoria();
}

window.abrirAuditoria = async function(remessaId) {
    remessaAtualEditando = remessaId;
    cancelarEdicaoTituloRemessa();
    alternarAbaDetalhes('auditoria');
    document.getElementById("corpoClientesAuditoria").innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;"><span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Carregando cartões...</td></tr>';
    
    filtrosAuditoria = { rede: [], loja: [], status: [] };
    document.getElementById("filtroTexto").value = "";
    mostrarTela('viewDetalhes');

    try {
        const remSnap = await db.collection("remessas").doc(remessaId).get();
        if (!remSnap.exists) throw new Error("Remessa não encontrada");
        const rData = remSnap.data();
        remessaAtualData = rData;

        await carregarBaseLojas(rData.empresaId || empresaId);
        await carregarDespachosRemessa(remessaId);

        descricaoRemessaAtual = rData.descricao || '';
        document.getElementById("detalheTitulo").innerText = descricaoRemessaAtual;
        
        document.getElementById("totCartoes").innerText = rData.totalCartoes || 0;
        document.getElementById("totPendentes").innerText = rData.pendentes || 0;
        document.getElementById("totRecebidos").innerText = rData.recebidos || 0;
        document.getElementById("totProblemas").innerText = rData.problemas || 0;

        renderBlocoLogistica(rData);

        const cliSnap = await db.collection(`remessas/${remessaId}/clientes`).get();
        
        clientesAuditoria = [];
        cliSnap.forEach(doc => { 
            const c = doc.data();
            const lj = buscarLojaNaBase(c.loja);
            c.nomeRedeOficial = lj ? lj.rede : `Rede Desconhecida (${c.rede || 'N/D'})`;
            c.nomeLojaOficial = lj ? lj.nome : (c.lojaNome || `Loja Não Identificada (${c.loja})`);
            c.redeIdOficial = lj ? lj.redeId : '';
            c.lojaIdOficial = lj ? lj.lojaId : '';
            clientesAuditoria.push({ id: doc.id, ...c }); 
        });
        
        renderizarFiltrosAuditoria();
        filtrarListaAuditoria();
        popularSelectRedesDespacho();
        renderizarGridDespachos();
        atualizarIndicadoresLogisticos();

    } catch (err) {
        console.error(err);
        document.getElementById("corpoClientesAuditoria").innerHTML = `<tr><td colspan="4" style="color:#ef4444; text-align:center;">Erro ao carregar lista.</td></tr>`;
    }
}

function formatarDataBR(dataStr) {
    if (!dataStr) return '-';
    const partes = String(dataStr).split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return dataStr;
}

function formatarMoedaBR(valor) {
    const n = parseFloat(valor) || 0;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderBlocoLogistica(rData) {
    const status = rData.statusLogistico || 'Aguardando Recebimento';
    document.getElementById('logDataEnvio').innerText = formatarDataBR(rData.dataRef);
    document.getElementById('logDataRecebimento').innerText = formatarDataBR(rData.dataRecebimento);
    document.getElementById('logRecebidoPor').innerText = rData.recebidoPor || '-';
    document.getElementById('logObservacao').innerText = rData.observacaoRecebimento || '-';

    const elStatus = document.getElementById('logStatusLogistico');
    elStatus.innerText = status;
    elStatus.className = 'badge-logistico';
    if (status === 'Recebida') elStatus.classList.add('badge-recebida');
    else if (status === 'Finalizada') elStatus.classList.add('badge-finalizada');
    else elStatus.classList.add('badge-aguardando');

    const btnRec = document.getElementById('btnRegistrarRecebimento');
    if (btnRec) {
        const jaRecebida = status === 'Recebida' || status === 'Finalizada';
        btnRec.style.display = jaRecebida ? 'none' : 'inline-flex';
    }
}

window.abrirModalRecebimento = function() {
    document.getElementById('modalDataRecebimento').value = new Date().toISOString().split('T')[0];
    document.getElementById('modalObsRecebimento').value = '';
    document.getElementById('modalRecebimento').classList.remove('escondido');
};

window.fecharModalRecebimento = function() {
    document.getElementById('modalRecebimento').classList.add('escondido');
};

window.confirmarRecebimento = async function() {
    if (!remessaAtualEditando) return;
    const dataRec = document.getElementById('modalDataRecebimento').value;
    const obs = document.getElementById('modalObsRecebimento').value.trim();
    if (!dataRec) return mostrarToast('Informe a data de recebimento.', 'erro');

    const nomeUsuario = (dadosUsuarioLogado && dadosUsuarioLogado.nome) ? dadosUsuarioLogado.nome : 'Usuário';
    const uid = firebase.auth().currentUser ? firebase.auth().currentUser.uid : '';

    try {
        const payload = {
            dataRecebimento: dataRec,
            recebidoPor: nomeUsuario,
            recebidoPorUid: uid,
            observacaoRecebimento: obs,
            statusLogistico: 'Recebida',
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('remessas').doc(remessaAtualEditando).update(payload);
        remessaAtualData = { ...remessaAtualData, ...payload };
        renderBlocoLogistica(remessaAtualData);
        fecharModalRecebimento();
        mostrarToast('Recebimento registrado com sucesso!', 'sucesso');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao registrar recebimento.', 'erro');
    }
};

window.alternarAbaDetalhes = function(aba) {
    const tabAud = document.getElementById('tabAuditoria');
    const tabDesp = document.getElementById('tabDespachos');
    const painelAud = document.getElementById('painelAuditoria');
    const painelDesp = document.getElementById('painelDespachos');
    if (!tabAud || !tabDesp) return;

    if (aba === 'despachos') {
        tabAud.classList.remove('ativo');
        tabDesp.classList.add('ativo');
        painelAud.classList.remove('ativo');
        painelDesp.classList.add('ativo');
    } else {
        tabDesp.classList.remove('ativo');
        tabAud.classList.add('ativo');
        painelDesp.classList.remove('ativo');
        painelAud.classList.add('ativo');
    }
};

function getClientesFiltrados() {
    const txt = document.getElementById('filtroTexto').value.toLowerCase();
    return clientesAuditoria.filter(c => {
        const mTxt = !txt || c.nome.toLowerCase().includes(txt) || c.cartao.includes(txt);
        const mRede = filtrosAuditoria.rede.includes('__NONE__') ? false : (filtrosAuditoria.rede.length === 0 || filtrosAuditoria.rede.includes(c.nomeRedeOficial));
        const mLoja = filtrosAuditoria.loja.includes('__NONE__') ? false : (filtrosAuditoria.loja.length === 0 || filtrosAuditoria.loja.includes(c.nomeLojaOficial));
        const mStatus = filtrosAuditoria.status.includes('__NONE__') ? false : (filtrosAuditoria.status.length === 0 || filtrosAuditoria.status.includes(c.status));
        return mTxt && mRede && mLoja && mStatus;
    });
}

function labelStatusCartao(st) {
    if (st === 'recebido') return 'Recebido OK';
    if (st === 'problema') return 'Com Problema';
    return 'Pendente';
}

function formatarCnpjPrint(cnpj) {
    if (!cnpj) return '-';
    const n = String(cnpj).replace(/\D/g, '');
    if (n.length === 14) return n.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    return cnpj;
}

function formatarDataHoraEmissao() {
    const agora = new Date();
    return agora.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function buscarRedeNaBase(redeId, redeNome) {
    if (redeId) {
        const porId = baseRedes.find(r => r.id === redeId);
        if (porId) return porId;
    }
    if (redeNome) return baseRedes.find(r => r.nome === redeNome) || null;
    return null;
}

function getDadosLojaPrint(c) {
    const lj = buscarLojaNaBase(c.loja);
    return {
        nome: lj ? lj.nome : (c.nomeLojaOficial || c.lojaNome || 'Sem Loja'),
        codigo: lj ? (lj.codigo || '-') : (c.loja || '-'),
        cnpj: lj ? formatarCnpjPrint(lj.cnpj) : '-',
        cidade: lj ? (lj.cidade || '-') : '-',
        bairro: lj ? (lj.bairro || '-') : '-',
        redeId: lj ? lj.redeId : (c.redeIdOficial || ''),
        redeNome: c.nomeRedeOficial || (lj ? lj.rede : 'Sem Rede')
    };
}

function pluralizarCartoes(qtd) {
    const n = parseInt(qtd, 10) || 0;
    return `${n} ${n === 1 ? 'cartão' : 'cartões'}`;
}

function montarResumoItemPrint(label, valor, full) {
    return `<div class="print-resumo-item${full ? ' full' : ''}"><label>${escaparHtml(label)}</label><span>${escaparHtml(valor)}</span></div>`;
}

window.imprimirListagemAuditoria = async function() {
    const filtrados = getClientesFiltrados();
    if (filtrados.length === 0) return mostrarToast('Nenhum cartão no filtro atual para imprimir.', 'erro');

    if (!baseLojas.length || !baseRedes.length) {
        await carregarBaseLojas(remessaAtualData.empresaId || empresaId);
    }

    const ordenados = [...filtrados].sort((a, b) => {
        const rA = (a.nomeRedeOficial || '').localeCompare(b.nomeRedeOficial || '', 'pt-BR');
        if (rA !== 0) return rA;
        const lA = (a.nomeLojaOficial || '').localeCompare(b.nomeLojaOficial || '', 'pt-BR');
        if (lA !== 0) return lA;
        return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
    });

    const gruposRede = {};
    ordenados.forEach(c => {
        const dadosLoja = getDadosLojaPrint(c);
        const redeKey = dadosLoja.redeNome || 'Sem Rede';
        const lojaKey = dadosLoja.nome || 'Sem Loja';

        if (!gruposRede[redeKey]) {
            gruposRede[redeKey] = {
                redeId: dadosLoja.redeId,
                redeNome: redeKey,
                lojas: {},
                totalCartoes: 0
            };
        }
        if (!gruposRede[redeKey].lojas[lojaKey]) {
            gruposRede[redeKey].lojas[lojaKey] = {
                dados: dadosLoja,
                lote: c.lote || '-',
                cartoes: []
            };
        }
        gruposRede[redeKey].lojas[lojaKey].cartoes.push(c);
        gruposRede[redeKey].totalCartoes++;
    });

    const redesOrdenadas = Object.values(gruposRede).sort((a, b) =>
        (a.redeNome || '').localeCompare(b.redeNome || '', 'pt-BR')
    );

    const qtdRedes = redesOrdenadas.length;
    const qtdLojas = redesOrdenadas.reduce((acc, r) => acc + Object.keys(r.lojas).length, 0);
    const qtdCartoes = filtrados.length;

    const statusLogistico = remessaAtualData.statusLogistico || 'Aguardando Recebimento';
    const fornecedor = remessaAtualData.fornecedor || remessaAtualData.fornecedorNome || 'Não informado';
    const usuarioEmissor = (dadosUsuarioLogado && dadosUsuarioLogado.nome) ? dadosUsuarioLogado.nome : 'Usuário';
    const dataHoraEmissao = formatarDataHoraEmissao();

    let cabecalhoResumo = `
        <div class="print-banner">
            <div class="print-banner-top">
                <div>
                    <p class="print-banner-title">Auditoria de Remessa</p>
                    <p class="print-banner-sub">Documento operacional — Logística e Verificação (Emboço)</p>
                </div>
                <div class="print-banner-brand">F1A</div>
            </div>
        </div>
        <div class="print-resumo">
            <p class="print-resumo-titulo">Dados da Remessa</p>
            <div class="print-resumo-grid">
                ${montarResumoItemPrint('Nome da Remessa', descricaoRemessaAtual, true)}
                ${montarResumoItemPrint('Fornecedor', fornecedor)}
                ${montarResumoItemPrint('Status Logístico', statusLogistico)}
                ${montarResumoItemPrint('Data de Envio', formatarDataBR(remessaAtualData.dataRef))}
                ${montarResumoItemPrint('Data de Recebimento', formatarDataBR(remessaAtualData.dataRecebimento))}
                ${montarResumoItemPrint('Emissão', dataHoraEmissao)}
                ${montarResumoItemPrint('Usuário Emissor', usuarioEmissor)}
            </div>
            <div class="print-emissao">
                <div class="print-emissao-linha">
                    <span>Relatório gerado com filtros aplicados na auditoria</span>
                </div>
            </div>
        </div>
        <div class="print-total-geral">
            <p class="print-total-geral-titulo">Total Geral da Remessa</p>
            <div class="print-total-geral-grid">
                <div class="print-total-geral-item">
                    <span class="print-total-geral-valor">${qtdCartoes}</span>
                    <span class="print-total-geral-label">${qtdCartoes === 1 ? 'Cartão' : 'Cartões'}</span>
                </div>
                <div class="print-total-geral-item">
                    <span class="print-total-geral-valor">${qtdRedes}</span>
                    <span class="print-total-geral-label">${qtdRedes === 1 ? 'Rede' : 'Redes'}</span>
                </div>
                <div class="print-total-geral-item">
                    <span class="print-total-geral-valor">${qtdLojas}</span>
                    <span class="print-total-geral-label">${qtdLojas === 1 ? 'Loja' : 'Lojas'}</span>
                </div>
            </div>
        </div>
    `;

    let corpoRedes = '';

    redesOrdenadas.forEach(redeBloco => {
        const redeCadastro = buscarRedeNaBase(redeBloco.redeId, redeBloco.redeNome);
        const gerenteNome = redeCadastro ? (redeCadastro.gerenteNome || '-') : '-';

        corpoRedes += `
            <div class="print-bloco-rede">
                <div class="print-rede-header">
                    <h2>Rede: ${escaparHtml(redeBloco.redeNome)}</h2>
                    <p>Gerente responsável: ${escaparHtml(gerenteNome)}</p>
                </div>
        `;

        const lojasOrdenadas = Object.entries(redeBloco.lojas).sort((a, b) =>
            a[0].localeCompare(b[0], 'pt-BR')
        );

        lojasOrdenadas.forEach(([, lojaBloco]) => {
            const dl = lojaBloco.dados;
            const cartoesOrdenados = [...lojaBloco.cartoes].sort((a, b) =>
                (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
            );
            const qtdLoja = cartoesOrdenados.length;
            const lotesUnicos = [...new Set(cartoesOrdenados.map(c => c.lote || '-'))];
            const loteExibir = lotesUnicos.length === 1 ? lotesUnicos[0] : lotesUnicos.join(', ');

            corpoRedes += `
                <div class="print-loja-bloco">
                    <div class="print-loja-info">
                        <div class="print-loja-linha">
                            <span class="print-loja-nome">${escaparHtml(dl.nome)}</span>
                            <span class="print-loja-meta">Cód: ${escaparHtml(String(dl.codigo))} | CNPJ: ${escaparHtml(dl.cnpj)} | Lote: ${escaparHtml(String(loteExibir || '-'))} | ${escaparHtml(dl.cidade)} - ${escaparHtml(dl.bairro)} | ${pluralizarCartoes(qtdLoja)}</span>
                        </div>
                    </div>
                    <table class="print-tabela">
                        <thead>
                            <tr>
                                <th style="width:22%;">Nº Cartão</th>
                                <th style="width:42%;">Nome Impresso</th>
                                <th style="width:14%;">Lote</th>
                                <th style="width:22%;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            cartoesOrdenados.forEach(c => {
                corpoRedes += `
                    <tr>
                        <td style="font-family: monospace;">${escaparHtml(c.cartao)}</td>
                        <td>${escaparHtml(c.nome)}</td>
                        <td>${escaparHtml(c.lote || '-')}</td>
                        <td>${escaparHtml(labelStatusCartao(c.status))}</td>
                    </tr>
                `;
            });

            corpoRedes += `
                        </tbody>
                    </table>
                    <div class="print-subtotal-loja">Subtotal da Loja: ${pluralizarCartoes(qtdLoja)}</div>
                </div>
            `;
        });

        corpoRedes += `
                <div class="print-subtotal-rede">
                    Subtotal da Rede "${escaparHtml(redeBloco.redeNome)}": ${pluralizarCartoes(redeBloco.totalCartoes)}
                    &nbsp;|&nbsp; ${lojasOrdenadas.length} loja${lojasOrdenadas.length !== 1 ? 's' : ''}
                </div>
            </div>
        `;
    });

    const area = document.getElementById('areaImpressao');
    area.innerHTML = `
        ${cabecalhoResumo}
        ${corpoRedes}
        <div class="print-emissao print-emissao-final">
            <div class="print-emissao-linha">
                <span>Emitido em ${escaparHtml(dataHoraEmissao)} por ${escaparHtml(usuarioEmissor)}</span>
                <span>F1A Platform — Módulo ADM Cartão</span>
            </div>
        </div>
    `;

    executarImpressaoRemessa(area);
};

function executarImpressaoRemessa(area) {
    if (!area) return;

    document.body.classList.add('modo-impressao-remessa');

    const restaurarPosicao = () => {
        document.body.classList.remove('modo-impressao-remessa');
        area.style.display = 'none';
        const slot = document.getElementById('areaImpressaoSlot');
        if (slot && area.parentNode !== slot) slot.appendChild(area);
        window.removeEventListener('afterprint', restaurarPosicao);
    };

    window.addEventListener('afterprint', restaurarPosicao);

    if (area.parentNode !== document.body) document.body.appendChild(area);
    area.style.display = 'block';

    requestAnimationFrame(() => {
        requestAnimationFrame(() => window.print());
    });
}

async function carregarDespachosRemessa(remessaId) {
    despachosRemessa = [];
    try {
        const snap = await db.collection(`remessas/${remessaId}/despachos`).orderBy('criadoEm', 'desc').get();
        snap.forEach(doc => despachosRemessa.push({ id: doc.id, ...doc.data() }));
    } catch (err) {
        try {
            const snap = await db.collection(`remessas/${remessaId}/despachos`).get();
            snap.forEach(doc => despachosRemessa.push({ id: doc.id, ...doc.data() }));
            despachosRemessa.sort((a, b) => {
                const tA = a.criadoEm ? a.criadoEm.toMillis() : 0;
                const tB = b.criadoEm ? b.criadoEm.toMillis() : 0;
                return tB - tA;
            });
        } catch (e) { console.error(e); }
    }
}

function getLojasUnicasRemessa() {
    const map = new Map();
    clientesAuditoria.forEach(c => {
        const lj = buscarLojaNaBase(c.loja);
        const key = lj ? lj.lojaId : `${c.rede}-${c.loja}`;
        if (!map.has(key)) {
            map.set(key, {
                lojaId: lj ? lj.lojaId : '',
                lojaNome: c.nomeLojaOficial,
                redeId: lj ? lj.redeId : '',
                redeNome: c.nomeRedeOficial,
                codigoLoja: c.loja
            });
        }
    });
    return Array.from(map.values()).sort((a, b) => (a.redeNome || '').localeCompare(b.redeNome || '') || (a.lojaNome || '').localeCompare(b.lojaNome || ''));
}

function popularSelectRedesDespacho() {
    const sel = document.getElementById('despRede');
    if (!sel) return;
    const redesUnicas = [...new Set(getLojasUnicasRemessa().map(l => l.redeNome))].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = '<option value="">Selecione a rede...</option>';
    redesUnicas.forEach(nome => {
        const lojaRef = getLojasUnicasRemessa().find(l => l.redeNome === nome);
        const redeId = lojaRef ? lojaRef.redeId : '';
        sel.innerHTML += `<option value="${escaparAttr(redeId)}" data-nome="${escaparAttr(nome)}">${escaparHtml(nome)}</option>`;
    });
    document.getElementById('despData').value = new Date().toISOString().split('T')[0];
}

window.atualizarLojasDespachoForm = function() {
    const sel = document.getElementById('despRede');
    const container = document.getElementById('despLojasCheckboxes');
    if (!sel || !container) return;
    const redeId = sel.value;
    const redeNome = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].getAttribute('data-nome') : '';

    if (!redeId && !redeNome) {
        container.innerHTML = '<span style="color: var(--cor-texto); font-size: 12px;">Selecione uma rede primeiro.</span>';
        return;
    }

    const lojas = getLojasUnicasRemessa().filter(l => (redeId && l.redeId === redeId) || l.redeNome === redeNome);
    if (lojas.length === 0) {
        container.innerHTML = '<span style="color: var(--cor-texto); font-size: 12px;">Nenhuma loja nesta rede.</span>';
        return;
    }

    container.innerHTML = lojas.map(l => `
        <label>
            <input type="checkbox" class="chk-loja-despacho" value="${escaparAttr(l.lojaId || l.codigoLoja)}" data-nome="${escaparAttr(l.lojaNome)}">
            <span>${escaparHtml(l.lojaNome)}</span>
        </label>
    `).join('');
};

function classeStatusDespacho(st) {
    const map = {
        'Pendente': 'st-desp-pendente',
        'Despachado': 'st-desp-despachado',
        'Em Trânsito': 'st-desp-transito',
        'Entregue': 'st-desp-entregue',
        'Cancelado': 'st-desp-cancelado'
    };
    return map[st] || 'st-desp-pendente';
}

function renderizarGridDespachos() {
    const tbody = document.getElementById('corpoGridDespachos');
    if (!tbody) return;

    if (despachosRemessa.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;">Nenhum despacho registrado.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    despachosRemessa.forEach(d => {
        const qtdLojas = Array.isArray(d.lojas) ? d.lojas.length : 0;
        const status = d.status || 'Pendente';
        tbody.innerHTML += `
            <tr>
                <td style="font-weight:bold;">${formatarDataBR(d.dataDespacho)}</td>
                <td><strong style="color:var(--f1a-blue);">${escaparHtml(d.redeNome || '-')}</strong></td>
                <td>${qtdLojas} loja${qtdLojas !== 1 ? 's' : ''}</td>
                <td>${escaparHtml(d.tipoEntrega || '-')}</td>
                <td>${formatarMoedaBR(d.custoEntrega)}</td>
                <td><span class="status-despacho ${classeStatusDespacho(status)}">${escaparHtml(status)}</span></td>
                <td>
                    <div class="acoes-horizontais">
                        <select class="select-filtro" style="font-size:11px; padding:4px;" onchange="alterarStatusDespacho('${d.id}', this.value)">
                            <option value="Pendente" ${status === 'Pendente' ? 'selected' : ''}>Pendente</option>
                            <option value="Despachado" ${status === 'Despachado' ? 'selected' : ''}>Despachado</option>
                            <option value="Em Trânsito" ${status === 'Em Trânsito' ? 'selected' : ''}>Em Trânsito</option>
                            <option value="Entregue" ${status === 'Entregue' ? 'selected' : ''}>Entregue</option>
                            <option value="Cancelado" ${status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
                        </select>
                        <button class="btn-icon" style="color:#ef4444;" onclick="excluirDespacho('${d.id}')" title="Excluir"><span class="material-symbols-rounded">delete</span></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

window.salvarDespacho = async function() {
    if (!remessaAtualEditando) return;

    const selRede = document.getElementById('despRede');
    const redeId = selRede.value;
    const redeNome = selRede.options[selRede.selectedIndex] ? selRede.options[selRede.selectedIndex].getAttribute('data-nome') : '';
    if (!redeId && !redeNome) return mostrarToast('Selecione a rede.', 'erro');

    const checks = document.querySelectorAll('.chk-loja-despacho:checked');
    if (checks.length === 0) return mostrarToast('Selecione ao menos uma loja.', 'erro');

    const lojas = [];
    checks.forEach(chk => {
        lojas.push({ lojaId: chk.value, lojaNome: chk.getAttribute('data-nome') || '' });
    });

    const dataDespacho = document.getElementById('despData').value;
    const tipoEntrega = document.getElementById('despTipoEntrega').value;
    const codigoRastreio = document.getElementById('despRastreio').value.trim();
    const custoEntrega = parseFloat(document.getElementById('despCusto').value) || 0;
    const observacao = document.getElementById('despObservacao').value.trim();

    if (!dataDespacho) return mostrarToast('Informe a data do despacho.', 'erro');

    const btn = document.getElementById('btnSalvarDespacho');
    if (btn) btn.disabled = true;

    try {
        const payload = {
            redeId,
            redeNome,
            lojas,
            dataDespacho,
            tipoEntrega,
            codigoRastreio,
            custoEntrega,
            observacao,
            status: 'Pendente',
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            criadoPor: firebase.auth().currentUser.uid
        };
        await db.collection(`remessas/${remessaAtualEditando}/despachos`).add(payload);
        await carregarDespachosRemessa(remessaAtualEditando);
        renderizarGridDespachos();
        atualizarIndicadoresLogisticos();

        document.getElementById('despRede').value = '';
        document.getElementById('despRastreio').value = '';
        document.getElementById('despCusto').value = '';
        document.getElementById('despObservacao').value = '';
        document.getElementById('despLojasCheckboxes').innerHTML = '<span style="color: var(--cor-texto); font-size: 12px;">Selecione uma rede primeiro.</span>';

        mostrarToast('Despacho salvo com sucesso!', 'sucesso');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao salvar despacho.', 'erro');
    } finally {
        if (btn) btn.disabled = false;
    }
};

window.alterarStatusDespacho = async function(despachoId, novoStatus) {
    if (!remessaAtualEditando) return;
    try {
        await db.collection(`remessas/${remessaAtualEditando}/despachos`).doc(despachoId).update({
            status: novoStatus,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        const idx = despachosRemessa.findIndex(d => d.id === despachoId);
        if (idx !== -1) despachosRemessa[idx].status = novoStatus;
        renderizarGridDespachos();
        atualizarIndicadoresLogisticos();
        mostrarToast('Status atualizado.', 'sucesso');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao atualizar status.', 'erro');
    }
};

window.excluirDespacho = async function(despachoId) {
    if (!remessaAtualEditando) return;
    if (!confirm('Deseja excluir este despacho?')) return;
    try {
        await db.collection(`remessas/${remessaAtualEditando}/despachos`).doc(despachoId).delete();
        await carregarDespachosRemessa(remessaAtualEditando);
        renderizarGridDespachos();
        atualizarIndicadoresLogisticos();
        mostrarToast('Despacho excluído.', 'sucesso');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao excluir despacho.', 'erro');
    }
};

function atualizarIndicadoresLogisticos() {
    const lojasRemessa = getLojasUnicasRemessa();
    const totalLojas = lojasRemessa.length;

    const lojasDespachadasSet = new Set();
    const lojasEntreguesSet = new Set();
    let custoTotal = 0;

    despachosRemessa.forEach(d => {
        if (d.status === 'Cancelado') return;
        custoTotal += parseFloat(d.custoEntrega) || 0;
        if (!Array.isArray(d.lojas)) return;
        d.lojas.forEach(l => {
            const key = l.lojaId || l.lojaNome;
            if (d.status === 'Entregue') lojasEntreguesSet.add(key);
            else if (d.status === 'Despachado' || d.status === 'Em Trânsito' || d.status === 'Pendente') lojasDespachadasSet.add(key);
        });
    });

    lojasEntreguesSet.forEach(k => lojasDespachadasSet.delete(k));

    const pendentes = Math.max(0, totalLojas - lojasDespachadasSet.size - lojasEntreguesSet.size);

    const elPend = document.getElementById('totLojasPendentes');
    const elDesp = document.getElementById('totLojasDespachadas');
    const elEnt = document.getElementById('totLojasEntregues');
    const elCusto = document.getElementById('totCustoEntrega');

    if (elPend) elPend.innerText = pendentes;
    if (elDesp) elDesp.innerText = lojasDespachadasSet.size;
    if (elEnt) elEnt.innerText = lojasEntreguesSet.size;
    if (elCusto) elCusto.innerText = formatarMoedaBR(custoTotal);
}

// Retorna quais opções existem para o filtro atual
function getOpcoesAtuais(tipo) {
    if (tipo === 'rede') return [...new Set(clientesAuditoria.map(c => c.nomeRedeOficial))].sort();
    if (tipo === 'loja') {
        let lojasFiltradas = clientesAuditoria;
        // Só filtra a loja se houver uma rede selecionada
        if (filtrosAuditoria.rede.length > 0 && !filtrosAuditoria.rede.includes('__NONE__')) {
            lojasFiltradas = clientesAuditoria.filter(c => filtrosAuditoria.rede.includes(c.nomeRedeOficial));
        }
        return [...new Set(lojasFiltradas.map(c => c.nomeLojaOficial))].sort();
    }
    if (tipo === 'status') return ['pendente', 'recebido', 'problema'];
    return [];
}

function renderizarFiltrosAuditoria() {
    const dropdownsAbertos = coletarFiltrosDropdownAbertos();
    renderizarCaixaCheckbox('filtroRede_container', 'Redes', getOpcoesAtuais('rede'), filtrosAuditoria.rede, 'rede');
    renderizarCaixaCheckbox('filtroLoja_container', 'Lojas', getOpcoesAtuais('loja'), filtrosAuditoria.loja, 'loja');
    renderizarCaixaCheckbox('filtroStatus_container', 'Status', getOpcoesAtuais('status'), filtrosAuditoria.status, 'status');
    restaurarFiltrosDropdownAbertos(dropdownsAbertos);
}

// Construtor do Dropdown Customizado com Checkboxes
function renderizarCaixaCheckbox(idContainer, label, opcoes, selecionados, tipo) {
    const container = document.getElementById(idContainer);
    const isTodos = selecionados.length === 0; 
    const isNenhum = selecionados.includes('__NONE__');
    
    let titulo = `${label} (${selecionados.length})`;
    if (isTodos) titulo = `Todas as ${label}`;
    if (isNenhum) titulo = `Nenhuma ${label}`;
    if (tipo === 'status' && isTodos) titulo = `Todos os Status`;
    if (tipo === 'status' && isNenhum) titulo = `Nenhum Status`;

    container.innerHTML = `
        <div class="multi-filtro-custom" data-filtro-tipo="${tipo}" style="position:relative; width: 100%; height: 100%;">
            <div onclick="toggleDropdown(this)" style="display:flex; align-items:center; justify-content:space-between; padding: 0 15px; border-radius: 8px; border: 1px solid var(--borda); background: var(--bg-body); color: var(--cor-titulo); font-size: 13px; outline: none; cursor: pointer; height: 100%; box-sizing: border-box; font-family: inherit;">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escaparHtml(titulo)}</span>
                <span class="material-symbols-rounded" style="font-size:18px; color: var(--cor-texto); margin-left: 5px;">expand_more</span>
            </div>
            
            <div class="dropdown-menu-custom" style="display:none; position:absolute; top:46px; left:0; width:100%; min-width:200px; background:var(--bg-painel); border:1px solid var(--borda); padding:10px; border-radius:8px; z-index:999; max-height:250px; overflow-y:auto; box-shadow:0 4px 15px rgba(0,0,0,0.3); flex-direction: column; gap: 5px;">
                <label style="display:flex; align-items:center; cursor:pointer; font-weight:bold; color:var(--f1a-blue); margin-bottom:5px; padding: 4px 8px; border-bottom: 1px solid var(--borda); padding-bottom: 8px;">

                    <input type="checkbox" onchange="toggleTodosFiltro('${tipo}', this.checked)" ${isTodos ? 'checked' : ''} style="margin: 0 8px 0 0; width: 16px; height: 16px; flex-shrink: 0; cursor: pointer;"> (Selecionar Todos)
                    </label>
                ${opcoes.map(opt => {
                    let optDisplay = (tipo === 'status') ? (opt === 'pendente' ? 'Pendentes' : opt === 'recebido' ? 'Recebidos OK' : 'Com Problema') : opt;
                    const isChecked = isTodos || (!isNenhum && selecionados.includes(opt));
                    return `
                    <label style="display:flex; align-items:center; cursor:pointer; font-size:12px; padding:4px 8px; color: var(--cor-texto); transition: 0.2s;" onmouseover="this.style.color='var(--f1a-blue)'" onmouseout="this.style.color='var(--cor-texto)'">
                        <input type="checkbox" value="${escaparAttr(opt)}" onchange="toggleItemFiltro('${tipo}', this.value)" ${isChecked ? 'checked' : ''} style="margin: 0 8px 0 0; width: 16px; height: 16px; flex-shrink: 0; cursor: pointer;"> 
                        <span>${escaparHtml(optDisplay)}</span>
                    </label>`
                }).join('')}
            </div>
        </div>
    `;
}

// Lógica de abrir/fechar manual
window.toggleDropdown = function(element) {
    const menu = element.nextElementSibling;
    const isVisible = menu.style.display === 'flex';
    // Fecha todos antes de abrir este
    document.querySelectorAll('.dropdown-menu-custom').forEach(m => m.style.display = 'none');
    menu.style.display = isVisible ? 'none' : 'flex';
}

// Fecha dropdown ao clicar fora
document.addEventListener('click', function(e) {
    if (!e.target.closest('.multi-filtro-custom')) {
        document.querySelectorAll('.dropdown-menu-custom').forEach(m => m.style.display = 'none');
    }
});

// Toggle Selecionar Todos / Desmarcar Todos
window.toggleTodosFiltro = function(tipo, forceState) {
    if (forceState === false) {
        filtrosAuditoria[tipo] = ['__NONE__']; // Desmarca tudo e oculta a lista
    } else {
        filtrosAuditoria[tipo] = []; // Marca tudo (vazio = todos)
    }
    
    if (tipo === 'rede') filtrosAuditoria.loja = []; // Reseta a cascata
    
    aplicarFiltrosAuditoria();
}

// Toggle Item Individual
window.toggleItemFiltro = function(tipo, val) {
    let arr = filtrosAuditoria[tipo];
    let opcoes = getOpcoesAtuais(tipo);

    // Se estava "Todos", preenchemos a array com todos EXCETO o que o usuário acabou de desmarcar
    if (arr.length === 0) {
        filtrosAuditoria[tipo] = opcoes.filter(o => o !== val);
    } else {
        if (arr.includes('__NONE__')) arr = []; // Se estava vazio, limpa a flag pra começar a preencher
        
        const idx = arr.indexOf(val);
        if (idx > -1) arr.splice(idx, 1); // Desmarca
        else arr.push(val); // Marca
        
        filtrosAuditoria[tipo] = arr;
        
        if (filtrosAuditoria[tipo].length === 0) filtrosAuditoria[tipo] = ['__NONE__']; // Desmarcou o último
        else if (filtrosAuditoria[tipo].length === opcoes.length) filtrosAuditoria[tipo] = []; // Marcou todos individualmente
    }
    
    // Regra de Cascata
    if (tipo === 'rede') filtrosAuditoria.loja = [];

    aplicarFiltrosAuditoria();
}

window.filtrarListaAuditoria = function() {
    const tbody = document.getElementById("corpoClientesAuditoria");
    tbody.innerHTML = '';

    let filtrados = getClientesFiltrados();

    // Ordenação
    filtrados.sort((a, b) => {
        let vA = a[sortCol] || '', vB = b[sortCol] || '';
        return sortAsc ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    atualizarCardsFiltrados(filtrados);

    if(filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Nenhum cartão encontrado neste filtro.</td></tr>'; return;
    }

    // Desenha as Linhas
    filtrados.forEach(c => {
        let classeSelect = 'status-pendente';
        if(c.status === 'recebido') classeSelect = 'status-recebido';
        if(c.status === 'problema') classeSelect = 'status-problema';

        tbody.innerHTML += `
            <tr>
                <td style="font-family: monospace; font-size: 14px;">${c.cartao}</td>
                <td style="font-weight: bold; color: var(--cor-titulo);">${c.nome}</td>
                <td style="font-size: 11px; color: var(--cor-texto);">
                    <strong style="color:var(--f1a-blue);">${c.nomeRedeOficial}</strong><br>
                    <span>${c.nomeLojaOficial}</span> | Lote ${c.lote}
                </td>
                <td style="text-align: right;">
                    <select class="select-status ${classeSelect}" onchange="mudarStatusCliente('${c.id}', this.value, this)">
                        <option value="pendente" ${c.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="recebido" ${c.status === 'recebido' ? 'selected' : ''}>Recebido OK</option>
                        <option value="problema" ${c.status === 'problema' ? 'selected' : ''}>Com Problema</option>
                    </select>
                </td>
            </tr>
        `;
    });
}

window.mudarStatusCliente = async function(clienteId, novoStatus, selectElement) {
    if (!remessaAtualEditando) return;
    selectElement.className = 'select-status';
    if(novoStatus === 'recebido') selectElement.classList.add('status-recebido');
    else if(novoStatus === 'problema') selectElement.classList.add('status-problema');
    else selectElement.classList.add('status-pendente');

    const index = clientesAuditoria.findIndex(c => c.id === clienteId);
    if (index !== -1) clientesAuditoria[index].status = novoStatus;

    try {
        await db.collection(`remessas/${remessaAtualEditando}/clientes`)
        .doc(clienteId)
        .update({ status: novoStatus });

        await recalcularTotaisRemessa(remessaAtualEditando);

        filtrarListaAuditoria();
    } catch(err) { console.error(err); mostrarToast("Erro ao gravar status.", "erro"); }
}

window.marcarTodos = async function(statusDesejado) {
    if (!remessaAtualEditando) return;
    
    const filtrados = getClientesFiltrados();

    if (filtrados.length === 0) return mostrarToast("Nenhum cartão visível para alterar.", "erro");
    if (!confirm(`Atenção: Isso alterará o status de ${filtrados.length} cartões filtrados para "${statusDesejado.toUpperCase()}". Confirma?`)) return;

    try {
        let batch = db.batch(); let cont = 0;
        for (let i = 0; i < filtrados.length; i++) {
            const c = filtrados[i];
            const docRef = db.collection(`remessas/${remessaAtualEditando}/clientes`).doc(c.id);
            batch.update(docRef, { status: statusDesejado });
            c.status = statusDesejado; 
            cont++;
            if (cont === 400 || i === filtrados.length - 1) { await batch.commit(); batch = db.batch(); cont = 0; }
        }
        await recalcularTotaisRemessa(remessaAtualEditando);
        mostrarToast(`${filtrados.length} cartões foram atualizados!`, "sucesso");
        filtrarListaAuditoria(); 
    } catch(err) { console.error(err); mostrarToast("Erro ao atualizar em lote.", "erro"); }
}

async function recalcularTotaisRemessa(remessaId) {
    const cliSnap = await db.collection(`remessas/${remessaId}/clientes`).get();
    let r = 0, p = 0, prob = 0;
    cliSnap.forEach(doc => {
        const st = doc.data().status;
        if(st === 'recebido') r++; else if(st === 'problema') prob++; else p++;
    });
    document.getElementById("totPendentes").innerText = p;
    document.getElementById("totRecebidos").innerText = r;
    document.getElementById("totProblemas").innerText = prob;
    await db.collection("remessas").doc(remessaId).update({ pendentes: p, recebidos: r, problemas: prob });
}

window.excluirRemessa = async function(remessaId) {
    if (!confirm("Deseja realmente excluir esta remessa?\n\nTodos os cartões vinculados também serão removidos.")) {
        return;
    }

    try {
        mostrarToast("Excluindo remessa...", "sucesso");

        const clientesSnap = await db
            .collection(`remessas/${remessaId}/clientes`)
            .get();

        const despachosSnap = await db
            .collection(`remessas/${remessaId}/despachos`)
            .get();

        let batch = db.batch();
        let contador = 0;

        for (const doc of clientesSnap.docs) {
            batch.delete(doc.ref);
            contador++;

            if (contador >= 400) {
                await batch.commit();
                batch = db.batch();
                contador = 0;
            }
        }

        for (const doc of despachosSnap.docs) {
            batch.delete(doc.ref);
            contador++;

            if (contador >= 400) {
                await batch.commit();
                batch = db.batch();
                contador = 0;
            }
        }

        if (contador > 0) {
            await batch.commit();
        }

        await db.collection("remessas").doc(remessaId).delete();

        mostrarToast("Remessa excluída com sucesso!", "sucesso");

        carregarGridRemessas();

    } catch (error) {
        console.error(error);
        mostrarToast("Erro ao excluir remessa.", "erro");
    }
}

function atualizarDescricaoNaGrid(remessaId, novaDescricao) {
    const linhas = document.querySelectorAll('#corpoGridRemessas tr');
    linhas.forEach(linha => {
        const btnAuditar = linha.querySelector('button[onclick*="abrirAuditoria"]');
        if (!btnAuditar) return;
        const onclickAttr = btnAuditar.getAttribute('onclick') || '';
        if (!onclickAttr.includes(remessaId)) return;
        const celulaDesc = linha.querySelectorAll('td')[1];
        if (celulaDesc) celulaDesc.innerHTML = `<strong style="color:var(--f1a-blue);">${escaparHtml(novaDescricao)}</strong>`;
        btnAuditar.setAttribute('onclick', `abrirAuditoria('${remessaId}')`);
    });
}

window.iniciarEdicaoTituloRemessa = function() {
    if (!remessaAtualEditando) return;
    const wrap = document.getElementById('detalheTituloWrap');
    const edicao = document.getElementById('detalheTituloEdicao');
    const input = document.getElementById('inputEditarDescricaoRemessa');
    if (!wrap || !edicao || !input) return;
    input.value = descricaoRemessaAtual;
    wrap.classList.add('escondido');
    edicao.classList.remove('escondido');
    edicao.style.display = 'flex';
    input.focus();
    input.select();
    input.onkeydown = function(e) {
        if (e.key === 'Enter') { e.preventDefault(); salvarDescricaoRemessa(); }
        if (e.key === 'Escape') { e.preventDefault(); cancelarEdicaoTituloRemessa(); }
    };
};

window.cancelarEdicaoTituloRemessa = function() {
    const wrap = document.getElementById('detalheTituloWrap');
    const edicao = document.getElementById('detalheTituloEdicao');
    const input = document.getElementById('inputEditarDescricaoRemessa');
    if (wrap) wrap.classList.remove('escondido');
    if (edicao) {
        edicao.classList.add('escondido');
        edicao.style.display = '';
    }
    if (input) input.value = descricaoRemessaAtual;
    const titulo = document.getElementById('detalheTitulo');
    if (titulo) titulo.innerText = descricaoRemessaAtual;
};

window.salvarDescricaoRemessa = async function() {
    if (!remessaAtualEditando) return;
    const input = document.getElementById('inputEditarDescricaoRemessa');
    const novaDescricao = (input && input.value) ? input.value.trim() : '';
    if (!novaDescricao) return mostrarToast('Informe um nome para a remessa.', 'erro');

    const btnSalvar = document.querySelector('#detalheTituloEdicao button[onclick="salvarDescricaoRemessa()"]');
    if (btnSalvar) btnSalvar.disabled = true;

    try {
        await db.collection('remessas').doc(remessaAtualEditando).update({ descricao: novaDescricao });
        descricaoRemessaAtual = novaDescricao;
        document.getElementById('detalheTitulo').innerText = novaDescricao;
        atualizarDescricaoNaGrid(remessaAtualEditando, novaDescricao);
        cancelarEdicaoTituloRemessa();
        mostrarToast('Nome da remessa atualizado!', 'sucesso');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao salvar nome da remessa.', 'erro');
    } finally {
        if (btnSalvar) btnSalvar.disabled = false;
    }
};

function atualizarCardsFiltrados(lista) {

    let pendentes = 0;
    let recebidos = 0;
    let problemas = 0;

    lista.forEach(item => {
        if (item.status === "recebido") recebidos++;
        else if (item.status === "problema") problemas++;
        else pendentes++;
    });

    document.getElementById("totCartoes").innerText = lista.length;
    document.getElementById("totPendentes").innerText = pendentes;
    document.getElementById("totRecebidos").innerText = recebidos;
    document.getElementById("totProblemas").innerText = problemas;
}

document.addEventListener('click', function(event){

    const perfil = document.querySelector('.user-profile');
    const dropdown = document.getElementById('dropdownPerfilLocal');

    if (!perfil || !dropdown) return;

    if (!perfil.contains(event.target)) {
        dropdown.classList.add('escondido');
    }

});