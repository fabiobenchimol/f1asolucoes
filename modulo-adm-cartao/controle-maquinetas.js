// ============================================================================
// MÓDULO DE CONTROLE: DASHBOARD, FATURAMENTO INTELIGENTE E RECEBIMENTOS
// ============================================================================

let abaControleAtiva = 'dashboard';

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { carregarAbaControle(abaControleAtiva); }, 800);
});

window.alternarAbasControle = function(aba, elemento) {
    document.querySelectorAll('.card-aba-ctrl').forEach(c => c.style.borderColor = 'var(--borda)');
    if (elemento) elemento.style.borderColor = 'var(--f1a-blue)';
    abaControleAtiva = aba;
    carregarAbaControle(aba);
}

function carregarAbaControle(aba) {
    const container = document.getElementById('conteudoAbaControle');
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--cor-texto);">Calculando dados...</div>';

    if (aba === 'dashboard') renderizarDashboard(container);
    else if (aba === 'faturamento') renderizarFaturamento(container);
    else if (aba === 'recebimentos') renderizarRecebimentos(container);
}

// ----------------------------------------------------------------------------
// 1. DASHBOARD DE EFICIÊNCIA
// ----------------------------------------------------------------------------
async function renderizarDashboard(container) {
    container.innerHTML = `
        <h3 style="color:var(--cor-titulo); margin-top:0; margin-bottom: 15px;">Visão Geral do Negócio</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;" id="gridDash">
            <div style="text-align:center; padding: 20px; color: var(--cor-texto); grid-column: 1 / -1;">Analisando banco de dados...</div>
        </div>
    `;

    try {
        const lojasSnap = await db.collection("cartao_lojas").get();
        const mapLojasPreco = {};
        lojasSnap.forEach(doc => { mapLojasPreco[doc.id] = parseFloat(doc.data().custoAluguel || 0); });

        const estoqueSnap = await db.collection("adm_estoque").get();
        let totalMaquinas = 0;

        estoqueSnap.forEach(doc => { totalMaquinas++; });

        const saidasSnap = await db.collection("adm_saidas").get();
        let maquinasEmClientes = 0;
        let receitaPrevista = 0;

        saidasSnap.forEach(doc => {
            maquinasEmClientes++;
            const lojaId = doc.data().lojaId;
            if (mapLojasPreco[lojaId]) receitaPrevista += mapLojasPreco[lojaId];
        });

        const taxaOcupacao = totalMaquinas > 0 ? ((maquinasEmClientes / totalMaquinas) * 100).toFixed(1) : 0;
        const formataMoeda = (valor) => "R$ " + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

        document.getElementById("gridDash").innerHTML = `
            <div class="dash-card">
                <span class="dash-title">Total em Estoque / Compradas</span>
                <span class="dash-value" style="color: var(--cor-texto);">${totalMaquinas}</span>
                <span class="material-symbols-rounded dash-icon" style="color: var(--cor-texto);">inventory_2</span>
            </div>
            <div class="dash-card">
                <span class="dash-title" style="color: var(--f1a-blue);">Máquinas Alugadas (Ativas)</span>
                <span class="dash-value" style="color: var(--f1a-blue);">${maquinasEmClientes}</span>
                <span class="material-symbols-rounded dash-icon" style="color: var(--f1a-blue);">storefront</span>
            </div>
            <div class="dash-card">
                <span class="dash-title" style="color: #10b981;">Taxa de Ocupação</span>
                <span class="dash-value" style="color: #10b981;">${taxaOcupacao}%</span>
                <span class="material-symbols-rounded dash-icon" style="color: #10b981;">pie_chart</span>
            </div>
            <div class="dash-card">
                <span class="dash-title" style="color: var(--f1a-copper);">Receita Recorrente (MRR)</span>
                <span class="dash-value" style="color: var(--f1a-copper);">${formataMoeda(receitaPrevista)}</span>
                <span class="material-symbols-rounded dash-icon" style="color: var(--f1a-copper);">account_balance_wallet</span>
            </div>
        `;
    } catch (e) {
        document.getElementById("gridDash").innerHTML = `<div style="color: #ef4444; padding: 20px;">Erro ao carregar dados: ${e.message}</div>`;
    }
}

// ----------------------------------------------------------------------------
// 2. MOTOR DE FATURAMENTO INTELIGENTE (AUTOMATIZADO)
// ----------------------------------------------------------------------------
function renderizarFaturamento(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
            <div>
                <h3 style="color:var(--cor-titulo); margin:0;">Histórico de Faturas Geradas</h3>
                <p style="font-size: 11px; color: var(--cor-texto); margin: 5px 0 0 0;">Faturas criadas automaticamente com base no 1º Vencimento de cada máquina.</p>
            </div>
            <button onclick="sincronizarFaturasAutomaticas(event)" style="margin:0; background:var(--f1a-copper); color:white; border:none; padding:8px 15px; font-size:12px; font-weight:bold; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:5px; text-transform:uppercase; transition:0.2s;">
                <span class="material-symbols-rounded" style="font-size:16px;">autorenew</span> Sincronizar Faturas
            </button>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Ref/Vencimento</th><th>Loja / Máquina</th><th>Valor</th><th>Status</th><th style="text-align:center;">Ações</th></tr></thead>
            <tbody id="listaFaturas"><tr><td colspan="5" style="text-align:center;">Buscando faturas...</td></tr></tbody>
        </table>
    `;
    buscarFaturas();
}

window.sincronizarFaturasAutomaticas = async function(event) {
    const btn = event.currentTarget;
    btn.innerHTML = '<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Processando...';
    btn.disabled = true;

    try {
        // 1. Pega os custos atualizados das lojas
        const lojasSnap = await db.collection("cartao_lojas").get();
        const mapLojas = {};
        lojasSnap.forEach(doc => { mapLojas[doc.id] = { nome: doc.data().nome, redeNome: doc.data().redeNome, custo: parseFloat(doc.data().custoAluguel || 0) }; });

        // 2. Pega todas as saídas (máquinas alugadas)
        const saidasSnap = await db.collection("adm_saidas").get();

        // 3. Pega faturas já geradas para não duplicar (Usa uma chave combinada: SaídaID + Mês/Ano)
        const faturasSnap = await db.collection("cartao_faturas").get();
        const faturasExistentes = new Set();
        faturasSnap.forEach(doc => { faturasExistentes.add(`${doc.data().saidaId}_${doc.data().mesReferencia}`); });

        const batch = db.batch();
        let faturasGeradas = 0;

        const dataAtual = new Date();
        const limiteAno = dataAtual.getFullYear();
        const limiteMes = dataAtual.getMonth(); // 0 a 11

        saidasSnap.forEach(docSaida => {
            const saidaId = docSaida.id;
            const dSaida = docSaida.data();
            const primeiroVenc = dSaida.primeiroVencimento;

            // Se for uma máquina antiga que não tem primeiro vencimento, pula
            if (!primeiroVenc) return; 

            const lojaInfo = mapLojas[dSaida.lojaId];
            if (!lojaInfo || lojaInfo.custo <= 0) return;

            // Configura a data do primeiro vencimento
            const partes = primeiroVenc.split('-');
            let iterAno = parseInt(partes[0]);
            let iterMes = parseInt(partes[1]) - 1; // 0 a 11
            const diaVencimentoOriginal = parseInt(partes[2]);

            let dataIteracao = new Date(iterAno, iterMes, 1);
            const dataLimite = new Date(limiteAno, limiteMes, 1);

            // Roda o laço de repetição: do primeiro vencimento até o mês atual
            while (dataIteracao <= dataLimite) {
                const mRefStr = String(dataIteracao.getMonth() + 1).padStart(2, '0') + '/' + dataIteracao.getFullYear();
                
                // Calcula a data exata de vencimento (previne erro de dias 31 em meses de 30)
                let dataVencCalculada = new Date(dataIteracao.getFullYear(), dataIteracao.getMonth(), diaVencimentoOriginal);
                if (dataVencCalculada.getMonth() !== dataIteracao.getMonth()) {
                    dataVencCalculada = new Date(dataIteracao.getFullYear(), dataIteracao.getMonth() + 1, 0); // Último dia do mês
                }
                const vencStr = dataVencCalculada.toISOString().split('T')[0];
                const chaveFatura = `${saidaId}_${mRefStr}`;

                // Se a fatura desse mês ainda não existe para essa máquina, CRIA!
                if (!faturasExistentes.has(chaveFatura)) {
                    const novaFaturaRef = db.collection("cartao_faturas").doc();
                    batch.set(novaFaturaRef, {
                        saidaId: saidaId,
                        mesReferencia: mRefStr,
                        lojaId: dSaida.lojaId,
                        lojaNomeInfo: `${lojaInfo.redeNome} > ${lojaInfo.nome}`,
                        maquinetaInfo: dSaida.maquinetaInfo,
                        qtdMaquinasCalculada: 1, // Geramos 1 fatura individual por máquina para rastreio perfeito
                        valorUnitarioCobrado: lojaInfo.custo,
                        valorTotalFatura: lojaInfo.custo,
                        dataVencimento: vencStr,
                        statusPagamento: 'pendente',
                        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    faturasExistentes.add(chaveFatura);
                    faturasGeradas++;
                }
                
                // Pula para o próximo mês
                dataIteracao.setMonth(dataIteracao.getMonth() + 1);
            }
        });

        if (faturasGeradas > 0) {
            await batch.commit();
            if(typeof mostrarToast === 'function') mostrarToast(`✅ Máquina do tempo executada! ${faturasGeradas} faturas geradas.`);
        } else {
            if(typeof mostrarToast === 'function') mostrarToast(`👍 Todas as faturas já estão sincronizadas em dia.`);
        }

    } catch (e) {
        alert("Erro na sincronização: " + e.message);
    } finally {
        btn.innerHTML = '<span class="material-symbols-rounded" style="font-size:16px;">autorenew</span> Sincronizar Faturas';
        btn.disabled = false;
    }
}

// ----------------------------------------------------------------------------
// 3. GESTÃO DE RECEBIMENTOS E INADIMPLÊNCIA
// ----------------------------------------------------------------------------
function renderizarRecebimentos(container) {
    container.innerHTML = `
        <div class="acoes-tabela" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="color:var(--cor-titulo); margin:0;">Controle de Recebimentos</h3>
        </div>
        <table class="tabela-dados" style="width: 100%;">
            <thead><tr><th>Vencimento</th><th>Loja / Máquina</th><th>Valor</th><th>Status Pagamento</th><th style="text-align:center;">Dar Baixa</th></tr></thead>
            <tbody id="listaRecebimentos"><tr><td colspan="5" style="text-align:center;">Buscando faturas pendentes...</td></tr></tbody>
        </table>
    `;
    buscarFaturas(true); 
}

function buscarFaturas(isTelaRecebimentos = false) {
    const idCorpo = isTelaRecebimentos ? "listaRecebimentos" : "listaFaturas";
    const corpo = document.getElementById(idCorpo);
    if(!corpo) return;

    db.collection("cartao_faturas").orderBy("dataVencimento", "desc").onSnapshot(snap => {
        corpo.innerHTML = "";
        if (snap.empty) { corpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhuma fatura encontrada.</td></tr>`; return; }

        const formataMoeda = (valor) => "R$ " + parseFloat(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        const hoje = new Date().toISOString().split('T')[0]; 

        snap.forEach(doc => {
            const d = doc.data();
            const vencFormatado = d.dataVencimento.split('-').reverse().join('/');
            
            let statusBadge = '';
            let isAtrasado = false;

            if (d.statusPagamento === 'pago') {
                statusBadge = '<span class="status-badge badge-aprovada">PAGO</span>';
            } else {
                if (d.dataVencimento < hoje) {
                    statusBadge = '<span class="status-badge badge-recusada">ATRASADO</span>';
                    isAtrasado = true;
                } else {
                    statusBadge = '<span class="status-badge badge-pendente">A VENCER</span>';
                }
            }

            if (isTelaRecebimentos) {
                const btnBaixa = d.statusPagamento === 'pago' 
                    ? `<span class="material-symbols-rounded" style="color:#10b981; font-size:20px;">check_circle</span>` 
                    : `<button class="btn-icon" style="color:#10b981; border-color:#10b981;" onclick="confirmarBaixaFatura('${doc.id}', '${d.valorTotalFatura}')" title="Marcar como Pago"><span class="material-symbols-rounded">price_check</span></button>`;

                corpo.innerHTML += `
                    <tr>
                        <td><span style="font-weight:bold; color:${isAtrasado ? '#ef4444' : 'var(--cor-texto)'};">${vencFormatado}</span></td>
                        <td><strong style="color:var(--cor-titulo);">${d.lojaNomeInfo}</strong><br><small style="color:var(--cor-texto);">${d.maquinetaInfo}</small></td>
                        <td><strong style="color:var(--f1a-blue);">${formataMoeda(d.valorTotalFatura)}</strong></td>
                        <td>${statusBadge}</td>
                        <td style="text-align:center; display:flex; justify-content:center;">${btnBaixa}</td>
                    </tr>`;
            } else {
                corpo.innerHTML += `
                    <tr>
                        <td><strong style="color:var(--cor-titulo);">${d.mesReferencia}</strong><br><small style="color:var(--cor-texto);">Venc: ${vencFormatado}</small></td>
                        <td><strong style="color:var(--cor-titulo);">${d.lojaNomeInfo}</strong><br><small style="color:var(--cor-texto);">${d.maquinetaInfo}</small></td>
                        <td><strong style="color:var(--f1a-copper);">${formataMoeda(d.valorTotalFatura)}</strong></td>
                        <td>${statusBadge}</td>
                        <td style="text-align:center;">
                            <button class="btn-icon" style="color:#ef4444;" onclick="excluirFatura('${doc.id}')" title="Excluir Fatura"><span class="material-symbols-rounded">delete</span></button>
                        </td>
                    </tr>`;
            }
        });
    });
}

// ----------------------------------------------------------------------------
// 4. FUNÇÕES DE SUPORTE E SEGURANÇA
// ----------------------------------------------------------------------------
window.confirmarBaixaFatura = async function(faturaId, valor) {
    const confirmacao = confirm(`Confirmar o recebimento de R$ ${parseFloat(valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})} desta fatura?`);
    if(!confirmacao) return;

    try {
        await db.collection("cartao_faturas").doc(faturaId).update({
            statusPagamento: 'pago',
            dataPagamentoRealizado: new Date().toISOString().split('T')[0] 
        });
        if(typeof mostrarToast === 'function') mostrarToast("✅ Fatura baixada com sucesso!");
    } catch (e) {
        alert("Erro ao dar baixa: " + e.message);
    }
}

window.excluirFatura = async function(faturaId) {
    if(!confirm("Tem certeza que deseja apagar esta cobrança?")) return;
    try { await db.collection("cartao_faturas").doc(faturaId).delete(); } 
    catch (e) { alert("Erro ao excluir: " + e.message); }
}