// ============================================================================
// MÓDULO: GESTÃO E METAS (ADMIN / MASTER / GERENTE)
// ARQUIVO: metas.js
// ============================================================================

let promotoraSelecionadaId = "";
let lojasGlobais = [];
let dataEscalaAtual = new Date();
let isUserAdminGlobal = false;

// ==============================
// GATILHO OFICIAL DO CORE.JS
// ==============================
window.posAuthCallback = async function() {
    // 1. Verifica Permissão (Apenas Master, Admin ou Gerente)
    isUserAdminGlobal = (perfilUsuario === 'master' || perfilUsuario === 'admin' || perfilUsuario === 'gerente');

    if (!isUserAdminGlobal) {
        if(typeof mostrarToast === 'function') mostrarToast("Acesso Restrito. Apenas Gestores podem configurar metas.", "erro");
        else alert("Acesso Restrito.");
        
        setTimeout(() => window.location.replace("visitas.html"), 1500);
        return;
    }

    // 2. Libera a Tela (Correção: Deixa o CSS Flexbox assumir)
    document.getElementById("corpoPagina").style.display = "";
    
    await carregarLojas();
    await carregarPromotorasSelect();
    
    if(typeof carregarMetasLojasGlobais === "function" && document.getElementById('abaLojas').classList.contains('ativo')) {
        carregarMetasLojasGlobais();
    }
};

/** ==============================
 * CARREGAMENTOS BASE
 * ============================== */
async function carregarLojas() {
    try {
        let qL = db.collection("lojas");
        if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
            qL = qL.where("empresaId", "==", dadosUsuarioLogado.empresaId);
        }
        
        const snap = await qL.orderBy("nome").get();
        lojasGlobais = [];
        snap.forEach(doc => lojasGlobais.push({ id: doc.id, nome: doc.data().nome }));
    } catch (e) { 
        console.error("Erro ao carregar lojas: ", e); 
    }
}

async function carregarPromotorasSelect() {
    const select = document.getElementById('selectPromotoraGlob');
    if (!select) return;
    
    try {
        let qU = db.collection("usuarios");
        
        // Filtra usuários da empresa logada
        if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
            qU = qU.where("empresaId", "==", dadosUsuarioLogado.empresaId);
        }

        const snap = await qU.orderBy("nome").get();
        let primeiroId = "";
        let encontrou = false;
        select.innerHTML = '<option value="">-- Selecione o Vendedor --</option>';

        snap.forEach(doc => {
            const d = doc.data();
            let m = d.modulosAcesso || []; 
            if (!Array.isArray(m)) m = [m];
            
            // REGRA CORRIGIDA: Procura pelo ID real do módulo salvo no banco ('visitas') ou pelo nome antigo
            const temAcessoCheckIn = m.includes('visitas') || m.includes('Check-in / Check-out');
            const estaAtivo = d.status !== 'bloqueado';

            if (estaAtivo && temAcessoCheckIn) {
                select.innerHTML += `<option value="${doc.id}">${d.nome || d.email}</option>`;
                encontrou = true; 
                if(!primeiroId) primeiroId = doc.id;
            }
        });

        if (encontrou && primeiroId) {
            select.value = primeiroId;
            carregarDadosPromotora();
        } else {
            select.innerHTML = '<option value="">Nenhum vendedor apto encontrado</option>';
            document.getElementById('msgSemPromotora').style.display = 'block';
            document.getElementById('formPromotoria').style.display = 'none';
        }
    } catch (e) { 
        console.error(e); 
        if(typeof mostrarToast === 'function') mostrarToast("Erro ao filtrar equipe.", "erro");
    }
}

/** ==============================
 * MÁSCARA DE MOEDA E FORMATAÇÃO
 * ============================== */
window.aplicarMascaraMoeda = function(input) {
    let v = input.value.replace(/\D/g,'');
    if (v === "") { input.value = ""; return; }
    v = (v/100).toFixed(2) + '';
    v = v.replace(".", ",");
    v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
    v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
    input.value = v;
}

function desformatarMoeda(valorStr) {
    if (!valorStr) return 0;
    return parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
}

function formatarParaMoedaSTR(valorNumero) {
    if (isNaN(valorNumero) || valorNumero === 0) return "";
    let f = parseFloat(valorNumero).toFixed(2).replace('.', ',');
    return f.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

/** ==============================
 * CARREGAR DADOS DO VENDEDOR (ABA 1)
 * ============================== */
window.carregarDadosPromotora = async function() {
    promotoraSelecionadaId = document.getElementById('selectPromotoraGlob').value;
    const msg = document.getElementById('msgSemPromotora');
    const form = document.getElementById('formPromotoria');
    
    if (!promotoraSelecionadaId) {
        msg.style.display = 'block';
        form.style.display = 'none';
        return;
    }

    msg.style.display = 'none';
    form.style.display = 'block';
    
    try {
        const doc = await db.collection("visitas_config_metas").doc(promotoraSelecionadaId).get();
        let config = doc.exists ? doc.data() : {};

        document.getElementById('metaHorasSemana').value = config.horasSemana || "";
        document.getElementById('metaHorasMes').value = config.horasMes || "";
        document.getElementById('metaCartoesMes').value = config.cartoesBase || "";
        document.getElementById('tipoTransporte').value = config.tipoTransporte || "";

        document.getElementById('containerGatilhos').innerHTML = "";
        if (config.gatilhosBonus && config.gatilhosBonus.length > 0) {
            config.gatilhosBonus.forEach(g => adicionarGatilhoUI(g.inicio, g.fim, g.valorBonus));
        } else {
            adicionarGatilhoUI(1, 50, 5.00); 
        }
        
        carregarEscalasMes();
    } catch (e) { console.error("Erro ao puxar configs:", e); }
}

/** ==============================
 * CARREGAR TABELA GLOBAL (ABA 2)
 * ============================== */
window.carregarMetasLojasGlobais = async function() {
    try {
        const idConfiguracao = (perfilUsuario === 'master') ? "GLOBAL_LOJAS" : `GLOBAL_LOJAS_${dadosUsuarioLogado.empresaId}`;
        const doc = await db.collection("visitas_config_metas").doc(idConfiguracao).get();
        let configGlob = doc.exists ? doc.data() : { ajudaDeCusto: [] };
        let locs = configGlob.ajudaDeCusto || [];

        const tbodyLojas = document.querySelector('#tabelaLojasLocomocao tbody');
        if(!tbodyLojas) return;
        
        tbodyLojas.innerHTML = "";

        if (lojasGlobais.length === 0) {
            tbodyLojas.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma loja cadastrada para esta empresa.</td></tr>`;
            return;
        }

        lojasGlobais.forEach(loja => {
            const cLoja = locs.find(a => a.lojaId === loja.id) || {};
            const vMoto = formatarParaMoedaSTR(cLoja.moto || 0);
            const vCarro = formatarParaMoedaSTR(cLoja.carro || 0);
            const vOnibus = formatarParaMoedaSTR(cLoja.onibus || 0);
            const vApp = formatarParaMoedaSTR(cLoja.app || 0);
            
            tbodyLojas.innerHTML += `
                <tr data-loja-id="${loja.id}">
                    <td style="font-weight: bold; color: var(--cor-titulo); font-size: 12px;">${loja.nome}</td>
                    <td><input type="text" class="input-locomocao loc-moto" value="${vMoto}" placeholder="0,00" oninput="aplicarMascaraMoeda(this)"></td>
                    <td><input type="text" class="input-locomocao loc-carro" value="${vCarro}" placeholder="0,00" oninput="aplicarMascaraMoeda(this)"></td>
                    <td><input type="text" class="input-locomocao loc-onibus" value="${vOnibus}" placeholder="0,00" oninput="aplicarMascaraMoeda(this)"></td>
                    <td><input type="text" class="input-locomocao loc-app" value="${vApp}" placeholder="0,00" oninput="aplicarMascaraMoeda(this)"></td>
                </tr>
            `;
        });
    } catch (e) { console.error("Erro ao carregar lojas globais:", e); }
}

/** ==============================
 * GATILHOS (UI)
 * ============================== */
window.adicionarGatilho = function() { adicionarGatilhoUI("", "", ""); }
function adicionarGatilhoUI(ini, fim, val) {
    const div = document.createElement('div');
    div.className = "linha-dupla";
    div.style.alignItems = "center";
    div.style.background = "var(--bg-body)";
    div.style.padding = "10px";
    div.style.borderRadius = "8px";
    div.style.border = "1px dashed var(--borda)";
    
    div.innerHTML = `
        <div style="flex: 1; display:flex; gap:5px; align-items:center;">
            <span style="font-size:10px; color:var(--cor-texto);">De</span>
            <input type="number" class="gat-ini" placeholder="Ex: 1" value="${ini}" style="padding: 8px;">
            <span style="font-size:10px; color:var(--cor-texto);">até</span>
            <input type="number" class="gat-fim" placeholder="Ex: 50" value="${fim}" style="padding: 8px;">
        </div>
        <div style="flex: 1; display:flex; gap:10px; align-items:center;">
            <span style="font-size:10px; color:var(--cor-texto);">Bônus (R$)</span>
            <input type="number" class="gat-val" placeholder="Ex: 5.50" step="0.01" value="${val}" style="padding: 8px; color: var(--f1a-copper); font-weight:bold;">
            <button type="button" class="btn-fechar" onclick="this.parentElement.parentElement.remove()" style="margin-top:0;"><span class="material-symbols-rounded" style="font-size:18px; color:#ef4444;">delete</span></button>
        </div>
    `;
    document.getElementById('containerGatilhos').appendChild(div);
}

/** ==============================
 * SALVAR CONFIGURAÇÕES
 * ============================== */
window.salvarMetasPromotoria = async function(e) {
    e.preventDefault();
    if (!promotoraSelecionadaId) {
        if(typeof mostrarToast === 'function') mostrarToast("Selecione um vendedor primeiro.", "erro");
        return;
    }
    
    const btn = e.submitter;
    const txtOrig = btn.innerHTML;
    btn.innerHTML = "Salvando..."; btn.disabled = true;

    const horasSemana = parseInt(document.getElementById('metaHorasSemana').value) || 0;
    const horasMes = parseInt(document.getElementById('metaHorasMes').value) || 0;
    const cartoesBase = parseInt(document.getElementById('metaCartoesMes').value) || 0;
    const tipoTransporte = document.getElementById('tipoTransporte').value;

    const gatilhosBonus = [];
    document.querySelectorAll('#containerGatilhos .linha-dupla').forEach(linha => {
        const i = parseInt(linha.querySelector('.gat-ini').value);
        const f = parseInt(linha.querySelector('.gat-fim').value);
        const v = parseFloat(linha.querySelector('.gat-val').value);
        if(!isNaN(i) && !isNaN(f) && !isNaN(v)) gatilhosBonus.push({ inicio: i, fim: f, valorBonus: v });
    });

    try {
        await db.collection("visitas_config_metas").doc(promotoraSelecionadaId).set({ 
            horasSemana, horasMes, cartoesBase, tipoTransporte, gatilhosBonus, atualizadoEm: new Date().toISOString() 
        }, { merge: true });
        
        if(typeof mostrarToast === 'function') mostrarToast("Metas salvas com sucesso!", "sucesso");
    } catch (err) { 
        console.error(err); 
        if(typeof mostrarToast === 'function') mostrarToast("Erro ao salvar metas.", "erro");
    } finally { 
        btn.innerHTML = txtOrig; btn.disabled = false; 
    }
}

window.salvarMetasLojasGlobais = async function(e) {
    e.preventDefault();
    const btn = e.submitter;
    const txtOrig = btn.innerHTML;
    btn.innerHTML = "Salvando..."; btn.disabled = true;

    const ajudaDeCusto = [];
    document.querySelectorAll('#tabelaLojasLocomocao tbody tr').forEach(tr => {
        const lId = tr.dataset.lojaId;
        const moto = desformatarMoeda(tr.querySelector('.loc-moto').value);
        const carro = desformatarMoeda(tr.querySelector('.loc-carro').value);
        const onibus = desformatarMoeda(tr.querySelector('.loc-onibus').value);
        const app = desformatarMoeda(tr.querySelector('.loc-app').value);
        if (moto > 0 || carro > 0 || onibus > 0 || app > 0) ajudaDeCusto.push({ lojaId: lId, moto, carro, onibus, app });
    });

    try {
        const idConfiguracao = (perfilUsuario === 'master') ? "GLOBAL_LOJAS" : `GLOBAL_LOJAS_${dadosUsuarioLogado.empresaId}`;
        await db.collection("visitas_config_metas").doc(idConfiguracao).set({ ajudaDeCusto, atualizadoEm: new Date().toISOString() }, { merge: true });
        
        if(typeof mostrarToast === 'function') mostrarToast("Tabela global de locomoção salva!", "sucesso");
    } catch (err) { 
        console.error(err); 
        if(typeof mostrarToast === 'function') mostrarToast("Erro ao salvar locomoção.", "erro");
    } finally { 
        btn.innerHTML = txtOrig; btn.disabled = false; 
    }
}

/** ==============================
 * ESCALAS E EXPORTAÇÃO
 * ============================== */
window.mudarMesEscala = function(dir) {
    dataEscalaAtual.setMonth(dataEscalaAtual.getMonth() + dir);
    carregarEscalasMes();
}

function calcularDiferencaHoras(hInicio, hFim) {
    if (!hInicio || !hFim) return 0;
    const [hI, mI] = hInicio.split(':').map(Number);
    const [hF, mF] = hFim.split(':').map(Number);
    let diff = ((hF * 60) + mF) - ((hI * 60) + mI);
    if (diff < 0) diff += 24 * 60;
    return diff;
}

function minutosParaHorasFormat(minutos) {
    return `${String(Math.floor(minutos / 60)).padStart(2,'0')}:${String(minutos % 60).padStart(2,'0')}`;
}

window.carregarEscalasMes = async function() {
    if (!promotoraSelecionadaId) return;
    const meses = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    document.getElementById('lblMesEscala').innerText = `${meses[dataEscalaAtual.getMonth()]} ${dataEscalaAtual.getFullYear()}`;
    const strInicio = new Date(dataEscalaAtual.getFullYear(), dataEscalaAtual.getMonth(), 1).toISOString().split('T')[0];
    const strFim = new Date(dataEscalaAtual.getFullYear(), dataEscalaAtual.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
        const snap = await db.collection("visitas_agenda").where("promotoraId", "==", promotoraSelecionadaId).get();
        const analiseLojas = {}; 
        let totalVisitas = 0, totalCartoes = 0, totalMinutos = 0;

        snap.forEach(doc => {
            const v = doc.data();
            if (v.data >= strInicio && v.data <= strFim && v.status === 'concluido') {
                if (!analiseLojas[v.lojaId]) analiseLojas[v.lojaId] = { visitas: 0, cartoes: 0, minutos: 0 };
                analiseLojas[v.lojaId].visitas += 1;
                totalVisitas += 1;
                const qtd = v.cartoesAprovados ? v.cartoesAprovados.length : 0;
                analiseLojas[v.lojaId].cartoes += qtd;
                totalCartoes += qtd;
                const mTrab = calcularDiferencaHoras(v.checkinReal || v.horaInicio, v.checkoutReal || v.horaFim);
                analiseLojas[v.lojaId].minutos += mTrab;
                totalMinutos += mTrab;
            }
        });

        const tbody = document.getElementById('tabelaEscalasBody');
        tbody.innerHTML = "";
        if (Object.keys(analiseLojas).length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 30px; font-style:italic;">Nenhuma visita concluída.</td></tr>`;
        } else {
            for (const [lId, stats] of Object.entries(analiseLojas)) {
                const lojaObj = lojasGlobais.find(l => l.id === lId);
                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight: bold; font-size: 12px; color: var(--cor-titulo);">${lojaObj ? lojaObj.nome : "Loja Excluída"}</td>
                        <td style="text-align: center;">${stats.visitas}</td>
                        <td style="text-align: center; color: var(--f1a-blue); font-weight: bold;">${stats.cartoes}</td>
                        <td style="text-align: center;">${minutosParaHorasFormat(stats.minutos)}h</td>
                    </tr>
                `;
            }
        }
        document.getElementById('totEscVisitas').innerText = totalVisitas;
        document.getElementById('totEscCartoes').innerText = totalCartoes;
        document.getElementById('totEscHoras').innerText = minutosParaHorasFormat(totalMinutos) + "h";
    } catch (e) { console.error(e); }
}

/** ==============================
 * FUNÇÕES DE EXPORTAÇÃO (PDF E EXCEL)
 * ============================== */
window.exportarExcelEscalas = function() {
    const sel = document.getElementById('selectPromotoraGlob');
    const nomePromotora = sel.options[sel.selectedIndex].text;
    const mesReferencia = document.getElementById('lblMesEscala').innerText;
    
    let csv = [];
    csv.push(`RELATÓRIO DE ESCALAS F1A;${nomePromotora};${mesReferencia}`);
    csv.push(""); 
    csv.push("Loja/Cliente;Visitas Realizadas;Cartões Aprovados;Horas Trabalhadas");

    const rows = document.querySelectorAll("#abaEscalas table tbody tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if(cols.length > 1) {
            let rowData = [cols[0].innerText, cols[1].innerText, cols[2].innerText, cols[3].innerText];
            csv.push(rowData.join(";"));
        }
    });

    csv.push("");
    csv.push(`TOTAIS;${document.getElementById('totEscVisitas').innerText};${document.getElementById('totEscCartoes').innerText};${document.getElementById('totEscHoras').innerText}`);

    const csvContent = "\uFEFF" + csv.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Escala_${nomePromotora}_${mesReferencia.replace(/ /g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

window.gerarPDFEscalas = async function() {
    if (!promotoraSelecionadaId) {
        if(typeof mostrarToast === 'function') mostrarToast("Selecione um vendedor primeiro.", "erro");
        return;
    }

    const btn = document.querySelector('button[onclick="gerarPDFEscalas()"]');
    const txtOrig = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Aguarde...`;
    btn.disabled = true;

    try {
        const sel = document.getElementById('selectPromotoraGlob');
        const nomePromotora = sel.options[sel.selectedIndex].text;
        const mesReferencia = document.getElementById('lblMesEscala').innerText;
        
        let razao = "EMPRESA NÃO VINCULADA";
        let cnpj = "--", endereco = "Não cadastrado", contato = "Não cadastrado", email = "Não cadastrado";

        if (dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
            const empDoc = await db.collection("empresas").doc(dadosUsuarioLogado.empresaId).get();
            if (empDoc.exists) {
                const empData = empDoc.data();
                razao = empData.razaoSocial || empData.nomeFantasia || empData.nome || razao;
                cnpj = empData.cnpj || cnpj;
                endereco = empData.endereco || empData.logradouro || endereco;
                if(empData.numero) endereco += `, ${empData.numero}`;
                contato = empData.telefone || empData.celular || contato;
                email = empData.email || email;
            }
        }

        if(document.getElementById('printRazaoSocial')) document.getElementById('printRazaoSocial').innerText = razao;
        if(document.getElementById('printCnpj')) document.getElementById('printCnpj').innerText = `CNPJ: ${cnpj}`;
        if(document.getElementById('printEndereco')) document.getElementById('printEndereco').innerText = endereco;
        if(document.getElementById('printContato')) document.getElementById('printContato').innerText = `Tel: ${contato} | E-mail: ${email}`;
        
        if(document.getElementById('printMesRef')) document.getElementById('printMesRef').innerText = mesReferencia;
        if(document.getElementById('printHeaderPromotora')) document.getElementById('printHeaderPromotora').innerText = `Consultor(a): ${nomePromotora}`;

        setTimeout(() => {
            window.print();
            btn.innerHTML = txtOrig;
            btn.disabled = false;
        }, 500);

    } catch (e) {
        console.error("Erro ao gerar PDF:", e);
        if(typeof mostrarToast === 'function') mostrarToast("Erro ao buscar os dados da empresa.", "erro");
        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
}