// ============================================================================
// MÓDULO DE CLIENTES (REDES E LOJAS) - cartoes/clientes.js
// Inteiramente reescrito para padrão F1A e cruzamento inteligente de bancos
// ============================================================================

let abaClienteAtiva = 'redes'; 

// Failsafe: Garante renderização da base do documento
document.addEventListener("DOMContentLoaded", () => {
    const corpo = document.getElementById("corpoPagina");
    if(corpo) corpo.style.display = "flex";
});

// Inicialização segura via core.js
window.posAuthCallback = async function() {
    try {
        let perfil = "";
        
        if (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado) {
            perfil = dadosUsuarioLogado.perfil || "";
        } else if (typeof usuarioLogado !== 'undefined' && usuarioLogado) {
            const docUser = await db.collection("usuarios").doc(usuarioLogado.uid).get();
            if (docUser.exists) {
                perfil = docUser.data().perfil || "";
                window.dadosUsuarioLogado = docUser.data(); 
            }
        }

        // Esconde o Loading inicial F1A
        const loadingInit = document.getElementById("loadingInit");
        if (loadingInit) loadingInit.style.display = "none";

        tentarPreencherPerfil();
        carregarAbaCliente(abaClienteAtiva);

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

// Controle do Menu Flutuante (Perfil)
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

window.aplicarMascaraMoeda = function(input) { 
    let v = input.value.replace(/\D/g, ""); 
    v = (v / 100).toFixed(2) + ""; 
    v = v.replace(".", ","); 
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); 
    input.value = v === "0,00" ? "" : "R$ " + v; 
}

// ----------------------------------------------------------------------------
// 1. GESTÃO E NAVEGAÇÃO DE ABAS
// ----------------------------------------------------------------------------
window.alternarAbasCliente = function(aba, elemento) {
    document.querySelectorAll('.card-aba-cli').forEach(c => c.style.borderColor = 'var(--borda)');
    if (elemento) elemento.style.borderColor = 'var(--f1a-blue)';
    abaClienteAtiva = aba;
    carregarAbaCliente(aba);
}

function carregarAbaCliente(aba) {
    const container = document.getElementById('conteudoAbaCliente');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--cor-texto);">Carregando dados...</div>';

    if (aba === 'redes') renderizarAbaRedes(container);
    else if (aba === 'lojas') renderizarAbaLojas(container);
}

function renderizarAbaRedes(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Redes Vinculadas ao Aluguel</h3>
            <button class="btn-nova-proposta" onclick="abrirModalRede()" style="margin:0; background:var(--f1a-blue); color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">add_link</span> Vincular Rede
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Nome da Rede</th><th style="text-align:center;">Data de Vínculo</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaRedesCartao"><tr><td colspan="3" style="text-align:center;">Buscando redes...</td></tr></tbody>
        </table>
    `;
    buscarRedes();
}

function renderizarAbaLojas(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Lojas Ativas</h3>
            <button class="btn-nova-proposta" onclick="abrirModalLoja()" style="margin:0; background:var(--f1a-copper); color:white; border:none; padding:6px 12px; font-size:12px; font-weight:bold; height:auto; display:flex; align-items:center; gap:5px; text-transform:uppercase;">
                <span class="material-symbols-rounded" style="font-size:16px;">add_business</span> Vincular Loja
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Rede Pertencente</th><th>Nome da Loja</th><th style="text-align:center;">Custo Aluguel</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaLojasCartao"><tr><td colspan="4" style="text-align:center;">Buscando lojas...</td></tr></tbody>
        </table>
    `;
    buscarLojas();
}

// ----------------------------------------------------------------------------
// 2. MODAIS E INTEGRAÇÃO CRUZADA DE DADOS
// ----------------------------------------------------------------------------
window.fecharModalRede = function() { document.getElementById('modalRede').classList.add('escondido'); }
window.fecharModalLoja = function() { document.getElementById('modalLoja').classList.add('escondido'); }

window.abrirModalRede = async function() {
    document.getElementById('modalRede').classList.remove('escondido');
    document.getElementById('formRede').reset();
    
    const sel = document.getElementById('redeSelect');
    sel.innerHTML = '<option value="">Analisando bancos de dados...</option>';

    try {
        // 1. Pegar quais redes já estão em uso no aluguel
        const ativasSnap = await db.collection("cartao_redes").get();
        const redesEmUsoIds = [];
        ativasSnap.forEach(doc => { if (doc.data().crmRedeId) redesEmUsoIds.push(doc.data().crmRedeId); });

        // 2. Pegar as redes gerais do sistema mestre
        const globaisSnap = await db.collection("crm_redes").orderBy("nome", "asc").get();

        sel.innerHTML = '<option value="">Selecione uma Rede Global...</option>';
        let qtdLivres = 0;

        globaisSnap.forEach(doc => {
            // Se o ID da rede mestre NÃO ESTIVER no array das ativas, ela está livre para uso
            if (!redesEmUsoIds.includes(doc.id)) {
                sel.innerHTML += `<option value="${doc.id}" data-nome="${doc.data().nome}">${doc.data().nome}</option>`;
                qtdLivres++;
            }
        });

        if (qtdLivres === 0) {
            sel.innerHTML = '<option value="">Todas as redes disponíveis já foram vinculadas.</option>';
        }

    } catch(e) {
        sel.innerHTML = '<option value="">Erro ao buscar redes.</option>';
        console.error("Erro cruzamento de redes: ", e);
    }
}

window.abrirModalLoja = async function() {
    document.getElementById('modalLoja').classList.remove('escondido');
    document.getElementById('formLoja').reset();
    
    const selRede = document.getElementById('lojaRede');
    const selLoja = document.getElementById('lojaSelect');
    
    selRede.innerHTML = '<option value="">Buscando redes ativas...</option>';
    selLoja.innerHTML = '<option value="">Selecione uma rede primeiro...</option>';

    try {
        const redesSnap = await db.collection("cartao_redes").orderBy("nome", "asc").get();
        selRede.innerHTML = '<option value="">Selecione a Rede (Aluguel)...</option>';
        redesSnap.forEach(doc => {
            selRede.innerHTML += `<option value="${doc.id}" data-crmredeid="${doc.data().crmRedeId}">${doc.data().nome}</option>`;
        });
    } catch(e) {
        console.error(e);
    }
}

// Ativado no ONCHANGE do select de Rede do Modal Loja
window.carregarLojasGlobaisDisponiveis = async function() {
    const selRede = document.getElementById('lojaRede');
    const selLoja = document.getElementById('lojaSelect');
    
    if (!selRede.value) {
        selLoja.innerHTML = '<option value="">Selecione uma rede primeiro...</option>';
        return;
    }

    selLoja.innerHTML = '<option value="">Analisando lojas disponíveis...</option>';
    
    // Pegar o ID da rede lá na base mestra (salvo no dataset)
    const opt = selRede.options[selRede.selectedIndex];
    const crmRedeId = opt.dataset.crmredeid; 

    try {
        // 1. Lojas que já alugam maquinetas para esta rede
        const ativasSnap = await db.collection("cartao_lojas").where("redeId", "==", selRede.value).get();
        const lojasEmUsoIds = [];
        ativasSnap.forEach(doc => { if (doc.data().crmLojaId) lojasEmUsoIds.push(doc.data().crmLojaId); });

        // 2. Lojas desta mesma rede lá na base mestra (crm_lojas)
        const globaisSnap = await db.collection("crm_lojas").where("redeId", "==", crmRedeId).get();

        selLoja.innerHTML = '<option value="">Selecione a Loja Global...</option>';
        let qtdLivres = 0;

        globaisSnap.forEach(doc => {
            if (!lojasEmUsoIds.includes(doc.id)) {
                selLoja.innerHTML += `<option value="${doc.id}" data-nome="${doc.data().nome}">${doc.data().nome}</option>`;
                qtdLivres++;
            }
        });

        if (qtdLivres === 0) selLoja.innerHTML = '<option value="">Todas as lojas desta rede já foram vinculadas.</option>';

    } catch(e) {
        selLoja.innerHTML = '<option value="">Erro ao buscar lojas.</option>';
        console.error("Erro cruzamento de lojas: ", e);
    }
}

// ----------------------------------------------------------------------------
// 3. SALVAMENTO E BUSCA NO FIREBASE
// ----------------------------------------------------------------------------
window.salvarRede = async function(event) {
    event.preventDefault();
    const sel = document.getElementById('redeSelect');
    if (!sel.value) return alert("Selecione uma rede válida da lista.");
    
    const opt = sel.options[sel.selectedIndex];
    
    try {
        await db.collection("cartao_redes").add({
            crmRedeId: sel.value,
            nome: opt.dataset.nome,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        fecharModalRede(); 
        carregarAbaCliente('redes'); 
        if(typeof mostrarToast === 'function') mostrarToast("Rede vinculada ao aluguel!");
    } catch (e) { alert("Erro ao vincular rede: " + e.message); }
}

window.salvarLoja = async function(event) {
    event.preventDefault();
    const selRede = document.getElementById('lojaRede');
    const selLoja = document.getElementById('lojaSelect');
    const custo = document.getElementById('lojaCusto').value;

    if (!selRede.value || !selLoja.value) return alert("Por favor, selecione a rede e a loja válida.");

    const redeNome = selRede.options[selRede.selectedIndex].text;
    const lojaNome = selLoja.options[selLoja.selectedIndex].dataset.nome;

    try {
        await db.collection("cartao_lojas").add({
            redeId: selRede.value,
            redeNome: redeNome,
            crmLojaId: selLoja.value,
            nome: lojaNome,
            custoAluguel: custo,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        fecharModalLoja(); 
        carregarAbaCliente('lojas'); 
        if(typeof mostrarToast === 'function') mostrarToast("Loja vinculada ao aluguel!");
    } catch (e) { alert("Erro ao vincular loja: " + e.message); }
}

function buscarRedes() {
    const corpo = document.getElementById("listaRedesCartao");
    db.collection("cartao_redes").orderBy("nome", "asc").onSnapshot(snap => {
        corpo.innerHTML = "";
        if(snap.empty) { corpo.innerHTML = '<tr><td colspan="3" style="text-align:center;">Nenhuma rede vinculada.</td></tr>'; return; }
        
        snap.forEach(doc => {
            const d = doc.data();
            let dataF = d.criadoEm && typeof d.criadoEm.toDate === 'function' ? d.criadoEm.toDate().toLocaleDateString('pt-BR') : 'Recente';
            
            corpo.innerHTML += `
                <tr>
                    <td><strong style="color:var(--f1a-blue);">${d.nome}</strong></td>
                    <td style="text-align:center; font-size:11px;">${dataF}</td>
                    <td style="text-align:center;">
                        <button class="btn-icon" style="color:#ef4444;" onclick="excluirRegistroCartao('cartao_redes', '${doc.id}')" title="Remover Vínculo"><span class="material-symbols-rounded">link_off</span></button>
                    </td>
                </tr>`;
        });
    });
}

function buscarLojas() {
    const corpo = document.getElementById("listaLojasCartao");
    db.collection("cartao_lojas").orderBy("redeNome", "asc").onSnapshot(snap => {
        corpo.innerHTML = "";
        if(snap.empty) { corpo.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma loja vinculada.</td></tr>'; return; }
        
        snap.forEach(doc => {
            const d = doc.data();
            corpo.innerHTML += `
                <tr>
                    <td style="color:var(--f1a-blue); font-size:11px; font-weight:bold;">${d.redeNome}</td>
                    <td><strong>${d.nome}</strong></td>
                    <td style="text-align:center; color:var(--f1a-copper); font-weight:bold;">${d.custoAluguel || 'R$ 0,00'}</td>
                    <td style="text-align:center;">
                        <button class="btn-icon" style="color:#ef4444;" onclick="excluirRegistroCartao('cartao_lojas', '${doc.id}')" title="Remover Vínculo"><span class="material-symbols-rounded">link_off</span></button>
                    </td>
                </tr>`;
        });
    });
}

window.excluirRegistroCartao = async function(colecao, docId) {
    if (confirm("Desvincular do aluguel? Máquinas que estejam na loja precisarão ser recolhidas.\nIsso não apaga o cadastro global no CRM, apenas o acesso ao aluguel de maquinetas.")) {
        try { 
            await db.collection(colecao).doc(docId).delete(); 
            if(typeof mostrarToast === 'function') mostrarToast("Vínculo removido com sucesso!");
        } catch (e) { alert("Erro ao desvincular: " + e.message); }
    }
}