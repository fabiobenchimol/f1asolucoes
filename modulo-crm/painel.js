// ============================================================================
// MÓDULO: CRM & MENSAGEIRO
// ARQUIVO: painel.js
// ============================================================================

let listaRemessas = [];
let unsubscribeRemessas = null;

window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    if (dadosUsuarioLogado && dadosUsuarioLogado.nome) {
        const nome = dadosUsuarioLogado.nome;
        const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuario";
        const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0] || "").join("").toUpperCase() || "--";
        document.getElementById("nomeUsuario").innerText = nome;
        document.getElementById("iniciaisUsuario").innerText = iniciais;
        const cargo = document.getElementById("cargoUsuario");
        if (cargo) cargo.innerText = String(perfil).toUpperCase();
    }
    iniciarListenerRemessas();
};

function iniciarListenerRemessas() {
    if (unsubscribeRemessas) unsubscribeRemessas();
    unsubscribeRemessas = db.collection("crm_remessas")
        .where("usuarioId", "==", usuarioLogado.uid)
        .orderBy("criadoEm", "desc")
        .onSnapshot(snap => {
            listaRemessas = [];
            let totalDisparos = 0, totalAcordos = 0, remessasPendentes = 0;
            snap.forEach(doc => {
                const r = doc.data();
                listaRemessas.push({ id: doc.id, ...r });
                totalDisparos += (r.totalProcessados || 0);
                totalAcordos += (r.totalAcordos || 0);
                if (r.status !== 'concluida') remessasPendentes++;
            });
            document.getElementById('dashTotalDisparos').innerText = totalDisparos;
            document.getElementById('dashAcordos').innerText = totalAcordos;
            document.getElementById('dashRemessasPendentes').innerText = remessasPendentes;
            renderizarTabelaRemessas();
        });
}

function renderizarTabelaRemessas() {
    const tbody = document.getElementById('tabelaRemessasBody');
    if (listaRemessas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--cor-texto);">Nenhuma remessa encontrada.</td></tr>`;
        return;
    }

    let html = "";
    listaRemessas.forEach(remessa => {
        let dataStr = "--/--/----";
        if (remessa.criadoEm) {
            const d = remessa.criadoEm.toDate();
            dataStr = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }

        let corTipo = remessa.tipo === 'cobranca' ? '#ef4444' : 'var(--premium-gold)';
        let bgTipo = remessa.tipo === 'cobranca' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 175, 55, 0.1)';
        let corStatus = remessa.status === 'concluida' ? 'var(--f1a-blue)' : '#10b981';
        let bgStatus = remessa.status === 'concluida' ? 'rgba(0, 71, 255, 0.1)' : 'rgba(16, 185, 129, 0.1)';
        const proc = remessa.totalProcessados || 0, tot = remessa.totalClientes || 1;
        const porc = Math.round((proc / tot) * 100);

        html += `
            <tr class="linha-remessa" onclick="abrirRemessa('${remessa.id}')">
                <td style="color: var(--cor-texto); font-size: 13px;">${dataStr}</td>
                <td style="font-weight: 700; color: var(--cor-titulo);">${remessa.nome}</td>
                <td><span style="background: ${bgTipo}; color: ${corTipo}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase;">${remessa.tipo === 'cobranca' ? 'Cobrança' : 'Lembrete'}</span></td>
                <td style="text-align: center;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                        <span style="font-size: 12px; font-weight: 700; color: var(--cor-titulo);">${proc} / ${tot}</span>
                        <div style="width: 100%; max-width: 120px; height: 6px; background: var(--borda); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${porc}%; height: 100%; background: var(--f1a-blue);"></div>
                        </div>
                    </div>
                </td>
                <td style="text-align: center;"><span style="background: ${bgStatus}; color: ${corStatus}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase;">${remessa.status === 'concluida' ? 'Concluída' : 'Em Andamento'}</span></td>
                
                <td style="text-align: center;" class="menu-pontinhos-wrapper" onclick="event.stopPropagation()">
                    <button class="btn-icon" onclick="toggleMenuRemessa(event, '${remessa.id}')" style="background: transparent;">
                        <span class="material-symbols-rounded" style="color: var(--cor-texto);">more_vert</span>
                    </button>
                    <div id="menu_rem_${remessa.id}" class="menu-perfil-flutuante remessa-menu escondido" style="right: 20px; top: 100%; z-index: 100;">
                        <a href="#" onclick="abrirRemessa('${remessa.id}')" class="dropdown-item"><span class="material-symbols-rounded">open_in_new</span> Abrir</a>
                        <a href="#" onclick="editarRemessa(event, '${remessa.id}')" class="dropdown-item"><span class="material-symbols-rounded">edit</span> Renomear</a>
                        <a href="#" onclick="excluirRemessa(event, '${remessa.id}')" class="dropdown-item danger"><span class="material-symbols-rounded">delete</span> Excluir</a>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

window.abrirRemessa = function(idRemessa) { window.location.href = `disparador.html?id=${idRemessa}`; }

window.toggleMenuRemessa = function(event, id) {
    event.stopPropagation();
    document.querySelectorAll('.remessa-menu').forEach(m => { if(m.id !== 'menu_rem_' + id) m.classList.add('escondido'); });
    const menu = document.getElementById('menu_rem_' + id);
    if(menu) menu.classList.toggle('escondido');
}

window.editarRemessa = async function(event, id) {
    event.stopPropagation();
    const remessa = listaRemessas.find(r => r.id === id);
    const novoNome = prompt("Digite o novo nome para a remessa:", remessa.nome);
    if(!novoNome || novoNome.trim() === "") return;
    await db.collection("crm_remessas").doc(id).update({ nome: novoNome.trim(), atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    toggleMenuRemessa(event, id);
}

window.excluirRemessa = async function(event, id) {
    event.stopPropagation();
    if(!confirm("Deseja realmente excluir esta remessa? O histórico de mensagens será perdido.")) return;
    await db.collection("crm_remessas").doc(id).delete();
    toggleMenuRemessa(event, id);
}

// Fechar menus flutuantes ao clicar fora
document.addEventListener('click', function() {
    document.querySelectorAll('.menu-perfil-flutuante').forEach(m => m.classList.add('escondido'));
});

window.toggleDropdownPerfil = function(event) {
    event.stopPropagation();
    const menu = document.getElementById('dropdownPerfilLocal');
    if (menu) menu.classList.toggle('escondido');
};