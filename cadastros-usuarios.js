// ==========================================
// MÓDULO DE GESTÃO DE EQUIPE E IAM (F1A)
// ==========================================

let authSecundario = null;

window.mostrarToast = function(mensagem, tipo = 'sucesso') {
    let container = document.getElementById('toastContainer');
    if(!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast ${tipo}`;
    const icone = tipo === 'erro' ? 'error' : 'check_circle'; const cor = tipo === 'erro' ? '#ef4444' : '#10b981';
    toast.innerHTML = `<span class="material-symbols-rounded" style="color: ${cor};">${icone}</span> <strong>${mensagem}</strong>`;
    container.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}

function inicializarAuthSecundario() {
    try {
        if (!authSecundario) {
            const configPrincipal = firebase.app().options;
            const appSecundario = firebase.initializeApp(configPrincipal, "SecondaryApp");
            authSecundario = appSecundario.auth();
        }
    } catch (e) {
        try { authSecundario = firebase.app("SecondaryApp").auth(); } catch (err) {}
    }
}

// ==========================================
// CONTROLE DOS DROPDOWNS CUSTOMIZADOS
// ==========================================
window.toggleDropdownMenu = function(id) {
    document.querySelectorAll('.dropdown-body').forEach(el => {
        if(el.id !== id) el.classList.remove('open');
    });
    document.getElementById(id).classList.toggle('open');
}

window.atualizarLabelDropdown = function(tipo) {
    const elCheckTodos = document.getElementById(`checkTodas${tipo}`);
    if (!elCheckTodos) return;
    const checkTodos = elCheckTodos.checked;
    const checkboxes = document.querySelectorAll(`.check-item-${tipo.toLowerCase()}:checked`);
    const label = document.getElementById(`labelDropdown${tipo}`);
    if (!label) return;
    
    if (tipo === 'Modulos') {
        if (checkTodos) {
            label.innerText = "Todos os Módulos Liberados";
            label.style.color = "var(--f1a-blue)";
        } else if (checkboxes.length > 0) {
            label.innerText = `${checkboxes.length} módulo(s) selecionado(s)`;
            label.style.color = "var(--cor-titulo)";
        } else {
            label.innerText = "Selecione os módulos...";
            label.style.color = "var(--cor-texto)";
        }
        return;
    }

    if (checkTodos) {
        label.innerText = "Acesso Total (Todas)";
        label.style.color = "var(--f1a-blue)";
    } else if (checkboxes.length > 0) {
        label.innerText = `${checkboxes.length} selecionada(s)`;
        label.style.color = "var(--cor-titulo)";
    } else {
        label.innerText = `Selecione as ${tipo}...`;
        label.style.color = "var(--cor-texto)";
    }
}

function normalizarArrayLegado(valor) {
    if (Array.isArray(valor)) return valor;
    if (valor) return [valor];
    return [];
}

window.aplicarVisibilidadeSecaoModulos = function() {
    const secao = document.getElementById("secaoModulosLicenca");
    if (!secao) return;
    if (typeof perfilUsuario !== 'undefined' && perfilUsuario === 'master') {
        secao.classList.remove('escondido');
    } else {
        secao.classList.add('escondido');
    }
}

// ==========================================
// RENDERIZAÇÃO DA PLANILHA GERAL & FILTROS
// ==========================================
window.filtrarTabelaEquipe = function() { 
    const textoBusca = document.getElementById("inputBuscaEquipe").value.toLowerCase(); 
    const filtroPerfil = document.getElementById("filtroDropdownEquipe").value.toLowerCase();
    const filtroEmpresa = document.getElementById("filtroDropdownEmpresa") ? document.getElementById("filtroDropdownEmpresa").value.toLowerCase() : "";
    
    document.querySelectorAll("#corpoTabela tr").forEach(linha => { 
        const textoLinha = linha.innerText.toLowerCase();
        const matchBusca = textoLinha.includes(textoBusca);
        const matchPerfil = filtroPerfil === "" || textoLinha.includes(filtroPerfil);
        
        // Se a empresa pesquisada estiver na linha ou se a pessoa tiver "Todas as Empresas" (Acesso Total)
        const matchEmpresa = filtroEmpresa === "" || textoLinha.includes(filtroEmpresa) || textoLinha.includes("todas as empresas");

        linha.style.display = (matchBusca && matchPerfil && matchEmpresa) ? "" : "none"; 
    }); 
}

async function carregarTabelaEquipe() {
    if (typeof dadosUsuarioLogado === 'undefined' || !dadosUsuarioLogado || typeof perfilUsuario === 'undefined') {
        setTimeout(() => carregarTabelaEquipe(), 200); return;
    }

    inicializarAuthSecundario();
    const cT = document.getElementById("corpoTabela");
    if (!cT) return;
    cT.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--f1a-blue);">Buscando equipe... <span class="material-symbols-rounded" style="animation: spin 1s linear infinite; vertical-align: middle;">sync</span></td></tr>';
    
    try {
        const empresasSnap = await db.collection("empresas").get(); const mapaEmpresas = {}; 
        
        // Preenche dinamicamente o Dropdown de Filtro de Empresa da Grade
        const dropFiltroEmpresa = document.getElementById("filtroDropdownEmpresa");
        if (dropFiltroEmpresa) dropFiltroEmpresa.innerHTML = '<option value="">Todas as Empresas</option>';

        empresasSnap.forEach(e => {
            const nomeExibicao = e.data().nomeFantasia || e.data().razaoSocial || `Empresa ${e.id.substring(0,4)}`;
            mapaEmpresas[e.id] = nomeExibicao;
            if (dropFiltroEmpresa) dropFiltroEmpresa.innerHTML += `<option value="${nomeExibicao.toLowerCase()}">${nomeExibicao}</option>`;
        });

        const redesSnap = await db.collection("redes").get(); const mapaRedes = {}; redesSnap.forEach(r => mapaRedes[r.id] = r.data().nome || r.data().codigo || "Rede");
        const lojasSnap = await db.collection("lojas").get(); const mapaLojas = {}; lojasSnap.forEach(l => mapaLojas[l.id] = l.data().nome || l.data().codigo || "Loja");

        const usuariosSnap = await db.collection("usuarios").get();
        
        cT.innerHTML = '';
        if(usuariosSnap.empty) { cT.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px;">Nenhum usuário cadastrado.</td></tr>'; return; }
        
        usuariosSnap.forEach(doc => {
            const d = doc.data();
            
            // Retrocompatibilidade: Transforma Strings Antigas em Arrays para o sistema não falhar
            let arrEmpresas = Array.isArray(d.empresaId) ? d.empresaId : (d.empresaId ? [d.empresaId] : []);
            let arrRedes = Array.isArray(d.redeId) ? d.redeId : (d.redeId ? [d.redeId] : []);
            let arrLojas = Array.isArray(d.lojaId) ? d.lojaId : (d.lojaId ? [d.lojaId] : []);

            if (perfilUsuario !== 'master') {
                if (!dadosUsuarioLogado.acessoTodasEmpresas) {
                    const usuarioLogadoEmpresas = Array.isArray(dadosUsuarioLogado.empresaId) ? dadosUsuarioLogado.empresaId : (dadosUsuarioLogado.empresaId ? [dadosUsuarioLogado.empresaId] : []);
                    const possuiEmpresa = arrEmpresas.some(id => usuarioLogadoEmpresas.includes(id));
                    if (!possuiEmpresa && !d.acessoTodasEmpresas) return;
                }
            }

            const cS = d.status === 'bloqueado' ? '#ef4444' : '#10b981';
            const badge = `<span class="status-badge" style="background:${cS}20;color:${cS}; border-color:${cS}40;">${(d.status || 'ativo').toUpperCase()}</span>`;
            
            // Renderização protegida dos Nomes
            let empText = d.acessoTodasEmpresas ? 'Todas as Empresas' : (arrEmpresas.length > 0 ? arrEmpresas.map(id => mapaEmpresas[id]).filter(Boolean).join(', ') : 'Nenhuma');
            let redesText = d.acessoTodasRedes ? 'Todas as Redes' : (arrRedes.length > 0 ? arrRedes.map(id => mapaRedes[id]).filter(Boolean).join(', ') : 'Nenhuma');
            let lojasText = d.acessoTodasLojas ? 'Todas as Lojas' : (arrLojas.length > 0 ? arrLojas.map(id => mapaLojas[id]).filter(Boolean).join(', ') : 'Nenhuma');
            
            let colunaDiferenciada = `<strong>Empresa(s):</strong> ${empText}<br><span style="font-size:11px; color:var(--cor-texto);"><strong>Redes:</strong> ${redesText} | <strong>Lojas:</strong> ${lojasText}</span>`;

            let tagPerfil = '';
            if(d.perfil === 'admin') tagPerfil = '<span class="status-badge" style="background:rgba(139, 92, 246, 0.1); color:#8b5cf6; border-color:rgba(139, 92, 246, 0.3);">Administrador</span>';
            else if(d.perfil === 'gerente') tagPerfil = '<span class="status-badge" style="background:rgba(245, 158, 11, 0.1); color:#f59e0b; border-color:rgba(245, 158, 11, 0.3);">Gerente</span>';
            else if(d.perfil === 'cliente_final') tagPerfil = '<span class="status-badge" style="background:rgba(59, 130, 246, 0.1); color:#3b82f6; border-color:rgba(59, 130, 246, 0.3);">Cliente Final</span>';
            else tagPerfil = '<span class="status-badge" style="background:rgba(16, 185, 129, 0.1); color:#10b981; border-color:rgba(16, 185, 129, 0.3);">Vendedor</span>';

            cT.innerHTML += `<tr>
                <td><strong style="color:var(--cor-titulo);">${d.nome || '-'}</strong></td>
                <td style="color:var(--f1a-blue); font-weight:bold;">@${d.username || '-'}</td>
                <td>${tagPerfil}</td>
                <td>${colunaDiferenciada}</td>
                <td>${badge}</td>
                <td style="text-align: center;"><button class="btn-icon" style="border:none; color:var(--f1a-blue);" onclick="abrirModalUsuario('${doc.id}')" title="Editar Perfil"><span class="material-symbols-rounded">edit</span></button></td>
            </tr>`;
        });
        filtrarTabelaEquipe();
    } catch(err) { cT.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#ef4444;">Erro na escuta de dados: ${err.message}</td></tr>`; }
}

// ==========================================
// HIERARQUIA DE CHECKBOXES NOS DROPDOWNS
// ==========================================
window.toggleTodosCheckbox = function(tipo) {
    const isChecked = document.getElementById(`checkTodas${tipo}`).checked;
    document.querySelectorAll(`.check-item-${tipo.toLowerCase()}`).forEach(cb => { cb.checked = isChecked; });
    atualizarLabelDropdown(tipo);
    
    if (tipo === 'Empresas') carregarRedesCheckbox([], false);
    if (tipo === 'Redes') carregarLojasCheckbox([], false);
}

window.atualizarCheckboxIndividual = function(tipo) {
    const checkboxes = document.querySelectorAll(`.check-item-${tipo.toLowerCase()}`);
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    document.getElementById(`checkTodas${tipo}`).checked = allChecked && checkboxes.length > 0;
    atualizarLabelDropdown(tipo);
    
    if (tipo === 'Empresas') carregarRedesCheckbox([], false);
    if (tipo === 'Redes') carregarLojasCheckbox([], false);
}

async function carregarEmpresasCheckbox(idsSelecionados = [], checkTodos = false) {
    const div = document.getElementById("listaEmpresasCheckbox"); div.innerHTML = "<label><span>Buscando...</span></label>";
    const snap = await db.collection("empresas").get();
    div.innerHTML = '';
    
    snap.forEach(d => {
        if (perfilUsuario !== 'master' && !dadosUsuarioLogado.acessoTodasEmpresas) {
            const myEmpresas = Array.isArray(dadosUsuarioLogado.empresaId) ? dadosUsuarioLogado.empresaId : (dadosUsuarioLogado.empresaId ? [dadosUsuarioLogado.empresaId] : []);
            if (!myEmpresas.includes(d.id)) return;
        }
        const nomeExibicao = d.data().nomeFantasia || d.data().razaoSocial || `Empresa ${d.id.substring(0,4)}`;
        const checked = checkTodos || idsSelecionados.includes(d.id) ? 'checked' : '';
        div.innerHTML += `<label><input type="checkbox" class="check-item-empresas" value="${d.id}" onchange="atualizarCheckboxIndividual('Empresas')" ${checked}> <span>${nomeExibicao}</span></label>`;
    });
    document.getElementById("checkTodasEmpresas").checked = checkTodos;
    atualizarLabelDropdown('Empresas');
    carregarRedesCheckbox([], false);
}

window.carregarRedesCheckbox = async function(idsSelecionados = [], checkTodos = false) {
    const div = document.getElementById("listaRedesCheckbox");
    const checkTodasEmpresas = document.getElementById("checkTodasEmpresas").checked;
    const empresasSelecionadas = Array.from(document.querySelectorAll('.check-item-empresas:checked')).map(cb => cb.value);

    if (!checkTodasEmpresas && empresasSelecionadas.length === 0) { 
        div.innerHTML = '<label><span style="color:#ef4444;">Nenhuma Empresa Selecionada.</span></label>'; 
        document.getElementById("checkTodasRedes").checked = false;
        atualizarLabelDropdown('Redes');
        document.getElementById("listaLojasCheckbox").innerHTML = ''; 
        atualizarLabelDropdown('Lojas');
        return; 
    }

    div.innerHTML = "<label><span>Buscando...</span></label>";
    const snap = await db.collection("redes").get();
    div.innerHTML = '';
    
    snap.forEach(d => {
        const r = d.data();
        if (!checkTodasEmpresas && !empresasSelecionadas.includes(r.empresaId)) return; 
        if (perfilUsuario !== 'master' && !dadosUsuarioLogado.acessoTodasRedes) {
            const myRedes = Array.isArray(dadosUsuarioLogado.redeId) ? dadosUsuarioLogado.redeId : (dadosUsuarioLogado.redeId ? [dadosUsuarioLogado.redeId] : []);
            if (!myRedes.includes(d.id)) return;
        }
        const nomeExibicao = r.nome || r.codigo || `Rede ${d.id.substring(0,4)}`;
        const checked = checkTodos || idsSelecionados.includes(d.id) ? 'checked' : '';
        div.innerHTML += `<label><input type="checkbox" class="check-item-redes" value="${d.id}" onchange="atualizarCheckboxIndividual('Redes')" ${checked}> <span>${nomeExibicao}</span></label>`;
    });
    document.getElementById("checkTodasRedes").checked = checkTodos;
    atualizarLabelDropdown('Redes');
    carregarLojasCheckbox([], false);
}

window.carregarLojasCheckbox = async function(idsSelecionados = [], checkTodos = false) {
    const div = document.getElementById("listaLojasCheckbox");
    const checkTodasRedes = document.getElementById("checkTodasRedes").checked;
    const redesSelecionadas = Array.from(document.querySelectorAll('.check-item-redes:checked')).map(cb => cb.value);

    if (!checkTodasRedes && redesSelecionadas.length === 0) { 
        div.innerHTML = '<label><span style="color:#ef4444;">Nenhuma Rede Selecionada.</span></label>'; 
        document.getElementById("checkTodasLojas").checked = false;
        atualizarLabelDropdown('Lojas');
        return; 
    }

    div.innerHTML = "<label><span>Buscando...</span></label>";
    const snap = await db.collection("lojas").get();
    div.innerHTML = '';
    
    snap.forEach(d => {
        const l = d.data();
        if (!checkTodasRedes && !redesSelecionadas.includes(l.redeId)) return; 
        if (perfilUsuario !== 'master' && !dadosUsuarioLogado.acessoTodasLojas) {
            const myLojas = Array.isArray(dadosUsuarioLogado.lojaId) ? dadosUsuarioLogado.lojaId : (dadosUsuarioLogado.lojaId ? [dadosUsuarioLogado.lojaId] : []);
            if (!myLojas.includes(d.id)) return;
        }
        const nomeExibicao = l.nome || l.codigo || `Loja ${d.id.substring(0,4)}`;
        const checked = checkTodos || idsSelecionados.includes(d.id) ? 'checked' : '';
        div.innerHTML += `<label><input type="checkbox" class="check-item-lojas" value="${d.id}" onchange="atualizarCheckboxIndividual('Lojas')" ${checked}> <span>${nomeExibicao}</span></label>`;
    });
    document.getElementById("checkTodasLojas").checked = checkTodos;
    atualizarLabelDropdown('Lojas');
}

async function carregarModulosCheckbox(idsSelecionados = [], checkTodos = false) {
    const div = document.getElementById("listaModulosCheckbox");
    const label = document.getElementById("labelDropdownModulos");
    if (!div) return;

    div.innerHTML = "<label><span>Buscando módulos...</span></label>";
    if (label) label.innerText = "Carregando módulos...";

    try {
        const snap = await db.collection("modulos_f1a").get();
        div.innerHTML = '';

        if (snap.empty) {
            div.innerHTML = '<label><span style="color:var(--cor-texto);">Nenhum módulo cadastrado em modulos_f1a.</span></label>';
            const chkTodos = document.getElementById("checkTodasModulos");
            if (chkTodos) chkTodos.checked = false;
            atualizarLabelDropdown('Modulos');
            return;
        }

        const modulos = [];
        snap.forEach(doc => {
            const d = doc.data();
            modulos.push({ id: doc.id, titulo: d.titulo || doc.id, icon: d.icon || 'extension', tipo: d.tipo || 'comercial' });
        });
        modulos.sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));

        const idsNorm = normalizarArrayLegado(idsSelecionados);
        modulos.forEach(mod => {
            const checked = checkTodos || idsNorm.includes(mod.id) ? 'checked' : '';
            div.innerHTML += `<label><input type="checkbox" class="check-item-modulos" value="${mod.id}" onchange="atualizarCheckboxIndividual('Modulos')" ${checked}> <span><span class="material-symbols-rounded" style="font-size:16px; vertical-align:middle; color:var(--f1a-blue); margin-right:4px;">${mod.icon}</span>${mod.titulo} <span style="font-size:10px; color:var(--cor-texto);">(${mod.id})</span></span></label>`;
        });

        const chkTodos = document.getElementById("checkTodasModulos");
        if (chkTodos) chkTodos.checked = checkTodos || (modulos.length > 0 && idsNorm.length >= modulos.length);
        atualizarLabelDropdown('Modulos');
    } catch (err) {
        div.innerHTML = `<label><span style="color:#ef4444;">Erro ao carregar módulos: ${err.message}</span></label>`;
    }
}

function obterModulosAcessoSelecionados() {
    if (typeof perfilUsuario === 'undefined' || perfilUsuario !== 'master') return null;
    const checkTodos = document.getElementById("checkTodasModulos")?.checked;
    if (checkTodos) {
        return Array.from(document.querySelectorAll('.check-item-modulos')).map(cb => cb.value);
    }
    return Array.from(document.querySelectorAll('.check-item-modulos:checked')).map(cb => cb.value);
}

// ==========================================
// ABERTURA DO MODAL E REGRAS DE TELA
// ==========================================
window.acaoNovoUsuario = function() { abrirModalUsuario(null); }

window.aplicarRegrasDeVinculoForm = function() {
    const perfilSel = document.getElementById("usuPerfil").value;
    const boxLoja = document.getElementById("boxLojaVinculo");
    const secaoVinculo = document.getElementById("secaoVinculoOperacional");

    if (perfilSel === 'cliente_final') {
        secaoVinculo.classList.add("escondido");
        return;
    }

    secaoVinculo.classList.remove("escondido");

    if (perfilSel === 'admin' || perfilSel === 'gerente') {
        boxLoja.classList.add("escondido"); 
    } else {
        boxLoja.classList.remove("escondido"); 
    }
}

window.abrirModalUsuario = async function(editId = null) {
    document.getElementById('viewLista').classList.add('escondido');
    document.getElementById('viewFormulario').classList.remove('escondido');
    document.getElementById('editUsuarioId').value = editId || "";
    
    const isEdicao = !!editId;
    
    if (!isEdicao) {
        document.getElementById('tituloModalUsuario').innerHTML = `<span class="material-symbols-rounded">person_add</span> Cadastrar Novo Usuário`;
        document.getElementById("boxSenhaCriacao").style.display = "block";
        document.getElementById("avisoPrimeiroAcesso").style.display = "block";
        document.getElementById("btnExcluirUsuario").style.display = "none";
        
        const btnResetar = document.getElementById("btnResetarAcesso");
        if(btnResetar) btnResetar.style.display = "none";
        
        document.getElementById("usuUsername").readOnly = false;
        document.getElementById("usuPerfil").value = "vendedor"; 
        
        document.getElementById("usuNome").value = ""; document.getElementById("usuCpf").value = "";
        document.getElementById("usuTelefone").value = ""; document.getElementById("usuUsername").value = "";
        document.getElementById("usuSenha").value = ""; document.getElementById("usuStatus").value = "ativo";
        
        aplicarRegrasDeVinculoForm();
        carregarEmpresasCheckbox([], false);
        if (perfilUsuario === 'master') await carregarModulosCheckbox([], false);
    } else {
        document.getElementById('tituloModalUsuario').innerHTML = `<span class="material-symbols-rounded">manage_accounts</span> Editar Usuário`;
        document.getElementById("boxSenhaCriacao").style.display = "none";
        document.getElementById("avisoPrimeiroAcesso").style.display = "none";
        document.getElementById("btnExcluirUsuario").style.display = "flex";
        
        const btnResetar = document.getElementById("btnResetarAcesso");
        if(btnResetar) btnResetar.style.display = "flex";
        
        document.getElementById("usuUsername").readOnly = true; 
        
        const doc = await db.collection("usuarios").doc(editId).get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById("usuPerfil").value = d.perfil || "vendedor";
            aplicarRegrasDeVinculoForm();

            document.getElementById("usuNome").value = d.nome || "";
            document.getElementById("usuCpf").value = d.cpf || "";
            document.getElementById("usuTelefone").value = d.telefone || "";
            document.getElementById("usuUsername").value = d.username || "";
            document.getElementById("usuStatus").value = d.status || "ativo";
            
            // Retrocompatibilidade também ao abrir formulário
            const arrayEmpresas = Array.isArray(d.empresaId) ? d.empresaId : (d.empresaId ? [d.empresaId] : []);
            const arrayRedes = Array.isArray(d.redeId) ? d.redeId : (d.redeId ? [d.redeId] : []);
            const arrayLojas = Array.isArray(d.lojaId) ? d.lojaId : (d.lojaId ? [d.lojaId] : []);
            
            await carregarEmpresasCheckbox(arrayEmpresas, d.acessoTodasEmpresas || false);
            setTimeout(() => { carregarRedesCheckbox(arrayRedes, d.acessoTodasRedes || false); }, 400);
            setTimeout(() => { carregarLojasCheckbox(arrayLojas, d.acessoTodasLojas || false); }, 800);

            if (perfilUsuario === 'master') {
                const arrayModulos = normalizarArrayLegado(d.modulosAcesso);
                await carregarModulosCheckbox(arrayModulos, false);
            }
        }
    }
}

window.fecharModalUsuario = function() { document.getElementById('viewFormulario').classList.add('escondido'); document.getElementById('viewLista').classList.remove('escondido'); }

// ==========================================
// SALVAR NO BANCO (ARRAYS E FLAGS INTELIGENTES)
// ==========================================
window.salvarUsuario = async function() {
    const btn = document.getElementById("btnSalvarUsuario"); const txtOrig = btn.innerHTML; btn.innerHTML = "Salvando..."; btn.disabled = true;
    try {
        const editId = document.getElementById('editUsuarioId').value; const isUpdate = editId !== "";
        const perfil = document.getElementById('usuPerfil').value;
        
        const nome = document.getElementById("usuNome").value.trim().toUpperCase();
        const cpf = document.getElementById("usuCpf").value.trim();
        const telefone = document.getElementById("usuTelefone").value.trim();
        const username = document.getElementById("usuUsername").value.trim().toLowerCase().replace(/\s+/g, '');
        const status = document.getElementById("usuStatus").value;
        
        if (!nome || !username) throw new Error("O Nome Completo e o Nome de Usuário são obrigatórios!");
        
        let payload;

        if (perfil === 'cliente_final') {
            payload = {
                nome, cpf, telefone, status, perfil,
                empresaId: [],
                acessoTodasEmpresas: false,
                redeId: [],
                acessoTodasRedes: false,
                lojaId: [],
                acessoTodasLojas: false
            };
        } else {
            const acessoTodasEmpresas = document.getElementById("checkTodasEmpresas").checked;
            const empresasSelecionadas = Array.from(document.querySelectorAll('.check-item-empresas:checked')).map(cb => cb.value);
            
            const acessoTodasRedes = document.getElementById("checkTodasRedes").checked;
            const redesSelecionadas = Array.from(document.querySelectorAll('.check-item-redes:checked')).map(cb => cb.value);
            
            const acessoTodasLojas = document.getElementById("checkTodasLojas").checked;
            const lojasSelecionadas = Array.from(document.querySelectorAll('.check-item-lojas:checked')).map(cb => cb.value);

            if (!acessoTodasEmpresas && empresasSelecionadas.length === 0) throw new Error("Você precisa designar pelo menos uma Empresa de acesso para este colaborador.");
            if (perfil === 'gerente' || perfil === 'vendedor') {
                if (!acessoTodasRedes && redesSelecionadas.length === 0) throw new Error("Você precisa designar pelo menos uma Rede de atuação.");
            }
            if (perfil === 'vendedor') {
                if (!acessoTodasLojas && lojasSelecionadas.length === 0) throw new Error("Você precisa designar pelo menos uma Loja de atuação para o Vendedor.");
            }

            payload = { 
                nome, cpf, telefone, status, perfil, 
                empresaId: empresasSelecionadas, acessoTodasEmpresas: acessoTodasEmpresas,
                redeId: redesSelecionadas, acessoTodasRedes: acessoTodasRedes,
                lojaId: (perfil === 'vendedor') ? lojasSelecionadas : [], acessoTodasLojas: (perfil === 'vendedor') ? acessoTodasLojas : false
            };
        }

        const modulosSelecionados = obterModulosAcessoSelecionados();
        if (modulosSelecionados !== null) {
            let modulosFinal = modulosSelecionados;
            if (isUpdate) {
                const docAtual = await db.collection("usuarios").doc(editId).get();
                if (docAtual.exists) {
                    const antigos = normalizarArrayLegado(docAtual.data().modulosAcesso);
                    const idsCatalogo = new Set(Array.from(document.querySelectorAll('.check-item-modulos')).map(cb => cb.value));
                    const orfaos = antigos.filter(id => !idsCatalogo.has(id));
                    modulosFinal = [...new Set([...modulosSelecionados, ...orfaos])];
                }
            }
            payload.modulosAcesso = modulosFinal;
        }
        
        if (isUpdate) {
            await db.collection("usuarios").doc(editId).update(payload);
            mostrarToast("Colaborador atualizado com sucesso!", "sucesso");
        } else {
            const senha = document.getElementById("usuSenha").value.trim();
            if (!senha || senha.length < 6) throw new Error("A senha provisória precisa de 6 ou mais dígitos!");
            if (!authSecundario) throw new Error("Robô de Autenticação indisponível.");
            
            const userCheck = await db.collection("usuarios").where("username", "==", username).get();
            if (!userCheck.empty) throw new Error("Este Nome de Usuário já está sendo usado. Escolha outro!");

            const pseudoEmail = `${username}@sistemaf1a.com.br`;
            const cred = await authSecundario.createUserWithEmailAndPassword(pseudoEmail, senha);
            
            await db.collection("usuarios").doc(cred.user.uid).set({ 
                ...payload, 
                username: username,
                primeiroAcesso: true,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp() 
            });
            
            await authSecundario.signOut(); 
            mostrarToast("Usuário criado com acesso inteligente!", "sucesso");
        }
        fecharModalUsuario();
        carregarTabelaEquipe();
    } catch(e) { mostrarToast(e.message, "erro"); } finally { btn.innerHTML = txtOrig; btn.disabled = false; }
}

window.excluirUsuarioAtual = async function() {
    const editId = document.getElementById('editUsuarioId').value; if (!editId) return;
    if (!confirm("⚠️ CUIDADO: Deseja apagar permanentemente o cadastro deste utilizador?")) return;
    try {
        await db.collection("usuarios").doc(editId).delete();
        mostrarToast("Conta removida do banco.", "sucesso"); fecharModalUsuario();
    } catch(e) { mostrarToast(e.message, "erro"); }
}

// ==========================================
// FORÇAR NOVO SETUP (RESET DE ACESSO)
// ==========================================
window.resetarAcessoUsuario = async function() {
    const editId = document.getElementById('editUsuarioId').value; 
    if (!editId) return;
    
    if (!confirm("⚠️ Tem certeza que deseja RESETAR O ACESSO deste colaborador?\n\nNo próximo login, ele será bloqueado de entrar no Lobby e será forçado a cadastrar um novo e-mail e criar uma nova senha.")) return;
    
    try {
        const btn = document.getElementById("btnResetarAcesso"); 
        const txtOrig = btn.innerHTML; 
        btn.innerHTML = "Resetando..."; btn.disabled = true;

        await db.collection("usuarios").doc(editId).update({
            primeiroAcesso: true
        });
        
        mostrarToast("Acesso resetado! O utilizador passará pelo setup novamente.", "sucesso");
        
        btn.innerHTML = txtOrig; btn.disabled = false;
    } catch(e) { 
        mostrarToast(e.message, "erro"); 
        document.getElementById("btnResetarAcesso").disabled = false;
    }
}

window.posAuthCallback = async function() {
    aplicarVisibilidadeSecaoModulos();
    await carregarTabelaEquipe();
};