// =========================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE (PRODUÇÃO)
// =========================================================
const firebaseConfig = {
    apiKey: "AIzaSyBZdBXKCfp3JboXC95Hbt7H-Tp7ezXOTUE",
    authDomain: "projeto-ceocard.firebaseapp.com",
    projectId: "projeto-ceocard",
    storageBucket: "projeto-ceocard.firebasestorage.app",
    messagingSenderId: "322820070422",
    appId: "1:322820070422:web:86c81c58bb930891a86937",
    measurementId: "G-WNSJH7F7R5"
};

// Evita inicialização duplicada do app
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}

const db = firebase.firestore();
const auth = firebase.auth();

// Identificador exclusivo deste módulo no Firestore
const MODULO_ID = "modulo_financeiro";

// =========================================================
// 2. VERIFICAÇÃO DE SESSÃO ATIVA
// =========================================================
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado no projeto-ceocard, vamos verificar as permissões
        verificarAcesso(user);
    } else {
        // Se a sessão expirou ou não existe, volta para a raiz (Login)
        window.location.href = "../index.html";
    }
});

// =========================================================
// 3. MIDDLEWARE DE ACESSO (O MOTOR DE SEGURANÇA - MODO DEBUG)
// =========================================================
async function verificarAcesso(user) {
    try {
        console.log("Iniciando verificação de acesso para:", user.uid);
        const doc = await db.collection("usuarios").doc(user.uid).get();
        
        if (!doc.exists) {
            alert("ERRO F1A: Seu documento de usuário não foi encontrado na coleção 'usuarios' do Firestore.");
            window.location.href = "../index.html";
            return;
        }

        const dadosUsuario = doc.data();
        console.log("Dados do usuário lidos do banco:", dadosUsuario);

        if (dadosUsuario.status === 'bloqueado') {
            alert("Acesso Suspenso.");
            window.location.href = "../index.html";
            return;
        }

        // A REGRA QUE ESTÁ TE EXPULSANDO PROVAVELMENTE É ESTA AQUI:
        if (!dadosUsuario.modulosAcesso || !dadosUsuario.modulosAcesso.includes(MODULO_ID)) {
            alert(`ACESSO NEGADO: O seu usuário não possui a string "${MODULO_ID}" no array 'modulosAcesso' do Firestore.`);
            window.location.href = "../lobby.html";
            return;
        }

        // Se passou...
        const navUser = document.getElementById('user-info');
        if(navUser) {
            navUser.innerText = `Olá, ${dadosUsuario.nome || 'Usuário'}`;
        }

        carregarDadosFinanceiros(dadosUsuario);
        
    } catch (error) {
        alert("ERRO DE BANCO DE DADOS: " + error.message + "\n\n(Provavelmente Regras de Segurança do Firestore bloqueando a leitura).");
        console.error(error);
        window.location.href = "../lobby.html"; 
    }
}

// =========================================================
// 4. LÓGICA DE DADOS (DASHBOARD E RELATÓRIOS)
// =========================================================
function carregarDadosFinanceiros(dadosUsuario) {
    // Aqui extraímos a hierarquia do usuário para futuras queries reais
    const perfil = dadosUsuario.perfil; 
    const empresaId = dadosUsuario.empresaId;
    const redeId = dadosUsuario.redeId;
    const lojaId = dadosUsuario.lojaId;

    console.log(`Buscando dados financeiros -> Papel: ${perfil}`);

    // Preenchendo os KPIs com dados simulados para teste de layout
    document.getElementById('total-vendas').innerText = "R$ 150.400,00";
    document.getElementById('inadimplencia').innerText = "4,5%";
    document.getElementById('a-receber').innerText = "R$ 38.200,00";
    document.getElementById('juros-total').innerText = "R$ 1.150,00";

    // Injetando uma linha falsa na tabela para validação visual do repasse
    const tabelaHTML = `
        <tr>
            <td>Loja Centro 01</td>
            <td>R$ 50.000,00</td>
            <td>R$ 2.500,00</td>
            <td><strong>R$ 47.500,00</strong></td>
            <td style="color: #10b981;">Liberado</td>
        </tr>
    `;
    
    const listaFinanceira = document.getElementById('lista-financeira');
    if(listaFinanceira) {
        listaFinanceira.innerHTML = tabelaHTML;
    }
}