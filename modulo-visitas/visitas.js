// ============================================================================
// MÓDULO: PLANNER DE VISITAS E PONTO (PROMOTORAS)
// ARQUIVO: visitas.js
// ============================================================================

let dataAtual = new Date();
let lojasGlobais = [];
let configLocomocaoGlobal = []; // Guarda a tabela de preços de transporte global
let promotoraSelecionadaId = "";
let listaVisitasMes = []; 
let configMetaGlobal = null; 
let isUserAdminGlobal = false;
let listenerVisitas = null; 

document.addEventListener("DOMContentLoaded", () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const doc = await db.collection("usuarios").doc(user.uid).get();
                if (doc.exists) {
                    const dadosUsuario = doc.data();
                    const perfil = String(dadosUsuario.perfil || dadosUsuario.cargo || '').toLowerCase().trim();
                    isUserAdminGlobal = (perfil === 'master' || perfil === 'admin');

                    // Preenche as informações no cabeçalho
                    const nome = dadosUsuario.nome || "Usuário";
                    document.getElementById("nomeUsuario").innerText = nome;
                    document.getElementById("cargoUsuario").innerText = perfil.toUpperCase();
                    document.getElementById("iniciaisUsuario").innerText = nome.substring(0, 2).toUpperCase();

                    if (isUserAdminGlobal) {
                        await iniciarSistemaVisitas(true); 
                    } else { 
                        aplicarRestricoesUI_Vendedor(); 
                        promotoraSelecionadaId = user.uid; 
                        await iniciarSistemaVisitas(false); 
                    }
                }
            } catch (error) { console.error(error); }
        } else { window.location.replace("../index.html"); }
    });
});

window.fazerLogout = function() {
    if(confirm("Deseja realmente sair do sistema?")) {
        firebase.auth().signOut().then(() => window.location.replace("../index.html"));
    }
};

function aplicarRestricoesUI_Vendedor() {
    const menuMetas = document.querySelector('a[href="metas.html"]');
    if (menuMetas) menuMetas.style.display = 'none';
    const painelAdmin = document.getElementById('painelControlesAdmin');
    if (painelAdmin) painelAdmin.style.display = 'none';
    const style = document.createElement('style');
    style.innerHTML = `.btn-add-visita { display: none !important; }`;
    document.head.appendChild(style);
}

/** ==============================
 * CARREGAMENTO DE DADOS
 * ============================== */
async function iniciarSistemaVisitas(isAdmin) {
    await carregarLojasEConfigGlobais();
    if (isAdmin) await carregarPromotoras();
    else await carregarMetasDaPromotora(promotoraSelecionadaId);
    renderizarSemana(dataAtual);
}

async function carregarLojasEConfigGlobais() {
    try {
        // 1. Carregar lista de Lojas
        const snap = await db.collection("cartao_lojas").orderBy("nome").get();
        lojasGlobais = [];
        const select = document.getElementById("visitaLojaSelect");
        if(select) select.innerHTML = '<option value="">Selecione o Cliente / Loja...</option>';
        snap.forEach(doc => {
            lojasGlobais.push({ id: doc.id, nome: doc.data().nome });
            if(select) select.innerHTML += `<option value="${doc.id}">${doc.data().nome}</option>`;
        });

        // 2. Carregar Tabela Global de Locomoção
        const docGlob = await db.collection("visitas_config_metas").doc("GLOBAL_LOJAS").get();
        if (docGlob.exists) {
            configLocomocaoGlobal = docGlob.data().ajudaDeCusto || [];
        }
    } catch (e) { console.error(e); }
}

async function carregarPromotoras() {
    const select = document.getElementById('filtroPromotora');
    if (!select) return;
    try {
        const snap = await db.collection("usuarios").orderBy("nome").get();
        let primeiroId = "";
        let encontrou = false;
        select.innerHTML = '<option value="">-- Selecione a Equipe --</option>';

        snap.forEach(doc => {
            const d = doc.data();
            let m = d.modulosAcesso || []; 
            if (!Array.isArray(m)) m = [m];
            
            // REGRA: Tem acesso ao módulo E é Vendedor ou Gerente
            const temAcesso = m.includes('Check-in / Check-out') || m.includes('visitas');
            const perfilUsuario = String(d.perfil || d.cargo || '').toLowerCase().trim();
            const ehPublicoAlvo = (perfilUsuario === 'vendedor' || perfilUsuario === 'gerente');

            if (temAcesso && ehPublicoAlvo) {
                select.innerHTML += `<option value="${doc.id}">${d.nome || d.email}</option>`;
                encontrou = true; 
                if(!primeiroId) primeiroId = doc.id; 
            }
        });

        if (!encontrou) { 
            document.getElementById('labelSemanaAtual').innerText = "Sem Equipe"; 
        } else if (primeiroId) { 
            select.value = primeiroId; 
            promotoraSelecionadaId = primeiroId; 
            await carregarMetasDaPromotora(primeiroId); 
        }
    } catch (e) { console.error(e); }
}

async function carregarMetasDaPromotora(id) {
    try {
        const doc = await db.collection("visitas_config_metas").doc(id).get();
        configMetaGlobal = doc.exists ? doc.data() : null;
    } catch(e) { console.error(e); }
}

window.trocarVisaoPromotora = async function() {
    promotoraSelecionadaId = document.getElementById('filtroPromotora').value;
    const btnCopiar = document.getElementById('btnCopiarSemana');
    if(promotoraSelecionadaId) {
        await carregarMetasDaPromotora(promotoraSelecionadaId);
        if(btnCopiar) btnCopiar.classList.remove('escondido');
        renderizarSemana(dataAtual); 
    } else {
        if(btnCopiar) btnCopiar.classList.add('escondido');
        limparGrelha(); configMetaGlobal = null;
        document.getElementById('labelSemanaAtual').innerText = "Selecione a Equipe";
    }
}

/** ==============================
 * CALENDÁRIO E TEMPO REAL
 * ============================== */
window.mudarSemana = function(d) { dataAtual.setDate(dataAtual.getDate() + (d * 7)); renderizarSemana(dataAtual); };
window.irParaHoje = function() { dataAtual = new Date(); renderizarSemana(dataAtual); };

function obterSegundaFeira(data) {
    const d = new Date(data); const dif = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - dif); d.setHours(0,0,0,0); return d;
}

function renderizarSemana(dataBase) {
    if(!promotoraSelecionadaId) return; 
    const segunda = obterSegundaFeira(dataBase);
    const diasNomes = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
    const cabecalhos = document.querySelectorAll('.pg-cabecalho');
    let dataFimDaSemana;

    for (let i = 0; i < 7; i++) {
        const d = new Date(segunda); d.setDate(segunda.getDate() + i);
        if(i === 6) dataFimDaSemana = d; 
        if(cabecalhos[i]) {
            cabecalhos[i].innerHTML = `<span>${diasNomes[i]}</span> <br><span style="font-size: 10px; font-weight: normal;">${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}</span>`;
            cabecalhos[i].dataset.dataIso = d.toISOString().split('T')[0]; 
        }
    }
    buscarVisitasEmTempoReal(dataBase);
}

function buscarVisitasEmTempoReal(dataBase) {
    if (listenerVisitas) listenerVisitas(); 
    document.getElementById('labelSemanaAtual').innerText = "A carregar dados...";
    limparGrelha();

    const d = new Date(dataBase);
    const strInicioMes = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const strFimMes = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    const strInicioSemana = obterSegundaFeira(dataBase).toISOString().split('T')[0];
    const domingoSemana = new Date(obterSegundaFeira(dataBase)); domingoSemana.setDate(domingoSemana.getDate() + 6);
    const strFimSemana = domingoSemana.toISOString().split('T')[0];

    listenerVisitas = db.collection("visitas_agenda").where("promotoraId", "==", promotoraSelecionadaId)
        .onSnapshot(snap => {
            listaVisitasMes = [];
            snap.forEach(doc => {
                const v = { id: doc.id, ...doc.data() };
                if (v.data >= strInicioMes && v.data <= strFimMes) {
                    v.cartoesAprovados = v.cartoesAprovados || [];
                    listaVisitasMes.push(v);
                }
            });

            processarMetasInteligentes();
            limparGrelha();
            listaVisitasMes.forEach(v => { if (v.data >= strInicioSemana && v.data <= strFimSemana) desenharCardVisita(v); });

            const visitaIdAtual = document.getElementById('visitaIdAtual').value;
            const modalAberto = !document.getElementById('modalVisita').classList.contains('escondido');
            if (modalAberto && visitaIdAtual) {
                const visitaRefresh = listaVisitasMes.find(v => v.id === visitaIdAtual);
                if(visitaRefresh) { atualizarInterfacePonto(visitaRefresh); atualizarTimeline(visitaRefresh); atualizarListaCartoes(visitaRefresh); }
            }
            const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            document.getElementById('labelSemanaAtual').innerText = `${obterSegundaFeira(dataBase).getDate()} ${meses[obterSegundaFeira(dataBase).getMonth()]} - ${domingoSemana.getDate()} ${meses[domingoSemana.getMonth()]} ${domingoSemana.getFullYear()}`;
            atualizarKPIs();
        });
}

function processarMetasInteligentes() {
    if (!configMetaGlobal || !configMetaGlobal.cartoesBase) { listaVisitasMes.forEach(v => v.metaHistorica = 1); return; }
    const visitasOrdenadas = [...listaVisitasMes].sort((a, b) => new Date(`${a.data}T${a.horaInicio}`) - new Date(`${b.data}T${b.horaInicio}`));
    let faltantes = configMetaGlobal.cartoesBase, restantes = visitasOrdenadas.length;

    visitasOrdenadas.forEach(v => {
        let metaAtual = Math.ceil(faltantes / restantes); if (metaAtual < 1) metaAtual = 1;
        v.metaHistorica = metaAtual;
        if (v.status === 'concluido') {
            faltantes -= (v.cartoesAprovados ? v.cartoesAprovados.length : 0);
            restantes--; if (faltantes < 0) faltantes = 0; 
        }
    });
}

function desenharCardVisita(v) {
    const dataObj = new Date(v.data + "T00:00:00");
    const idia = dataObj.getDay() === 0 ? 6 : dataObj.getDay() - 1; 
    const pref = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
    const cel = document.getElementById(`cel-${pref[idia]}-${v.turno}`);

    if (cel) {
        const loja = lojasGlobais.find(l => l.id === v.lojaId);
        let status = v.status === 'concluido' ? 'status-concluido' : (v.status === 'andamento' ? 'status-andamento' : 'status-pendente');
        const aprovados = v.cartoesAprovados ? v.cartoesAprovados.length : 0;
        const meta = v.metaHistorica || 1; 
        const classeMeta = aprovados >= meta ? 'meta-atingida' : '';
        
        cel.classList.add('ocupada');
        
        const card = document.createElement('div');
        card.className = `card-visita ${status}`;
        card.style.position = "relative";
        card.style.zIndex = "10";
        
        card.innerHTML = `
            <div class="cv-loja">${loja ? loja.nome : "Desconhecida"}</div>
            <div class="cv-hora"><span class="material-symbols-rounded" style="font-size: 14px;">schedule</span> ${v.horaInicio} - ${v.horaFim}</div>
            <div class="cv-contador ${classeMeta}">Cartões: ${aprovados}/${meta}</div>
        `;

        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            abrirModalVisita(idia, v.turno, v.id);
        });

        cel.appendChild(card);
    }
}

function limparGrelha() {
    document.querySelectorAll('.pg-celula').forEach(c => {
        if (c.id) {
            c.classList.remove('ocupada'); 
            const p = c.id.split('-'); 
            const idia = { "seg":"0", "ter":"1", "qua":"2", "qui":"3", "sex":"4", "sab":"5", "dom":"6" }[p[1]];
            c.innerHTML = `<button class="btn-add-visita" onclick="abrirModalVisita('${idia}', '${p[2]}')"><span class="material-symbols-rounded">add</span></button>`;
        }
    });
}

/** ==============================
 * AÇÕES ADMIN (SALVAR / EXCLUIR)
 * ============================== */
window.copiarSemanaAnterior = async function() { 
    if(!promotoraSelecionadaId || !confirm("Copiar a agenda da semana passada?")) return;
    const btn = document.getElementById('btnCopiarSemana'); btn.innerText = "A Copiar...";
    const seg = obterSegundaFeira(dataAtual);
    const sPassada = new Date(seg); sPassada.setDate(sPassada.getDate() - 7);
    const dPassado = new Date(sPassada); dPassado.setDate(dPassado.getDate() + 6);

    try {
        const snap = await db.collection("visitas_agenda").where("promotoraId", "==", promotoraSelecionadaId).get();
        const batch = db.batch(); let count = 0;
        snap.forEach(doc => {
            const d = doc.data();
            if(d.data >= sPassada.toISOString().split('T')[0] && d.data <= dPassado.toISOString().split('T')[0]) {
                const nova = new Date(d.data + "T00:00:00"); nova.setDate(nova.getDate() + 7); 
                batch.set(db.collection("visitas_agenda").doc(), { ...d, data: nova.toISOString().split('T')[0], status: 'pendente' });
                count++;
            }
        });
        if(count === 0) return alert("Sem visitas na semana passada.");
        await batch.commit(); alert(`✅ ${count} visitas copiadas.`);
    } catch(e) { console.error(e); } finally { btn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 16px;">content_copy</span> Repetir Escala`; }
}

window.salvarVisitaFirebase = async function(e) {
    e.preventDefault(); if (!isUserAdminGlobal) return; 
    const vId = document.getElementById('visitaIdAtual').value;
    const pacote = {
        promotoraId: promotoraSelecionadaId,
        data: document.getElementById(`cab-${document.getElementById('visitaDiaIndice').value}`).dataset.dataIso,
        turno: document.getElementById('visitaTurnoAtual').value,
        lojaId: document.getElementById('visitaLojaSelect').value,
        horaInicio: document.getElementById('visitaHoraInicio').value,
        horaFim: document.getElementById('visitaHoraFim').value,
        notas: document.getElementById('visitaNotas').value,
        atualizadoEm: new Date().toISOString()
    };
    try {
        if(vId) await db.collection("visitas_agenda").doc(vId).update(pacote);
        else await db.collection("visitas_agenda").add({ ...pacote, status: 'pendente', cartoesAprovados: [] });
        fecharModalVisita();
    } catch (e) { console.error(e); }
}

window.excluirVisitaFirebase = async function() {
    if (!isUserAdminGlobal) return;
    const vId = document.getElementById('visitaIdAtual').value;
    if(vId && confirm("Apagar este agendamento?")) { await db.collection("visitas_agenda").doc(vId).delete(); fecharModalVisita(); }
}

/** ==============================
 * MODAL (MÁQUINA DE ESTADOS)
 * ============================== */
window.abrirModalVisita = function(diaIndice, turno, visitaId = null) {
    if(!promotoraSelecionadaId) return;
    if (!isUserAdminGlobal && !visitaId) return; 

    document.getElementById('modalVisita').classList.remove('escondido');
    
    if(document.getElementById('formVisita')) document.getElementById('formVisita').reset();
    document.getElementById('visitaDiaIndice').value = diaIndice;
    document.getElementById('visitaTurnoAtual').value = turno;
    document.getElementById('visitaIdAtual').value = visitaId || "";
    document.getElementById('obsVendedorInput').value = "";

    const aAdmin = document.getElementById('areaFormAdmin');
    const aVendHeader = document.getElementById('areaHeaderVendedor');
    const aVendExec = document.getElementById('areaExecucaoPromotora');
    const aAudit = document.getElementById('areaAuditoriaAdmin');

    if (visitaId) {
        document.getElementById('tituloModalVisita').innerText = "Detalhes da Visita";
        aVendExec.classList.remove('escondido'); 
        const v = listaVisitasMes.find(x => x.id === visitaId);
        
        if (isUserAdminGlobal) {
            aAdmin.classList.remove('escondido');
            aVendHeader.classList.add('escondido');
            aAudit.classList.remove('escondido');
            
            document.getElementById('visitaLojaSelect').value = v.lojaId;
            document.getElementById('visitaHoraInicio').value = v.horaInicio;
            document.getElementById('visitaHoraFim').value = v.horaFim;
            document.getElementById('visitaNotas').value = v.notas || "";
            
            if(v.checkinFoto) {
                document.getElementById('auditFotoIn').src = v.checkinFoto;
                document.getElementById('auditFotoIn').style.display = "block";
                document.getElementById('auditGpsIn').href = `https://www.google.com/maps/search/?api=1&query=${v.checkinGpsLat},${v.checkinGpsLng}`;
                document.getElementById('auditGpsIn').style.display = "inline-block";
                document.getElementById('auditVazioIn').style.display = "none";
            } else {
                document.getElementById('auditFotoIn').style.display = "none"; document.getElementById('auditGpsIn').style.display = "none"; document.getElementById('auditVazioIn').style.display = "block";
            }
            if(v.checkoutFoto) {
                document.getElementById('auditFotoOut').src = v.checkoutFoto;
                document.getElementById('auditFotoOut').style.display = "block";
                document.getElementById('auditGpsOut').href = `https://www.google.com/maps/search/?api=1&query=${v.checkoutGpsLat},${v.checkoutGpsLng}`;
                document.getElementById('auditGpsOut').style.display = "inline-block";
                document.getElementById('auditVazioOut').style.display = "none";
            } else {
                document.getElementById('auditFotoOut').style.display = "none"; document.getElementById('auditGpsOut').style.display = "none"; document.getElementById('auditVazioOut').style.display = "block";
            }

        } else {
            aAdmin.classList.add('escondido');
            aAudit.classList.add('escondido');
            aVendHeader.classList.remove('escondido');
            
            const loja = lojasGlobais.find(l => l.id === v.lojaId);
            document.getElementById('vhLoja').innerText = loja ? loja.nome : "Loja Desconhecida";
            document.getElementById('vhHorario').innerText = `${v.horaInicio} às ${v.horaFim}`;
            document.getElementById('vhNotas').innerText = v.notas ? `Obs Admin: "${v.notas}"` : "";
        }
        
        if(v) { atualizarInterfacePonto(v); atualizarTimeline(v); atualizarListaCartoes(v); }
    } else {
        document.getElementById('tituloModalVisita').innerText = "Agendar Nova Visita";
        aAdmin.classList.remove('escondido');
        aVendHeader.classList.add('escondido');
        aVendExec.classList.add('escondido'); 
        aAudit.classList.add('escondido');
        document.getElementById('btnExcluirVisita').classList.add('escondido');
        
        if(turno === 'manha') { document.getElementById('visitaHoraInicio').value = "08:00"; document.getElementById('visitaHoraFim').value = "12:00"; }
        if(turno === 'tarde') { document.getElementById('visitaHoraInicio').value = "14:00"; document.getElementById('visitaHoraFim').value = "18:00"; }
        if(turno === 'noite') { document.getElementById('visitaHoraInicio').value = "18:00"; document.getElementById('visitaHoraFim').value = "22:00"; }
    }
}
window.fecharModalVisita = function() { document.getElementById('modalVisita').classList.add('escondido'); }
function horasParaMinutos(strHora) { const [h, m] = strHora.split(':').map(Number); return (h * 60) + m; }

/** ==============================
 * AÇÃO DE PONTO INTELIGENTE
 * ============================== */
window.iniciarCapturaPonto = function(tipo) {
    document.getElementById('intencaoDePonto').value = tipo;
    document.getElementById('inputFotoCamera').click(); 
}

window.processarPontoAutomatico = function(evento) {
    const file = evento.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxW = 800; const scale = maxW / img.width;
            canvas.width = maxW; canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const fotoBase64 = canvas.toDataURL("image/jpeg", 0.7);
            const intencao = document.getElementById('intencaoDePonto').value;
            
            document.getElementById('inputFotoCamera').value = ""; 
            executarRotinaPontoFinal(intencao, fotoBase64);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

function obterLocalizacaoObrigatoria() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("Navegador não suporta GPS.");
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            (e) => reject("Ligue o GPS e dê permissão para marcar o ponto."),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });
}

async function executarRotinaPontoFinal(tipoAcao, fotoBase64) {
    const vId = document.getElementById('visitaIdAtual').value;
    const v = listaVisitasMes.find(x => x.id === vId);
    if(!v) return;

    const btn = tipoAcao === 'checkin' ? document.getElementById('btnFazerCheckin') : document.getElementById('btnFazerCheckout');
    const txtOrig = btn.innerHTML;
    btn.innerHTML = `<span class="material-symbols-rounded" style="animation: spin 1s linear infinite;">sync</span> Obtendo GPS...`;
    btn.disabled = true;

    try {
        const coords = await obterLocalizacaoObrigatoria();
        const agora = new Date();
        const minReal = (agora.getHours() * 60) + agora.getMinutes();
        const horaStr = String(agora.getHours()).padStart(2, '0') + ":" + String(agora.getMinutes()).padStart(2, '0');
        
        let justificativa = "";

        if (tipoAcao === 'checkin') {
            const diff = minReal - horasParaMinutos(v.horaInicio);
            if (diff < -15) throw new Error("Muito cedo! Permitido 15min antes.");
            if (diff > 30) {
                if (!isUserAdminGlobal) throw new Error("Atraso crítico (>30 min). Contate o Administrador.");
                else { justificativa = prompt("🔒 AÇÃO ADMIN: Justificativa obrigatória:"); if (!justificativa) throw new Error("Cancelado."); }
            } else if (diff > 15) {
                justificativa = prompt(`⚠️ Atraso de ${diff}m. Justifique:`); if (!justificativa) throw new Error("Obrigatório.");
            }
            await db.collection("visitas_agenda").doc(vId).update({
                status: 'andamento', checkinReal: horaStr, notaCheckin: justificativa ? `Atraso: ${justificativa}` : '',
                checkinGpsLat: coords.lat, checkinGpsLng: coords.lng, checkinFoto: fotoBase64
            });

        } else { 
            const diff = minReal - horasParaMinutos(v.horaFim);
            if (Math.abs(diff) > 15) {
                justificativa = prompt(`⚠️ Saída fora do horário (${diff}m). Justifique:`); if (!justificativa) throw new Error("Obrigatório.");
            }
            await db.collection("visitas_agenda").doc(vId).update({
                status: 'concluido', checkoutReal: horaStr, notaCheckout: justificativa ? `Desvio: ${justificativa}` : '',
                checkoutGpsLat: coords.lat, checkoutGpsLng: coords.lng, checkoutFoto: fotoBase64
            });
        }
    } catch(e) { alert("❌ Erro:\n" + (e.message || e)); } 
    finally { btn.innerHTML = txtOrig; btn.disabled = false; }
}

/** ==============================
 * DADOS EXTRAS DO VENDEDOR
 * ============================== */
window.registrarCartaoAprovado = async function() {
    const vId = document.getElementById('visitaIdAtual').value;
    const nome = document.getElementById('nomeClienteCartao').value.trim();
    if(!nome || !nome.includes(" ")) return alert("Digite NOME e SOBRENOME.");
    const v = listaVisitasMes.find(x => x.id === vId); if(!v) return;

    const hora = String(new Date().getHours()).padStart(2, '0') + ":" + String(new Date().getMinutes()).padStart(2, '0');
    const novos = v.cartoesAprovados ? [...v.cartoesAprovados, {nome: nome.toUpperCase(), hora}] : [{nome: nome.toUpperCase(), hora}];
    try { await db.collection("visitas_agenda").doc(vId).update({ cartoesAprovados: novos }); document.getElementById('nomeClienteCartao').value = ""; } catch(e) {}
}

window.salvarObsVendedor = async function() {
    const vId = document.getElementById('visitaIdAtual').value;
    const obs = document.getElementById('obsVendedorInput').value.trim();
    if(!obs) return alert("Escreva algo antes de salvar.");
    try { await db.collection("visitas_agenda").doc(vId).update({ obsVendedor: obs }); alert("✅ Observação salva."); } catch(e) {}
}

function atualizarInterfacePonto(v) {
    const bIn = document.getElementById('btnFazerCheckin'), bOut = document.getElementById('btnFazerCheckout');
    bIn.disabled = false; bIn.style.opacity = '1'; bIn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">location_on</span> CHECK-IN`;
    bOut.disabled = true; bOut.style.opacity = '0.5';
    
    if(v.obsVendedor) document.getElementById('obsVendedorInput').value = v.obsVendedor;

    if (v.status === 'andamento') {
        bIn.disabled = true; bIn.style.opacity = '0.5'; bIn.innerHTML = `<span class="material-symbols-rounded">check</span> Check-in Feito`;
        bOut.disabled = false; bOut.style.opacity = '1';
    } else if (v.status === 'concluido') {
        bIn.disabled = true; bIn.style.opacity = '0.5'; bIn.innerHTML = `<span class="material-symbols-rounded">check</span> Check-in Feito`;
        bOut.disabled = true; bOut.style.opacity = '0.5'; bOut.innerHTML = `<span class="material-symbols-rounded">done_all</span> Turno Encerrado`;
    }
}

function atualizarListaCartoes(v) {
    const c = document.getElementById('containerAprovadosUI'); c.innerHTML = "";
    if(!v.cartoesAprovados || v.cartoesAprovados.length === 0) return c.innerHTML = "<span style='font-weight:normal; color:var(--cor-texto)'>Nenhum.</span>";
    v.cartoesAprovados.forEach(x => c.innerHTML += `<div style="padding: 5px; background: rgba(0,0,0,0.03); border-radius: 4px; border-left: 2px solid var(--f1a-copper);"><span style="color:var(--f1a-blue)">[${x.hora}]</span> ${x.nome}</div>`);
}

function atualizarTimeline(v) {
    const t = document.getElementById('linhaDoTempoVisita'); t.innerHTML = ""; 
    if (!v.checkinReal) return t.innerHTML = `<div class="timeline-item" style="color: var(--cor-texto); font-style: italic;">Aguardando início...</div>`;
    
    t.innerHTML += `<div class="timeline-item checkin"><span class="tl-hora">${v.checkinReal}</span> Entrada (Check-in) ${v.notaCheckin ? `<br><span style="color:#ef4444; font-size:9px;">${v.notaCheckin}</span>` : ''}</div>`;
    
    if (v.cartoesAprovados) { [...v.cartoesAprovados].sort((a, b) => a.hora.localeCompare(b.hora)).forEach(c => t.innerHTML += `<div class="timeline-item cartao"><span class="tl-hora" style="color: var(--f1a-copper);">${c.hora}</span> ${c.nome}</div>`); }
    
    if (v.obsVendedor) t.innerHTML += `<div class="timeline-item obs"><span class="tl-hora" style="color: var(--f1a-blue);">OBS</span> <span style="font-style:italic;">"${v.obsVendedor}"</span></div>`;

    if (v.checkoutReal) t.innerHTML += `<div class="timeline-item checkout"><span class="tl-hora" style="color: #ef4444;">${v.checkoutReal}</span> Saída (Check-out) ${v.notaCheckout ? `<br><span style="color:#10b981; font-size:9px;">${v.notaCheckout}</span>` : ''}</div>`;
}

/** ==============================
 * KPIs COM LEITURA GLOBAL DE TRANSPORTE
 * ============================== */
window.formatarParaMoeda = function(valorNumero) {
    const v = parseFloat(valorNumero) || 0;
    let f = v.toFixed(2).replace('.', ',');
    return "R$ " + f.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}
function atualizarKPIs() {
    if (!configMetaGlobal) return;
    let cm = 0, cs = 0, acs = 0;
    const startS = obterSegundaFeira(dataAtual).toISOString().split('T')[0];
    const domS = new Date(obterSegundaFeira(dataAtual)); domS.setDate(domS.getDate() + 6);
    const fimS = domS.toISOString().split('T')[0];

    // Pega o meio de transporte cadastrado e normaliza para cruzar com as chaves do objeto Global
    let transp = configMetaGlobal.tipoTransporte ? configMetaGlobal.tipoTransporte.toLowerCase() : "";
    if (transp === "onibus" || transp === "ônibus") transp = "onibus";

    listaVisitasMes.forEach(v => {
        const a = v.cartoesAprovados ? v.cartoesAprovados.length : 0; cm += a;
        if (v.data >= startS && v.data <= fimS) {
            cs += a;
            if (v.status === 'concluido' && transp) {
                // Lê da tabela global
                const locObj = configLocomocaoGlobal.find(x => x.lojaId === v.lojaId);
                if (locObj && locObj[transp]) {
                    acs += parseFloat(locObj[transp]);
                }
            }
        }
    });

    document.getElementById('kpiCartoesSemana').innerHTML = `${cs} <span style="font-size:12px; color:var(--cor-texto); font-weight:normal;">/ --</span>`;
    document.getElementById('kpiCartoesMes').innerHTML = `${cm} <span style="font-size:12px; color:var(--cor-texto); font-weight:normal;">/ ${configMetaGlobal.cartoesBase || 0}</span>`;
    document.getElementById('kpiHorasMes').innerHTML = `00:00 <span style="font-size:12px; color:var(--cor-texto); font-weight:normal;">/ ${configMetaGlobal.horasMes || '--'}h</span>`;
    document.getElementById('kpiHorasSemana').innerHTML = `00:00 <span style="font-size:12px; color:var(--cor-texto); font-weight:normal;">/ ${configMetaGlobal.horasSemana || '--'}h</span>`;
    document.getElementById('kpiCustoSemana').innerHTML = formatarParaMoeda(acs);
    
    let bonus = 0;
    if (configMetaGlobal.gatilhosBonus) {
        configMetaGlobal.gatilhosBonus.forEach(g => {
            if (cm >= g.inicio) {
                let limite = cm > g.fim ? g.fim : cm;
                let faixa = (limite - g.inicio) + 1;
                if (faixa > 0) bonus += faixa * g.valorBonus;
            }
        });
    }
    document.getElementById('kpiBonusMes').innerHTML = formatarParaMoeda(bonus);
}