// ============================================================================
// MÓDULO: CRM & MENSAGEIRO (WHATSAPP)
// ARQUIVO: nova_remessa.js
// ============================================================================

let modelosMensagem = [];
let lojasMapeadas = {}; 
let clientesProcessados = [];

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
    carregarLojasBase();
    carregarModelosBase();
};

async function carregarLojasBase() {
    try {
        const snap = await db.collection("crm_lojas").where("usuarioId", "==", usuarioLogado.uid).get();
        snap.forEach(doc => { lojasMapeadas[doc.data().codigo] = doc.data().nome; });
    } catch (e) { console.error(e); }
}

async function carregarModelosBase() {
    try {
        const snap = await db.collection("crm_modelos_msg").where("usuarioId", "==", usuarioLogado.uid).get();
        modelosMensagem = [];
        snap.forEach(doc => modelosMensagem.push({ id: doc.id, ...doc.data() }));
        carregarModelosPorTipo();
    } catch (e) { console.error(e); }
}

window.carregarModelosPorTipo = function() {
    const tipoSel = document.getElementById('remessaTipo').value;
    const selectModelo = document.getElementById('remessaModelo');
    const filtrados = modelosMensagem.filter(m => m.tipo === tipoSel);
    
    if (filtrados.length === 0) {
        selectModelo.innerHTML = '<option value="">Nenhum modelo cadastrado...</option>';
        atualizarPreviewModelo();
        return;
    }
    let html = '<option value="">Selecione um modelo...</option>';
    filtrados.forEach(m => { html += `<option value="${m.id}">${m.nome}</option>`; });
    selectModelo.innerHTML = html;
    selectModelo.addEventListener('change', atualizarPreviewModelo);
    atualizarPreviewModelo();
}

function atualizarPreviewModelo() {
    const idSel = document.getElementById('remessaModelo').value;
    const divPreview = document.getElementById('previewTextoModelo');
    if (!idSel) { divPreview.innerHTML = "Prévia..."; divPreview.style.color = "var(--cor-texto)"; return; }
    const modelo = modelosMensagem.find(m => m.id === idSel);
    if (modelo) { divPreview.innerHTML = modelo.texto.replace(/\n/g, '<br>'); divPreview.style.color = "var(--cor-titulo)"; }
}

window.lerPlanilhaFaturas = function(input) {
    const file = input.files[0];
    if(!file) return;
    const areaDrop = document.getElementById('areaDropFaturas');
    areaDrop.style.opacity = '0.5';
    areaDrop.innerHTML = `<span class="material-symbols-rounded" style="font-size: 48px; animation: spin 1s linear infinite;">sync</span><h4 style="margin: 0;">Lendo Planilha...</h4>`;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processarDadosConsulta(json);
    };
    reader.readAsArrayBuffer(file);
}

function processarDadosConsulta(linhasExcel) {
    clientesProcessados = [];
    let contatosValidos = 0;

    linhasExcel.forEach(linha => {
        const nomeCliente = linha['Cliente'] || 'Cliente';
        const origemBruta = linha['Origem'] ? String(linha['Origem']).replace('.0', '').trim() : '';
        const saldoDevedor = parseFloat(linha['Saldo Devedor']) || 0;
        const diasAtraso = parseInt(linha['Atraso']) || 0;
        
        // ASPIRADOR DE CPF: Limpa todos os espaços e pontuações do nome da coluna para não ter erro de leitura
        let cpfCnpj = '';
        for(let nomeDaColuna in linha) {
            let nomeLimpo = nomeDaColuna.toUpperCase().replace(/[^A-Z]/g, ''); 
            if(nomeLimpo.includes('CPF') || nomeLimpo.includes('CNPJ')) {
                cpfCnpj = linha[nomeDaColuna];
                break;
            }
        }
        
        let telefoneBruto = linha['Telefones'] || '';
        telefoneBruto = telefoneBruto.split(',')[0]; 
        let telefoneLimpo = String(telefoneBruto).replace(/\D/g, '');

        if (telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11) {
            contatosValidos++;
            clientesProcessados.push({
                nome: nomeCliente,
                telefone: telefoneLimpo,
                valor: saldoDevedor,
                atraso: diasAtraso,
                origem: origemBruta,
                documento: cpfCnpj ? String(cpfCnpj).trim() : '', // Garante que seja um texto válido
                statusEnvio: 'pendente'
            });
        }
    });

    const areaDrop = document.getElementById('areaDropFaturas');
    areaDrop.style.opacity = '1';
    areaDrop.innerHTML = `<span class="material-symbols-rounded" style="font-size: 48px; color: #10b981;">check_circle</span><h4 style="margin: 0;">Planilha Carregada</h4>`;
    document.getElementById('lblTotalLinhas').innerText = linhasExcel.length;
    document.getElementById('lblContatosValidos').innerText = contatosValidos;
    document.getElementById('resumoPlanilha').classList.remove('escondido');
}

window.gerarFilaDeDisparo = async function() {
    const nomeRemessa = document.getElementById('remessaNome').value.trim();
    const tipoAcao = document.getElementById('remessaTipo').value;
    const modeloId = document.getElementById('remessaModelo').value;

    if (!nomeRemessa || !modeloId || clientesProcessados.length === 0) return alert("Preencha todos os campos e suba uma planilha válida.");

    const btn = document.getElementById('btnGerarRemessa');
    btn.innerHTML = `Processando...`; btn.disabled = true;

    const modeloSelecionado = modelosMensagem.find(m => m.id === modeloId);
    const templateTexto = modeloSelecionado.texto;

    const filaFinal = clientesProcessados.map((cliente, index) => {
        const nomeDaLoja = lojasMapeadas[cliente.origem] || "Nossa Loja";
        let msgPronta = templateTexto;
        msgPronta = msgPronta.replace(/{{NOME_CLIENTE}}/g, cliente.nome);
        msgPronta = msgPronta.replace(/{{VALOR_FATURA}}/g, formatarParaMoedaSTR(cliente.valor));
        msgPronta = msgPronta.replace(/{{DIAS_ATRASO}}/g, cliente.atraso);
        msgPronta = msgPronta.replace(/{{NOME_LOJA}}/g, nomeDaLoja);

        return {
            idFila: `fila_${index}_${Date.now()}`,
            nome: cliente.nome,
            telefone: cliente.telefone,
            valorOriginal: cliente.valor,
            lojaNome: nomeDaLoja,
            documento: cliente.documento, // Salvo no banco
            mensagemFormatada: msgPronta,
            status: 'pendente',
            observacao: ''
        };
    });

    const dadosRemessa = {
        usuarioId: usuarioLogado.uid,
        nome: nomeRemessa,
        tipo: tipoAcao,
        modeloUsado: modeloSelecionado.nome,
        totalClientes: filaFinal.length,
        totalProcessados: 0,
        totalAcordos: 0,
        status: 'andamento',
        filaEnvios: filaFinal, 
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const docRef = await db.collection("crm_remessas").add(dadosRemessa);
        setTimeout(() => { window.location.href = `disparador.html?id=${docRef.id}`; }, 1000);
    } catch (e) { console.error(e); btn.disabled = false; }
}

function formatarParaMoedaSTR(valorNumero) {
    if (isNaN(valorNumero) || valorNumero === 0) return "0,00";
    return parseFloat(valorNumero).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

window.toggleDropdownPerfil = function(event) { event.stopPropagation(); const menu = document.getElementById('dropdownPerfilLocal'); if (menu) menu.classList.toggle('escondido'); };
document.addEventListener('click', function() { const menu = document.getElementById('dropdownPerfilLocal'); if (menu && !menu.classList.contains('escondido')) menu.classList.add('escondido'); });