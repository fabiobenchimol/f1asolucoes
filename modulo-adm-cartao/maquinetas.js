// ============================================================================
// MÓDULO DE GESTÃO DE MAQUINETAS E ESTOQUE
// ============================================================================

let abaAtiva = 'estoque'; // Define a aba que abrirá por padrão

// Failsafe: Exibe o layout da página principal e trava o conteúdo na tela de Loading
document.addEventListener("DOMContentLoaded", () => {
    const corpo = document.getElementById("corpoPagina");
    if(corpo) corpo.style.display = "flex";
});

// A Função Chave: Acionada automaticamente após o core.js validar o usuário
window.posAuthCallback = async function() {
    try {
        let perfil = "";
        
        // Verifica dados do usuário
        if (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado) {
            perfil = dadosUsuarioLogado.perfil || "";
        } else if (typeof usuarioLogado !== 'undefined' && usuarioLogado) {
            const docUser = await db.collection("usuarios").doc(usuarioLogado.uid).get();
            if (docUser.exists) {
                perfil = docUser.data().perfil || "";
                window.dadosUsuarioLogado = docUser.data(); 
            }
        }

        // Esconde o Loading e libera a Interface
        const loadingInit = document.getElementById("loadingInit");
        if (loadingInit) loadingInit.style.display = "none";

        // Preenche o Menu de Usuário no Topo
        tentarPreencherPerfil();

        // Carrega a Tabela Ativa, agora que o DB do Firebase está conectado!
        carregarAba(abaAtiva);

    } catch (erro) {
        console.error("Erro na inicialização F1A:", erro);
        window.location.replace("../lobby.html");
    }
};

function tentarPreencherPerfil() {
    const nomeEl = document.getElementById("nomeUsuario");
    const iniciaisEl = document.getElementById("iniciaisUsuario");
    const cargoEl = document.getElementById("cargoUsuario");

    if (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado && dadosUsuarioLogado.nome) {
        if (nomeEl) nomeEl.innerText = dadosUsuarioLogado.nome;
        if (cargoEl) cargoEl.innerText = (dadosUsuarioLogado.perfil || "USUÁRIO").toUpperCase();
        
        if (iniciaisEl) {
            const partesNome = dadosUsuarioLogado.nome.trim().split(" ");
            if (partesNome.length > 1) {
                iniciaisEl.innerText = (partesNome[0][0] + partesNome[1][0]).toUpperCase();
            } else {
                iniciaisEl.innerText = dadosUsuarioLogado.nome.substring(0, 2).toUpperCase();
            }
        }
    } else {
        setTimeout(tentarPreencherPerfil, 500);
    }
}

// Interações do Menu Perfil Global F1A
window.toggleDropdownPerfil = function(event) {
    event.stopPropagation();
    const menu = document.getElementById('dropdownPerfilLocal');
    if (menu) menu.classList.toggle('escondido');
};
document.addEventListener('click', function(e) {
    const menus = document.querySelectorAll('.menu-perfil-flutuante');
    menus.forEach(m => {
        if (!m.contains(e.target) && !m.classList.contains('escondido')) {
            m.classList.add('escondido');
        }
    });
});

// Funções de formatação e máscaras globais auxiliares
window.aplicarMascaraMoeda = function(input) { let v = input.value.replace(/\D/g, ""); v = (v / 100).toFixed(2) + ""; v = v.replace(".", ","); v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); input.value = v === "0,00" ? "" : "R$ " + v; }
window.aplicarMascaraCNPJ = function(input) { let v = input.value.replace(/\D/g, ""); if (v.length > 14) v = v.substring(0, 14); v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); input.value = v; }

// ----------------------------------------------------------------------------
// 1. NAVEGAÇÃO ENTRE ABAS
// ----------------------------------------------------------------------------
window.alternarAbasMaquineta = function(aba, elemento) {
    document.querySelectorAll('.card-aba-maq').forEach(c => {
        c.style.borderColor = 'var(--borda)';
    });
    if (elemento) elemento.style.borderColor = 'var(--f1a-blue)';
    
    abaAtiva = aba;
    carregarAba(aba);
}

function carregarAba(aba) {
    const container = document.getElementById('conteudoAba');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--cor-texto);">Carregando dados...</div>';

    if (aba === 'fornecedores') renderizarAbaFornecedores(container);
    else if (aba === 'produtos') renderizarAbaProdutos(container);
    else if (aba === 'entradas') renderizarAbaEntradas(container);
    else if (aba === 'estoque') renderizarAbaEstoque(container);
    else if (aba === 'saidas') renderizarAbaSaidas(container);
}

// ----------------------------------------------------------------------------
// 2. RENDERIZAÇÃO DAS TELAS
// ----------------------------------------------------------------------------
function renderizarAbaFornecedores(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Lista de Fornecedores</h3>
            <button class="btn-nova-proposta" onclick="abrirModalFornecedorGlobal()" style="margin:0; background:var(--f1a-blue); color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">add</span> Novo Fornecedor
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>CNPJ</th><th>Razão Social / Nome Fantasia</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaFornecedores"><tr><td colspan="3" style="text-align:center;">Buscando fornecedores...</td></tr></tbody>
        </table>
    `;
    buscarFornecedores();
}

function renderizarAbaProdutos(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Marcas e Modelos</h3>
            <button class="btn-nova-proposta" onclick="abrirModalProdutoGlobal()" style="margin:0; background:var(--f1a-copper); color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">add</span> Novo Produto
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Marca</th><th>Modelo do Equipamento</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaProdutos"><tr><td colspan="3" style="text-align:center;">Buscando produtos...</td></tr></tbody>
        </table>
    `;
    buscarProdutos();
}

function renderizarAbaEntradas(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Histórico de Notas Fiscais</h3>
            <button class="btn-nova-proposta" onclick="abrirModalEntradaGlobal()" style="margin:0; background:#10b981; color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">input</span> Registrar Entrada
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Nº NF / Faturamento</th><th>Fornecedor</th><th>Produto (Qtd)</th><th>Rastreio</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaEntradas"><tr><td colspan="5" style="text-align:center;">Buscando entradas...</td></tr></tbody>
        </table>
    `;
    buscarEntradas();
}

function renderizarAbaSaidas(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Histórico de Expedição</h3>
            <button class="btn-nova-proposta" onclick="abrirModalSaida()" style="margin:0; background:#10b981; color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">output</span> Registrar Saída
            </button>
        </div>
        <table class="tabela-dados tabela-saidas-compacta" style="width: 100%;">
            <thead><tr><th>Data Saída</th><th>ID Maquineta</th><th>Destino (Loja)</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaSaidas"><tr><td colspan="4" style="text-align:center; padding: 10px;">Buscando saídas...</td></tr></tbody>
        </table>
    `;
    buscarSaidas();
}

function renderizarAbaEstoque(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: wrap; gap: 15px;">
            <div style="display:flex; align-items:center; gap: 15px; flex-wrap: wrap;">
                <h3 style="color:var(--cor-titulo); margin:0;">Inventário Individual</h3>
                <div style="display:flex; gap: 8px; flex-wrap: wrap;">
                    <span id="chipTotal" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: var(--bg-body); border: 1px solid var(--borda); color: var(--cor-texto);">Total: 0</span>
                    <span id="chipSemId" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: rgba(230,145,56,0.1); border: 1px solid var(--f1a-copper); color: var(--f1a-copper);">Sem ID: 0</span>
                    <span id="chipDisp" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: rgba(16,185,129,0.1); border: 1px solid #10b981; color: #10b981;">Disponíveis: 0</span>
                    <span id="chipAlug" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; background: rgba(59,130,246,0.1); border: 1px solid var(--f1a-blue); color: var(--f1a-blue);">Alugadas: 0</span>
                </div>
            </div>
            <div style="display:flex; gap:10px; width: 100%; max-width: 300px;">
                <input type="text" id="inputBuscaEstoque" onkeyup="filtrarEstoque()" placeholder="Buscar ID (Ex: 111-111-111)..." style="width: 100%; padding:8px 12px; border-radius:8px; border:1px solid var(--borda); background:var(--bg-body); color:var(--cor-titulo); outline:none;">
            </div>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>ID da Maquineta</th><th>Modelo</th><th>Data Entrada</th><th>Status</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaEstoque"><tr><td colspan="5" style="text-align:center; padding: 20px;">Buscando estoque...</td></tr></tbody>
        </table>
    `;
    buscarEstoque();
}

// ----------------------------------------------------------------------------
// 3. CONTROLE DE MODAIS (ABRIR E FECHAR)
// ----------------------------------------------------------------------------
function abrirModalFornecedor() { document.getElementById('modalFornecedor').classList.remove('escondido'); document.getElementById('formFornecedor').reset(); }
function fecharModalFornecedor() { document.getElementById('modalFornecedor').classList.add('escondido'); }
function abrirModalProduto() { document.getElementById('modalProduto').classList.remove('escondido'); document.getElementById('formProduto').reset(); }
function fecharModalProduto() { document.getElementById('modalProduto').classList.add('escondido'); }

async function abrirModalEntrada() { 
    document.getElementById('modalEntrada').classList.remove('escondido'); 
    document.getElementById('formEntrada').reset(); 
    const selForn = document.getElementById('entFornecedor');
    const selProd = document.getElementById('entProduto');
    selForn.innerHTML = '<option value="">Buscando...</option>';
    selProd.innerHTML = '<option value="">Buscando...</option>';
    try {
        const fornSnap = await db.collection("adm_fornecedores").get();
        selForn.innerHTML = '<option value="">Selecione o Fornecedor...</option>';
        fornSnap.forEach(d => selForn.innerHTML += `<option value="${d.id}">${d.data().nomeFantasia}</option>`);
        const prodSnap = await db.collection("adm_produtos").get();
        selProd.innerHTML = '<option value="">Selecione o Produto...</option>';
        prodSnap.forEach(d => selProd.innerHTML += `<option value="${d.id}">${d.data().marca} - ${d.data().modelo}</option>`);
    } catch (e) { console.error(e); }
}
function fecharModalEntrada() { document.getElementById('modalEntrada').classList.add('escondido'); }

// ----------------------------------------------------------------------------
// REDE → LOJA (Modal Saída e Edição)
// ----------------------------------------------------------------------------
async function popularDropdownRedes(selectEl, placeholder) {
    const redesSnap = await db.collection("redes").orderBy("nome", "asc").get();
    selectEl.innerHTML = `<option value="">${placeholder || 'Selecione a Rede...'}</option>`;
    redesSnap.forEach(doc => {
        selectEl.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`;
    });
}

window.carregarLojasPorRede = async function(redeSelectId, lojaSelectId, lojaIdPreselect) {
    const selRede = document.getElementById(redeSelectId);
    const selLoja = document.getElementById(lojaSelectId);
    if (!selRede || !selLoja) return;

    if (!selRede.value) {
        selLoja.innerHTML = '<option value="">Selecione uma rede primeiro...</option>';
        selLoja.disabled = true;
        return;
    }

    selLoja.disabled = false;
    selLoja.innerHTML = '<option value="">Carregando lojas...</option>';

    try {
        const lojasSnap = await db.collection("lojas").where("redeId", "==", selRede.value).get();
        const lojas = [];
        lojasSnap.forEach(doc => lojas.push({ id: doc.id, ...doc.data() }));
        lojas.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

        if (lojas.length === 0) {
            selLoja.innerHTML = '<option value="">Nenhuma loja vinculada a esta rede.</option>';
            return;
        }

        selLoja.innerHTML = '<option value="">Selecione a Loja...</option>';
        lojas.forEach(l => {
            const sel = lojaIdPreselect && l.id === lojaIdPreselect ? ' selected' : '';
            selLoja.innerHTML += `<option value="${l.id}" data-nome="${l.nome}"${sel}>${l.nome}</option>`;
        });
    } catch (e) {
        selLoja.innerHTML = '<option value="">Erro ao buscar lojas.</option>';
        console.error(e);
    }
}

async function resolverRedeIdSaida(saidaData) {
    if (saidaData.redeId) return saidaData.redeId;
    if (!saidaData.lojaId) return null;
    try {
        const lojaDoc = await db.collection("lojas").doc(saidaData.lojaId).get();
        if (lojaDoc.exists && lojaDoc.data().redeId) return lojaDoc.data().redeId;
    } catch (e) { console.error(e); }
    return null;
}

window.abrirModalSaida = async function() {
    document.getElementById('modalSaida').classList.remove('escondido');
    document.getElementById('formSaida').reset();
    document.getElementById('saidaData').value = new Date().toISOString().split('T')[0];
    document.getElementById('saidaPrimeiroVencimento').value = "";

    const selMaq = document.getElementById('saidaMaquineta');
    const selRede = document.getElementById('saidaRede');
    const selLoja = document.getElementById('saidaLoja');
    selMaq.innerHTML = '<option value="">Carregando maquinetas...</option>';
    selRede.innerHTML = '<option value="">Carregando redes...</option>';
    selLoja.innerHTML = '<option value="">Selecione uma rede primeiro...</option>';
    selLoja.disabled = true;

    try {
        const maqSnap = await db.collection("adm_estoque").where("status", "==", "funcionando").get();
        selMaq.innerHTML = '<option value="">Selecione uma Maquineta...</option>';
        maqSnap.forEach(d => {
            if(d.data().maquinetaId) {
                selMaq.innerHTML += `<option value="${d.id}">ID: ${d.data().maquinetaId} - ${d.data().prodNome}</option>`;
            }
        });
        await popularDropdownRedes(selRede, 'Selecione a Rede...');
    } catch (e) { console.error(e); }
}
window.fecharModalSaida = function() { document.getElementById('modalSaida').classList.add('escondido'); }

window.abrirModalFornecedorGlobal = abrirModalFornecedor;
window.abrirModalProdutoGlobal = abrirModalProduto;
window.abrirModalEntradaGlobal = abrirModalEntrada;

window.buscarCnpjFornecedor = async function(event) {
    const btn = event ? event.currentTarget : null;
    const cnpjInput = document.getElementById("fornCnpj");
    const cnpjLimpo = cnpjInput.value.replace(/\D/g, ''); 
    if (cnpjLimpo.length !== 14) return alert("⚠️ CNPJ Inválido!"); 
    if(btn) { btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span>'; btn.disabled = true; }
    try { 
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`); 
        if (!res.ok) throw new Error("Erro na API");
        const data = await res.json(); 
        document.getElementById("fornRazao").value = data.razao_social || ""; 
        document.getElementById("fornFantasia").value = data.nome_fantasia || data.razao_social || ""; 
    } catch (e) { alert("❌ Busca automática indisponível. Preencha manualmente."); } 
    finally { if(btn) { btn.innerHTML = '<span class="material-symbols-rounded">search</span>'; btn.disabled = false; } }
}

// ----------------------------------------------------------------------------
// 4. SALVAMENTO DE DADOS NO FIREBASE
// ----------------------------------------------------------------------------
window.salvarFornecedor = async function(event) {
    event.preventDefault();
    try {
        await db.collection("adm_fornecedores").add({
            cnpj: document.getElementById("fornCnpj").value,
            razaoSocial: document.getElementById("fornRazao").value.trim().toUpperCase(),
            nomeFantasia: document.getElementById("fornFantasia").value.trim().toUpperCase(),
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        fecharModalFornecedor(); carregarAba('fornecedores'); 
    } catch (e) { alert(e.message); }
}

window.salvarProduto = async function(event) {
    event.preventDefault();
    try {
        await db.collection("adm_produtos").add({
            marca: document.getElementById("prodMarca").value.trim().toUpperCase(),
            modelo: document.getElementById("prodModelo").value.trim().toUpperCase(),
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        fecharModalProduto(); carregarAba('produtos'); 
    } catch (e) { alert(e.message); }
}

window.salvarEntrada = async function(event) {
    event.preventDefault();
    try {
        const fornId = document.getElementById("entFornecedor").value;
        const prodId = document.getElementById("entProduto").value;
        const qtd = parseInt(document.getElementById("entQtd").value);
        const fornNome = document.getElementById("entFornecedor").options[document.getElementById("entFornecedor").selectedIndex].text;
        const prodNome = document.getElementById("entProduto").options[document.getElementById("entProduto").selectedIndex].text;

        const entradaRef = await db.collection("adm_entradas").add({
            fornecedorId: fornId, fornNome, produtoId: prodId, prodNome,
            numeroNf: document.getElementById("entNf").value,
            dataFaturamento: document.getElementById("entDataFaturamento").value,
            dataRecebimento: document.getElementById("entDataRecebimento").value,
            quantidade: qtd, criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        const batch = db.batch();
        for (let i = 0; i < qtd; i++) {
            batch.set(db.collection("adm_estoque").doc(), {
                entradaId: entradaRef.id, produtoId: prodId, prodNome, maquinetaId: "", status: "pendente_config",
                historico: [{ acao: "Entrada via NF", data: new Date().toLocaleString('pt-BR') }],
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();
        fecharModalEntrada(); carregarAba('entradas'); 
    } catch (e) { alert(e.message); }
}

window.salvarSaida = async function(event) {
    event.preventDefault();
    try {
        const dataEscolhida = document.getElementById("saidaData").value; 
        const dataFormatada = dataEscolhida.split('-').reverse().join('/'); 
        const primeiroVenc = document.getElementById("saidaPrimeiroVencimento").value; 

        const maqIdRef = document.getElementById("saidaMaquineta").value;
        const maqTexto = document.getElementById("saidaMaquineta").options[document.getElementById("saidaMaquineta").selectedIndex].text;
        const selRede = document.getElementById("saidaRede");
        const selLoja = document.getElementById("saidaLoja");
        const redeId = selRede.value;
        const redeNome = selRede.options[selRede.selectedIndex].text;
        const lojaId = selLoja.value;
        const lojaOpt = selLoja.options[selLoja.selectedIndex];
        const lojaNome = lojaOpt.dataset.nome || lojaOpt.text;
        const lojaInfo = `${redeNome} > ${lojaNome}`;

        await db.collection("adm_saidas").add({
            dataSaida: dataEscolhida,
            primeiroVencimento: primeiroVenc,
            estoqueDocId: maqIdRef,
            maquinetaInfo: maqTexto,
            redeId: redeId,
            redeNome: redeNome,
            lojaId: lojaId,
            lojaInfo: lojaInfo,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        const docRef = db.collection("adm_estoque").doc(maqIdRef);
        const docData = await docRef.get();
        const historico = docData.data().historico || [];
        historico.push({
            acao: `Expedição para Loja: ${lojaInfo} (Venc: ${primeiroVenc.split('-').reverse().join('/')})`,
            data: `${dataFormatada} (Lançado às ${new Date().toLocaleTimeString('pt-BR')})`
        });
        await docRef.update({ status: 'alugada', historico: historico });

        fecharModalSaida(); carregarAba('saidas');
        if(typeof mostrarToast === 'function') mostrarToast("Saída registrada com sucesso!");
    } catch (e) { alert("Erro: " + e.message); }
}

// ----------------------------------------------------------------------------
// 5. BUSCA DE DADOS E GESTÃO DA GRID (TEMPO REAL)
// ----------------------------------------------------------------------------
function buscarFornecedores() {
    const corpo = document.getElementById("listaFornecedores");
    db.collection("adm_fornecedores").orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            corpo.innerHTML += `<tr><td>${d.cnpj}</td><td><strong>${d.nomeFantasia}</strong></td><td style="text-align:center;"><button class="btn-icon" style="color:#ef4444;" onclick="excluirRegistro('adm_fornecedores', '${doc.id}')" title="Excluir"><span class="material-symbols-rounded">delete</span></button></td></tr>`;
        });
    });
}

function buscarProdutos() {
    const corpo = document.getElementById("listaProdutos");
    db.collection("adm_produtos").orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        snap.forEach(doc => {
            const d = doc.data();
            corpo.innerHTML += `<tr><td>${d.marca}</td><td><strong>${d.modelo}</strong></td><td style="text-align:center;"><button class="btn-icon" style="color:#ef4444;" onclick="excluirRegistro('adm_produtos', '${doc.id}')" title="Excluir"><span class="material-symbols-rounded">delete</span></button></td></tr>`;
        });
    });
}

function buscarEntradas() {
    const corpo = document.getElementById("listaEntradas");
    db.collection("adm_entradas").orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        if (snap.empty) { corpo.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma entrada.</td></tr>'; return; }
        snap.forEach(doc => {
            const d = doc.data();
            const isCancelada = d.status === 'cancelada';
            const opacidade = isCancelada ? 'opacity: 0.5;' : '';
            const statusBadge = isCancelada ? '<br><span style="color:#ef4444; font-size:10px; font-weight:bold;">CANCELADA</span>' : '';
            const btnAcoes = isCancelada ? '-' : `<button class="btn-icon" style="color:var(--f1a-blue);" onclick="abrirModalEdicaoEntrada('${doc.id}', '${d.numeroNf}', ${d.quantidade})" title="Editar / Excluir"><span class="material-symbols-rounded">edit</span></button>`;

            corpo.innerHTML += `
                <tr style="${opacidade}">
                    <td><strong>${d.numeroNf}</strong><br><span style="font-size:10px;">Fat: ${d.dataFaturamento.split('-').reverse().join('/')}</span>${statusBadge}</td>
                    <td>${d.fornNome}</td>
                    <td><strong>${d.prodNome}</strong><br><span style="color:var(--f1a-copper); font-size:11px;">${d.quantidade} unidades</span></td>
                    <td style="font-size:11px;">${d.dataRecebimento.split('-').reverse().join('/')}</td>
                    <td style="text-align:center;">${btnAcoes}</td>
                </tr>`;
        });
    });
}

function buscarSaidas() {
    const corpo = document.getElementById("listaSaidas");
    db.collection("adm_saidas").orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        if (snap.empty) { corpo.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma saída.</td></tr>'; return; }
        snap.forEach(doc => {
            const d = doc.data();
            let arrData = d.dataSaida.split('-');
            let fData = arrData.length === 3 ? `${arrData[2]}/${arrData[1]}/${arrData[0]}` : d.dataSaida;

            corpo.innerHTML += `
                <tr>
                    <td style="font-weight:bold; color:var(--f1a-copper);">${fData}</td>
                    <td>${d.maquinetaInfo}</td>
                    <td style="font-weight:600;">${d.lojaInfo}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <button class="btn-icon" style="color:#ef4444;" onclick="abrirModalTroca('${doc.id}', '${d.estoqueDocId}', '${(d.lojaInfo || '').replace(/'/g, "\\'")}', '${(d.maquinetaInfo || '').replace(/'/g, "\\'")}')" title="Substituir Máquina com Defeito"><span class="material-symbols-rounded">swap_horiz</span></button>
                        <button class="btn-icon" style="color:var(--f1a-blue);" onclick="abrirModalEdicaoSaida('${doc.id}', '${(d.maquinetaInfo || '').replace(/'/g, "\\'")}', '${d.estoqueDocId}')" title="Editar / Excluir"><span class="material-symbols-rounded">edit</span></button>
                    </td>
                </tr>`;
        });
    });
}

// ----------------------------------------------------------------------------
// 6. GESTÃO DE ESTOQUE (AGRUPADO E CHIPS)
// ----------------------------------------------------------------------------
function buscarEstoque() {
    const corpo = document.getElementById("listaEstoque");
    db.collection("adm_estoque").orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        let qtdTotal = 0, qtdSemId = 0, qtdDisponiveis = 0, qtdAlugadas = 0;
        
        if (snap.empty) { 
            corpo.innerHTML = '<tr><td colspan="5" style="text-align:center;">Vazio.</td></tr>'; 
            atualizarChipsEstoque(0, 0, 0, 0); 
            return; 
        }

        const comId = [];
        const pendentes = {};

        snap.forEach(doc => {
            qtdTotal++;
            const d = doc.data();
            d.docId = doc.id;

            if (!d.maquinetaId || d.status === 'pendente_config') qtdSemId++;
            else if (d.status === 'funcionando') qtdDisponiveis++;
            else if (d.status === 'alugada') qtdAlugadas++;

            if (d.maquinetaId) comId.push(d);
            else {
                const chave = d.entradaId + "_" + d.produtoId;
                if (!pendentes[chave]) pendentes[chave] = { nome: d.prodNome, data: d.criadoEm, docs: [] };
                pendentes[chave].docs.push(d);
            }
        });

        atualizarChipsEstoque(qtdTotal, qtdSemId, qtdDisponiveis, qtdAlugadas);

        Object.values(pendentes).forEach(lote => {
            const qtd = lote.docs.length;
            let dataF = "Processando...";
            if (lote.data && typeof lote.data.toDate === 'function') dataF = lote.data.toDate().toLocaleDateString('pt-BR');
            
            corpo.innerHTML += `
                <tr class="linha-estoque" style="background: rgba(230,145,56,0.05);">
                    <td colspan="2" style="color:var(--f1a-copper); font-weight:bold;"><span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">warning</span> Lote sem ID (${qtd} itens) - ${lote.nome}</td>
                    <td style="font-size:11px;">${dataF}</td>
                    <td><span style="padding:2px 8px; border-radius:4px; font-size:10px; background:#f59e0b; color:white; font-weight:bold;">PENDENTE</span></td>
                    <td style="text-align:center;"><button onclick="atribuirIdLote('${lote.docs[0].docId}')" style="background:var(--f1a-copper); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">Atribuir Primeiro ID</button></td>
                </tr>`;
        });

        comId.forEach(d => {
            let dataF = "";
            if (d.criadoEm && typeof d.criadoEm.toDate === 'function') dataF = d.criadoEm.toDate().toLocaleDateString('pt-BR');
            let selStatus = `<select onchange="atualizarStatusMaquineta('${d.docId}', this.value)" style="padding:4px; border-radius:4px; font-size:11px; border:1px solid var(--borda); background:var(--bg-body); color:var(--cor-titulo);">
                <option value="funcionando" ${d.status==='funcionando'?'selected':''}>Disponível (OK)</option>
                <option value="defeito" ${d.status==='defeito'?'selected':''}>Com Defeito</option>
                <option value="alugada" ${d.status==='alugada'?'selected':''} disabled>Alugada</option>
            </select>`;

            corpo.innerHTML += `
                <tr class="linha-estoque">
                    <td style="font-weight:bold;">${d.maquinetaId}</td>
                    <td style="font-size:11px;">${d.prodNome}</td>
                    <td style="font-size:11px;">${dataF}</td>
                    <td>${selStatus}</td>
                    <td style="text-align:center;">
                        <button class="btn-icon" style="color:var(--cor-texto);" onclick="abrirHistoricoMaquineta('${d.docId}')" title="Ver Histórico"><span class="material-symbols-rounded">history</span></button>
                    </td>
                </tr>`;
        });
    });
}

window.filtrarEstoque = function() {
    const input = document.getElementById("inputBuscaEstoque").value.toLowerCase();
    const trs = document.querySelectorAll("#listaEstoque .linha-estoque");
    trs.forEach(tr => {
        const idCol = tr.querySelector("td:first-child");
        if(idCol) tr.style.display = idCol.innerText.toLowerCase().includes(input) ? "" : "none";
    });
}

function atualizarChipsEstoque(total, semId, disponiveis, alugadas) {
    const cTotal = document.getElementById('chipTotal');
    const cSemId = document.getElementById('chipSemId');
    const cDisp = document.getElementById('chipDisp');
    const cAlug = document.getElementById('chipAlug');
    if(cTotal) cTotal.innerText = `Total: ${total}`;
    if(cSemId) cSemId.innerText = `Sem ID: ${semId}`;
    if(cDisp) cDisp.innerText = `Disponíveis: ${disponiveis}`;
    if(cAlug) cAlug.innerText = `Alugadas: ${alugadas}`;
}

window.atribuirIdLote = async function(docIdAlvo) {
    const novoId = prompt("Bipe ou digite o ID/Serial de uma maquineta deste lote:");
    if (!novoId || novoId.trim() === "") return;
    try {
        const check = await db.collection("adm_estoque").where("maquinetaId", "==", novoId.trim()).get();
        if (!check.empty) return alert(`⚠️ ATENÇÃO: O ID "${novoId.trim()}" já está cadastrado em outra maquineta!`);
        
        const docRef = db.collection("adm_estoque").doc(docIdAlvo);
        const docData = await docRef.get();
        const historico = docData.data().historico || [];
        historico.push({ acao: `ID Atribuído via Bipagem de Lote: ${novoId.trim()}`, data: new Date().toLocaleString('pt-BR') });
        await docRef.update({ maquinetaId: novoId.trim(), status: 'funcionando', historico: historico });
    } catch (e) { alert("Erro ao atribuir ID: " + e.message); }
}

window.atualizarStatusMaquineta = async function(docId, novoStatus) {
    try {
        const docRef = db.collection("adm_estoque").doc(docId);
        const docData = await docRef.get();
        const historico = docData.data().historico || [];
        const statusNomes = { 'funcionando': '✅ Funcionando', 'defeito': '❌ Com Defeito' };
        
        historico.push({ acao: `Alteração de Status: ${statusNomes[novoStatus] || novoStatus}`, data: new Date().toLocaleString('pt-BR') });
        await docRef.update({ status: novoStatus, historico: historico });
        if(typeof mostrarToast === 'function') mostrarToast("Status atualizado!");
    } catch (e) { alert("Erro: " + e.message); }
}

window.abrirHistoricoMaquineta = async function(docId) {
    try {
        const doc = await db.collection("adm_estoque").doc(docId).get();
        const d = doc.data();
        const historico = d.historico || [];
        let listItems = historico.map(h => `<div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--borda);"><div style="font-size: 11px; color: var(--f1a-copper); font-weight: bold; margin-bottom: 4px;"><span class="material-symbols-rounded" style="font-size: 12px; vertical-align: middle;">schedule</span> ${h.data}</div><div style="font-size: 13px; color: var(--cor-titulo);">${h.acao}</div></div>`).join('');
        
        const modalHtml = `<div id="modalHistoricoTemp" class="modal-overlay"><div class="modal-caixa" style="max-width: 450px;"><div class="modal-header"><h3><span class="material-symbols-rounded" style="vertical-align:middle; color:var(--f1a-blue);">history</span> Histórico da Maquineta</h3><button class="btn-fechar" onclick="document.getElementById('modalHistoricoTemp').remove()">✖</button></div><div class="modal-body"><p style="margin-top:0; font-size:12px; color:var(--cor-texto);">ID: <strong style="color:var(--cor-titulo);">${d.maquinetaId || 'Aguardando ID'}</strong><br>Modelo: ${d.prodNome}</p><div style="max-height: 300px; overflow-y: auto; background: var(--bg-body); padding: 15px; border-radius: 8px; border: 1px solid var(--borda);">${listItems}</div></div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } catch (e) { alert("Erro ao buscar histórico: " + e.message); }
}

// ----------------------------------------------------------------------------
// 7. MENUS DE EDIÇÃO E ROTINAS DE TROCA/EXCLUSÃO (ENTRADAS E SAÍDAS)
// ----------------------------------------------------------------------------
window.abrirModalEdicaoEntrada = function(id, nf, qtd) {
    const modalHtml = `
        <div id="modalEdicaoDinamico" class="modal-overlay">
            <div class="modal-caixa" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Opções do Lançamento</h3>
                    <button class="btn-fechar" onclick="document.getElementById('modalEdicaoDinamico').remove()"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--cor-texto); font-size: 12px; margin-top: 0;">Nota Fiscal: <strong style="color:var(--cor-titulo);">${nf}</strong></p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="excluirEntradaEReverterEstoque('${id}', ${qtd}); document.getElementById('modalEdicaoDinamico').remove();" style="padding: 10px; border-radius: 8px; border: none; background: #ef4444; color: white; font-weight: bold; cursor: pointer;">🗑️ Excluir Entrada e Remover do Estoque</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.excluirEntradaEReverterEstoque = async function(entradaId, qtdInserida) {
    if(!confirm(`⚠️ ATENÇÃO EXTREMA!\n\nVocê está prestes a excluir a entrada desta NF.\nIsso DELETARÁ permanentemente as ${qtdInserida} máquinas ligadas a ela do estoque.\n\nMáquinas que já foram expedidas (alugadas) NÃO poderão ser deletadas e o processo será bloqueado.\n\nDeseja continuar?`)) return;
    try {
        const snap = await db.collection("adm_estoque").where("entradaId", "==", entradaId).get();
        let possuiAlugada = false;
        snap.forEach(doc => { if (doc.data().status === 'alugada') possuiAlugada = true; });
        if (possuiAlugada) { alert("🚫 OPERAÇÃO CANCELADA: Você não pode excluir esta NF pois algumas máquinas dela já foram enviadas para clientes. Cancele as saídas primeiro."); return; }
        
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        await db.collection("adm_entradas").doc(entradaId).delete();
        alert("Entrada deletada e máquinas retiradas do estoque.");
    } catch (e) { alert("Erro ao excluir: " + e.message); }
}

window.excluirRegistro = async function(colecao, docId) {
    if (confirm("Tem certeza que deseja excluir permanentemente este registro?")) {
        try { await db.collection(colecao).doc(docId).delete(); } catch (e) { alert("Erro ao excluir: " + e.message); }
    }
}

window.abrirModalTroca = async function(saidaId, estoqueDocId, lojaInfo, maquinetaAtual) {
    document.getElementById('modalTroca').classList.remove('escondido');
    document.getElementById('trocaSaidaId').value = saidaId;
    document.getElementById('trocaOldEstoqueId').value = estoqueDocId;
    document.getElementById('trocaLojaInfo').value = lojaInfo;
    document.getElementById('trocaLabelLoja').innerText = lojaInfo;
    document.getElementById('trocaLabelMaquina').innerText = maquinetaAtual;

    const selTroca = document.getElementById('trocaNovaMaquineta');
    selTroca.innerHTML = '<option value="">Carregando maquinetas disponíveis...</option>';

    try {
        const maqSnap = await db.collection("adm_estoque").where("status", "==", "funcionando").get();
        selTroca.innerHTML = '<option value="">Selecione uma nova Máquina...</option>';
        maqSnap.forEach(d => {
            if(d.data().maquinetaId) {
                selTroca.innerHTML += `<option value="${d.id}">ID: ${d.data().maquinetaId} - ${d.data().prodNome}</option>`;
            }
        });
    } catch (e) { console.error(e); }
}

window.fecharModalTroca = function() { document.getElementById('modalTroca').classList.add('escondido'); }

window.abrirModalEdicaoSaida = function(saidaId, maquinetaInfo, estoqueDocId) {
    const modalHtml = `
        <div id="modalEdicaoDinamicoSaida" class="modal-overlay">
            <div class="modal-caixa" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Opções da Expedição</h3>
                    <button class="btn-fechar" onclick="document.getElementById('modalEdicaoDinamicoSaida').remove()"><span class="material-symbols-rounded">close</span></button>
                </div>
                <div class="modal-body">
                    <p style="color: var(--cor-texto); font-size: 12px; margin-top: 0;">Equipamento: <strong style="color:var(--cor-titulo);">${maquinetaInfo}</strong></p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <button onclick="carregarFormEdicaoSaida('${saidaId}', '${estoqueDocId}', '${maquinetaInfo}')" style="padding: 10px; border-radius: 8px; border: 1px solid var(--f1a-blue); background: transparent; color: var(--f1a-blue); font-weight: bold; cursor: pointer; transition: 0.2s;">✏️ Editar Destino / Data</button>
                        <hr style="border: 0; border-top: 1px solid var(--borda); margin: 10px 0;">
                        <button onclick="excluirSaida('${saidaId}', '${estoqueDocId}'); document.getElementById('modalEdicaoDinamicoSaida').remove();" style="padding: 10px; border-radius: 8px; border: none; background: #ef4444; color: white; font-weight: bold; cursor: pointer;">🗑️ Excluir Saída (Devolver ao Estoque)</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.carregarFormEdicaoSaida = async function(saidaId, estoqueDocId, maquinetaInfo) {
    const modalBody = document.querySelector('#modalEdicaoDinamicoSaida .modal-body');
    modalBody.innerHTML = '<p style="color: var(--cor-texto);">Carregando dados do banco...</p>';
    try {
        const saidaDoc = await db.collection("adm_saidas").doc(saidaId).get();
        const s = saidaDoc.data();
        const redeIdResolvido = await resolverRedeIdSaida(s);
        const dataSaidaAtual = s.dataSaida || '';
        const vencAtual = s.primeiroVencimento || '';

        modalBody.innerHTML = `
            <form onsubmit="salvarEdicaoSaida(event, '${saidaId}', '${estoqueDocId}', this)">
                <div style="margin-bottom: 10px;">
                    <label>Data da Saída:</label>
                    <input type="date" name="novaData" value="${dataSaidaAtual}" required style="width: 100%;">
                </div>
                <div style="margin-bottom: 10px;">
                    <label>Rede (Destino):</label>
                    <select id="editSaidaRede" required style="width: 100%;" onchange="carregarLojasPorRede('editSaidaRede', 'editSaidaLoja')">
                        <option value="">Carregando...</option>
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label>Loja (Destino):</label>
                    <select id="editSaidaLoja" name="novaLoja" required style="width: 100%;" disabled>
                        <option value="">Selecione uma rede primeiro...</option>
                    </select>
                </div>
                <div style="margin-bottom: 20px;">
                    <label>Primeiro Vencimento:</label>
                    <input type="date" name="novoVencimento" value="${vencAtual}" required style="width: 100%;">
                </div>
                <button type="submit" style="width: 100%; background: var(--f1a-blue); color: white; padding: 10px; border-radius: 8px; border: none; font-weight: bold; cursor: pointer;">Salvar Alterações</button>
            </form>
        `;

        const selRede = document.getElementById('editSaidaRede');
        const selLoja = document.getElementById('editSaidaLoja');
        await popularDropdownRedes(selRede, 'Selecione a Rede...');

        if (redeIdResolvido) {
            selRede.value = redeIdResolvido;
            await carregarLojasPorRede('editSaidaRede', 'editSaidaLoja', s.lojaId);
        } else if (s.lojaId) {
            selLoja.disabled = false;
            selLoja.innerHTML = `<option value="${s.lojaId}" selected>${s.lojaInfo || 'Loja vinculada'}</option>`;
        }
    } catch (e) { modalBody.innerHTML = `<p style="color: red;">Erro ao carregar edição: ${e.message}</p>`; }
}

window.salvarEdicaoSaida = async function(event, saidaId, estoqueDocId, formElement) {
    event.preventDefault();
    const btn = formElement.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Salvando...";

    try {
        const novaData = formElement.novaData.value;
        const novoVenc = formElement.novoVencimento.value;
        const selRede = document.getElementById('editSaidaRede');
        const selLoja = formElement.novaLoja;
        const novaLojaId = selLoja.value;
        const redeId = selRede ? selRede.value : null;
        const redeNome = selRede && selRede.value ? selRede.options[selRede.selectedIndex].text : null;
        const lojaOpt = selLoja.options[selLoja.selectedIndex];
        const lojaNome = lojaOpt.dataset.nome || lojaOpt.text;
        const novaLojaInfo = redeNome ? `${redeNome} > ${lojaNome}` : lojaOpt.text;

        const updateData = {
            dataSaida: novaData,
            primeiroVencimento: novoVenc,
            lojaId: novaLojaId,
            lojaInfo: novaLojaInfo
        };
        if (redeId) {
            updateData.redeId = redeId;
            updateData.redeNome = redeNome;
        }

        await db.collection("adm_saidas").doc(saidaId).update(updateData);

        const docRef = db.collection("adm_estoque").doc(estoqueDocId);
        const docData = await docRef.get();
        if(docData.exists) {
            const historico = docData.data().historico || [];
            historico.push({ acao: `Edição de Expedição: Transferida para ${novaLojaInfo} (Venc: ${novoVenc.split('-').reverse().join('/')})`, data: new Date().toLocaleString('pt-BR') });
            await docRef.update({ historico: historico });
        }

        document.getElementById('modalEdicaoDinamicoSaida').remove();
        if(typeof mostrarToast === 'function') mostrarToast("Expedição atualizada com sucesso!");
        carregarAba('saidas');
    } catch (e) { alert("Erro ao salvar edição: " + e.message); btn.disabled = false; btn.innerText = "Salvar Alterações"; }
}

window.excluirSaida = async function(saidaId, estoqueDocId) {
    if(!confirm("Tem certeza que deseja EXCLUIR esta saída?\n\nA maquineta retornará automaticamente para o estoque como 'Funcionando'.")) return;
    try {
        await db.collection("adm_saidas").doc(saidaId).delete();
        
        const docRef = db.collection("adm_estoque").doc(estoqueDocId);
        const docData = await docRef.get();
        if(docData.exists) {
            const historico = docData.data().historico || [];
            historico.push({ acao: "Devolução ao Estoque (Expedição Cancelada)", data: new Date().toLocaleString('pt-BR') });
            await docRef.update({ status: 'funcionando', historico: historico });
        }
        carregarAba('saidas');
        if(typeof mostrarToast === 'function') mostrarToast("Saída excluída e máquina devolvida ao estoque.");
    } catch (e) { alert("Erro ao excluir: " + e.message); }
}

window.salvarTroca = async function(event) {
    event.preventDefault();
    try {
        const saidaId = document.getElementById('trocaSaidaId').value;
        const oldEstoqueId = document.getElementById('trocaOldEstoqueId').value;
        const newEstoqueId = document.getElementById('trocaNovaMaquineta').value;
        const lojaInfo = document.getElementById('trocaLojaInfo').value;
        
        const maquinaAtualDefeito = document.getElementById('trocaLabelMaquina').innerText;
        const newMaquinetaInfo = document.getElementById('trocaNovaMaquineta').options[document.getElementById('trocaNovaMaquineta').selectedIndex].text;

        const oldDocRef = db.collection("adm_estoque").doc(oldEstoqueId);
        const oldDocData = await oldDocRef.get();
        if(oldDocData.exists) {
            const oldHist = oldDocData.data().historico || [];
            oldHist.push({ acao: `Retirada da loja (${lojaInfo}) por DEFEITO.`, data: new Date().toLocaleString('pt-BR') });
            await oldDocRef.update({ status: 'defeito', historico: oldHist });
        }

        const newDocRef = db.collection("adm_estoque").doc(newEstoqueId);
        const newDocData = await newDocRef.get();
        if(newDocData.exists) {
            const newHist = newDocData.data().historico || [];
            newHist.push({ acao: `Expedição para Loja: ${lojaInfo} (Substituindo máquina com defeito)`, data: new Date().toLocaleString('pt-BR') });
            await newDocRef.update({ status: 'alugada', historico: newHist });
        }

        await db.collection("adm_saidas").doc(saidaId).update({
            estoqueDocId: newEstoqueId,
            maquinetaInfo: newMaquinetaInfo
        });

        fecharModalTroca();
        if(typeof mostrarToast === 'function') mostrarToast("Troca realizada com sucesso!");
        alert(`✅ Troca concluída!\n\nA máquina antiga (${maquinaAtualDefeito}) foi marcada com defeito no estoque.\nA nova máquina (${newMaquinetaInfo}) já está vinculada à loja.`);
        carregarAba('saidas');
    } catch (e) { alert("Erro ao realizar troca: " + e.message); }
}