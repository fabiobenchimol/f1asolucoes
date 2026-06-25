// ============================================================================
// MÓDULO: CRM & MENSAGEIRO (WHATSAPP)
// ARQUIVO: disparador.js
// ============================================================================

let remessaId = null;
let remessaDados = null;
let clienteAtualIndex = -1;
let statusSelecionado = null;

window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    if (dadosUsuarioLogado && dadosUsuarioLogado.nome) {
        const nome = dadosUsuarioLogado.nome;
        const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuario";
        const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0] || "").join("").toUpperCase() || "--";
        const nomeEl = document.getElementById("nomeUsuario");
        const iniciaisEl = document.getElementById("iniciaisUsuario");
        const cargoEl = document.getElementById("cargoUsuario");
        if (nomeEl) nomeEl.innerText = nome;
        if (iniciaisEl) iniciaisEl.innerText = iniciais;
        if (cargoEl) cargoEl.innerText = String(perfil).toUpperCase();
    }
    const urlParams = new URLSearchParams(window.location.search);
    remessaId = urlParams.get('id');

    if (!remessaId) { window.location.href = 'painel.html'; return; }
    carregarRemessa();
};

function carregarRemessa() {
    db.collection("crm_remessas").doc(remessaId).onSnapshot(doc => {
        if (!doc.exists) { window.location.href = 'painel.html'; return; }
        remessaDados = doc.data();
        
        // AJUSTE: Esconde o botão se o status já for concluído
        const btnConcluir = document.getElementById('btnConcluirRemessa');
        if (btnConcluir) {
            if (remessaDados.status === 'concluida') {
                btnConcluir.style.display = 'none';
            } else {
                btnConcluir.style.display = 'flex';
            }
        }

        document.getElementById('lblNomeRemessa').innerText = remessaDados.nome;
        document.getElementById('lblModeloUsado').innerText = remessaDados.modeloUsado || 'Personalizado';
        atualizarProgresso();
        renderizarFila();
        if (clienteAtualIndex === -1) procurarProximoPendente();
        else selecionarCliente(clienteAtualIndex);
    });
}

function atualizarProgresso() {
    const fila = remessaDados.filaEnvios || [];
    let proc = 0, acor = 0;
    fila.forEach(c => { if (c.status !== 'pendente') proc++; if (c.status === 'acordo') acor++; });
    const porc = fila.length === 0 ? 0 : Math.round((proc / fila.length) * 100);
    document.getElementById('lblProgressoNumeros').innerText = `${proc} / ${fila.length}`;
    document.getElementById('barraProgresso').style.width = `${porc}%`;
}

function renderizarFila() {
    const container = document.getElementById('containerListaFila');
    const fila = remessaDados.filaEnvios || [];
    if (fila.length === 0) { container.innerHTML = '<div style="text-align: center; padding: 40px;">Vazia.</div>'; return; }

    let html = '';
    fila.forEach((cliente, index) => {
        let classeAtivo = index === clienteAtualIndex ? 'ativo' : '';
        let badgeHtml = '';
        if (cliente.status === 'pendente') badgeHtml = `<span class="badge-status status-pendente">Pendente</span>`;
        else if (cliente.status === 'enviado') badgeHtml = `<span class="badge-status status-enviado">Enviado</span>`;
        else if (cliente.status === 'acordo') badgeHtml = `<span class="badge-status status-acordo">Acordo</span>`;
        else if (cliente.status === 'falha') badgeHtml = `<span class="badge-status status-falha">Falha</span>`;

        let docHtml = '';
        if (cliente.documento && cliente.documento.trim() !== '') {
            docHtml = `
                <span style="color: var(--borda); margin: 0 5px;">•</span>
                <span style="font-size: 11px; color: var(--cor-texto); font-family: monospace;">${cliente.documento}</span>
                <button onclick="copiarDocumento(event, '${cliente.documento}')" style="background: transparent; border: none; padding: 0; margin-left: 5px; cursor: pointer; color: var(--f1a-blue);" title="Copiar">
                    <span class="material-symbols-rounded" style="font-size: 14px;">content_copy</span>
                </button>
            `;
        }

        html += `
            <div class="item-cliente ${classeAtivo}" onclick="selecionarCliente(${index})">
                <div style="flex: 1; overflow: hidden;">
                    <span style="display: block; font-weight: 700; color: var(--cor-titulo); white-space: nowrap; text-overflow: ellipsis; overflow: hidden; font-size: 14px;">${cliente.nome}</span>
                    <div style="display: flex; align-items: center; margin-top: 3px;">
                        <span style="font-size: 11px; color: var(--cor-texto);">${cliente.telefone}</span>
                        ${docHtml}
                    </div>
                </div>
                <div style="text-align: right;">${badgeHtml}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.selecionarCliente = function(index) {
    const fila = remessaDados.filaEnvios || [];
    if (index < 0 || index >= fila.length) return;
    clienteAtualIndex = index;
    const cliente = fila[index];

    renderizarFila();
    document.getElementById('areaClienteVazio').classList.add('escondido');
    document.getElementById('areaClienteAtivo').classList.remove('escondido');
    document.getElementById('cliNome').innerText = cliente.nome;
    document.getElementById('cliLoja').innerText = cliente.lojaNome;
    document.getElementById('cliValor').innerText = `R$ ${formatarParaMoedaSTR(cliente.valorOriginal)}`;
    document.getElementById('cliMensagem').value = cliente.mensagemFormatada;

    if (cliente.documento && cliente.documento.trim() !== '') {
        document.getElementById('cliDoc').innerText = cliente.documento;
        document.getElementById('cliDocContainer').classList.remove('escondido');
    } else {
        document.getElementById('cliDocContainer').classList.add('escondido');
    }

    resetarBotoesStatus();
    if (cliente.status !== 'pendente') marcarStatus(cliente.status);
    else statusSelecionado = null;
}

function procurarProximoPendente() {
    const fila = remessaDados.filaEnvios || [];
    const indexPendente = fila.findIndex(c => c.status === 'pendente');
    if (indexPendente !== -1) {
        selecionarCliente(indexPendente);
        setTimeout(() => { const itemAtivo = document.querySelector('.item-cliente.ativo'); if(itemAtivo) itemAtivo.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
    } else {
        document.getElementById('areaClienteVazio').classList.remove('escondido');
        document.getElementById('areaClienteAtivo').classList.add('escondido');
        document.getElementById('areaClienteVazio').innerHTML = `<span class="material-symbols-rounded" style="font-size: 64px; color: #10b981; margin-bottom: 15px;">celebration</span><h3 style="margin: 0; color: #10b981;">Fila Concluída!</h3>`;
    }
}

// ==============================================================
// FUNÇÕES DE COPIAR COM AVISO VISUAL GARANTIDO
// ==============================================================
window.copiarDocumento = function(event, texto) {
    event.stopPropagation();
    navigator.clipboard.writeText(texto).then(() => { 
        mostrarAvisoCopiado();
    }).catch(err => { 
        console.error('Erro ao copiar: ', err); 
    });
}

window.copiarDocumentoAtivo = function(event) {
    copiarDocumento(event, document.getElementById('cliDoc').innerText);
}

function mostrarAvisoCopiado() {
    const avisoAntigo = document.getElementById('aviso-copiado-temp');
    if (avisoAntigo) avisoAntigo.remove();

    const aviso = document.createElement('div');
    aviso.id = 'aviso-copiado-temp';
    aviso.innerHTML = '<span class="material-symbols-rounded" style="font-size: 18px;">check_circle</span> Copiado com sucesso!';
    
    aviso.style.position = 'fixed';
    aviso.style.bottom = '30px';
    aviso.style.left = '50%';
    aviso.style.transform = 'translateX(-50%)';
    aviso.style.background = '#10b981'; 
    aviso.style.color = 'white';
    aviso.style.padding = '12px 25px';
    aviso.style.borderRadius = '30px';
    aviso.style.boxShadow = '0 5px 15px rgba(16, 185, 129, 0.4)';
    aviso.style.display = 'flex';
    aviso.style.alignItems = 'center';
    aviso.style.gap = '10px';
    aviso.style.fontWeight = '700';
    aviso.style.fontSize = '14px';
    aviso.style.zIndex = '99999';
    aviso.style.opacity = '0'; 
    aviso.style.transition = 'all 0.3s ease';

    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.style.opacity = '1';
        aviso.style.bottom = '40px';
    }, 10);

    setTimeout(() => {
        aviso.style.opacity = '0';
        aviso.style.bottom = '30px';
        setTimeout(() => aviso.remove(), 300);
    }, 2000);
}

window.abrirWhatsApp = function() {
    const cliente = remessaDados.filaEnvios[clienteAtualIndex];
    let telefone = cliente.telefone;
    let mensagem = document.getElementById('cliMensagem').value; 
    if (!telefone.startsWith('55')) telefone = '55' + telefone;
    window.open(`https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`, '_blank');
    if (!statusSelecionado || statusSelecionado === 'pendente') marcarStatus('enviado');
}

window.marcarStatus = function(status) {
    statusSelecionado = status;
    resetarBotoesStatus();
    if (status === 'enviado') document.getElementById('btnStEnviado').classList.add('selecionado');
    if (status === 'acordo') document.getElementById('btnStAcordo').classList.add('selecionado');
    if (status === 'falha') document.getElementById('btnStFalha').classList.add('selecionado');
}

function resetarBotoesStatus() {
    document.getElementById('btnStEnviado').classList.remove('selecionado');
    document.getElementById('btnStAcordo').classList.remove('selecionado');
    document.getElementById('btnStFalha').classList.remove('selecionado');
}

window.salvarEAvancar = async function() {
    if (!statusSelecionado || statusSelecionado === 'pendente') return alert("Selecione um resultado antes de avançar.");
    const btnAvancar = document.querySelector('button[onclick="salvarEAvancar()"]');
    btnAvancar.innerHTML = `Guardar...`; btnAvancar.disabled = true;

    const filaAtualizada = [...remessaDados.filaEnvios];
    filaAtualizada[clienteAtualIndex].status = statusSelecionado;
    filaAtualizada[clienteAtualIndex].mensagemFormatada = document.getElementById('cliMensagem').value;

    let proc = 0, acor = 0;
    filaAtualizada.forEach(c => { if (c.status !== 'pendente') proc++; if (c.status === 'acordo') acor++; });

    try {
        await db.collection("crm_remessas").doc(remessaId).update({ filaEnvios: filaAtualizada, totalProcessados: proc, totalAcordos: acor, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
        statusSelecionado = null;
        procurarProximoPendente();
    } catch (e) { console.error(e); } finally { btnAvancar.innerHTML = 'Guardar e Ir para o Próximo <span class="material-symbols-rounded">arrow_forward</span>'; btnAvancar.disabled = false; }
}

window.finalizarRemessa = async function() {
    if(!confirm("Concluir esta remessa?")) return;
    await db.collection("crm_remessas").doc(remessaId).update({ status: 'concluida', atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
    window.location.href = 'painel.html';
}

function formatarParaMoedaSTR(valorNumero) {
    if (isNaN(valorNumero) || valorNumero === 0) return "0,00";
    return parseFloat(valorNumero).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

window.toggleDropdownPerfil = function(event) { event.stopPropagation(); const menu = document.getElementById('dropdownPerfilLocal'); if (menu) menu.classList.toggle('escondido'); };
document.addEventListener('click', function() { const menu = document.getElementById('dropdownPerfilLocal'); if (menu && !menu.classList.contains('escondido')) menu.classList.add('escondido'); });