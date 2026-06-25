// ============================================================================
// MÓDULO: PONTO DE OURO (CROCHÊ)
// ARQUIVO: inicio.js
// OBJETIVO: Resumo Financeiro e Mural de Fotos
// ============================================================================

// ==============================
// GATILHO OFICIAL DO BLUEPRINT
// ==============================
window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";

    await preencherDadosUsuario();
    await inicializarVisaoEmpresa();

    if (dadosUsuarioLogado && dadosUsuarioLogado.nome) {
        const primeiroNome = dadosUsuarioLogado.nome.split(' ')[0];
        const spanNome = document.getElementById("primeiroNomeArtesa");
        if (spanNome) spanNome.innerText = primeiroNome;
    }

    carregarResumoFinanceiro();
    carregarMuralProjetos();
    iniciarMonitoramentoBalao();
};

// ==============================
// USUÁRIO E EMPRESA ATIVA
// ==============================
async function preencherDadosUsuario() {
    const elNome = document.getElementById("nomeUsuario");
    const elCargo = document.getElementById("cargoUsuario");
    const elIniciais = document.getElementById("iniciaisUsuario");
    const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuario";

    if (elNome) {
        elNome.innerText = (dadosUsuarioLogado && dadosUsuarioLogado.nome) ? dadosUsuarioLogado.nome : "Usuário";
    }
    if (elIniciais && elNome) {
        const iniciais = (elNome.innerText || "").trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "--";
        elIniciais.innerText = iniciais;
    }
    if (elCargo) elCargo.innerText = String(perfil).toUpperCase();
}

async function inicializarVisaoEmpresa() {
    const userAuth = firebase.auth().currentUser;
    if (!userAuth) return;

    let listaEmpresasUsuario = [];

    if (dadosUsuarioLogado && (dadosUsuarioLogado.perfil === 'master' || dadosUsuarioLogado.acessoTodasEmpresas)) {
        try {
            const snapEmpresas = await db.collection("empresas").get();
            snapEmpresas.forEach(doc => listaEmpresasUsuario.push(doc.id));
        } catch (err) {
            console.error("Erro ao buscar empresas:", err);
        }
    } else if (dadosUsuarioLogado) {
        const empId = dadosUsuarioLogado.empresaId;
        if (Array.isArray(empId) && empId.length > 0) {
            listaEmpresasUsuario = empId.map(id => String(id));
        } else if (empId && typeof empId === 'string') {
            listaEmpresasUsuario = [String(empId)];
        }
    }

    if (listaEmpresasUsuario.length === 0) listaEmpresasUsuario = [String(userAuth.uid)];

    let empresaMemorizada = sessionStorage.getItem('visaoEmpresaAtiva');
    if (!empresaMemorizada || !listaEmpresasUsuario.includes(empresaMemorizada)) {
        empresaMemorizada = listaEmpresasUsuario[0];
        sessionStorage.setItem('visaoEmpresaAtiva', empresaMemorizada);
    }

    try {
        await construirSeletorEmpresas(listaEmpresasUsuario, empresaMemorizada);
    } catch (err) {
        console.error("Falha ao desenhar seletor de empresas.", err);
    }
}

async function construirSeletorEmpresas(listaIds, idAtivo) {
    let opcoesHTML = "";
    try {
        for (let id of listaIds) {
            const docEmp = await db.collection("empresas").doc(id).get();
            let nomeEmpresa = docEmp.exists
                ? (docEmp.data().nomeFantasia || docEmp.data().razaoSocial || `Empresa ${id.substring(0, 4)}...`)
                : `Empresa Cód. ${id.substring(0, 4)}`;
            let isSelected = (id === idAtivo) ? "selected" : "";
            opcoesHTML += `<option value="${id}" ${isSelected}>${nomeEmpresa}</option>`;
        }
    } catch (e) {
        opcoesHTML = `<option value="${idAtivo}">Empresa Ativa</option>`;
    }

    let containerDropdown = document.getElementById("containerSeletorVisaoEmpresa");

    if (!containerDropdown) {
        containerDropdown = document.createElement("div");
        containerDropdown.id = "containerSeletorVisaoEmpresa";
        containerDropdown.style.marginRight = "10px";
        containerDropdown.style.display = "flex";
        containerDropdown.style.alignItems = "center";
        containerDropdown.style.gap = "8px";

        let btnTema = document.getElementById("btnTemaGlobal");
        if (btnTema && btnTema.parentNode) {
            btnTema.parentNode.insertBefore(containerDropdown, btnTema);
        }
    }

    if (!containerDropdown) return;

    if (listaIds.length > 1) {
        containerDropdown.innerHTML = `
            <span class="material-symbols-rounded" style="color: var(--f1a-blue); font-size: 20px;">domain</span>
            <select onchange="trocarVisaoEmpresa(this.value)" style="background: var(--bg-painel); border: 1px solid var(--borda); color: var(--cor-texto); padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 13px; cursor: pointer; outline: none;">
                ${opcoesHTML}
            </select>
        `;
    } else {
        const nomeDaUnicaEmpresa = opcoesHTML.replace(/<[^>]*>?/gm, '');
        containerDropdown.innerHTML = `
            <span class="material-symbols-rounded" style="color: var(--f1a-blue); font-size: 20px;">domain</span>
            <span style="color: var(--cor-texto); font-size: 13px; font-weight: 700;">${nomeDaUnicaEmpresa}</span>
        `;
    }

    aplicarVisibilidadeSeletorEmpresaMobile();
    if (!window._f1aSeletorEmpresaResizeBound) {
        window._f1aSeletorEmpresaResizeBound = true;
        window.addEventListener('resize', aplicarVisibilidadeSeletorEmpresaMobile);
    }
}

function aplicarVisibilidadeSeletorEmpresaMobile() {
    const container = document.getElementById("containerSeletorVisaoEmpresa");
    if (!container) return;
    container.style.display = window.matchMedia('(max-width: 768px)').matches ? 'none' : 'flex';
}

window.trocarVisaoEmpresa = function(novoIdEmpresa) {
    sessionStorage.setItem('visaoEmpresaAtiva', novoIdEmpresa);
    window.location.reload();
};

window.sair = function() {
    firebase.auth().signOut().then(() => {
        sessionStorage.clear();
        window.location.replace('../index.html');
    });
};

window.toggleDropdownPerfil = function(event) {
    event.preventDefault();
    event.stopPropagation();

    const menu = document.getElementById('dropdownPerfilLocal');
    if (!menu) return;

    const abrir = menu.classList.contains('escondido');

    document.querySelectorAll('.menu-perfil-flutuante').forEach((m) => {
        m.classList.add('escondido');
    });

    if (abrir) menu.classList.remove('escondido');
};

document.addEventListener('click', function(event) {
    const menu = document.getElementById('dropdownPerfilLocal');
    const perfil = document.querySelector('.user-profile');
    if (menu && perfil && !perfil.contains(event.target)) {
        menu.classList.add('escondido');
    }
});

/** ==============================
 * UTILITÁRIOS DE PROJETO
 * ============================== */
function obterSegundosProjeto(p) {
    if (p.segundosAcumulados != null && !isNaN(p.segundosAcumulados)) {
        return parseFloat(p.segundosAcumulados) || 0;
    }
    if (p.tempoTotalMinutos != null && !isNaN(p.tempoTotalMinutos)) {
        return (parseFloat(p.tempoTotalMinutos) || 0) * 60;
    }
    return 0;
}

function formatarHoras(totalSegundos) {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos > 0 ? minutos + 'm' : ''}`.trim();
    if (minutos > 0) return `${minutos}m`;
    return "0h";
}

function obterPrecoNumerico(valor) {
    if (valor == null || valor === '') return 0;
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
    const str = String(valor).trim();
    const num = str.includes(',')
        ? parseFloat(str.replace(/\./g, '').replace(',', '.'))
        : parseFloat(str);
    return isNaN(num) ? 0 : num;
}

function obterNomeProjeto(p) {
    return p.nomeProjeto || p.nome || 'Sem nome';
}

function obterCategoria(p) {
    return p.categoria || 'Sem categoria';
}

function obterTimestampOrdenacao(p) {
    const candidatos = [p.dataConclusao, p.atualizadoEm, p.criadoEm];
    for (const ts of candidatos) {
        if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
        if (ts && ts.seconds) return ts.seconds * 1000;
        if (ts instanceof Date) return ts.getTime();
    }
    return 0;
}

function escaparHtml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** ==============================
 * 1. RESUMO FINANCEIRO (CARDS)
 * ============================== */
function carregarResumoFinanceiro() {
    db.collection("croche_projetos")
        .where("usuarioId", "==", usuarioLogado.uid)
        .onSnapshot(snap => {
            let totalSegundos = 0;
            let totalConcluidos = 0;
            let faturamentoTotal = 0;
            const contagemCategorias = {};

            snap.forEach(doc => {
                const p = doc.data();
                totalSegundos += obterSegundosProjeto(p);

                if (p.status === 'concluido') {
                    totalConcluidos++;
                    faturamentoTotal += obterPrecoNumerico(p.precoSugerido);

                    const cat = obterCategoria(p);
                    contagemCategorias[cat] = (contagemCategorias[cat] || 0) + 1;
                }
            });

            let categoriaMaisCriada = '---';
            let maxOcorrencias = 0;
            Object.keys(contagemCategorias).forEach(cat => {
                if (contagemCategorias[cat] > maxOcorrencias) {
                    maxOcorrencias = contagemCategorias[cat];
                    categoriaMaisCriada = cat;
                }
            });

            const elHoras = document.getElementById('resumoHoras');
            const elPecas = document.getElementById('resumoPecas');
            const elValor = document.getElementById('resumoValor');
            const elCategoria = document.getElementById('resumoCategoria');

            if (elHoras) elHoras.innerText = formatarHoras(totalSegundos);
            if (elPecas) elPecas.innerText = totalConcluidos;
            if (elValor) elValor.innerText = `R$ ${formatarParaMoedaSTR(faturamentoTotal)}`;
            if (elCategoria) elCategoria.innerText = categoriaMaisCriada;
        });
}

/** ==============================
 * 2. MURAL DE PROJETOS (GALERIA)
 * ============================== */
function carregarMuralProjetos() {
    const containerMural = document.getElementById('containerMural');
    const muralVazio = document.getElementById('muralVazio');
    if (!containerMural) return;

    db.collection("croche_projetos")
        .where("usuarioId", "==", usuarioLogado.uid)
        .where("status", "==", "concluido")
        .onSnapshot(snap => {
            const projetos = [];
            snap.forEach(doc => projetos.push({ id: doc.id, ...doc.data() }));

            projetos.sort((a, b) => obterTimestampOrdenacao(b) - obterTimestampOrdenacao(a));

            if (projetos.length === 0) {
                containerMural.innerHTML = '';
                if (muralVazio) muralVazio.style.display = '';
                return;
            }

            if (muralVazio) muralVazio.style.display = 'none';

            let html = "";
            projetos.forEach(p => {
                const nome = escaparHtml(obterNomeProjeto(p));
                const categoria = escaparHtml(obterCategoria(p));
                const preco = obterPrecoNumerico(p.precoSugerido);
                const imagemUrl = p.imagemUrl || '';

                const thumbStyle = imagemUrl
                    ? `background-image: url('${imagemUrl.replace(/'/g, "%27")}');`
                    : '';

                const thumbConteudo = imagemUrl
                    ? `<div class="mural-thumb" style="${thumbStyle}"></div>`
                    : `<div class="mural-thumb" style="display:flex; align-items:center; justify-content:center; color:var(--premium-gold);"><span class="material-symbols-rounded" style="font-size:48px;">palette</span></div>`;

                html += `
                    <div class="mural-item" onclick="window.location.href='projetos.html?id=${encodeURIComponent(p.id)}'" style="cursor:pointer;">
                        ${thumbConteudo}
                        <div class="mural-info">
                            <div class="mural-title">${nome}</div>
                            <div class="mural-meta">
                                <span>${categoria}</span>
                                <span style="color:var(--f1a-blue); font-weight:800;">R$ ${formatarParaMoedaSTR(preco)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            containerMural.innerHTML = html;
        }, error => {
            console.error("Erro no Mural:", error);
            if (muralVazio) muralVazio.style.display = '';
            containerMural.innerHTML = `<p style="color:var(--cor-texto); font-size:12px; text-align:center; grid-column:1/-1;">Não foi possível carregar o mural.</p>`;
        });
}

/** ==============================
 * 3. BALÃO GLOBAL (CÓDIGO REUTILIZADO)
 * ============================== */
function iniciarMonitoramentoBalao() {
    db.collection("croche_projetos")
        .where("usuarioId", "==", usuarioLogado.uid)
        .where("status", "==", "crochetando")
        .onSnapshot(snap => {
            let balao = document.getElementById('balaoCrochetando');
            if (snap.empty) { if (balao) balao.remove(); return; }

            const docAtivo = snap.docs[0];
            const projetoAtivo = docAtivo.data();
            const projetoId = docAtivo.id;
            const urlProjeto = `projetos.html?id=${encodeURIComponent(projetoId)}`;

            if (!balao) {
                if(!document.getElementById('cssPulse')) {
                    document.head.insertAdjacentHTML('beforeend', `<style id="cssPulse">@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }</style>`);
                }
                const balaoHtml = `
                    <div id="balaoCrochetando" onclick="window.location.href='${urlProjeto}'" style="position: fixed; bottom: 20px; right: 20px; background: #ec4899; color: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4); display: flex; align-items: center; gap: 15px; z-index: 9999; cursor: pointer; border: 2px solid #be185d; animation: pulse 2s infinite;">
                        <div style="display: flex; align-items: center; justify-content: center; background: white; color: #ec4899; width: 40px; height: 40px; border-radius: 50%;">
                            <span class="material-symbols-rounded" style="animation: spin 3s linear infinite;">motion_photos_on</span>
                        </div>
                        <div>
                            <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Atenção Artesã</span>
                            <span id="balaoNomeProjetoGlobal" style="display: block; font-size: 15px; font-weight: 700;">${escaparHtml(obterNomeProjeto(projetoAtivo))}</span>
                        </div>
                    </div>`;
                document.body.insertAdjacentHTML('beforeend', balaoHtml);
            } else {
                document.getElementById('balaoNomeProjetoGlobal').innerText = obterNomeProjeto(projetoAtivo);
                balao.onclick = function() { window.location.href = urlProjeto; };
            }
        });
}

function formatarParaMoedaSTR(valorNumero) {
    if (isNaN(valorNumero) || valorNumero === 0) return "0,00";
    return parseFloat(valorNumero).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}
