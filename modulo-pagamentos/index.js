// ==========================================
// MÓDULO DA MESA DE PROPOSTAS (index.js) - F1A PLATFORM
// ==========================================

if (typeof firebase === 'undefined') throw new Error("Firebase não carregado.");

var firebaseConfig = { 
    apiKey: "AIzaSyBZdBXKCfp3JboXC95Hbt7H-Tp7ezXOTUE", 
    authDomain: "projeto-ceocard.firebaseapp.com", 
    projectId: "projeto-ceocard", 
    storageBucket: "projeto-ceocard.firebasestorage.app", 
    messagingSenderId: "322820070422", 
    appId: "1:322820070422:web:86c81c58bb930891a86937" 
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig); 

const auth = firebase.auth(); 
const db = firebase.firestore();
let usuarioLogado = null; 
let dadosUsuarioLogado = null; 
let perfilUsuario = null;

// ==========================================
// FUNÇÕES DE MOEDA
// ==========================================
function formatarMoedaVisual(valorNum) {
    let v = parseFloat(valorNum);
    if (isNaN(v)) return "R$ 0,00";
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function converterParaFloat(valorStr) {
    if (typeof valorStr === 'number') return valorStr;
    if (!valorStr) return 0;
    let limpo = valorStr.toString().replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(limpo) || 0;
}

// ==========================================
// INICIALIZAÇÃO E TEMA
// ==========================================
function aplicarTemaSalvo() { 
    const isDark = localStorage.getItem("temaEscuro") === "true"; 
    if (isDark) document.body.classList.add("dark-mode"); 
    else document.body.classList.remove("dark-mode"); 
}
aplicarTemaSalvo(); 

window.alternarTema = function() { 
    document.body.classList.toggle("dark-mode"); 
    localStorage.setItem("temaEscuro", document.body.classList.contains("dark-mode")); 
    aplicarTemaSalvo(); 
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        usuarioLogado = user;
        try {
            const docUser = await db.collection("usuarios").doc(user.uid).get();
            if (docUser.exists) {
                dadosUsuarioLogado = { id: user.uid, ...docUser.data() };
                perfilUsuario = dadosUsuarioLogado.perfil;
                
                document.getElementById("corpoPagina").style.display = "flex";
                if(document.getElementById("nomeUsuario")) document.getElementById("nomeUsuario").innerText = (dadosUsuarioLogado.nome || user.email.split('@')[0]).toUpperCase();
                if(document.getElementById("cargoUsuario")) document.getElementById("cargoUsuario").innerText = perfilUsuario.toUpperCase();

                if(perfilUsuario !== 'vendedor' && document.getElementById('btnGerarBordero')) {
                    document.getElementById('btnGerarBordero').style.display = 'inline-flex';
                }

                renderizarMenus(); 
                carregarPropostas();
            } else { alert("Perfil não encontrado."); auth.signOut(); }
        } catch (e) { console.error(e); }
    } else { window.location.href = "../index.html"; }
});

window.sair = function() { auth.signOut().then(() => { window.location.href = "../index.html"; }); }

function renderizarMenus() {
    const navLinks = document.querySelector('.nav-links'); 
    const isMesa = window.location.pathname.includes("index.html"); 
    const isRemessa = window.location.pathname.includes("remessas.html"); 
    const isEquipe = window.location.pathname.includes("cadastros.html");
    
    if (navLinks) {
        navLinks.innerHTML = `<a href="index.html" class="nav-item ${isMesa?'ativo':''}"><span class="material-symbols-rounded">dashboard</span>Mesa de Propostas</a>` + 
        (perfilUsuario!=='vendedor' ? `<a href="remessas.html" class="nav-item ${isRemessa?'ativo':''}"><span class="material-symbols-rounded">account_balance_wallet</span>Remessas</a><a href="cadastros.html" class="nav-item ${isEquipe?'ativo':''}"><span class="material-symbols-rounded">manage_accounts</span>Cadastros</a><a href="../dashboard.html" class="nav-item"><span class="material-symbols-rounded">bar_chart</span>Dashboard</a>` : '');
    }
}

// ==========================================
// CARREGAR TABELA (LIVE FETCH + FILTROS)
// ==========================================
function carregarPropostas() {
    const cT = document.getElementById("corpoTabela");
    if(!cT) return;

    let q = db.collection('propostas').orderBy('criadoEm', 'desc');

    if (perfilUsuario === 'vendedor') q = q.where("vendedorId", "==", usuarioLogado.uid);
    else if (perfilUsuario === 'gerente') q = q.where("gerenteId", "==", usuarioLogado.uid);
    else if (perfilUsuario === 'admin') q = q.where("empresaId", "==", dadosUsuarioLogado.empresaId);

    q.onSnapshot(async snap => {
        // BUSCA LIVE DOS NOMES DE TODAS AS COLEÇÕES
        const [vendSnap, lojasSnap, redesSnap] = await Promise.all([
            db.collection("vendedores").get(),
            db.collection("lojas").get(),
            db.collection("redes").get()
        ]);
        
        const vendedoresMap = {}; vendSnap.forEach(v => vendedoresMap[v.id] = v.data());
        const lojasMap = {}; lojasSnap.forEach(l => lojasMap[l.id] = l.data());
        const redesMap = {}; redesSnap.forEach(r => redesMap[r.id] = r.data());

        cT.innerHTML = '';
        if (snap.empty) { 
            cT.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; opacity: 0.5;">Nenhuma proposta na mesa.</td></tr>'; 
            return; 
        }
        
        snap.forEach(doc => {
            const d = doc.data();
            const id = doc.id;
            
            // 1. CAÇA-IDS (Procura o ID real em qualquer lugar possível)
            let vendId = d.vendedorId || d.hierarquia?.vendedorId || d.uid || null;
            let lojaId = d.lojaId || d.hierarquia?.lojaId || null;
            let redeId = d.redeId || d.hierarquia?.redeId || null;

            // 2. CRUZAMENTO (Se achou o ID no mapa "ao vivo", usa. Se não, usa o antigo.)
            let nomeVendReal = "-";
            if (vendId && vendedoresMap[vendId]) {
                nomeVendReal = vendedoresMap[vendId].nome;
            } else {
                nomeVendReal = d.vendedorNome || d.hierarquia?.vendedorNome || "Vendedor Não Localizado";
            }

            let nomeLojaReal = "-";
            if (lojaId && lojasMap[lojaId]) {
                nomeLojaReal = lojasMap[lojaId].nome;
            } else {
                nomeLojaReal = d.lojaNome || d.hierarquia?.lojaNome || "Loja Não Localizada";
            }

            let nomeRedeReal = "-";
            if (redeId && redesMap[redeId]) {
                nomeRedeReal = redesMap[redeId].nome;
            } else {
                nomeRedeReal = d.redeNome || d.hierarquia?.redeNome || "S/ Rede";
            }

            // Formatação de Data e Dados para Filtro
            let dataHT = "-";
            let dataBusca = "1900-01-01";
            if (d.criadoEm && d.criadoEm.toDate) {
                const dt = d.criadoEm.toDate();
                dataHT = `${dt.toLocaleDateString('pt-BR')}<br><span style="font-size:10px; opacity:0.5;">${dt.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>`;
                dataBusca = dt.toISOString().split('T')[0];
            }

            // Status Cores
            let cS = '#6b7280';
            if(d.status === 'aprovada' || d.status === 'paga') cS = '#10b981';
            if(d.status === 'recusada') cS = '#ef4444';
            if(d.status === 'agendada') cS = '#6366f1';
            if(d.status === 'pendente') cS = '#3b82f6';

            // Comissão e Valor
            const valCom = formatarMoedaVisual(d.comissao || d.hierarquia?.valorComissao || 0);
            const comHTML = d.status === 'pendente' ? '<span style="font-size:11px; opacity:0.4;">Em Análise</span>' : `<span style="color:#10b981; font-weight:bold;">+ ${valCom}</span>`;

            const pEmpresa = d.empresaId || d.hierarquia?.empresaId || '';
            const stringBuscaGeral = `${d.cliente || ''} ${d.cpf || ''} ${d.codigo || id} ${nomeLojaReal} ${nomeVendReal} ${nomeRedeReal}`.toLowerCase();

            // Desenha a linha
            cT.innerHTML += `
                <tr class="linha-proposta-item" data-status="${d.status || 'pendente'}" data-data="${dataBusca}" data-busca="${stringBuscaGeral}" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="text-align: center;"><input type="checkbox" class="check-proposta" value="${id}" data-valor="${converterParaFloat(d.valor)}" data-empresa="${pEmpresa}"></td>
                    <td style="font-size: 12px;">${dataHT}</td>
                    <td style="color:var(--f1a-blue); font-weight:bold; font-size:11px;">${redeId || '-'}<br><span style="color:var(--cor-texto); font-weight:normal; opacity:0.7;">${nomeRedeReal}</span></td>
                    <td style="color:var(--f1a-blue); font-weight:bold; font-size:12px;">${d.codigo || id.substring(0,6)}</td>
                    <td>
                        <strong style="font-size:13px;">${(d.cliente || '-').toUpperCase()}</strong><br>
                        <span style="font-size:11px; display:flex; align-items:center; gap:5px; margin-top:4px; color:var(--cor-texto);">
                            <span class="material-symbols-rounded" style="font-size:14px; color:#E69138;">storefront</span> ${nomeLojaReal}
                        </span>
                        <span style="font-size:11px; display:flex; align-items:center; gap:5px; opacity:0.7;">
                            <span class="material-symbols-rounded" style="font-size:14px;">person</span> ${nomeVendReal}
                        </span>
                    </td>
                    <td><span class="tag-status" style="background:${cS}20; color:${cS}; font-size:10px; padding:4px 8px;">${(d.status || 'pendente').toUpperCase()}</span></td>
                    <td>${comHTML}</td>
                    <td>
                        <button class="btn-acoes" onclick="toggleMenuAcoes('${id}')">Ações <span class="material-symbols-rounded" style="font-size:16px;">expand_more</span></button>
                    </td>
                </tr>
            `;
        });
        
        // Aplica os filtros assim que carregar, caso o usuário já tenha digitado algo
        if(typeof aplicarFiltrosMesa === 'function') aplicarFiltrosMesa();
    });
}

// ==========================================
// LÓGICA DE BORDERÔ / REMESSA
// ==========================================
window.marcarTodasPropostas = function(checkboxGeral) {
    const checkboxesLinhas = document.querySelectorAll('.check-proposta');
    checkboxesLinhas.forEach(check => {
        if(check.closest('tr').style.display !== "none") {
            check.checked = checkboxGeral.checked;
        }
    });
}

window.gerarBordero = async function() {
    const selecionados = document.querySelectorAll('.check-proposta:checked');
    if (selecionados.length === 0) return alert("Selecione pelo menos uma proposta marcando a caixinha na primeira coluna.");

    let valorTotalBorder = 0;
    let propostasIds = [];
    let empresaHerdadaId = null;

    selecionados.forEach(chk => {
        valorTotalBorder += parseFloat(chk.dataset.valor);
        propostasIds.push(chk.value);
        if (!empresaHerdadaId && chk.dataset.empresa) {
            empresaHerdadaId = chk.dataset.empresa;
        }
    });

    if (valorTotalBorder <= 0 || isNaN(valorTotalBorder)) {
        return alert("Erro: O valor total selecionado é zero ou inválido.");
    }

    const valorAviso = formatarMoedaVisual(valorTotalBorder);
    if (!confirm(`Deseja gerar uma Remessa/Borderô para ${selecionados.length} proposta(s) no valor total de ${valorAviso}?`)) return;

    const btn = document.getElementById("btnGerarBordero");
    const txtOrig = btn.innerHTML;
    btn.innerHTML = "Gerando..."; btn.disabled = true;

    try {
        const codigoBordero = "REM-" + Math.floor(1000 + Math.random() * 9000);
        
        const remessaRef = await db.collection("remessas").add({
            codigo: codigoBordero,
            identificador: codigoBordero,
            dataVencimento: new Date().toLocaleDateString('pt-BR'),
            valorTotal: valorTotalBorder, 
            qtdPropostas: propostasIds.length,
            status: "aberta", 
            empresaId: empresaHerdadaId || dadosUsuarioLogado.empresaId || null,
            gerenteId: perfilUsuario === 'gerente' ? dadosUsuarioLogado.id : null,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        const batch = db.batch();
        propostasIds.forEach(id => {
            batch.update(db.collection("propostas").doc(id), { 
                status: 'agendada', 
                borderoId: remessaRef.id, 
                borderoNome: codigoBordero,
                dataAgendamento: new Date().toLocaleDateString('pt-BR')
            });
        });
        await batch.commit();

        if(document.getElementById('checkMarcarTodos')) document.getElementById('checkMarcarTodos').checked = false;
        alert(`✅ Borderô ${codigoBordero} criado com sucesso!`);
    } catch(e) {
        alert("Erro ao criar Borderô: " + e.message);
        console.error(e);
    } finally {
        btn.innerHTML = txtOrig; btn.disabled = false;
    }
}

// ==========================================
// DETALHES DA PROPOSTA (BUSCA AO VIVO NO MODAL)
// ==========================================
window.abrirDetalhesProposta = async function(id) {
    const modal = document.getElementById("modalDetalhesProposta");
    const conteudo = document.getElementById("conteudoDetalhes");
    
    if (!modal || !conteudo) {
        return alert("Erro: Estrutura do modal não encontrada no HTML.");
    }

    conteudo.innerHTML = '<div style="text-align: center; padding: 40px;"><span class="material-symbols-rounded" style="font-size: 40px; color: var(--f1a-blue); animation: spin 1s linear infinite;">sync</span><p style="margin-top:10px; color: var(--cor-texto);">Buscando dados ao vivo...</p></div>';
    modal.classList.remove("escondido");

    try {
        const docProp = await db.collection("propostas").doc(id).get();
        if (!docProp.exists) {
            conteudo.innerHTML = '<div style="text-align: center; padding: 30px; color: #ef4444;">Proposta não encontrada no sistema.</div>';
            return;
        }
        
        const d = docProp.data();

        const vendId = d.vendedorId || d.hierarquia?.vendedorId;
        const lojaId = d.lojaId || d.hierarquia?.lojaId;
        const redeId = d.redeId || d.hierarquia?.redeId;
        const empId = d.empresaId || d.hierarquia?.empresaId;

        const promessas = [];
        promessas.push(vendId ? db.collection("vendedores").doc(vendId).get() : null);
        promessas.push(lojaId ? db.collection("lojas").doc(lojaId).get() : null);
        promessas.push(redeId ? db.collection("redes").doc(redeId).get() : null);
        promessas.push(empId ? db.collection("empresas").doc(empId).get() : null);
        
        const [snapVend, snapLoja, snapRede, snapEmp] = await Promise.all(promessas);

        const nomeVendLive = snapVend?.exists ? snapVend.data().nome : (d.vendedorNome || d.hierarquia?.vendedorNome || "Não informado");
        const nomeLojaLive = snapLoja?.exists ? snapLoja.data().nome : (d.lojaNome || d.hierarquia?.lojaNome || "Não informado");
        const nomeRedeLive = snapRede?.exists ? snapRede.data().nome : (d.redeNome || d.hierarquia?.redeNome || "Não informado");
        const nomeEmpLive = snapEmp?.exists ? (snapEmp.data().nomeFantasia || snapEmp.data().razaoSocial) : "Não informada";

        const dataCriacao = d.criadoEm ? d.criadoEm.toDate().toLocaleString('pt-BR') : '-';
        const valorFormatado = formatarMoedaVisual(d.valor || 0);
        const comissaoFormatada = formatarMoedaVisual(d.comissao || d.hierarquia?.valorComissao || 0);
        const statusHT = (d.status || 'pendente').toUpperCase();

        let cS = '#6b7280';
        if(d.status === 'aprovada' || d.status === 'paga') cS = '#10b981';
        if(d.status === 'recusada') cS = '#ef4444';
        if(d.status === 'agendada') cS = '#6366f1';
        if(d.status === 'pendente') cS = '#3b82f6';

        conteudo.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px; font-size: 14px; color: var(--cor-texto);">
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    <div>
                        <strong style="color: var(--f1a-blue); font-size: 16px;">CÓD: ${d.codigo || id.substring(0,8).toUpperCase()}</strong><br>
                        <span style="font-size: 11px; opacity: 0.7;">Criado em: ${dataCriacao}</span>
                    </div>
                    <div>
                        <span style="background:${cS}20; color:${cS}; font-size:11px; padding:6px 12px; border-radius: 4px; font-weight: bold;">${statusHT}</span>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="margin: 0 0 8px 0; color: #E69138; font-size: 13px; display: flex; align-items: center; gap: 5px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">person</span> Dados do Cliente
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                        <div><strong style="color: var(--cor-titulo);">Nome:</strong><br>${d.cliente || '-'}</div>
                        <div><strong style="color: var(--cor-titulo);">CPF:</strong><br>${d.cpf || '-'}</div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="margin: 0 0 8px 0; color: #E69138; font-size: 13px; display: flex; align-items: center; gap: 5px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">account_tree</span> Estrutura (Sincronizada)
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; margin-bottom: 8px;">
                        <div><strong style="color: var(--cor-titulo);">Empresa:</strong><br>${nomeEmpLive}</div>
                        <div><strong style="color: var(--cor-titulo);">Rede:</strong><br>${nomeRedeLive}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
                        <div><strong style="color: var(--cor-titulo);">Loja:</strong><br>${nomeLojaLive}</div>
                        <div><strong style="color: var(--cor-titulo);">Vendedor:</strong><br><span style="color: var(--f1a-blue); font-weight: bold;">${nomeVendLive}</span></div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.1); padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <h4 style="margin: 0 0 8px 0; color: #E69138; font-size: 13px; display: flex; align-items: center; gap: 5px;">
                        <span class="material-symbols-rounded" style="font-size: 16px;">payments</span> Detalhes Financeiros
                    </h4>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px; font-size: 13px;">
                        <div><strong style="color: var(--cor-titulo);">Tabela/Produto:</strong> ${d.tabela || '-'}</div>
                        <div style="display: flex; justify-content: space-between; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 8px; margin-top: 4px;">
                            <span><strong style="color: var(--cor-titulo);">Valor Base:</strong><br>${valorFormatado}</span>
                            <span style="text-align: right;"><strong style="color: var(--cor-titulo);">Comissão (Repasse):</strong><br><span style="color: #10b981; font-weight: bold; font-size: 15px;">${comissaoFormatada}</span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        console.error("Erro ao abrir detalhes da proposta:", e);
        conteudo.innerHTML = '<div style="text-align: center; padding: 30px; color: #ef4444;">Erro ao carregar dados do banco. Verifique o console.</div>';
    }
}

window.fecharModalDetalhes = function() {
    const modal = document.getElementById("modalDetalhesProposta");
    if (modal) modal.classList.add("escondido");
}

// ==========================================
// FILTROS DA MESA DE PROPOSTAS
// ==========================================
window.aplicarFiltrosMesa = function() {
    const termoBusca = (document.getElementById("filtroBuscaProp")?.value || "").toLowerCase();
    const statusDesejado = document.getElementById("filtroStatusProp")?.value || "";
    const dataInicio = document.getElementById("filtroDataInicioProp")?.value || "";
    const dataFim = document.getElementById("filtroDataFimProp")?.value || "";

    const linhas = document.querySelectorAll(".linha-proposta-item");

    linhas.forEach(linha => {
        const textoLinha = linha.getAttribute("data-busca");
        const statusLinha = linha.getAttribute("data-status");
        const dataLinha = linha.getAttribute("data-data");

        let exibir = true;

        if (termoBusca && !textoLinha.includes(termoBusca)) exibir = false;
        if (statusDesejado && statusLinha !== statusDesejado) exibir = false;
        if (dataInicio && dataLinha < dataInicio) exibir = false;
        if (dataFim && dataLinha > dataFim) exibir = false;

        linha.style.display = exibir ? "" : "none";
    });
}

// 1. Defina qual módulo esta página representa
const MODULO_ID_ATUAL = 'propostas'; 

async function configurarMasterVision() {
    const user = firebase.auth().currentUser;
    const docUser = await db.collection("usuarios").doc(user.uid).get();
    
    // Só executa se for Master
    if (docUser.data().perfil.toLowerCase() === 'master') {
        document.getElementById('containerMasterVision').style.display = 'flex';
        
        const select = document.getElementById('masterVisionSelect');
        
        // Busca usuários que têm acesso a este módulo específico
        const usersSnap = await db.collection("usuarios").get();
        usersSnap.forEach(uDoc => {
            const uData = uDoc.data();
            const modulos = uData.modulosAcesso || [];
            
            // Regra: Mostrar se for Master OU se tiver o módulo no array
            if (uData.perfil.toLowerCase() === 'master' || modulos.includes(MODULO_ID_ATUAL)) {
                if (uDoc.id !== user.uid) { // Não duplicar o próprio Master
                    const opt = document.createElement('option');
                    opt.value = uDoc.id;
                    opt.textContent = uData.nome || uData.email;
                    select.appendChild(opt);
                }
            }
        });

        // Recupera visão salva se houver
        const visaoSalva = sessionStorage.getItem('f1a_vision_uid');
        if (visaoSalva) {
            select.value = visaoSalva;
        }
    }
}

function alterarVisaoGlobal(uid) {
    if (uid === 'todos') {
        sessionStorage.removeItem('f1a_vision_uid');
    } else {
        sessionStorage.setItem('f1a_vision_uid', uid);
    }
    window.location.reload(); // Recarrega para aplicar o filtro nos dados
}

// 3. Aplique o filtro na sua função que carrega as propostas
// Exemplo de como ficaria a sua consulta ao Firestore:
function carregarPropostas() {
    let consulta = db.collection("propostas");
    
    const visionUid = sessionStorage.getItem('f1a_vision_uid');
    if (visionUid) {
        // Se houver um usuário selecionado, filtra apenas as propostas dele
        // Ajuste o campo 'vendedorUid' conforme o nome que você usa no seu banco
        consulta = consulta.where("vendedorUid", "==", visionUid);
    }
    
    // ... restante da sua lógica de carregar propostas
}

window.limparFiltrosMesa = function() {
    if(document.getElementById("filtroBuscaProp")) document.getElementById("filtroBuscaProp").value = "";
    if(document.getElementById("filtroStatusProp")) document.getElementById("filtroStatusProp").value = "";
    if(document.getElementById("filtroDataInicioProp")) document.getElementById("filtroDataInicioProp").value = "";
    if(document.getElementById("filtroDataFimProp")) document.getElementById("filtroDataFimProp").value = "";
    aplicarFiltrosMesa();
}