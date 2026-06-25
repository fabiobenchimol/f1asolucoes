// ==========================================
// MÓDULO DE REMESSAS F1A (remessas.js) - BLINDAGEM DE DADOS + FILTROS
// ==========================================

// Injeta classe CSS para os filtros não conflituarem com o carregamento assíncrono
if (!document.getElementById('styleFiltroRemessas')) {
    const style = document.createElement('style');
    style.id = 'styleFiltroRemessas';
    style.innerHTML = '.escondido-por-filtro { display: none !important; }';
    document.head.appendChild(style);
}

let todasRemessasGlobal = [];
let remessaAbertaId = null;
let arvoreAtualPDF = null; 
let dadosBorderôAtual = null;

window.formatarMoedaVisual = function(valorNum) {
    let v = parseFloat(valorNum);
    if (isNaN(v)) return "R$ 0,00";
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// ==========================================
// 1. CARREGAR LISTA DE BORDERÔS (Sem travas na capa)
// ==========================================
function carregarRemessas() {
    const lista = document.getElementById("listaRemessas");
    if (!lista) return;

    // Removemos o filtro nativo daqui, pois a nova barra de filtros (Client-side) fará isso!
    lista.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">Buscando borderôs...</td></tr>';

    try {
        let query = db.collection("remessas");

        query.onSnapshot((snapshot) => {
            let remessasData = [];
            
            snapshot.forEach(doc => { 
                remessasData.push({ id: doc.id, ...doc.data() }); 
            });

            // Ordena da mais recente para a mais antiga
            remessasData.sort((a, b) => {
                const tempoA = a.criadoEm ? a.criadoEm.toMillis() : 0;
                const tempoB = b.criadoEm ? b.criadoEm.toMillis() : 0;
                return tempoB - tempoA;
            });

            todasRemessasGlobal = remessasData;
            renderizarTabelaRemessas(todasRemessasGlobal);

        }, (error) => {
            console.error("Erro Snapshot Remessas:", error);
            lista.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#ef4444;">Erro de conexão.</td></tr>';
        });
    } catch (erroGeral) {
        console.error("Erro fatal em carregarRemessas:", erroGeral);
    }
}

// ==========================================
// 2. RENDERIZAR TABELA (A mágica da visibilidade)
// ==========================================
function renderizarTabelaRemessas(dados) {
    const lista = document.getElementById("listaRemessas");
    if (!lista) return;

    if (dados.length === 0) { 
        lista.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; font-weight: bold; color: var(--cor-texto);">Nenhum borderô encontrado.</td></tr>'; 
        return; 
    }
    
    lista.innerHTML = "";
    
    dados.forEach(d => {
        const badgeClass = d.status === 'aberta' ? 'badge-agendada' : 'badge-paga';
        const iconStatus = d.status === 'aberta' ? '⏳' : '✅';
        const statusTexto = d.status === 'aberta' ? 'Pendente' : 'Liquidada';

        const linhaId = `remessa-linha-${d.id}`;
        // A linha começa escondida (display:none) e só aparece se tiver dinheiro da pessoa nela
        const linhaTabela = `
            <tr id="${linhaId}" class="remessa-item" data-codigo="${(d.codigo || d.identificador || '').toLowerCase()}" onclick="abrirDetalhesRemessa('${d.id}', '${d.codigo || d.identificador}', '${d.dataVencimento}', '${d.status}')" style="cursor:pointer; display:none;">
                <td style="font-weight: bold; color: var(--cor-titulo);"><span class="material-symbols-rounded" style="vertical-align: middle; font-size: 18px; color: var(--f1a-blue);">folder_open</span> ${d.codigo || d.identificador || '-'}</td>
                <td style="font-weight: 600;">${d.dataVencimento || '-'}</td>
                <td id="qtd-${d.id}" style="color: var(--cor-texto);">...</td>
                <td id="val-${d.id}" style="font-weight: bold; color: ${d.status === 'aberta' ? 'var(--f1a-copper)' : '#10b981'}; font-size: 14px;">Calculando...</td>
                <td><span class="status-badge ${badgeClass}" style="padding: 4px 8px;">${iconStatus} ${statusTexto}</span></td>
            </tr>
        `;
        lista.innerHTML += linhaTabela;

        db.collection("propostas").where("borderoId", "==", d.id).get().then(propsSnap => {
            let totalRemessa = 0;
            let countPropostas = 0;

            propsSnap.forEach(p => { 
                const propData = p.data();
                
                let pEmp = propData.empresaId || propData.hierarquia?.empresaId;
                let pVend = propData.vendedorId || propData.hierarquia?.vendedorId;
                let pGerente = propData.gerenteId || propData.hierarquia?.gerenteId;
                
                // BARREIRAS DE SEGURANÇA: Só conta a proposta se for do usuário!
                if (perfilUsuario === 'admin' && pEmp !== dadosUsuarioLogado.empresaId) return;
                if (perfilUsuario === 'gerente' && pGerente !== usuarioLogado.uid) return;
                if (perfilUsuario === 'vendedor' && pVend !== usuarioLogado.uid) return;

                totalRemessa += parseFloat(propData.comissao) || parseFloat(propData.hierarquia?.valorComissao) || 0; 
                countPropostas++;
            });
            
            const linhaTr = document.getElementById(linhaId);
            const cellQtd = document.getElementById(`qtd-${d.id}`);
            const cellVal = document.getElementById(`val-${d.id}`);
            
            // SE O USUÁRIO TEM PELO MENOS 1 PROPOSTA, A LINHA APARECE!
            if (countPropostas > 0) {
                if(linhaTr) linhaTr.style.display = ''; 
                if(cellQtd) cellQtd.innerText = `${countPropostas} Propostas`;
                if(cellVal) cellVal.innerText = formatarMoedaVisual(totalRemessa);
            } else {
                if(linhaTr) linhaTr.remove(); 
            }

        }).catch(err => console.warn("Erro calc borderô", err));
    });
    
    // Tenta aplicar filtros residuais após renderizar
    setTimeout(() => { if(typeof aplicarFiltrosRemessas === 'function') aplicarFiltrosRemessas(); }, 500);
}

// ==========================================
// 4. DETALHES E MONTAGEM DA ÁRVORE (Isolamento de Dados)
// ==========================================
window.abrirDetalhesRemessa = async function(id, codigo, vencimento, status) {
    remessaAbertaId = id;
    document.getElementById("modalRemessa").classList.remove("escondido");
    const container = document.getElementById("conteudoPrint");
    container.innerHTML = '<div style="text-align: center; padding: 40px;"><span class="material-symbols-rounded" style="font-size: 40px; color: #0047FF; animation: spin 1s linear infinite;">sync</span><p style="margin-top:10px; color:#334155;">Montando relatório com segurança F1A...</p></div>';
    
    document.getElementById("btnLiquidar").style.display = status === 'aberta' ? 'block' : 'none';
    document.getElementById("btnExcluir").style.display  = status === 'aberta' ? 'block' : 'none';
    document.getElementById("btnEstornar").style.display = status === 'paga' ? 'block' : 'none';

    try {
        const propsSnap = await db.collection("propostas").where("borderoId", "==", id).get();
        const btnExcluir = document.getElementById("btnExcluir");
        
        if(propsSnap.empty) { 
            btnExcluir.style.background = "#ef4444"; 
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #334155; font-size: 16px;">Borderô vazio.</p>'; 
            return; 
        } else {
            btnExcluir.style.background = "#6b7280"; 
        }

        let nomeEmpresaCliente = "MÚLTIPLAS EMPRESAS (VISÃO GLOBAL)";
        if (perfilUsuario !== 'master') {
            const empDoc = await db.collection("empresas").doc(dadosUsuarioLogado.empresaId).get();
            if(empDoc.exists) nomeEmpresaCliente = empDoc.data().nomeFantasia || empDoc.data().razaoSocial;
        } else if (dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
            const empDoc = await db.collection("empresas").doc(dadosUsuarioLogado.empresaId).get();
            if(empDoc.exists) nomeEmpresaCliente = empDoc.data().nomeFantasia || empDoc.data().razaoSocial;
        }

        const [redesSnap, usuariosSnap, vendedoresSnap, lojasSnap] = await Promise.all([
            db.collection("redes").get(),
            db.collection("usuarios").get(),
            db.collection("vendedores").get(),
            db.collection("lojas").get()
        ]);

        const redesMap = {}; redesSnap.forEach(r => redesMap[r.id] = r.data());
        const usuariosMap = {}; usuariosSnap.forEach(u => usuariosMap[u.id] = u.data());
        const vendedoresMap = {}; vendedoresSnap.forEach(v => vendedoresMap[v.id] = v.data());
        const lojasMap = {}; lojasSnap.forEach(l => lojasMap[l.id] = l.data());

        const arvore = {}; let totalGeralBordero = 0; let propostasVendedorLogado = 0; 
        let qtdePropostasExibidas = 0;

        propsSnap.forEach(doc => {
            const p = doc.data(); 
            const pId = doc.id;

            // ITEM 2 ROADMAP: A Barreira de Ferro do Relatório
            let pEmp = p.empresaId || p.hierarquia?.empresaId;
            let pVend = p.vendedorId || p.hierarquia?.vendedorId;

            if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
                if (pEmp !== dadosUsuarioLogado.empresaId) return; // Barra o vazamento JS vs HS
            }
            if (perfilUsuario === 'vendedor' && pVend !== usuarioLogado.uid) {
                return; // Impede um vendedor de ver os ganhos de outro
            }

            const vComissao = parseFloat(p.comissao) || parseFloat(p.hierarquia?.valorComissao) || 0;
            const valBase = parseFloat(p.valor) || 0;
            const dataProp = p.criadoEm ? new Date(p.criadoEm.toMillis()).toLocaleDateString('pt-BR') : '-';
            
            const redeId = p.hierarquia?.redeId || p.redeId || 'sem-rede'; 
            const lojaId = p.hierarquia?.lojaId || p.lojaId || 'sem-loja'; 
            const vendId = p.hierarquia?.vendedorId || p.vendedorId || 'sem-vendedor';
            const gerenteId = redesMap[redeId]?.gerenteId || p.hierarquia?.gerenteId || p.gerenteId || 'sem-gerente';

            totalGeralBordero += vComissao;
            if (perfilUsuario === 'vendedor') propostasVendedorLogado += vComissao;
            qtdePropostasExibidas++;

            const nomeGerenteLive = usuariosMap[gerenteId]?.nome || p.gerenteNome || 'Gerente Indefinido';
            const nomeRedeLive = redesMap[redeId]?.nome || p.hierarquia?.redeNome || p.redeNome || 'Rede Indefinida';
            const nomeLojaLive = lojasMap[lojaId]?.nome || p.hierarquia?.lojaNome || p.lojaNome || 'Loja Indefinida';
            const nomeVendedorLive = vendedoresMap[vendId]?.nome || p.hierarquia?.vendedorNome || p.vendedorNome || 'Vendedor Indefinido';

            if(!arvore[gerenteId]) arvore[gerenteId] = { nome: nomeGerenteLive, redes: {} };
            if(!arvore[gerenteId].redes[redeId]) arvore[gerenteId].redes[redeId] = { nome: nomeRedeLive, lojas: {} };
            if(!arvore[gerenteId].redes[redeId].lojas[lojaId]) arvore[gerenteId].redes[redeId].lojas[lojaId] = { nome: nomeLojaLive, vendedores: {} };
            
            if(!arvore[gerenteId].redes[redeId].lojas[lojaId].vendedores[vendId]) {
                arvore[gerenteId].redes[redeId].lojas[lojaId].vendedores[vendId] = { 
                    nome: nomeVendedorLive, 
                    pix: (vendedoresMap[vendId]?.pix || p.pix || 'Não informada'), 
                    lojaNome: nomeLojaLive,
                    propostas: [], 
                    subtotal: 0 
                };
            }

            p.docId = pId; p.dataFormatada = dataProp; p.valBase = valBase; p.vComissao = vComissao;
            arvore[gerenteId].redes[redeId].lojas[lojaId].vendedores[vendId].propostas.push(p);
            arvore[gerenteId].redes[redeId].lojas[lojaId].vendedores[vendId].subtotal += vComissao;
        });

        if(qtdePropostasExibidas === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #334155; font-size: 16px;">Você não possui permissão para visualizar propostas neste borderô.</p>'; 
            return;
        }

        const valorFinalExibido = perfilUsuario === 'vendedor' ? propostasVendedorLogado : totalGeralBordero;
        arvoreAtualPDF = arvore;
        dadosBorderôAtual = { id, codigo, vencimento, status, nomeEmpresa: nomeEmpresaCliente, totalGeral: valorFinalExibido };

        let htmlRelatorio = `
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #0047FF; padding-bottom: 15px;">
                <div style="text-align: left;">
                    <h2 style="margin: 0; color: #0f172a; font-weight: 900; font-size: 24px;">${nomeEmpresaCliente.toUpperCase()}</h2>
                    <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #E69138; letter-spacing: 1px;">SISTEMA INTEGRADO DE COMISSÕES</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0; color: #E69138; font-size: 16px; letter-spacing: 1px;">RELATÓRIO DE REPASSE</h3>
                    <p style="margin: 4px 0 0 0; font-weight: bold; font-size: 18px; color: #0f172a;">${codigo}</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #334155;">Vencimento: ${vencimento}</p>
                </div>
            </div>`;

        for (const [gId, g] of Object.entries(arvore)) {
            if (perfilUsuario === 'admin' || perfilUsuario === 'master') htmlRelatorio += `<div class="pdf-gerente" style="background: #0047FF; color: #ffffff; padding: 12px; margin-top: 20px; font-size: 14px; font-weight: bold; border-radius: 6px 6px 0 0;">Gestor: ${g.nome.toUpperCase()}</div>`;
            for (const [rId, r] of Object.entries(g.redes)) {
                if (perfilUsuario !== 'vendedor') htmlRelatorio += `<div class="pdf-rede" style="background: #0f172a; color: #ffffff; padding: 8px 10px; font-size: 13px; font-weight: bold;">REDE: ${r.nome}</div>`;
                for (const [lId, l] of Object.entries(r.lojas)) {
                    if (perfilUsuario !== 'vendedor') htmlRelatorio += `<div class="pdf-loja" style="background: #f8fafc; color: #0f172a; border-left: 4px solid #E69138; padding: 8px 10px; font-weight: bold; font-size: 12px; border-bottom: 1px solid #cbd5e1;">🏬 Loja: ${l.nome}</div>`;
                    for (const [vId, v] of Object.entries(l.vendedores)) {
                        if (perfilUsuario === 'vendedor') htmlRelatorio += `<div class="pdf-loja" style="background: #0047FF; color:white; padding: 8px 10px; font-weight: bold; font-size: 12px;">🏬 Sua Loja: ${l.nome}</div>`;

                        htmlRelatorio += `
                        <div class="pdf-vendedor" ${perfilUsuario === 'vendedor' ? 'style="border:none; margin:0; padding:10px 0;"' : 'style="margin-left: 15px; border-left: 2px solid #cbd5e1; padding-left: 10px; padding-bottom: 10px;"'}>
                            <div class="pdf-vendedor-header" style="color: #334155; font-weight: bold; font-size: 12px; margin-bottom: 8px; margin-top: 10px; display: flex; justify-content: space-between;">
                                <span>👤 VENDEDOR: <strong style="color:#0f172a;">${v.nome}</strong></span>
                                <span style="font-family: monospace; font-size: 11px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #E69138;">PIX: ${v.pix}</span>
                            </div>
                            <table class="pdf-table" style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px;">
                                <thead><tr>
                                    <th style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Data</th>
                                    <th style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Proposta</th>
                                    <th style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Cliente</th>
                                    <th style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Valor Total</th>
                                    <th style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left;">Comissão</th>
                                    <th class="no-print" style="background:#f1f5f9; color:#334155; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; width:40px;">Ação</th>
                                </tr></thead>
                                <tbody>
                                    ${v.propostas.map(p => {
                                        const btnRemover = (status === 'aberta' && (perfilUsuario === 'admin' || perfilUsuario === 'master')) 
                                            ? `<button style="background:none; border:none; color:#ef4444; cursor:pointer;" onclick="removerPropostaDaRemessa('${p.docId}')"><span class="material-symbols-rounded" style="font-size:16px;">output</span></button>` 
                                            : `-`;
                                            
                                        return `<tr>
                                            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${p.dataFormatada}</td>
                                            <td style="border: 1px solid #cbd5e1; font-weight:bold; padding: 6px 8px;">${p.codigo || '-'}</td>
                                            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${p.cliente || '-'}</td>
                                            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${formatarMoedaVisual(p.valBase)}</td>
                                            <td style="border: 1px solid #cbd5e1; font-weight:bold; color:#0047FF; padding: 6px 8px;">${formatarMoedaVisual(p.vComissao)}</td>
                                            <td class="no-print" style="text-align:center; border: 1px solid #cbd5e1;">${btnRemover}</td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                            <div class="pdf-subtotal" style="text-align: right; font-size: 12px; font-weight: bold; color: #0047FF;">Subtotal a Receber: ${formatarMoedaVisual(v.subtotal)}</div>
                        </div>`;
                    }
                }
            }
        }

        htmlRelatorio += `
            <div style="text-align: right; font-size: 18px; font-weight: 900; margin-top: 30px; padding-top: 15px; border-top: 2px solid #E69138; color: #0f172a;">
                TOTAL GERAL: <span style="color: #10b981;">${formatarMoedaVisual(valorFinalExibido)}</span>
            </div>
        `;
        
        container.innerHTML = htmlRelatorio;
    } catch (e) { console.error(e); }
}

window.fecharModalRemessa = function() { 
    document.getElementById("modalRemessa").classList.add("escondido"); 
    remessaAbertaId = null; 
}

window.removerPropostaDaRemessa = async function(propostaId) {
    if(!confirm("Deseja retirar esta proposta deste borderô?\n\nEla voltará para o status 'Aprovada' (Em fila de espera) na Mesa de Propostas.")) return;
    try {
        let userLogadoNome = "Administrador";
        if (typeof dadosUsuarioLogado !== 'undefined' && dadosUsuarioLogado && dadosUsuarioLogado.nome) {
            userLogadoNome = dadosUsuarioLogado.nome;
        }

        await db.collection("propostas").doc(propostaId).update({
            status: 'aprovada',
            borderoId: firebase.firestore.FieldValue.delete(),
            borderoNome: firebase.firestore.FieldValue.delete(),
            dataAgendamento: firebase.firestore.FieldValue.delete(),
            historico: firebase.firestore.FieldValue.arrayUnion({ acao: `Removida do Borderô manualmente`, usuario: userLogadoNome, data: new Date().toLocaleString('pt-BR') })
        });
        
        if(typeof mostrarToast === 'function') mostrarToast("✅ Proposta desvinculada. Ela voltou para a fila!");
        else alert("Proposta desvinculada com sucesso.");

        const dRemessa = await db.collection("remessas").doc(remessaAbertaId).get();
        if(dRemessa.exists) {
            const dr = dRemessa.data();
            abrirDetalhesRemessa(remessaAbertaId, dr.codigo||dr.identificador, dr.dataVencimento, dr.status);
        }
    } catch (error) { alert("Erro ao desvincular proposta."); console.error(error); }
}

window.liquidarRemessa = async function() {
    if(!remessaAbertaId) return;
    if(!confirm("ATENÇÃO: Deseja liquidar este Borderô? Todas as propostas contidas nele serão marcadas como PAGAS.")) return;
    document.getElementById("btnLiquidar").innerText = "Processando..."; document.getElementById("btnLiquidar").disabled = true;

    try {
        const batch = db.batch();
        const remessaRef = db.collection("remessas").doc(remessaAbertaId);
        batch.update(remessaRef, { status: 'paga', dataPagamento: firebase.firestore.FieldValue.serverTimestamp() });

        const propsSnap = await db.collection("propostas").where("borderoId", "==", remessaAbertaId).get();
        propsSnap.forEach(docProp => { 
            batch.update(docProp.ref, { 
                status: 'paga',
                historico: firebase.firestore.FieldValue.arrayUnion({ acao: `Comissão Paga via Borderô`, usuario: (dadosUsuarioLogado?.nome || 'Admin'), data: new Date().toLocaleString('pt-BR') })
            }); 
        });

        await batch.commit();
        if(typeof mostrarToast === 'function') mostrarToast("✅ Borderô liquidado com sucesso!"); 
        fecharModalRemessa();
    } catch(e) { alert("Erro ao processar."); } finally { document.getElementById("btnLiquidar").innerText = "💰 Liquidar Borderô"; document.getElementById("btnLiquidar").disabled = false; }
}

window.estornarRemessa = async function() {
    if(!remessaAbertaId) return;
    if(!confirm("ATENÇÃO: Deseja ESTORNAR este Borderô? Ele voltará a ficar 'Aberto' e as propostas voltarão a ficar 'Agendadas'.")) return;
    document.getElementById("btnEstornar").innerText = "Processando..."; document.getElementById("btnEstornar").disabled = true;

    try {
        const batch = db.batch();
        batch.update(db.collection("remessas").doc(remessaAbertaId), { status: 'aberta', dataPagamento: firebase.firestore.FieldValue.delete() });
        const propsSnap = await db.collection("propostas").where("borderoId", "==", remessaAbertaId).get();
        propsSnap.forEach(docProp => { 
            batch.update(docProp.ref, { 
                status: 'agendada',
                historico: firebase.firestore.FieldValue.arrayUnion({ acao: `Pagamento Estornado. Voltou para Agendada.`, usuario: (dadosUsuarioLogado?.nome || 'Admin'), data: new Date().toLocaleString('pt-BR') })
            }); 
        });
        await batch.commit();
        if(typeof mostrarToast === 'function') mostrarToast("⏪ Borderô estornado com sucesso!"); 
        fecharModalRemessa();
    } catch(e) { alert("Erro ao estornar."); } finally { document.getElementById("btnEstornar").innerText = "⏪ Estornar Pagamento"; document.getElementById("btnEstornar").disabled = false; }
}

window.excluirRemessa = async function() {
    if(!remessaAbertaId) return;
    document.getElementById("btnExcluir").innerText = "Verificando..."; document.getElementById("btnExcluir").disabled = true;

    try {
        const propsSnap = await db.collection("propostas").where("borderoId", "==", remessaAbertaId).get();
        if (!propsSnap.empty) {
            alert("⛔ AÇÃO BLOQUEADA: Não é possível excluir uma remessa que contém dinheiro (propostas).\n\nPara excluir este borderô, clique no ícone vermelho de retirar (na tabela acima) para remover as propostas uma a uma.");
            document.getElementById("btnExcluir").innerText = "🗑️ Excluir Borderô"; document.getElementById("btnExcluir").disabled = false;
            return;
        }

        if(!confirm("Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este Borderô Vazio?")) {
            document.getElementById("btnExcluir").innerText = "🗑️ Excluir Borderô"; document.getElementById("btnExcluir").disabled = false;
            return;
        }

        document.getElementById("btnExcluir").innerText = "Excluindo..."; 
        await db.collection("remessas").doc(remessaAbertaId).delete();

        if(typeof mostrarToast === 'function') mostrarToast("🗑️ Borderô vazio excluído."); 
        fecharModalRemessa();
    } catch(e) { 
        alert("Erro ao excluir."); console.error(e);
    } finally { 
        if(document.getElementById("btnExcluir")) { document.getElementById("btnExcluir").innerText = "🗑️ Excluir Borderô"; document.getElementById("btnExcluir").disabled = false; }
    }
}

// 7. EXPORTAR PDF ANALÍTICO
window.exportarPDF = function() {
    const btn = document.getElementById("btnExportar");
    const textoOriginal = btn.innerText;
    btn.innerText = "⏳ Preparando..."; btn.disabled = true;

    try {
        const conteudo = document.getElementById("conteudoPrint").innerHTML;
        const codigoRemessa = document.getElementById("printCodigoRemessa") ? document.getElementById("printCodigoRemessa").innerText : "Relatorio";

        let iframe = document.getElementById('iframePrint');
        if (iframe) iframe.remove(); 

        iframe = document.createElement('iframe');
        iframe.id = 'iframePrint';
        iframe.style.position = 'absolute';
        iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Relatório Analítico - ${codigoRemessa}</title>
                    <style>
                        @media print {
                            @page { margin: 10mm; }
                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            .no-print { display: none !important; }
                        }
                        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 10px; background: #fff;}
                    </style>
                </head>
                <body>
                    ${conteudo}
                </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus(); iframe.contentWindow.print();
            btn.innerText = textoOriginal; btn.disabled = false;
        }, 500);

    } catch (erro) {
        console.error("Erro na impressão:", erro);
        alert("Erro ao preparar o documento. Detalhe: " + erro.message);
        btn.innerText = textoOriginal; btn.disabled = false;
    }
}

// 8. EXPORTAR PDF SINTÉTICO (BANCO)
window.exportarPDFSintetico = function() {
    if(!arvoreAtualPDF || !dadosBorderôAtual) return alert("Erro ao carregar dados do borderô.");
    
    const btn = document.getElementById("btnExportarSintetico");
    if(btn) { btn.innerText = "⏳ Gerando..."; btn.disabled = true; }

    try {
        let listaVendedores = [];
        for (const g of Object.values(arvoreAtualPDF)) {
            for (const r of Object.values(g.redes)) {
                for (const l of Object.values(r.lojas)) {
                    for (const v of Object.values(l.vendedores)) {
                        listaVendedores.push(v);
                    }
                }
            }
        }

        const conteudoSintetico = `
            <div style="padding: 20px; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
                <div style="text-align: center; border-bottom: 2px solid #0047FF; padding-bottom: 10px; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 20px; color: #111;">${dadosBorderôAtual.nomeEmpresa.toUpperCase()}</h1>
                    <p style="margin: 5px 0; font-weight: bold; color: #0047FF;">RELATÓRIO SINTÉTICO PARA PAGAMENTO (BANCO)</p>
                    <p style="margin: 0; font-size: 12px; color: #333;">Borderô: ${dadosBorderôAtual.codigo} | Vencimento: ${dadosBorderôAtual.vencimento}</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 10px; text-align: left; color: #111; border: 1px solid #cbd5e1;">VENDEDOR / BENEFICIÁRIO</th>
                            <th style="padding: 10px; text-align: left; color: #111; border: 1px solid #cbd5e1;">LOJA</th>
                            <th style="padding: 10px; text-align: left; color: #111; border: 1px solid #cbd5e1;">CHAVE PIX</th>
                            <th style="padding: 10px; text-align: center; color: #111; border: 1px solid #cbd5e1;">QTD APROVADAS</th>
                            <th style="padding: 10px; text-align: right; color: #111; border: 1px solid #cbd5e1;">VALOR TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${listaVendedores.map(v => `
                            <tr>
                                <td style="padding: 10px; font-weight: bold; color: #111; border: 1px solid #cbd5e1;">${v.nome.toUpperCase()}</td>
                                <td style="padding: 10px; font-size: 11px; color: #333; border: 1px solid #cbd5e1;">${v.lojaNome.toUpperCase()}</td>
                                <td style="padding: 10px; font-family: monospace; font-size: 12px; color: #111; border: 1px solid #cbd5e1;">${v.pix}</td>
                                <td style="padding: 10px; text-align: center; font-weight: bold; color: #111; border: 1px solid #cbd5e1;">${v.propostas.length}</td>
                                <td style="padding: 10px; text-align: right; font-weight: bold; color: #10b981; border: 1px solid #cbd5e1;">${formatarMoedaVisual(v.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="text-align: right; margin-top: 30px; font-size: 18px; font-weight: 900; border-top: 2px solid #0047FF; padding-top: 10px; color:#111;">
                    TOTAL DO BORDERÔ: <span style="color: #10b981;">${formatarMoedaVisual(dadosBorderôAtual.totalGeral)}</span>
                </div>
                <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8;">
                    Gerado automaticamente por F1A Platform em ${new Date().toLocaleString('pt-BR')}
                </div>
            </div>
        `;

        let iframe = document.getElementById('iframePrintSintetico');
        if (iframe) iframe.remove(); 
        iframe = document.createElement('iframe'); iframe.id = 'iframePrintSintetico';
        iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document; doc.open();
        doc.write(`<html><head><title>Sintético - ${dadosBorderôAtual.codigo}</title><style>@media print { @page { margin: 10mm; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body style="background:#fff;">${conteudoSintetico}</body></html>`);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus(); iframe.contentWindow.print();
            if(btn) { btn.innerText = "📑 PDF Sintético (Banco)"; btn.disabled = false; }
        }, 500);
    } catch (e) { 
        console.error(e); alert("Erro ao gerar PDF Sintético.");
        if(btn) { btn.innerText = "📑 PDF Sintético (Banco)"; btn.disabled = false; }
    }
}

// ==========================================
// FILTROS DA TELA DE REMESSAS (NOVO)
// ==========================================
window.aplicarFiltrosRemessas = function() {
    const termoBusca = document.getElementById("filtroBuscaRem")?.value.toLowerCase() || "";
    const statusDesejado = document.getElementById("filtroStatusRem")?.value || "";

    const linhas = document.querySelectorAll(".remessa-item");

    linhas.forEach(linha => {
        const codigoLinha = linha.getAttribute("data-codigo") || "";
        const htmlLinha = linha.innerHTML.toLowerCase(); 
        
        // Pega o status olhando se tem a palavra 'paga' ou 'liquidada' na linha
        const isPaga = htmlLinha.includes("liquidada") || htmlLinha.includes("paga");
        const statusLinha = isPaga ? "paga" : "aberta";

        let exibir = true;

        if (termoBusca && !codigoLinha.includes(termoBusca)) exibir = false;
        if (statusDesejado && statusLinha !== statusDesejado) exibir = false;

        // Ao invés de conflitar com o display: none do carregamento, injetamos a classe CSS
        if (exibir) {
            linha.classList.remove("escondido-por-filtro");
        } else {
            linha.classList.add("escondido-por-filtro");
        }
    });
}

window.limparFiltrosRemessas = function() {
    if(document.getElementById("filtroBuscaRem")) document.getElementById("filtroBuscaRem").value = "";
    if(document.getElementById("filtroStatusRem")) document.getElementById("filtroStatusRem").value = "";
    aplicarFiltrosRemessas();
}
window.alterarNomeExibicao = async function() {
    const novoNome = prompt("Digite como você gostaria de ser chamado(a):");
    if (!novoNome || novoNome.trim() === "") return;
    
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await firebase.firestore().collection("usuarios").doc(user.uid).update({ 
                nome: novoNome.trim().toUpperCase() 
            });
            alert("✅ Nome atualizado com sucesso!");
            window.location.reload();
        }
    } catch (error) {
        alert("Erro ao atualizar o nome: " + error.message);
    }
}