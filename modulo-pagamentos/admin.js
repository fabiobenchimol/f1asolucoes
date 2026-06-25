// ==========================================
// MÓDULO MASTER E AGENDAMENTOS (admin.js) - ATUALIZADO
// ==========================================

let propostaAgendamentoId = null;

window.abrirModalAgendamento = function(idProp) {
    propostaAgendamentoId = idProp; 
    const sel = document.getElementById("agendamentoBorderoSelect"); 
    if(!sel) return;
    sel.innerHTML = '<option value="">Buscando borderôs...</option>';
    
    // REMOVIDA A TRAVA DE EMPRESAID PARA PERMITIR BORDERÔS MISTOS!
    db.collection("remessas").where("status", "==", "aberta").get().then(snap => {
        sel.innerHTML = '<option value="">Selecione um Borderô Aberto...</option>';
        let remessasAbertas = [];
        
        snap.forEach(doc => { 
            remessasAbertas.push({ id: doc.id, ...doc.data() }); 
        });
        
        // Ordena para que os mais recentes fiquem no topo
        remessasAbertas.sort((a, b) => (b.criadoEm ? b.criadoEm.toMillis() : 0) - (a.criadoEm ? a.criadoEm.toMillis() : 0));
        
        if(remessasAbertas.length === 0) { 
            sel.innerHTML = '<option value="">Nenhum borderô aberto encontrado.</option>'; 
            return; 
        }
        
        remessasAbertas.forEach(d => { 
            sel.innerHTML += `<option value="${d.id}" data-nome="${d.codigo || d.identificador}" data-venc="${d.dataVencimento}">[${d.dataVencimento}] - ${d.codigo || d.identificador}</option>`; 
        });
    }).catch(err => {
        console.error("Erro ao carregar borderôs no modal:", err);
        sel.innerHTML = '<option value="">Erro ao buscar borderôs.</option>';
    });
    
    document.getElementById("modalAgendamento").classList.remove("escondido");
}

window.fecharModalAgendamento = function() { 
    document.getElementById("modalAgendamento").classList.add("escondido"); 
    propostaAgendamentoId = null; 
}

window.confirmarAgendamento = function() {
    const sel = document.getElementById("agendamentoBorderoSelect"); if(!sel || !sel.value) return; const opt = sel.options[sel.selectedIndex];
    
    // Fallback do log historico (caso o propostas.js não tenha carregado a tempo)
    const logRegistro = typeof criarRegistroHistorico === 'function' 
        ? criarRegistroHistorico(`Agendada no Borderô ${opt.dataset.nome}`) 
        : { acao: `Agendada no Borderô ${opt.dataset.nome}`, usuario: dadosUsuarioLogado?.nome || 'Usuário', data: new Date().toLocaleString('pt-BR') };

    db.collection("propostas").doc(propostaAgendamentoId).update({ 
        status: 'agendada', 
        borderoId: sel.value, 
        borderoNome: opt.dataset.nome, 
        dataAgendamento: opt.dataset.venc, 
        historico: firebase.firestore.FieldValue.arrayUnion(logRegistro) 
    }).then(() => { 
        if(typeof mostrarToast === 'function') mostrarToast(`✅ Proposta agendada com sucesso!`);
        fecharModalAgendamento(); 
    }).catch(err => alert("Erro ao agendar: " + err));
}

window.criarBorderoEAgendar = async function(event) {
    const dataInput = document.getElementById("novaRemessaData").value; if(!dataInput) return; const [ano, mes, dia] = dataInput.split('-'); const dataVenc = `${dia}/${mes}/${ano}`;
    const btn = event ? event.target : document.querySelector('button[onclick="criarBorderoEAgendar()"]'); 
    if(btn) { btn.innerText = "⏳ Criando..."; btn.disabled = true; }
    
    try {
        const propDoc = await db.collection("propostas").doc(propostaAgendamentoId).get(); const d = propDoc.data(); const codigoRemessa = `REM-${Math.floor(1000 + Math.random() * 9000)}`;
        const remessaRef = await db.collection("remessas").add({ 
            codigo: codigoRemessa, 
            identificador: codigoRemessa, 
            dataVencimento: dataVenc, 
            status: 'aberta', 
            gerenteId: (d.hierarquia?.gerenteId || d.gerenteId || usuarioLogado.uid), 
            empresaId: d.empresaId || dadosUsuarioLogado.empresaId, 
            criadoEm: firebase.firestore.FieldValue.serverTimestamp() 
        });

        const logRegistro = typeof criarRegistroHistorico === 'function' 
            ? criarRegistroHistorico(`Borderô ${codigoRemessa} criado e agendado.`) 
            : { acao: `Borderô ${codigoRemessa} criado e agendado.`, usuario: dadosUsuarioLogado?.nome || 'Usuário', data: new Date().toLocaleString('pt-BR') };

        await db.collection("propostas").doc(propostaAgendamentoId).update({ 
            status: 'agendada', 
            borderoId: remessaRef.id, 
            borderoNome: codigoRemessa, 
            dataAgendamento: dataVenc, 
            historico: firebase.firestore.FieldValue.arrayUnion(logRegistro) 
        });

        if(typeof mostrarToast === 'function') mostrarToast(`✅ Borderô ${codigoRemessa} criado e agendado!`); else alert(`✅ Borderô ${codigoRemessa} criado e agendado!`);
        fecharModalAgendamento();
    } catch (e) { 
        alert("Erro ao criar o borderô: " + e.message); 
    } finally { 
        if(btn) { btn.innerHTML = '<span class="material-symbols-rounded" style="vertical-align: middle;">add_circle</span> Criar e Agendar'; btn.disabled = false; }
        document.getElementById("novaRemessaData").value = ""; 
    }
}

window.injetarDropdownMaster = async function() {
    if (document.getElementById('blocoMasterView')) return;
    const btnNovaProposta = document.querySelector('button[onclick*="abrirModal"]'); if (!btnNovaProposta) return;
    const selectContainer = document.createElement('div'); selectContainer.id = 'blocoMasterView'; selectContainer.style.cssText = "display: inline-block; margin-left: 15px; vertical-align: middle;"; 
    selectContainer.innerHTML = `<select id="selectMasterView" style="padding: 8px 15px; border-radius: 6px; border: none; background-color: var(--cor-primaria, #2563eb); color: #ffffff; font-size: 12px; font-weight: bold; cursor: pointer; outline: none;"><option value="global" style="background: #ffffff; color: #333333;">👑 VISÃO GLOBAL (TODAS AS EMPRESAS)</option></select>`;
    btnNovaProposta.parentNode.insertBefore(selectContainer, btnNovaProposta.nextSibling);
    const selectEl = document.getElementById('selectMasterView');
    try {
        const empSnap = await db.collection("empresas").get();
        empSnap.forEach(doc => { selectEl.innerHTML += `<option value="${doc.id}" style="background: #ffffff; color: #333333;">🏢 ${doc.data().nomeFantasia || doc.data().razaoSocial}</option>`; });
        selectEl.value = localStorage.getItem("f1a_master_view") || "global";
        selectEl.addEventListener('change', (e) => {
            localStorage.setItem("f1a_master_view", e.target.value);
            document.body.innerHTML += `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:var(--bg-body);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;"><span class="material-symbols-rounded" style="font-size:40px; color:var(--cor-primaria); animation: spin 1s linear infinite;">sync</span><h2 style="color:var(--cor-titulo); margin-top:15px;">Trocando de Ambiente...</h2></div><style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>`;
            setTimeout(() => window.location.reload(), 400);
        });
    } catch (e) { console.error("Erro Dropdown", e); }
}


// ==========================================
// FUNÇÃO FALTANTE: CARREGAR TABELA DE REMESSAS
// ==========================================
window.carregarRemessas = function() {
    const corpoTabela = document.getElementById("listaBorderos");
    if (!corpoTabela) return;

    let query = db.collection("remessas");
    
    // Regra SaaS: Filtra pela Empresa do usuário (se não for Master)
    if (perfilUsuario !== 'master' && dadosUsuarioLogado && dadosUsuarioLogado.empresaId) {
        query = query.where("empresaId", "==", dadosUsuarioLogado.empresaId);
    }

    query.orderBy("criadoEm", "desc").onSnapshot(snap => {
        corpoTabela.innerHTML = "";
        if (snap.empty) {
            corpoTabela.innerHTML = "<tr><td colspan='6' style='text-align: center; padding: 30px; color: var(--cor-texto);'>Nenhum borderô financeiro encontrado.</td></tr>";
            return;
        }

        snap.forEach(doc => {
            const d = doc.data();
            
            let dataCriacao = '--/--/----';
            if (d.criadoEm && typeof d.criadoEm.toDate === 'function') {
                const dataBase = d.criadoEm.toDate();
                dataCriacao = `${String(dataBase.getDate()).padStart(2, '0')}/${String(dataBase.getMonth() + 1).padStart(2, '0')}/${dataBase.getFullYear()}`;
            }
            
            const valorTotalStr = typeof formatarMoedaF1A === 'function' ? formatarMoedaF1A(d.valorTotal || 0) : `R$ ${parseFloat(d.valorTotal || 0).toFixed(2).replace('.', ',')}`;
            const statusLabel = (d.status || 'aberta').toLowerCase();
            const badgeClass = statusLabel === 'paga' || statusLabel === 'pago' ? 'badge-aprovada' : 'badge-pendente';

            corpoTabela.innerHTML += `
                <tr style="cursor: pointer;" onclick="alert('Funcionalidade de Detalhes da Remessa em construção!')">
                    <td style="font-weight:bold; color:var(--cor-titulo);">#${d.codigo || d.identificador || doc.id.substring(0,8)}</td>
                    <td style="color:var(--cor-texto);">${dataCriacao}</td>
                    <td style="color:var(--f1a-copper); font-weight:bold;"><span class="material-symbols-rounded" style="font-size:14px; vertical-align:middle;">event</span> ${d.dataVencimento || 'A Definir'}</td>
                    <td style="font-weight:bold; color:var(--f1a-blue);">${valorTotalStr}</td>
                    <td><span class="status-badge ${badgeClass}">${statusLabel.toUpperCase()}</span></td>
                    <td><button class="btn-icon" style="color:var(--f1a-copper);"><span class="material-symbols-rounded">visibility</span></button></td>
                </tr>
            `;
        });
    }, error => {
        console.error("Erro ao carregar remessas: ", error);
        corpoTabela.innerHTML = "<tr><td colspan='6' style='text-align: center; padding: 30px; color: #ef4444;'>Erro ao carregar borderôs. Verifique o console.</td></tr>";
    });
}