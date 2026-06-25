// ==========================================
// UI F1A - COMPONENTES GLOBAIS DE INTERFACE
// ==========================================

// 1. DROPDOWN DE AÇÕES DAS TABELAS
window.toggleDropdownF1A = function(event, id) {
    event.stopPropagation();
    const drop = document.getElementById('drop-' + id);
    if (!drop) return;

    const isAlreadyOpen = drop.classList.contains('show-dropdown-f1a');
    
    // Fecha todos os outros dropdowns que estiverem abertos
    const allDropdowns = document.getElementsByClassName("dropdown-content-f1a");
    for (let i = 0; i < allDropdowns.length; i++) { 
        allDropdowns[i].classList.remove('show-dropdown-f1a'); 
    }
    
    // Abre apenas o que foi clicado (se não estava aberto)
    if (!isAlreadyOpen) { 
        drop.classList.add("show-dropdown-f1a"); 
    }
};

// Fecha o dropdown se o utilizador clicar em qualquer outro lugar da tela
document.addEventListener('click', function(event) {
    if (!event.target.matches('.dropbtn-f1a') && !event.target.closest('.dropbtn-f1a')) {
        const dropdowns = document.getElementsByClassName("dropdown-content-f1a");
        for (let i = 0; i < dropdowns.length; i++) {
            if (dropdowns[i].classList.contains('show-dropdown-f1a')) {
                dropdowns[i].classList.remove('show-dropdown-f1a');
            }
        }
    }
});

// 2. ALTERAR NOME DE EXIBIÇÃO (MODAL DO PERFIL)
window.alterarNomeExibicao = async function() {
    const novoNome = prompt("Digite como você gostaria de ser chamado(a):");
    if (!novoNome || novoNome.trim() === "") return;
    
    try {
        // Usa as variáveis globais 'usuarioLogado' e 'db' do core.js
        if (usuarioLogado) {
            await db.collection("usuarios").doc(usuarioLogado.uid).update({ 
                nome: novoNome.trim().toUpperCase() 
            });
            
            if (typeof mostrarToast === 'function') {
                mostrarToast("Nome atualizado com sucesso!", "sucesso");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert("✅ Nome atualizado com sucesso!");
                window.location.reload();
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar o nome:", error);
        if (typeof mostrarToast === 'function') {
            mostrarToast("Erro ao atualizar o nome.", "erro");
        } else {
            alert("Erro ao atualizar o nome.");
        }
    }
}