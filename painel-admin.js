// ==========================================
// PAINEL DE GESTÃO DO CLIENTE SAAS (painel-admin.js)
// ==========================================

// Inicialização segura do Firebase Secundário
let secondaryAppAdmin; 
try { 
    secondaryAppAdmin = firebase.app("SecondaryAdmin"); 
} catch (e) { 
    secondaryAppAdmin = firebase.initializeApp({ 
        apiKey: "AIzaSyBZdBXKCfp3JboXC95Hbt7H-Tp7ezXOTUE", 
        authDomain: "projeto-ceocard.firebaseapp.com", 
        projectId: "projeto-ceocard" 
    }, "SecondaryAdmin"); 
}

let limitesDaEmpresa = { admin: 0, gerente: 0, vendedor: 0 };
let contagemAtual = { admin: 0, gerente: 0, vendedor: 0 };

let listaGerentes = [];
let listaRedes = [];
let listaLojas = [];
let listaTodosUsuarios = [];
let usuarioEdicaoIdAtual = null;

// ==========================================
// GATILHO OFICIAL (Acionado pelo core.js)
// ==========================================
window.posAuthCallback = async function() {
    // Validação de Segurança (Apenas Admins do SaaS podem acessar)
    if (perfilUsuario !== 'admin') {
        if (typeof mostrarToast === 'function') mostrarToast("Acesso restrito a Administradores.", "erro");
        else alert("Acesso restrito a Administradores.");
        
        setTimeout(() => sair(), 2000);
        return;
    }

    // A sessão é válida, libera a tela
    document.getElementById("corpoPagina").style.display = "block";
    iniciarListenersDaCascata();
};

// ==========================================
// 3. LISTENERS DO BANCO DE DADOS EM TEMPO REAL
// ==========================================
function iniciarListenersDaCascata() {
    // Escuta a Empresa
    db.collection("empresas").doc(dadosUsuarioLogado.empresaId).onSnapshot(doc => {
        if (doc.exists) {
            const elEmpresa = document.getElementById("nomeEmpresaHeader");
            if (elEmpresa) elEmpresa.innerText = doc.data().nomeFantasia;
            limitesDaEmpresa = doc.data().limites || { admin: 0, gerente: 0, vendedor: 0 };
            atualizarDashboardLicencas();
        }
    });

    // Escuta os Usuários da Empresa
    db.collection("usuarios").where("empresaId", "==", dadosUsuarioLogado.empresaId).onSnapshot(snap => {
        listaTodosUsuarios = []; listaGerentes = []; contagemAtual = { admin: 0, gerente: 0, vendedor: 0 };
        snap.forEach(doc => {
            const u = { id: doc.id, ...doc.data() };
            listaTodosUsuarios.push(u);
            if (u.perfil === 'admin') contagemAtual.admin++;
            if (u.perfil === 'gerente') { contagemAtual.gerente++; listaGerentes.push(u); }
            if (u.perfil === 'vendedor') contagemAtual.vendedor++;
        });
        atualizarDashboardLicencas(); renderizarTabelaEquipe();
    });

    // Escuta as Redes
    db.collection("redes").where("empresaId", "==", dadosUsuarioLogado.empresaId).onSnapshot(snap => {
        listaRedes = []; snap.forEach(doc => listaRedes.push({ id: doc.id, ...doc.data() })); renderizarTabelaEquipe();
    });

    // Escuta as Lojas
    db.collection("lojas").where("empresaId", "==", dadosUsuarioLogado.empresaId).onSnapshot(snap => {
        listaLojas = []; snap.forEach(doc => listaLojas.push({ id: doc.id, ...doc.data() })); renderizarTabelaEquipe();
    });
}

function atualizarDashboardLicencas() {
    const elAdmins = document.getElementById("usoAdmins");
    const elGerentes = document.getElementById("usoGerentes");
    const elVendedores = document.getElementById("usoVendedores");

    if(elAdmins) elAdmins.innerText = `${contagemAtual.admin} / ${limitesDaEmpresa.admin}`;
    if(elGerentes) elGerentes.innerText = `${contagemAtual.gerente} / ${limitesDaEmpresa.gerente}`;
    if(elVendedores) elVendedores.innerText = `${contagemAtual.vendedor} / ${limitesDaEmpresa.vendedor}`;
}

// ==========================================
// 4. RENDERIZAÇÃO E ORGANIZAÇÃO DA TABELA
// ==========================================
function renderizarTabelaEquipe() {
    const tbody = document.getElementById("listaEquipe");
    if(!tbody) return;
    
    let html = "";

    if (listaTodosUsuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">Nenhum colaborador encontrado.</td></tr>'; return;
    }

    // ORDENAÇÃO: Admin primeiro(1), Gerente(2), Vendedor(3)
    const ordem = { 'admin': 1, 'gerente': 2, 'vendedor': 3 };
    listaTodosUsuarios.sort((a, b) => ordem[a.perfil] - ordem[b.perfil]);

    listaTodosUsuarios.forEach(u => {
        const status = u.status === 'bloqueado' ? '<span style="color:red; font-weight:bold;">BLOQUEADO</span>' : '<span style="color:green; font-weight:bold;">ATIVO</span>';
        const nomeExibicao = u.nome ? u.nome.toUpperCase() : "AGUARDANDO 1º ACESSO";
        const emailExibicao = u.email || "E-mail não registrado";
        
        let vinculo = "ADMINISTRAÇÃO GERAL";
        if (u.perfil === 'gerente') {
            const redesDoGerente = listaRedes.filter(r => r.gerenteId === u.id).map(r => r.nome);
            vinculo = redesDoGerente.length > 0 ? `Redes: ${redesDoGerente.join(', ')}` : '<span style="color:#f59e0b;">Sem Rede</span>';
        } else if (u.perfil === 'vendedor') {
            const loja = listaLojas.find(l => l.id === u.lojaId);
            vinculo = loja ? `Loja: ${loja.nome}` : '<span style="color:#ef4444;">Sem Loja</span>';
        }

        html += `
            <tr>
                <td><strong>${nomeExibicao}</strong><br><span style="font-size: 11px; color: var(--cor-texto);">${emailExibicao}</span></td>
                <td><span style="background: var(--bg-body); padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; text-transform: uppercase;">${u.perfil}</span></td>
                <td style="font-size: 12px;"><strong>${vinculo}</strong></td>
                <td>${status}</td>
                <td>
                    <button class="btn-icon" style="color: var(--cor-primaria); background: var(--cor-primaria-20); padding: 5px; border-radius: 4px;" onclick="abrirEdicao('${u.id}', '${nomeExibicao.replace(/'/g, "\\'")}', '${u.status || 'ativo'}')" title="Editar Conta">
                        <span class="material-symbols-rounded" style="font-size: 18px;">edit</span>
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==========================================
// 5. ABERTURA DE MODAIS
// ==========================================
function fecharModais() { document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("escondido")); }

window.abrirModalAdmin = function() {
    if (contagemAtual.admin >= limitesDaEmpresa.admin) { if(typeof mostrarToast === 'function') mostrarToast("Limite de Admins Atingido.", "erro"); else alert("Limite de Admins Atingido."); return; }
    document.getElementById("modalNovoAdmin").classList.remove("escondido");
}
window.abrirModalGerente = function() {
    if (contagemAtual.gerente >= limitesDaEmpresa.gerente) { if(typeof mostrarToast === 'function') mostrarToast("Limite de Gerentes Atingido.", "erro"); else alert("Limite de Gerentes Atingido."); return; }
    document.getElementById("modalNovoGerente").classList.remove("escondido");
}
window.abrirModalRede = function() {
    if (listaGerentes.length === 0) { if(typeof mostrarToast === 'function') mostrarToast("Crie ao menos um GERENTE antes.", "erro"); else alert("Crie ao menos um GERENTE antes."); return; }
    const select = document.getElementById("redeGerenteId"); select.innerHTML = "";
    listaGerentes.forEach(g => { select.innerHTML += `<option value="${g.id}">${g.nome}</option>`; });
    document.getElementById("modalNovaRede").classList.remove("escondido");
}
window.abrirModalLoja = function() {
    if (listaRedes.length === 0) { if(typeof mostrarToast === 'function') mostrarToast("Crie ao menos uma REDE antes.", "erro"); else alert("Crie ao menos uma REDE antes."); return; }
    const select = document.getElementById("lojaRedeId"); select.innerHTML = "";
    listaRedes.forEach(r => { select.innerHTML += `<option value="${r.id}">${r.nome}</option>`; });
    document.getElementById("modalNovaLoja").classList.remove("escondido");
}
window.abrirModalVendedor = function() {
    if (contagemAtual.vendedor >= limitesDaEmpresa.vendedor) { if(typeof mostrarToast === 'function') mostrarToast("Limite de Vendedores Atingido.", "erro"); else alert("Limite de Vendedores Atingido."); return; }
    if (listaLojas.length === 0) { if(typeof mostrarToast === 'function') mostrarToast("Crie ao menos uma LOJA antes.", "erro"); else alert("Crie ao menos uma LOJA antes."); return; }
    const select = document.getElementById("vendLojaId"); select.innerHTML = "";
    listaLojas.forEach(l => { select.innerHTML += `<option value="${l.id}">${l.nome}</option>`; });
    document.getElementById("modalNovoVendedor").classList.remove("escondido");
}

window.abrirEdicao = function(id, nome, status) {
    usuarioEdicaoIdAtual = id;
    document.getElementById("editUsuarioNome").value = nome === "AGUARDANDO 1º ACESSO" ? "" : nome;
    document.getElementById("editUsuarioStatus").value = status;
    document.getElementById("modalEditarUsuario").classList.remove("escondido");
}

window.fecharModalBase = fecharModais; // Atalho caso o HTML chame assim

// ==========================================
// 6. FUNÇÕES DE GRAVAÇÃO (FIREBASE & AUTH)
// ==========================================
async function criarUsuarioAuthAdmin(email, senha, dados) {
    const credencial = await secondaryAppAdmin.auth().createUserWithEmailAndPassword(email, senha);
    await db.collection("usuarios").doc(credencial.user.uid).set({
        ...dados, email: email, empresaId: dadosUsuarioLogado.empresaId, status: 'ativo', criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    await secondaryAppAdmin.auth().signOut();
}

window.salvarAdmin = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarAdm"); btn.disabled = true; btn.innerText = "Criando...";
    try {
        await criarUsuarioAuthAdmin(document.getElementById("admEmail").value.trim(), document.getElementById("admSenha").value.trim(), { nome: document.getElementById("admNome").value.trim().toUpperCase(), perfil: "admin" });
        if(typeof mostrarToast === 'function') mostrarToast("Administrador criado com sucesso!", "sucesso");
        fecharModais(); document.getElementById("modalNovoAdmin").querySelector("form").reset();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast(err.message, "erro"); else alert(err.message); } finally { btn.disabled = false; btn.innerText = "Criar Administrador"; }
}

window.salvarGerente = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarGer"); btn.disabled = true; btn.innerText = "Criando...";
    try {
        await criarUsuarioAuthAdmin(document.getElementById("gerEmail").value.trim(), document.getElementById("gerSenha").value.trim(), { nome: document.getElementById("gerNome").value.trim().toUpperCase(), perfil: "gerente" });
        if(typeof mostrarToast === 'function') mostrarToast("Gerente criado com sucesso!", "sucesso");
        fecharModais(); document.getElementById("modalNovoGerente").querySelector("form").reset();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast(err.message, "erro"); else alert(err.message); } finally { btn.disabled = false; btn.innerText = "Criar Gerente"; }
}

window.salvarRede = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarRede"); btn.disabled = true; btn.innerText = "Salvando...";
    try {
        await db.collection("redes").add({ nome: document.getElementById("redeNome").value.trim().toUpperCase(), gerenteId: document.getElementById("redeGerenteId").value, empresaId: dadosUsuarioLogado.empresaId, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
        if(typeof mostrarToast === 'function') mostrarToast("Rede salva com sucesso!", "sucesso");
        fecharModais(); document.getElementById("modalNovaRede").querySelector("form").reset();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast(err.message, "erro"); else alert(err.message); } finally { btn.disabled = false; btn.innerText = "Criar Rede"; }
}

window.salvarLoja = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarLoja"); btn.disabled = true; btn.innerText = "Salvando...";
    try {
        await db.collection("lojas").add({ nome: document.getElementById("lojaNome").value.trim().toUpperCase(), redeId: document.getElementById("lojaRedeId").value, empresaId: dadosUsuarioLogado.empresaId, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
        if(typeof mostrarToast === 'function') mostrarToast("Loja salva com sucesso!", "sucesso");
        fecharModais(); document.getElementById("modalNovaLoja").querySelector("form").reset();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast(err.message, "erro"); else alert(err.message); } finally { btn.disabled = false; btn.innerText = "Criar Loja"; }
}

window.salvarVendedor = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarVend"); btn.disabled = true; btn.innerText = "Criando...";
    try {
        await criarUsuarioAuthAdmin(document.getElementById("vendEmail").value.trim(), document.getElementById("vendSenha").value.trim(), { nome: document.getElementById("vendNome").value.trim().toUpperCase(), perfil: "vendedor", lojaId: document.getElementById("vendLojaId").value });
        if(typeof mostrarToast === 'function') mostrarToast("Vendedor criado com sucesso!", "sucesso");
        fecharModais(); document.getElementById("modalNovoVendedor").querySelector("form").reset();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast(err.message, "erro"); else alert(err.message); } finally { btn.disabled = false; btn.innerText = "Criar Vendedor"; }
}

window.salvarEdicaoUsuario = async function(e) {
    e.preventDefault(); const btn = document.getElementById("btnSalvarEdicao"); btn.disabled = true; btn.innerText = "Salvando...";
    try {
        await db.collection("usuarios").doc(usuarioEdicaoIdAtual).update({
            nome: document.getElementById("editUsuarioNome").value.trim().toUpperCase(),
            status: document.getElementById("editUsuarioStatus").value
        });
        if(typeof mostrarToast === 'function') mostrarToast("Edição salva com sucesso!", "sucesso");
        fecharModais();
    } catch (err) { if(typeof mostrarToast === 'function') mostrarToast("Erro ao editar: " + err.message, "erro"); else alert("Erro ao editar: " + err.message); } finally { btn.disabled = false; btn.innerText = "Atualizar Dados"; }
}