// ==========================================
// MÓDULO ESTRUTURAL E SaaS (F1A Platform)
// ==========================================

let abaAtiva = null;
const STORAGE_CHAVE_ABA = 'f1a_cadastros_aba_ativa';

window.mostrarToast = function(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toastContainer');
    if(!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${tipo}`;
    const icone = tipo === 'erro' ? 'error' : 'check_circle'; const cor = tipo === 'erro' ? '#ef4444' : '#10b981';
    toast.innerHTML = `<span class="material-symbols-rounded" style="color: ${cor};">${icone}</span> <strong>${mensagem}</strong>`;
    container.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}

window.posAuthCallback = async function() {
    document.getElementById('corpoPagina').style.display = '';
    preencherCabecalhoUsuario();
    carregarEmpresasNoSelect();

    const abaSalva = sessionStorage.getItem(STORAGE_CHAVE_ABA);
    if (abaSalva) abrirAcoesHub(abaSalva);
}

function preencherCabecalhoUsuario() {
    const nome = dadosUsuarioLogado?.nome || 'Usuário';
    const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || 'Usuário';
    const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0] || '').join('').toUpperCase() || '--';

    const nomeEl = document.getElementById('nomeUsuario');
    const cargoEl = document.getElementById('cargoUsuario');
    const iniciaisEl = document.getElementById('iniciaisUsuario');

    if (nomeEl) nomeEl.innerText = nome;
    if (cargoEl) cargoEl.innerText = String(perfil).charAt(0).toUpperCase() + String(perfil).slice(1);
    if (iniciaisEl) iniciaisEl.innerText = iniciais;
}

// ==========================================
// ROTEAMENTO E REGRAS DE EMPRESA
// ==========================================

// Função robusta para extrair o ID da empresa corretamente (Evita Arrays quebrando a query)
function obterEmpresaAlvo(forcarMasterSelect = false) {
    let emp = null;
    if (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado) {
        emp = Array.isArray(dadosUsuarioLogado.empresaId) ? dadosUsuarioLogado.empresaId[0] : dadosUsuarioLogado.empresaId;
    }
    if (typeof perfilUsuario !== 'undefined' && perfilUsuario === 'master') {
        const masterSelect = document.getElementById(forcarMasterSelect ? "masterEmpresaImport" : "masterEmpresa");
        if (masterSelect && masterSelect.value) {
            emp = masterSelect.value;
        } else {
            emp = null; // Master sem seleção vê tudo
        }
    }
    return emp ? String(emp) : null;
}

window.carregarEmpresasNoSelect = function() { 
    aplicarRegrasDeAcesso();
    db.collection("empresas").get().then(snap => { 
        const s = document.getElementById("masterEmpresa"); if(s) { s.innerHTML = '<option value="">Selecione a empresa...</option>'; snap.forEach(d => { s.innerHTML += `<option value="${d.id}">${d.data().nomeFantasia}</option>`; }); }
        const sImp = document.getElementById("masterEmpresaImport"); if(sImp) { sImp.innerHTML = '<option value="">Selecione a empresa...</option>'; snap.forEach(d => { sImp.innerHTML += `<option value="${d.id}">${d.data().nomeFantasia}</option>`; }); }
    });
}

function aplicarRegrasDeAcesso() {
    if (perfilUsuario === 'master') { document.getElementById("btnSaaS").style.display = "flex"; document.getElementById("btnPlanos").style.display = "flex"; document.getElementById("btnModulos").style.display = "flex"; document.getElementById("ferramentasMaster").style.display = "block"; }
}

window.abrirAcoesHub = function(tipo) {
    abaAtiva = tipo;
    sessionStorage.setItem(STORAGE_CHAVE_ABA, tipo);
    const titulos = { 'empresas': 'Clientes SaaS', 'planos': 'Planos de Licenciamento', 'modulos': 'Módulos do Sistema', 'redes': 'Redes de Lojas', 'lojas': 'Lojas Físicas' };
    document.getElementById("tituloTabelaAtual").innerText = titulos[tipo];
    document.getElementById("viewFormulario").classList.add("escondido"); document.getElementById("viewLista").classList.remove("escondido"); document.getElementById("areaTabela").style.display = "block"; 
    
    const btnImportar = document.getElementById("btnImportarLote");
    if (['redes', 'lojas'].includes(tipo)) btnImportar.style.display = "flex"; else btnImportar.style.display = "none";
    
    carregarTabela(tipo);
}

// ==========================================
// UTILITÁRIOS E MÁSCARAS
// ==========================================
window.aplicarMascaraMoeda = function(input) { let v = input.value.replace(/\D/g, ""); v = (v / 100).toFixed(2) + ""; v = v.replace(".", ","); v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1."); input.value = v === "0,00" ? "" : "R$ " + v; }
function extrairFloatDeMoeda(strMoeda) { if (!strMoeda) return 0; let limpo = strMoeda.replace("R$ ", "").replace(/\./g, "").replace(",", "."); return parseFloat(limpo) || 0; }
function floatParaMoeda(valor) { if (!valor) return "R$ 0,00"; return "R$ " + parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function extrairPercentual(valor) { if (valor === null || valor === undefined) return 0; return parseFloat(String(valor).replace(',', '.')) || 0; }
window.aplicarMascaraCNPJ = function(input) { let v = input.value.replace(/\D/g, ""); if (v.length > 14) v = v.substring(0, 14); v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); input.value = v; }
window.toggleComissaoLoja = function() { const b = document.getElementById('boxComissaoLoja'); if(document.getElementById('checkComissaoLoja').checked) b.classList.remove('escondido'); else b.classList.add('escondido'); }

// ==========================================
// LÓGICA DE VIEW-SWITCH E EXCLUSÃO
// ==========================================
window.acaoNovoCadastro = function() {
    if (!abaAtiva) {
        mostrarToast('Escolha uma categoria antes de criar um novo cadastro.', 'erro');
        return;
    }
    abrirModalCadastro(null, abaAtiva);
}

window.abrirModalCadastro = async function(editId = null, tipo) {
    document.getElementById('viewLista').classList.add('escondido'); document.getElementById('viewFormulario').classList.remove('escondido');
    document.getElementById('editId').value = editId || ""; document.getElementById('tipoCadastroAtivo').value = tipo;
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('ativo')); document.getElementById(`form-${tipo}`).classList.add('ativo');

    const titulos = { 'empresas': 'Empresa SaaS', 'planos': 'Plano SaaS', 'modulos': 'Módulo F1A', 'redes': 'Rede', 'lojas': 'Loja' };
    document.getElementById('tituloModal').innerHTML = `<span class="material-symbols-rounded">edit_document</span> ${editId ? 'Editar' : 'Novo(a)'} ${titulos[tipo]}`;

    let empresaAtualContexto = obterEmpresaAlvo();
    const boxMaster = document.getElementById("boxMasterEmpresa");
    if(perfilUsuario === 'master' && !['empresas', 'planos', 'modulos'].includes(tipo) && !editId) { 
        boxMaster.style.display = "block"; carregarEmpresasNoSelect();
    } else { boxMaster.style.display = "none"; }

    const isEdicao = !!editId;
    
    if(isEdicao) {
        document.getElementById("btnExcluirCadastroGeral").style.display = "flex";
    } else {
        document.getElementById("btnExcluirCadastroGeral").style.display = "none";
        document.querySelectorAll(`#form-${tipo} input`).forEach(i => { if(i.type !== 'checkbox') i.value = ''; });
        if(tipo === 'empresas') { carregarPlanosNoSelect(); document.getElementById('empStatus').value = "ativa"; } 
        if(tipo === 'planos') { document.getElementById('planoLimAdm').value = 1; document.getElementById('planoLimGer').value = 3; document.getElementById('planoLimVen').value = 15; }
        if(tipo === 'lojas') { document.getElementById('checkComissaoLoja').checked = false; toggleComissaoLoja(); }
        if(tipo === 'modulos') { document.getElementById('modId').readOnly = false; document.getElementById('modTipo').value = "comercial"; document.getElementById('modCor').value = "icon-blue"; }
        if(tipo === 'redes') {
            document.getElementById('redeVendedor').value = "";
            if (document.getElementById('redeIndicacao')) document.getElementById('redeIndicacao').value = "";
            carregarResponsaveisDaRede(empresaAtualContexto);
        }
    }
    if(isEdicao) await preencherFormularioEdicao(editId, tipo); else if (!['planos', 'modulos'].includes(tipo)) await carregarSelectsHierarquia();
}

window.fecharModalCadastro = function() { document.getElementById('viewFormulario').classList.add('escondido'); document.getElementById('viewLista').classList.remove('escondido'); }

window.excluirCadastroAtual = async function() {
    const editId = document.getElementById('editId').value; const tipo = document.getElementById('tipoCadastroAtivo').value;
    if (!editId) return; const nomes = { 'empresas': 'esta Empresa', 'planos': 'este Plano', 'modulos': 'este Módulo', 'redes': 'esta Rede', 'lojas': 'esta Loja' };
    if (!confirm(`⚠️ ATENÇÃO: Tem certeza absoluta que deseja EXCLUIR ${nomes[tipo] || 'este registro'}?\n\nEsta ação não pode ser desfeita.`)) return;
    
    const btn = document.getElementById("btnExcluirCadastroGeral"); const txtOrig = btn.innerHTML; btn.innerHTML = "Excluindo..."; btn.disabled = true;
    try { let colecaoDb = tipo === 'modulos' ? 'modulos_f1a' : tipo; await db.collection(colecaoDb).doc(editId).delete(); mostrarToast("Registro excluído com sucesso!", "sucesso"); fecharModalCadastro(); } 
    catch(e) { mostrarToast("Erro ao excluir: " + e.message, "erro"); } finally { btn.innerHTML = txtOrig; btn.disabled = false; }
}

async function carregarPlanosNoSelect(planoSelecionadoId = null) {
    const s = document.getElementById("empPlano"); if(!s) return; s.innerHTML = '<option value="">Buscando planos...</option>';
    const snap = await db.collection("planos").orderBy("valor", "asc").get(); s.innerHTML = '<option value="">Selecione um pacote...</option>';
    snap.forEach(doc => { const d = doc.data(); s.innerHTML += `<option value="${doc.id}" ${doc.id === planoSelecionadoId ? 'selected' : ''}>${d.nome} - R$ ${d.valor}</option>`; });
}

async function carregarSelectsHierarquia(forcarEmpresaId = null) {
    let empresaAlvo = forcarEmpresaId || obterEmpresaAlvo();
    let qR = db.collection("redes"); if (empresaAlvo) qR = qR.where("empresaId", "==", String(empresaAlvo));
    const snapR = await qR.get(); const sR = document.getElementById("lojaRede"); if(sR) { sR.innerHTML = '<option value="">Selecione a Rede...</option>'; snapR.forEach(d => { sR.innerHTML += `<option value="${d.id}">${d.data().nome}</option>`; }); }
    if (document.getElementById('tipoCadastroAtivo')?.value === 'redes') {
        await carregarResponsaveisDaRede(empresaAlvo);
    }
}

async function carregarVendedoresParaRedes(empresaId, vendedorSelecionadoId = null) {
    const s = document.getElementById("redeVendedor"); if(!s) return;
    s.innerHTML = '<option value="">Carregando vendedores...</option>';
    try {
        let query = db.collection("usuarios");
        if (empresaId) query = query.where("empresaId", "==", String(empresaId));
        const snap = await query.get();
        s.innerHTML = '<option value="">Selecione um Vendedor...</option>';
        snap.forEach(doc => {
            const d = doc.data();
            let isSelected = (doc.id === vendedorSelecionadoId) ? 'selected' : '';
            s.innerHTML += `<option value="${doc.id}" ${isSelected}>${d.nome} (${d.perfil || 'Usuário'})</option>`;
        });
    } catch(e) { console.error(e); s.innerHTML = '<option value="">Erro ao carregar vendedores</option>'; }
}

async function carregarResponsaveisDaRede(empresaId, gerenteSelecionadoId = null, indicacaoSelecionadaId = null) {
    await Promise.all([
        carregarUsuariosPorPerfilNoSelect("redeVendedor", empresaId, ["gerente"], gerenteSelecionadoId, "Selecione um Gerente..."),
        carregarUsuariosPorPerfilNoSelect("redeIndicacao", empresaId, ["vendedor"], indicacaoSelecionadaId, "Selecione um Vendedor...")
    ]);
}

async function carregarUsuariosPorPerfilNoSelect(selectId, empresaId, perfisPermitidos, valorSelecionado = null, placeholder = "Selecione...") {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">Carregando...</option>';
    try {
        const snap = await db.collection("usuarios").get();
        const perfisNormalizados = perfisPermitidos.map(perfil => String(perfil).toLowerCase());
        const usuarios = [];

        snap.forEach(doc => {
            const dados = doc.data();
            const perfil = String(dados.perfil || "").toLowerCase();
            const pertenceEmpresa = !empresaId || usuarioPertenceEmpresa(dados, empresaId);
            if (perfisNormalizados.includes(perfil) && pertenceEmpresa) {
                usuarios.push({ id: doc.id, nome: dados.nome || "Usuário" });
            }
        });

        usuarios.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        select.innerHTML = `<option value="">${placeholder}</option>`;
        usuarios.forEach(usuario => {
            const isSelected = usuario.id === valorSelecionado ? 'selected' : '';
            select.innerHTML += `<option value="${usuario.id}" ${isSelected}>${usuario.nome}</option>`;
        });
    } catch(e) { console.error(e); select.innerHTML = '<option value="">Erro ao carregar usuários</option>'; }
}

function usuarioPertenceEmpresa(dadosUsuario, empresaId) {
    const empresaAlvo = String(empresaId || "");
    if (!empresaAlvo) return true;

    const empresaDoUsuario = dadosUsuario?.empresaId;
    if (Array.isArray(empresaDoUsuario)) {
        return empresaDoUsuario.map(item => String(item)).includes(empresaAlvo);
    }

    return String(empresaDoUsuario || "") === empresaAlvo;
}

async function preencherFormularioEdicao(editId, tipo) {
    let colecaoDb = tipo === 'modulos' ? 'modulos_f1a' : tipo;
    try {
        const doc = await db.collection(colecaoDb).doc(editId).get(); if(!doc.exists) return; const d = doc.data();
        if (!['planos', 'modulos'].includes(tipo)) await carregarSelectsHierarquia(d.empresaId);

        setTimeout(async () => { 
            if(tipo === 'modulos') { document.getElementById('modId').value = doc.id; document.getElementById('modId').readOnly = true; document.getElementById('modTipo').value = d.tipo || "comercial"; document.getElementById('modTitulo').value = d.titulo || ""; document.getElementById('modIcon').value = d.icon || ""; document.getElementById('modCor').value = d.cor || "icon-blue"; document.getElementById('modUrl').value = d.url || ""; document.getElementById('modDesc').value = d.desc || ""; } 
            else if(tipo === 'planos') { document.getElementById('planoNome').value = d.nome || ""; document.getElementById('planoValor').value = floatParaMoeda(d.valor) || ""; document.getElementById('planoLimAdm').value = d.limites?.admin || 1; document.getElementById('planoLimGer').value = d.limites?.gerente || 3; document.getElementById('planoLimVen').value = d.limites?.vendedor || 15; } 
            else if(tipo === 'empresas') { document.getElementById('empCnpj').value = d.cnpj || ""; document.getElementById('empRazao').value = d.razaoSocial || ""; document.getElementById('empFantasia').value = d.nomeFantasia || ""; document.getElementById('empDataAtivacao').value = d.dataAtivacao || ""; document.getElementById('empDataValidade').value = d.dataValidade || ""; document.getElementById('empStatus').value = d.status || "ativa"; carregarPlanosNoSelect(d.planoId); } 
            else if(tipo === 'redes') { 
                document.getElementById('redeNome').value = d.nome || ""; 
                document.getElementById('redeCodigo').value = d.codigo || ""; 
                document.getElementById('redeTaxaManutencao').value = floatParaMoeda(d.taxaManutencao) || "";
                document.getElementById('redePctComissaoFatura').value = d.pctComissaoFatura || "";
                document.getElementById('redePctComissaoPlastico').value = d.pctComissaoPlastico || "";
                carregarResponsaveisDaRede(d.empresaId, d.gerenteId || d.vendedorId || "", d.indicacaoVendedorId || "");
            } 
            else if(tipo === 'lojas') { document.getElementById('lojaNome').value = d.nome || ""; document.getElementById('lojaCodigo').value = d.codigo || ""; document.getElementById('lojaCnpj').value = d.cnpj || ""; document.getElementById('lojaCidade').value = d.cidade || ""; document.getElementById('lojaBairro').value = d.bairro || ""; document.getElementById('lojaRede').value = d.redeId || ""; document.getElementById('checkComissaoLoja').checked = d.usarComissaoPersonalizada || false; document.getElementById('lojaComissao').value = floatParaMoeda(d.comissao) || ""; toggleComissaoLoja(); }
        }, 300);
    } catch(e) { console.error(e); }
}

window.salvarCadastro = async function() {
    const btn = document.getElementById("btnSalvarCadastroGeral"); const txtOrig = btn.innerHTML; btn.innerHTML = "Salvando..."; btn.disabled = true;
    try {
        const editId = document.getElementById('editId').value; const isUpdate = editId !== ""; const tipo = document.getElementById('tipoCadastroAtivo').value;
        let empresaAlvo = obterEmpresaAlvo();
        
        if (perfilUsuario === 'master' && !['empresas', 'planos', 'modulos'].includes(tipo)) { 
            empresaAlvo = isUpdate ? (await db.collection(tipo === 'modulos' ? 'modulos_f1a' : tipo).doc(editId).get()).data().empresaId : document.getElementById("masterEmpresa").value; 
            if(!empresaAlvo) throw new Error("Escolha a Empresa Alvo!"); 
        }

        if (tipo === 'modulos') {
            const modId = document.getElementById('modId').value.trim().toLowerCase().replace(/\s+/g, '-'); if(!modId) throw new Error("O ID do módulo não pode ficar vazio!");
            const payload = { tipo: document.getElementById('modTipo').value, titulo: document.getElementById('modTitulo').value.trim(), icon: document.getElementById('modIcon').value.trim() || 'extension', cor: document.getElementById('modCor').value, url: document.getElementById('modUrl').value.trim(), desc: document.getElementById('modDesc').value.trim() };
            if(isUpdate) await db.collection("modulos_f1a").doc(editId).update(payload); else { const docCheck = await db.collection("modulos_f1a").doc(modId).get(); if(docCheck.exists) throw new Error("Já existe um módulo com esse ID."); await db.collection("modulos_f1a").doc(modId).set({...payload, criadoEm: firebase.firestore.FieldValue.serverTimestamp()}); }
        } else if (tipo === 'planos') {
            const limites = { admin: parseInt(document.getElementById('planoLimAdm').value)||1, gerente: parseInt(document.getElementById('planoLimGer').value)||0, vendedor: parseInt(document.getElementById('planoLimVen').value)||1 };
            const payload = { nome: document.getElementById('planoNome').value.trim().toUpperCase(), valor: extrairFloatDeMoeda(document.getElementById('planoValor').value), limites };
            if(isUpdate) await db.collection("planos").doc(editId).update(payload); else await db.collection("planos").add({...payload, criadoEm: firebase.firestore.FieldValue.serverTimestamp()});
        } else if (tipo === 'empresas') {
            const statusSalvo = document.getElementById("empStatus").value || 'ativa';
            const payload = { cnpj: document.getElementById('empCnpj').value, razaoSocial: document.getElementById('empRazao').value.trim().toUpperCase(), nomeFantasia: document.getElementById('empFantasia').value.trim().toUpperCase(), planoId: document.getElementById("empPlano").value, dataAtivacao: document.getElementById("empDataAtivacao").value, dataValidade: document.getElementById("empDataValidade").value, status: statusSalvo };
            if(!payload.planoId) throw new Error("Selecione um pacote de licenciamento.");
            if(isUpdate) await db.collection("empresas").doc(editId).update(payload); else await db.collection("empresas").add({...payload, criadoEm: firebase.firestore.FieldValue.serverTimestamp()});
        } else if (tipo === 'redes') {
            const payload = { 
                nome: document.getElementById('redeNome').value.trim().toUpperCase(), 
                codigo: document.getElementById('redeCodigo').value.trim(), 
                gerenteId: document.getElementById('redeVendedor').value,
                vendedorId: document.getElementById('redeVendedor').value,
                indicacaoVendedorId: document.getElementById('redeIndicacao')?.value || "",
                taxaManutencao: extrairFloatDeMoeda(document.getElementById('redeTaxaManutencao').value),
                pctComissaoFatura: extrairPercentual(document.getElementById('redePctComissaoFatura').value),
                pctComissaoPlastico: extrairPercentual(document.getElementById('redePctComissaoPlastico').value)
            };
            if(isUpdate) await db.collection("redes").doc(editId).update(payload); else await db.collection("redes").add({...payload, empresaId: String(empresaAlvo), criadoEm: firebase.firestore.FieldValue.serverTimestamp()});
        } else if (tipo === 'lojas') {
            const usarC = document.getElementById('checkComissaoLoja').checked; const comC = extrairFloatDeMoeda(document.getElementById('lojaComissao').value); 
            const payload = { redeId: document.getElementById('lojaRede').value, nome: document.getElementById('lojaNome').value.trim().toUpperCase(), codigo: document.getElementById('lojaCodigo').value.trim(), cnpj: document.getElementById('lojaCnpj').value.trim(), cidade: document.getElementById('lojaCidade').value.trim(), bairro: document.getElementById('lojaBairro').value.trim(), usarComissaoPersonalizada: usarC, comissao: usarC ? comC : null };
            if(isUpdate) await db.collection("lojas").doc(editId).update(payload); else await db.collection("lojas").add({...payload, empresaId: String(empresaAlvo), criadoEm: firebase.firestore.FieldValue.serverTimestamp()});
        } 
        mostrarToast("Salvo com sucesso!", "sucesso"); fecharModalCadastro(); 
    } catch(e) { mostrarToast(e.message, "erro"); } finally { btn.innerHTML = txtOrig; btn.disabled = false; }
}

// ==========================================
// FILTRO DE TABELA AVANÇADO (Busca + Dropdown)
// ==========================================
window.filtrarTabela = function() { 
    const textoBusca = document.getElementById("inputBusca").value.toLowerCase(); 
    const filtroDropdown = document.getElementById("filtroDropdown").value.toLowerCase();
    
    document.querySelectorAll("#corpoTabela tr").forEach(linha => { 
        const textoLinha = linha.innerText.toLowerCase();
        const matchBusca = textoLinha.includes(textoBusca);
        const matchFiltro = filtroDropdown === "" || textoLinha.includes(filtroDropdown);
        linha.style.display = (matchBusca && matchFiltro) ? "" : "none"; 
    }); 
}

// ==========================================
// IMPORTAÇÃO INTELIGENTE (COM LOADING E BAIRRO)
// ==========================================
window.abrirModalImportacao = function() {
    document.body.classList.add("modal-open"); document.getElementById('modalImportacao').classList.remove('escondido');
    document.getElementById("layoutPlanilhaExemplo").innerHTML = "<strong>Robô de Importação Atualizado (F1A)</strong><br><br>Dica: Para atualizar a lista de Redes e Lojas, deve-se gerar o arquivo em <strong>Relatórios> Redes e Lojas> Empresas/Lojas</strong> e exportá-lo em CSV.";
    const boxMaster = document.getElementById("boxMasterImportacao");
    if(perfilUsuario === 'master') boxMaster.style.display = "block"; else boxMaster.style.display = "none";
    document.getElementById('arquivoCsvImportacao').value = "";
}

window.fecharModalImportacao = function() { document.body.classList.remove("modal-open"); document.getElementById('modalImportacao').classList.add('escondido'); }

window.iniciarProcessamentoCsv = async function() {
    const fileInput = document.getElementById('arquivoCsvImportacao');
    if (!fileInput.files || fileInput.files.length === 0) return mostrarToast("Selecione um arquivo TXT.", "erro");
    
    let empresaAlvo = obterEmpresaAlvo(true);
    if (!empresaAlvo) return mostrarToast("Selecione a empresa destino.", "erro");

    document.getElementById('loadingGlobal').classList.remove('escondido');
    fecharModalImportacao(); 
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const file = fileInput.files[0]; const text = await file.text();
        let sucessoRedes = 0, atualizadasRedes = 0, sucessoLojas = 0, atualizadasLojas = 0, erroCount = 0;

        const regexTokens = /"([^"]*)"|([^,\s]+)/g;
        let match; const tokens = [];
        while ((match = regexTokens.exec(text)) !== null) {
            if (match[1] !== undefined) tokens.push(match[1].trim());
            else if (match[2] !== undefined && match[2].trim() !== "") tokens.push(match[2].trim());
        }

        const mapaRedes = {}; 

        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i] === "Status" && tokens[i-1] === "Layout") {
                try {
                    const nomeRede = tokens[i+1].toUpperCase();
                    const razaoSocial = tokens[i+2].toUpperCase();
                    const fantasia = tokens[i+3].toUpperCase();
                    const cnpj = tokens[i+4];
                    
                    if (!/\d/.test(cnpj)) continue; 

                    let codRede = ""; let codLoja = "";
                    for(let k = i + 5; k < i + 15 && k < tokens.length - 1; k++) {
                        if (/^\d+$/.test(tokens[k]) && /^\d+$/.test(tokens[k+1])) {
                            codRede = tokens[k]; codLoja = tokens[k+1]; break;
                        }
                    }
                    if(!codRede || !codLoja) continue; 

                    let cidade = "Desconhecida"; let bairro = "";
                    for(let j = i+5; j < i+20 && j < tokens.length; j++) {
                        if(tokens[j].includes("CEP:")) {
                            const partes = tokens[j].split(',');
                            if(partes.length >= 2) {
                                const endPart = partes[partes.length - 1];
                                cidade = endPart.split('CEP:')[0].trim();
                                if(partes.length >= 3) {
                                    bairro = partes[partes.length - 2].trim(); 
                                }
                            }
                            break;
                        }
                    }

                    // 1. CRIA OU ATUALIZA A REDE
                    let redeId = mapaRedes[codRede];
                    if (!redeId) {
                        let rSnap = await db.collection("redes").where("empresaId", "==", String(empresaAlvo)).where("codigo", "==", codRede).get();
                        if (rSnap.empty) rSnap = await db.collection("redes").where("empresaId", "==", String(empresaAlvo)).where("nome", "==", nomeRede).get();

                        if (!rSnap.empty) { 
                            redeId = rSnap.docs[0].id; await db.collection("redes").doc(redeId).update({ nome: nomeRede, codigo: codRede }); atualizadasRedes++;
                        } else {
                            const novaRede = await db.collection("redes").add({
                                nome: nomeRede,
                                codigo: codRede,
                                gerenteId: "",
                                vendedorId: "",
                                indicacaoVendedorId: "",
                                taxaManutencao: 0,
                                pctComissaoFatura: 0,
                                pctComissaoPlastico: 0,
                                empresaId: String(empresaAlvo),
                                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                            });
                            redeId = novaRede.id; sucessoRedes++;
                        }
                        mapaRedes[codRede] = redeId;
                    }

                    // 2. CRIA OU ATUALIZA A LOJA
                    let lSnap = await db.collection("lojas").where("empresaId", "==", String(empresaAlvo)).where("codigo", "==", codLoja).get();
                    if (lSnap.empty && cnpj) lSnap = await db.collection("lojas").where("empresaId", "==", String(empresaAlvo)).where("cnpj", "==", cnpj).get();
                    if (lSnap.empty && cnpj) lSnap = await db.collection("lojas").where("empresaId", "==", String(empresaAlvo)).where("codigo", "==", cnpj).get();
                    if (lSnap.empty) lSnap = await db.collection("lojas").where("empresaId", "==", String(empresaAlvo)).where("nome", "==", fantasia).get();

                    if (!lSnap.empty) {
                        const lojaId = lSnap.docs[0].id;
                        await db.collection("lojas").doc(lojaId).update({ redeId: redeId, nome: fantasia, razaoSocial: razaoSocial, codigo: codLoja, cnpj: cnpj, cidade: cidade, bairro: bairro });
                        atualizadasLojas++;
                    } else {
                        await db.collection("lojas").add({ redeId: redeId, nome: fantasia, razaoSocial: razaoSocial, codigo: codLoja, cnpj: cnpj, cidade: cidade, bairro: bairro, usarComissaoPersonalizada: false, comissao: null, empresaId: String(empresaAlvo), criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
                        sucessoLojas++;
                    }
                } catch(e) { erroCount++; }
            }
        }
        mostrarToast(`Importação Concluída!<br>Criadas: ${sucessoRedes} Redes, ${sucessoLojas} Lojas<br>Atualizadas: ${atualizadasRedes} Redes, ${atualizadasLojas} Lojas.`, "sucesso");
    } catch (err) { 
        mostrarToast("Erro na leitura do arquivo: " + err.message, "erro"); 
    } finally { 
        document.getElementById('loadingGlobal').classList.add('escondido');
    }
}

// ==========================================
// RENDERIZAR TABELAS 
// ==========================================
async function carregarTabela(colecao) {
    const cT = document.getElementById("corpoTabela"); const cab = document.getElementById("cabecalhoTabela");
    const filtroDropdown = document.getElementById("filtroDropdown");
    if (!cT || !cab) return;
    cT.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--f1a-blue);">Carregando dados... <span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span></td></tr>';
    
    try {
        let empresaAlvo = obterEmpresaAlvo();

        // Controle do Dropdown de Filtros
        if (colecao === 'lojas') {
            filtroDropdown.style.display = "block"; filtroDropdown.innerHTML = '<option value="">Filtro: Todas as Redes</option>';
            let qRedes = db.collection('redes'); if(empresaAlvo) qRedes = qRedes.where("empresaId", "==", String(empresaAlvo));
            qRedes.get().then(snap => { snap.forEach(d => filtroDropdown.innerHTML += `<option value="${d.data().nome.toLowerCase()}">${d.data().nome}</option>`); });
        } else if (colecao === 'redes') {
            filtroDropdown.style.display = "block"; filtroDropdown.innerHTML = '<option value="">Filtro: Todos os Status</option><option value="ativo">Ativo</option><option value="suspenso">Suspenso</option>';
        } else { filtroDropdown.style.display = "none"; }

        // MÓDULOS F1A
        if(colecao === 'modulos') {
            cab.innerHTML = '<tr><th style="width: 35%;">Módulo / ID</th><th style="width: 15%;">Tipo</th><th style="width: 35%;">Rota (URL)</th><th style="width: 15%; text-align: center;">Ações</th></tr>';
            db.collection('modulos_f1a').onSnapshot(snap => { cT.innerHTML = ''; if(snap.empty) { cT.innerHTML = '<tr><td colspan="4" style="text-align:center;">Vazio.</td></tr>'; return; } snap.forEach(doc => { const d = doc.data(); const tipoSeguro = d.tipo || 'comercial'; const badge = tipoSeguro === 'sistema' ? 'badge-pendente' : 'badge-aprovada'; cT.innerHTML += `<tr><td><strong style="color:var(--cor-titulo);"><span class="material-symbols-rounded" style="font-size:16px; vertical-align:middle; color:var(--f1a-blue);">${d.icon||'extension'}</span> ${d.titulo || 'Sem Título'}</strong><br><span style="font-size:10px; color:var(--cor-texto);">ID: ${doc.id}</span></td><td><span class="status-badge ${badge}" style="font-size:10px;">${tipoSeguro.toUpperCase()}</span></td><td style="font-size:12px; color:var(--f1a-copper);">${d.url || '-'}</td><td style="text-align: center; white-space: nowrap;"><button class="btn-icon" style="border:none; color:var(--f1a-blue); margin-right: 5px;" onclick="abrirModalCadastro('${doc.id}', 'modulos')" title="Editar"><span class="material-symbols-rounded">edit</span></button></td></tr>`; }); }); return;
        }

        // PLANOS SAAS
        if (colecao === 'planos') {
            cab.innerHTML = '<tr><th>Nome do Pacote</th><th>Valor Mensal</th><th>Limites (Adm/Ger/Vend)</th><th>Ações</th></tr>';
            db.collection('planos').orderBy("valor", "asc").onSnapshot(snap => { cT.innerHTML = ''; if(snap.empty) { cT.innerHTML = '<tr><td colspan="4" style="text-align:center;">Vazio.</td></tr>'; return; } snap.forEach(doc => { const d = doc.data(); cT.innerHTML += `<tr><td><strong style="color:var(--cor-titulo);">${d.nome || '-'}</strong></td><td style="font-weight:bold; color:var(--f1a-blue);">${floatParaMoeda(d.valor)}</td><td><span class="status-badge badge-pendente" style="background:transparent; border-color:var(--borda); color:var(--cor-texto);">A:${d.limites?.admin||0} | G:${d.limites?.gerente||0} | V:${d.limites?.vendedor||0}</span></td><td><button class="btn-icon" style="border:none; color:var(--f1a-copper);" onclick="abrirModalCadastro('${doc.id}', 'planos')"><span class="material-symbols-rounded">edit</span></button></td></tr>`; }); }, error => { cT.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">Erro ao carregar planos.</td></tr>`; }); return;
        }

        // EMPRESAS (SAAS)
        if (colecao === 'empresas') {
            cab.innerHTML = '<tr><th>Cliente SaaS</th><th>Licenciamento</th><th>Validade</th><th>Status</th><th>Ações</th></tr>';
            const planosSnap = await db.collection('planos').get(); const mapPlanos = {}; planosSnap.forEach(p => mapPlanos[p.id] = p.data().nome);
            db.collection('empresas').orderBy("criadoEm", "desc").onSnapshot(snap => { cT.innerHTML = ''; if(snap.empty) { cT.innerHTML = '<tr><td colspan="5" style="text-align:center;">Vazio.</td></tr>'; return; } const dataHoje = new Date(); dataHoje.setHours(0,0,0,0); snap.forEach(doc => { const d = doc.data(); let cS = d.status === 'ativa' ? '#10b981' : (d.status === 'cancelada' ? '#6b7280' : '#ef4444'); let statusTexto = (d.status || 'ativa').toUpperCase(); const pNome = mapPlanos[d.planoId] || 'Não Atribuído'; let isVencido = false; if(d.dataValidade && d.status === 'ativa') { const dataVal = new Date(d.dataValidade + "T00:00:00"); if (dataHoje > dataVal) { isVencido = true; cS = '#ef4444'; statusTexto = 'VENCIDO'; } } cT.innerHTML += `<tr><td><strong style="color:var(--cor-titulo);">${d.nomeFantasia || '-'}</strong><br><span style="font-size:11px;">${d.cnpj || '-'}</span></td><td><span class="status-badge" style="background:var(--bg-body);color:var(--cor-titulo);border:1px solid var(--borda);">PLANO ${pNome}</span></td><td><span style="font-weight:bold; color:${isVencido ? '#ef4444' : 'var(--cor-texto)'}; font-size:11px;">${d.dataValidade ? d.dataValidade.split('-').reverse().join('/') : 'Indefinido'}</span></td><td><span class="status-badge" style="background:${cS}20;color:${cS}; border-color:${cS}40;">${statusTexto}</span></td><td><button class="btn-icon" style="border:none; color:var(--f1a-blue);" onclick="abrirModalCadastro('${doc.id}', 'empresas')"><span class="material-symbols-rounded">edit</span></button></td></tr>`; }); }, error => { cT.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">Erro ao carregar empresas.</td></tr>`; }); return;
        }

        // REDES
        if (colecao === 'redes') {
            cab.innerHTML = '<tr><th>Cod.Rede</th><th>Rede</th><th>Qtd.Lojas</th><th>Status</th><th>Ações</th></tr>';
            let q = db.collection('redes'); if (empresaAlvo) q = q.where("empresaId", "==", String(empresaAlvo));
            
            q.onSnapshot(async snap => { 
                let qLojas = db.collection('lojas'); if (empresaAlvo) qLojas = qLojas.where("empresaId", "==", String(empresaAlvo));
                const lojasSnap = await qLojas.get();
                const mapaQtdLojas = {};
                lojasSnap.forEach(l => { const rId = l.data().redeId; mapaQtdLojas[rId] = (mapaQtdLojas[rId] || 0) + 1; });

                cT.innerHTML = ''; if(snap.empty) { cT.innerHTML = '<tr><td colspan="5" style="text-align:center;">Vazio.</td></tr>'; return; } 
                snap.forEach(doc => { 
                    const d = doc.data(); 
                    const qtd = mapaQtdLojas[doc.id] || 0;
                    const cS = d.status === 'bloqueado' ? '#ef4444' : '#10b981'; const badge = `<span class="status-badge" style="background:${cS}20;color:${cS}; border-color:${cS}40;">${d.status==='bloqueado'?'SUSPENSO':'ATIVO'}</span>`;
                    cT.innerHTML += `<tr><td>${d.codigo || '-'}</td><td style="font-weight:700; color:var(--cor-titulo);">${d.nome || '-'}</td><td><span class="status-badge" style="background:var(--bg-body); border-color:var(--borda); color:var(--cor-texto);">${qtd} Loja(s)</span></td><td>${badge}</td><td style="white-space: nowrap;"><button class="btn-icon" style="border:none; color:var(--f1a-blue);" onclick="abrirModalCadastro('${doc.id}', 'redes')" title="Editar"><span class="material-symbols-rounded">edit</span></button></td></tr>`; 
                }); 
                filtrarTabela(); 
            });
            return;
        }

        // LOJAS
        if (colecao === 'lojas') {
            cab.innerHTML = '<tr><th>Cod.Loja</th><th>Loja</th><th>CNPJ</th><th>Cidade</th><th>Bairro</th><th>Status</th><th>Ações</th></tr>';
            
            let qRedes = db.collection('redes'); if (empresaAlvo) qRedes = qRedes.where("empresaId", "==", String(empresaAlvo));
            const redesSnap = await qRedes.get();
            const mapaNomesRedes = {};
            redesSnap.forEach(r => { mapaNomesRedes[r.id] = r.data().nome; });

            let q = db.collection('lojas'); if (empresaAlvo) q = q.where("empresaId", "==", String(empresaAlvo));
            q.onSnapshot(snap => { 
                cT.innerHTML = ''; if(snap.empty) { cT.innerHTML = '<tr><td colspan="7" style="text-align:center;">Vazio.</td></tr>'; return; } 
                snap.forEach(doc => { 
                    const d = doc.data(); 
                    const nomeRede = mapaNomesRedes[d.redeId] || '';
                    const cS = d.status === 'bloqueado' ? '#ef4444' : '#10b981'; const badge = `<span class="status-badge" style="background:${cS}20;color:${cS}; border-color:${cS}40;">${d.status==='bloqueado'?'SUSPENSO':'ATIVO'}</span>`;
                    cT.innerHTML += `<tr><td>${d.codigo || '-'}</td><td style="font-weight:700; color:var(--cor-titulo);">${d.nome || '-'} <span style="display:none;">${nomeRede}</span></td><td>${d.cnpj || '-'}</td><td>${d.cidade || '-'}</td><td>${d.bairro || '-'}</td><td>${badge}</td><td style="white-space: nowrap;"><button class="btn-icon" style="border:none; color:var(--f1a-blue);" onclick="abrirModalCadastro('${doc.id}', 'lojas')" title="Editar"><span class="material-symbols-rounded">edit</span></button></td></tr>`; 
                }); 
                filtrarTabela(); 
            });
            return;
        }

    } catch (e) { cT.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">Falha de comunicação: ${e.message}</td></tr>`; }
}
