// ==========================================
// CORE F1A: AUTENTICAÇÃO E SEGURANÇA GERAL
// ==========================================

const firebaseConfig = {
    apiKey: "AIzaSyBZdBXKCfp3JboXC95Hbt7H-Tp7ezXOTUE",
    authDomain: "projeto-ceocard.firebaseapp.com",
    projectId: "projeto-ceocard",
    storageBucket: "projeto-ceocard.appspot.com" // <-- ESTA LINHA RESOLVE O ERRO
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let usuarioLogado = null;
let dadosUsuarioLogado = null;
let perfilUsuario = null;

firebase.auth().onAuthStateChanged(async (user) => {
    const isTelaLogin = window.location.pathname.toLowerCase().endsWith('index.html') || window.location.pathname === '/';
    
    if (user) {
        if (isTelaLogin) return; // O login.js cuida do roteamento se estiver na tela de login

        try {
            const docRef = await db.collection("usuarios").doc(user.uid).get();
            if (!docRef.exists) { sair(); return; }

            dadosUsuarioLogado = docRef.data();
            usuarioLogado = user;
            perfilUsuario = String(dadosUsuarioLogado.perfil || '').toLowerCase();

            // ========================================================================
            // 🛡️ VACINA DE RETROCOMPATIBILIDADE (Transforma Strings antigas em Arrays)
            // Isso impede que as telas novas (Lobby, etc) travem com dados velhos.
            // ========================================================================
            if (dadosUsuarioLogado.empresaId && !Array.isArray(dadosUsuarioLogado.empresaId)) {
                dadosUsuarioLogado.empresaId = [dadosUsuarioLogado.empresaId];
            } else if (!dadosUsuarioLogado.empresaId) {
                dadosUsuarioLogado.empresaId = [];
            }

            if (dadosUsuarioLogado.redeId && !Array.isArray(dadosUsuarioLogado.redeId)) {
                dadosUsuarioLogado.redeId = [dadosUsuarioLogado.redeId];
            } else if (!dadosUsuarioLogado.redeId) {
                dadosUsuarioLogado.redeId = [];
            }

            if (dadosUsuarioLogado.lojaId && !Array.isArray(dadosUsuarioLogado.lojaId)) {
                dadosUsuarioLogado.lojaId = [dadosUsuarioLogado.lojaId];
            } else if (!dadosUsuarioLogado.lojaId) {
                dadosUsuarioLogado.lojaId = [];
            }
            // ========================================================================

            // 🛑 GUILHOTINAS DE BLOQUEIO
            if (dadosUsuarioLogado.status === 'bloqueado') {
                alert("⛔ LICENÇA REVOGADA: O seu acesso foi desativado pelo administrador da sua empresa.");
                sair(); return;
            }
            
            // Valida a Empresa Principal (A primeira do array) para checar se está inadimplente
            if (perfilUsuario !== 'master' && dadosUsuarioLogado.empresaId.length > 0) {
                const empRef = await db.collection("empresas").doc(dadosUsuarioLogado.empresaId[0]).get();
                if (empRef.exists) {
                    const statusEmpresa = empRef.data().status || 'ativa';
                    if (statusEmpresa === 'bloqueada' || statusEmpresa === 'cancelada') {
                        alert("⛔ SISTEMA SUSPENSO: O painel da sua empresa encontra-se temporariamente indisponível.");
                        sair(); return;
                    }
                }
            }

            // 🔒 ROUTER GUARD (Bloqueio de URL)
            if (perfilUsuario !== 'master') {
                const urlAtual = window.location.pathname.toLowerCase();
                const modulos = dadosUsuarioLogado.modulosAcesso || [];
                const ferramentas = dadosUsuarioLogado.ferramentasAcesso || [];
                let acessoNegado = false;

                if (urlAtual.includes('modulo-financeiro') && !modulos.includes('financeiro')) acessoNegado = true;
                if (urlAtual.includes('modulo-pagamentos') && !modulos.includes('propostas')) acessoNegado = true;
                if (urlAtual.includes('modulo-contratos') && !modulos.includes('contratos')) acessoNegado = true;
                if (urlAtual.includes('modulo-visitas') && !modulos.includes('visitas')) acessoNegado = true;
                if (urlAtual.includes('cadastros.html') && !ferramentas.includes('equipe')) acessoNegado = true;
                if (urlAtual.includes('dashboard.html') && !ferramentas.includes('executivo')) acessoNegado = true;

                if (acessoNegado) {
                    alert("⛔ ACESSO NEGADO: Você não possui a licença necessária para abrir este módulo.");
                    const rotaFuga = urlAtual.includes('modulo-') ? '../lobby.html' : 'lobby.html';
                    window.location.replace(rotaFuga); 
                    return;
                }
            }

            // ATUALIZA O NOME NO CABEÇALHO
            atualizarInterfaceGlobal();

            // LIBERA A TELA
            const corpo = document.getElementById('corpoPagina');
            if(corpo) corpo.style.display = 'flex'; 

            // GATILHOS PARA CARREGAR OS DADOS (Isso faz os cards do Master aparecerem)
            if (typeof carregarEmpresasNoSelect === 'function') carregarEmpresasNoSelect(); 
            if (typeof carregarPropostas === 'function') carregarPropostas(); 
            if (typeof posAuthCallback === 'function') posAuthCallback(); 

        } catch (error) {
            console.error("Erro na autenticação:", error);
            alert("Erro ao carregar dados. Atualize a página.");
        }
    } else {
        if (!isTelaLogin) {
            const urlAtual = window.location.pathname.toLowerCase();
            const rotaLogin = urlAtual.includes('modulo-') ? '../index.html' : 'index.html';
            window.location.replace(rotaLogin);
        }
    }
});

function atualizarInterfaceGlobal() {
    const elNome = document.getElementById("nomeUsuario");
    const elIniciais = document.getElementById("iniciaisUsuario");
    const elCargo = document.getElementById("cargoUsuario");
    
    const nomeExibicao = dadosUsuarioLogado.nome || "Usuário F1A";
    
    if (elNome) elNome.innerText = nomeExibicao;
    if (elIniciais) elIniciais.innerText = nomeExibicao.substring(0, 2).toUpperCase();
    if (elCargo) {
        if (perfilUsuario === 'master') elCargo.innerText = 'F1A MASTER';
        else if (perfilUsuario === 'admin') elCargo.innerText = 'ADMINISTRADOR';
        else if (perfilUsuario === 'gerente') elCargo.innerText = 'GERENTE';
        else elCargo.innerText = 'VENDEDOR';
    }
}

window.sair = function() {
    firebase.auth().signOut().then(() => {
        sessionStorage.clear(); 
        const urlAtual = window.location.pathname.toLowerCase();
        const rotaLogin = urlAtual.includes('modulo-') ? '../index.html' : 'index.html';
        window.location.replace(rotaLogin);
    });
}

// ==========================================
// GESTÃO GLOBAL DE TEMA (DARK MODE)
// ==========================================
window.aplicarTemaGlobal = function() {
    const isDark = localStorage.getItem("temaEscuro") === "true";
    document.body.classList.toggle("dark-mode", isDark);
    
    // Atualiza o ícone de qualquer botão de tema que exista na tela
    const botoesTema = [document.getElementById("btnTemaGlobal"), document.getElementById("btnTema")];
    botoesTema.forEach(btn => {
        if (btn) {
            btn.innerHTML = isDark ? '<span class="material-symbols-rounded" style="color: var(--cor-texto);">light_mode</span>' : '<span class="material-symbols-rounded" style="color: var(--cor-texto);">dark_mode</span>';
        }
    });

    // Caminho inteligente (sabe se está na raiz ou dentro de um módulo)
    const prefixoCaminho = window.location.pathname.includes('modulo-') ? '../assets/' : 'assets/';

    // REGRA: Apenas a logo do Lobby muda com o tema. Menu e Header são sempre azuis escuros.
    const logoLobby = document.getElementById("logoLobby");
    if (logoLobby) {
        logoLobby.src = isDark ? prefixoCaminho + "logo_f1a_2.png" : prefixoCaminho + "logo_f1a.png"; 
    }
};

window.alternarTemaGlobal = function() {
    const isDark = !document.body.classList.contains("dark-mode");
    localStorage.setItem("temaEscuro", isDark);
    aplicarTemaGlobal();
};
window.alternarTema = window.alternarTemaGlobal;

// Aplica o tema na hora que o sistema carrega
aplicarTemaGlobal();


// ==========================================
// CONTROLE GLOBAL DO MENU LATERAL (SIDEBAR)
// ==========================================
window.toggleSidebarF1A = function() {
    const sidebar = document.getElementById('sidebarF1A');
    if (!sidebar) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('aberta');
        const overlay = document.getElementById('overlayMobile');
        if (overlay) overlay.classList.toggle('ativa');
    } else { 
        sidebar.classList.toggle('retraida'); 
    }
};

// Listener para clicar no "Espaço Vazio" do Menu Lateral
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebarF1A');
    if (sidebar) {
        sidebar.addEventListener('click', function(event) {
            // Se o usuário clicou exatamente na sidebar ou no container de links (e não em um botão/link específico)
            if (event.target.id === 'sidebarF1A' || event.target.classList.contains('nav-links')) {
                window.toggleSidebarF1A();
            }
        });
    }
});