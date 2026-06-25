// ============================================================================
// MÓDULO: PONTO DE OURO (CROCHÊ)
// ARQUIVO: projetos.js
// OBJETIVO: Gestão de Projetos, Cronômetro em Background, Custos e Fotos (Base64)
// ============================================================================

let listaProjetos = [];
let estoqueMateriais = [];
let unsubscribeProjetos = null;

const CATEGORIAS_PROJETO = ['Amigurumi', 'Vestuário', 'Decoração', 'Acessórios', 'Outros'];

let filtroBusca = sessionStorage.getItem('projetosFiltroBusca') || '';
let filtroCategorias = JSON.parse(sessionStorage.getItem('projetosFiltroCategorias') || 'null');
let sortCol = sessionStorage.getItem('projetosSortCol') || 'data';
const sortAscSalvo = sessionStorage.getItem('projetosSortAsc');
let sortAsc = sortAscSalvo === 'true' ? true : sortAscSalvo === 'false' ? false : false;
let projetoRenomearId = null;

if (!Array.isArray(filtroCategorias)) {
    filtroCategorias = [...CATEGORIAS_PROJETO];
}

/** Estrutura preparada para futura sincronização automática com /croche/materiais */
const MATERIAIS_SYNC = {
    colecaoFirestore: 'croche_materiais',
    rotaModulo: '/croche/materiais',
    listenerAtivo: false
};

// Variáveis do Workspace
let projetoAtualId = null;
let projetoAtual = null;
let projetoIdUrlAbertura = new URLSearchParams(window.location.search).get('id');
let projetoUrlAberturaProcessado = false;

// Variáveis das Anotações
let anotacoesTimerSalvar = null;
let anotacoesUltimoSalvo = '';

// Variáveis do Cronômetro
let segundosDecorridos = 0;
let displayInterval = null;

const MODOS_PRECIFICACAO = {
    HORA_TRABALHADA: 'HORA_TRABALHADA',
    MEU_PRECO: 'MEU_PRECO',
    MEU_PRECO_TEMPO: 'MEU_PRECO_TEMPO'
};

let modoNovoProjetoSelecionado = MODOS_PRECIFICACAO.HORA_TRABALHADA;

function obterModoPrecificacao(projeto) {
    if (!projeto) return MODOS_PRECIFICACAO.HORA_TRABALHADA;
    if (projeto.modoPrecificacao) return projeto.modoPrecificacao;
    return projeto.considerarValorHora === false
        ? MODOS_PRECIFICACAO.MEU_PRECO
        : MODOS_PRECIFICACAO.HORA_TRABALHADA;
}

function projetoConsideraTempo(projeto) {
    const modo = obterModoPrecificacao(projeto);
    return modo === MODOS_PRECIFICACAO.HORA_TRABALHADA || modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO;
}

function obterTituloModoPrecificacao(modo) {
    const titulos = {
        HORA_TRABALHADA: 'Hora Trabalhada',
        MEU_PRECO: 'Meu Preço',
        MEU_PRECO_TEMPO: 'Meu Preço x Tempo'
    };
    return titulos[modo] || 'Hora Trabalhada';
}

function obterCustoMateriais(projeto) {
    let custo = 0;
    (projeto.materiaisUsados || []).forEach(m => custo += m.custoFracao);
    return custo;
}

function calcularPrecificacao(projeto, segundos) {
    const modo = obterModoPrecificacao(projeto);
    const custoMat = obterCustoMateriais(projeto);
    const outrosCustos = Number(projeto.outrosCustos) || 0;
    const horasTrabalhadas = segundos / 3600;

    const resultado = {
        modo,
        custoMat,
        outrosCustos,
        custoMaoObra: 0,
        custoTotal: 0,
        valorLucro: 0,
        margemLucroPct: 0,
        precoFinal: 0,
        valorHoraReal: null
    };

    if (modo === MODOS_PRECIFICACAO.HORA_TRABALHADA) {
        resultado.custoMaoObra = horasTrabalhadas * (Number(projeto.valorHora) || 0);
        const custoBase = custoMat + resultado.custoMaoObra + outrosCustos;
        resultado.custoTotal = custoBase;
        resultado.margemLucroPct = Number(projeto.margemLucro) || 0;
        resultado.valorLucro = custoBase * (resultado.margemLucroPct / 100);
        resultado.precoFinal = custoBase + resultado.valorLucro;
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO) {
        resultado.custoTotal = custoMat + outrosCustos;
        resultado.precoFinal = Number(projeto.precoVendaDesejado) || 0;
        resultado.valorLucro = resultado.precoFinal - resultado.custoTotal;
        resultado.margemLucroPct = resultado.custoTotal > 0
            ? (resultado.valorLucro / resultado.custoTotal) * 100
            : 0;
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO) {
        resultado.custoTotal = custoMat + outrosCustos;
        resultado.precoFinal = Number(projeto.precoVendaDesejado) || 0;
        resultado.valorLucro = resultado.precoFinal - resultado.custoTotal;
        resultado.margemLucroPct = resultado.custoTotal > 0
            ? (resultado.valorLucro / resultado.custoTotal) * 100
            : 0;
        if (horasTrabalhadas > 0) {
            resultado.valorHoraReal = resultado.valorLucro / horasTrabalhadas;
        }
    }

    return resultado;
}

function obterPrecoExibicaoProjeto(projeto, segundos) {
    const modo = obterModoPrecificacao(projeto);
    const usaPrecoDesejado = modo === MODOS_PRECIFICACAO.MEU_PRECO || modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO;
    if (!usaPrecoDesejado && projeto.status === 'concluido' && projeto.precoSugerido != null && !isNaN(projeto.precoSugerido)) {
        return projeto.precoSugerido;
    }
    const calc = calcularPrecificacao(projeto, segundos);
    return calc.precoFinal;
}

// ==============================
// GATILHO OFICIAL DO BLUEPRINT
// ==============================
window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    preencherDadosUsuario();
    restaurarEstadoFiltros();
    iniciarListenerProjetos();
    carregarEstoqueMateriais();
    iniciarBalaoGlobal();
    configurarBotaoAddMaterialWorkspace();
};

let ultimoToqueBtnAddMaterial = 0;

function configurarBotaoAddMaterialWorkspace() {
    const btn = document.getElementById('btnAddMaterialWorkspace');
    if (!btn || btn.dataset.eventosVinculados === '1') return;
    btn.dataset.eventosVinculados = '1';

    const acionar = function(event) {
        event.stopPropagation();
        if (btn.disabled) return;

        if (event.type === 'touchend') {
            event.preventDefault();
            ultimoToqueBtnAddMaterial = Date.now();
            abrirModalUsoMaterial();
            return;
        }

        if (Date.now() - ultimoToqueBtnAddMaterial < 500) return;
        abrirModalUsoMaterial();
    };

    btn.addEventListener('touchend', acionar, { passive: false });
    btn.addEventListener('click', acionar);
}

window.sair = function() {
    firebase.auth().signOut().then(() => {
        sessionStorage.clear();
        window.location.replace('../index.html');
    });
};

function preencherDadosUsuario() {
    if (!dadosUsuarioLogado?.nome) return;
    const nome = dadosUsuarioLogado.nome;
    const nomeEl = document.getElementById('nomeUsuario');
    const iniciaisEl = document.getElementById('iniciaisUsuario');
    if (nomeEl) nomeEl.innerText = nome;
    if (iniciaisEl) iniciaisEl.innerText = nome.substring(0, 2).toUpperCase();
}

function restaurarEstadoFiltros() {
    const inputBusca = document.getElementById('filtroTexto');
    if (inputBusca) inputBusca.value = filtroBusca;

    const checks = document.querySelectorAll('.filtro-cat-check');
    const todosEl = document.getElementById('filtroCatTodos');
    const todasSelecionadas = filtroCategorias.length === CATEGORIAS_PROJETO.length;

    checks.forEach(ch => {
        ch.checked = filtroCategorias.includes(ch.value);
    });
    if (todosEl) todosEl.checked = todasSelecionadas;

    atualizarLabelFiltroCategoria();
    atualizarIconesOrdenacao();
    atualizarSelectOrdenacaoMobileProjetos();
}

function salvarEstadoFiltros() {
    sessionStorage.setItem('projetosFiltroBusca', filtroBusca);
    sessionStorage.setItem('projetosFiltroCategorias', JSON.stringify(filtroCategorias));
    sessionStorage.setItem('projetosSortCol', sortCol);
    sessionStorage.setItem('projetosSortAsc', sortAsc);
}

function converterParaData(valor) {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate();
    if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
    const tentativa = new Date(valor);
    return Number.isNaN(tentativa.getTime()) ? null : tentativa;
}

function paraMillis(valor) {
    const data = converterParaData(valor);
    return data ? data.getTime() : 0;
}

function formatarDataTela(valor) {
    const data = converterParaData(valor);
    return data ? data.toLocaleDateString('pt-BR') : '-';
}

function obterTextoStatus(projeto) {
    if (projeto.status === 'concluido') return 'Concluído';
    if (projeto.status === 'crochetando') return 'Crochetando';
    return 'Em Andamento';
}

function obterSegundosProjeto(projeto) {
    let seg = projeto.segundosAcumulados || ((projeto.tempoTotalMinutos || 0) * 60);
    if (projeto.status === 'crochetando' && projeto.timerInicioMs) {
        seg += Math.floor((Date.now() - projeto.timerInicioMs) / 1000);
    }
    return seg;
}

function atualizarLabelFiltroCategoria() {
    const lbl = document.getElementById('lblFiltroCategoria');
    if (!lbl) return;
    if (filtroCategorias.length === 0 || filtroCategorias.length === CATEGORIAS_PROJETO.length) {
        lbl.innerText = 'Todas Categorias';
    } else if (filtroCategorias.length === 1) {
        lbl.innerText = filtroCategorias[0];
    } else {
        lbl.innerText = `${filtroCategorias.length} categorias`;
    }
}

function atualizarIconesOrdenacao() {
    document.querySelectorAll('.sort-icon[data-sort-col]').forEach(el => {
        const col = el.getAttribute('data-sort-col');
        if (col === sortCol) {
            el.innerText = sortAsc ? '↑' : '↓';
            el.style.opacity = '1';
        } else {
            el.innerText = '';
            el.style.opacity = '0.35';
        }
    });
}

window.toggleDropdownCategoria = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('dropdownFiltroCategoria');
    if (!dropdown) return;
    dropdown.classList.toggle('escondido');
};

window.toggleTodasCategorias = function(checkbox) {
    const checks = document.querySelectorAll('.filtro-cat-check');
    checks.forEach(ch => { ch.checked = checkbox.checked; });
    alterarFiltroCategoria();
};

window.alterarFiltroCategoria = function() {
    const checks = document.querySelectorAll('.filtro-cat-check');
    const todosEl = document.getElementById('filtroCatTodos');
    const selecionadas = [];

    checks.forEach(ch => {
        if (ch.checked) selecionadas.push(ch.value);
    });

    if (todosEl) {
        todosEl.checked = selecionadas.length === CATEGORIAS_PROJETO.length;
    }

    filtroCategorias = selecionadas.length > 0 ? selecionadas : [...CATEGORIAS_PROJETO];
    atualizarLabelFiltroCategoria();
    salvarEstadoFiltros();
    renderizarTabelaProjetos();
};

window.filtrarListaProjetos = function() {
    const input = document.getElementById('filtroTexto');
    filtroBusca = input ? input.value.trim().toLowerCase() : '';
    salvarEstadoFiltros();
    renderizarTabelaProjetos();
};

window.ordenarProjetos = function(coluna) {
    if (sortCol === coluna) {
        sortAsc = !sortAsc;
    } else {
        sortCol = coluna;
        sortAsc = true;
    }
    salvarEstadoFiltros();
    atualizarIconesOrdenacao();
    atualizarSelectOrdenacaoMobileProjetos();
    renderizarTabelaProjetos();
};

window.aplicarOrdenacaoMobileProjetos = function() {
    const select = document.getElementById('filtroOrdenacaoMobile');
    if (!select) return;

    const valor = select.value;
    const separador = valor.lastIndexOf('-');
    sortCol = valor.slice(0, separador);
    sortAsc = valor.slice(separador + 1) !== 'desc';

    salvarEstadoFiltros();
    atualizarIconesOrdenacao();
    renderizarTabelaProjetos();
};

function atualizarSelectOrdenacaoMobileProjetos() {
    const select = document.getElementById('filtroOrdenacaoMobile');
    if (!select) return;

    const valor = `${sortCol}-${sortAsc ? 'asc' : 'desc'}`;
    if (select.querySelector(`option[value="${valor}"]`)) {
        select.value = valor;
    }
}

function obterProjetosFiltradosOrdenados() {
    let filtrados = listaProjetos.filter(p => {
        const nome = String(p.nomeProjeto || '').toLowerCase();
        const categoria = String(p.categoria || '');
        const statusTexto = obterTextoStatus(p).toLowerCase();

        const matchBusca = !filtroBusca
            || nome.includes(filtroBusca)
            || categoria.toLowerCase().includes(filtroBusca)
            || statusTexto.includes(filtroBusca);

        const matchCategoria = filtroCategorias.length === 0
            || filtroCategorias.length === CATEGORIAS_PROJETO.length
            || filtroCategorias.includes(categoria);

        return matchBusca && matchCategoria;
    });

    filtrados.sort((a, b) => {
        let vA;
        let vB;

        const segA = obterSegundosProjeto(a);
        const segB = obterSegundosProjeto(b);
        const custoA = obterCustoMateriais(a);
        const custoB = obterCustoMateriais(b);
        const precoA = obterPrecoExibicaoProjeto(a, segA);
        const precoB = obterPrecoExibicaoProjeto(b, segB);

        switch (sortCol) {
            case 'nome':
                vA = a.nomeProjeto || '';
                vB = b.nomeProjeto || '';
                break;
            case 'categoria':
                vA = a.categoria || '';
                vB = b.categoria || '';
                break;
            case 'data':
                vA = paraMillis(a.criadoEm);
                vB = paraMillis(b.criadoEm);
                break;
            case 'tempo':
                vA = segA;
                vB = segB;
                break;
            case 'custo':
                vA = custoA;
                vB = custoB;
                break;
            case 'preco':
                vA = precoA;
                vB = precoB;
                break;
            case 'status':
                vA = obterTextoStatus(a);
                vB = obterTextoStatus(b);
                break;
            default:
                vA = paraMillis(a.criadoEm);
                vB = paraMillis(b.criadoEm);
        }

        if (typeof vA === 'string' || typeof vB === 'string') {
            const comparacao = String(vA).localeCompare(String(vB), 'pt-BR', { sensitivity: 'base' });
            return sortAsc ? comparacao : -comparacao;
        }

        if (vA < vB) return sortAsc ? -1 : 1;
        if (vA > vB) return sortAsc ? 1 : -1;
        return 0;
    });

    return filtrados;
}

function obterEstiloStatusProjeto(projeto) {
    let statusCor = 'var(--premium-gold)';
    let statusBg = 'rgba(212, 175, 55, 0.2)';
    let textoStatus = 'Em Andamento';
    let cardExtraClass = '';
    let badgeAnimacao = '';

    if (projeto.status === 'concluido') {
        statusCor = 'var(--f1a-blue)';
        statusBg = 'rgba(0, 71, 255, 0.1)';
        textoStatus = 'Concluído';
    } else if (projeto.status === 'crochetando') {
        statusCor = '#ffffff';
        statusBg = '#ec4899';
        textoStatus = '🧶 Crochetando';
        cardExtraClass = ' projeto-card-mobile--crochetando';
        badgeAnimacao = ' animation: pulse 2s infinite;';
    }

    return { statusCor, statusBg, textoStatus, cardExtraClass, badgeAnimacao };
}

function renderizarCardsMobileProjetos(filtrados) {
    const container = document.getElementById('listaProjetosMobile');
    if (!container) return;

    if (!filtrados || filtrados.length === 0) {
        container.innerHTML = `
            <div class="projeto-card-mobile-vazio">
                Nenhum projeto encontrado.
            </div>
        `;
        return;
    }

    const htmlParts = [];

    filtrados.forEach((p, index) => {
        const montarCardFallback = (projetoRef) => {
            const id = projetoRef?.id || '';
            const nome = projetoRef?.nomeProjeto || '-';
            const cat = projetoRef?.categoria || '-';
            const onclickAttr = id ? ` onclick="acessarProjeto('${id}')"` : '';
            return `
                <article class="projeto-card-mobile"${onclickAttr}
                         role="button"
                         tabindex="0"
                         aria-label="Abrir projeto ${nome}">
                    <div class="projeto-card-mobile-corpo">
                        <h4 class="projeto-card-mobile-nome">${nome}</h4>
                        <dl class="projeto-card-mobile-dados">
                            <div class="projeto-card-mobile-linha">
                                <dt>Categoria</dt>
                                <dd>${cat}</dd>
                            </div>
                            <div class="projeto-card-mobile-linha projeto-card-mobile-linha--preco">
                                <dt>Preço de Venda</dt>
                                <dd>--</dd>
                            </div>
                            <div class="projeto-card-mobile-linha">
                                <dt>Status</dt>
                                <dd>
                                    <span class="status-projeto-badge projeto-card-mobile-status"
                                          style="background: rgba(212, 175, 55, 0.2); color: var(--premium-gold);">
                                        Em Andamento
                                    </span>
                                </dd>
                            </div>
                            <div class="projeto-card-mobile-linha">
                                <dt>Data</dt>
                                <dd>-</dd>
                            </div>
                        </dl>
                        <span class="material-symbols-rounded projeto-card-mobile-seta" aria-hidden="true">chevron_right</span>
                    </div>
                </article>
            `;
        };

        try {
            if (!p || typeof p !== 'object') {
                console.error('[renderizarCardsMobileProjetos] Projeto inválido:', { index, p });
                htmlParts.push(montarCardFallback(null));
                return;
            }

            const imagemUrl = p.imagemUrl || '';
            const nomeProjeto = p.nomeProjeto || '-';
            const categoria = p.categoria || '-';
            const status = p.status || 'andamento';
            const criadoEm = p.criadoEm;
            const projetoId = p.id || '';
            const projetoBase = { ...p, imagemUrl, nomeProjeto, categoria, status, criadoEm, id: projetoId };

            let segAtuais = 0;
            let precoStr = '--';
            let statusCor = 'var(--premium-gold)';
            let statusBg = 'rgba(212, 175, 55, 0.2)';
            let textoStatus = 'Em Andamento';
            let cardExtraClass = '';
            let badgeAnimacao = '';

            try {
                segAtuais = obterSegundosProjeto(projetoBase);
            } catch (err) {
                console.error('[renderizarCardsMobileProjetos] obterSegundosProjeto:', { index, id: projetoId, err, p });
            }

            try {
                const precoExibicao = obterPrecoExibicaoProjeto(projetoBase, segAtuais);
                precoStr = precoExibicao > 0
                    ? `R$ ${formatarParaMoedaSTR(precoExibicao)}`
                    : '--';
            } catch (err) {
                console.error('[renderizarCardsMobileProjetos] obterPrecoExibicaoProjeto:', { index, id: projetoId, err, p });
            }

            try {
                ({ statusCor, statusBg, textoStatus, cardExtraClass, badgeAnimacao } = obterEstiloStatusProjeto(projetoBase));
            } catch (err) {
                console.error('[renderizarCardsMobileProjetos] obterEstiloStatusProjeto:', { index, id: projetoId, err, p });
            }

            let dataStr = '-';
            try {
                dataStr = formatarDataTela(criadoEm);
            } catch (err) {
                console.error('[renderizarCardsMobileProjetos] formatarDataTela:', { index, id: projetoId, criadoEm, err, p });
            }

            const imagemHtml = imagemUrl
                ? `<div class="projeto-card-mobile-imagem">
                        <img src="${imagemUrl}" alt="Foto de ${nomeProjeto}">
                   </div>`
                : '';

            const onclickAttr = projetoId ? ` onclick="acessarProjeto('${projetoId}')"` : '';

            htmlParts.push(`
                <article class="projeto-card-mobile${cardExtraClass}"${onclickAttr}
                         role="button"
                         tabindex="0"
                         aria-label="Abrir projeto ${nomeProjeto}">
                    ${imagemHtml}
                    <div class="projeto-card-mobile-corpo">
                        <h4 class="projeto-card-mobile-nome">${nomeProjeto}</h4>
                        <dl class="projeto-card-mobile-dados">
                            <div class="projeto-card-mobile-linha">
                                <dt>Categoria</dt>
                                <dd>${categoria}</dd>
                            </div>
                            <div class="projeto-card-mobile-linha projeto-card-mobile-linha--preco">
                                <dt>Preço de Venda</dt>
                                <dd>${precoStr}</dd>
                            </div>
                            <div class="projeto-card-mobile-linha">
                                <dt>Status</dt>
                                <dd>
                                    <span class="status-projeto-badge projeto-card-mobile-status"
                                          style="background: ${statusBg}; color: ${statusCor};${badgeAnimacao}">
                                        ${textoStatus}
                                    </span>
                                </dd>
                            </div>
                            <div class="projeto-card-mobile-linha">
                                <dt>Data</dt>
                                <dd>${dataStr}</dd>
                            </div>
                        </dl>
                        <span class="material-symbols-rounded projeto-card-mobile-seta" aria-hidden="true">chevron_right</span>
                    </div>
                </article>
            `);
        } catch (err) {
            console.error('[renderizarCardsMobileProjetos] Erro ao renderizar projeto:', { index, id: p?.id, err, p });
            htmlParts.push(montarCardFallback(p));
        }
    });

    container.innerHTML = htmlParts.join('');
}

/** ==============================
 * ESCUTAR BANCO DE DADOS
 * ============================== */
function iniciarListenerProjetos() {
    if (unsubscribeProjetos) unsubscribeProjetos();

    unsubscribeProjetos = db.collection("croche_projetos")
        .where("usuarioId", "==", usuarioLogado.uid)
        .orderBy("criadoEm", "desc")
        .onSnapshot(snap => {
            listaProjetos = [];
            snap.forEach(doc => listaProjetos.push({ id: doc.id, ...doc.data() }));

            if (projetoIdUrlAbertura && !projetoUrlAberturaProcessado) {
                projetoUrlAberturaProcessado = true;
                const projetoUrl = listaProjetos.find(p => p.id === projetoIdUrlAbertura);
                if (projetoUrl) {
                    acessarProjeto(projetoIdUrlAbertura);
                    atualizarBalaoGlobal();
                    return;
                }
            }
            
            renderizarTabelaProjetos();
            atualizarBalaoGlobal();
            
            if (projetoAtualId) {
                projetoAtual = listaProjetos.find(p => p.id === projetoAtualId);
                if (projetoAtual) {
                    renderizarMateriaisProjeto();
                    sincronizarCronometro();
                    carregarFotoWorkspace();
                    sincronizarAnotacoesDoListener();
                    aplicarVisibilidadeModoPrecificacao();
                    atualizarPainelCalculadora();
                }
            }
        }, error => console.error("Erro ao buscar projetos:", error));
}

function renderizarTabelaProjetos() {
    const tbody = document.getElementById('tabelaProjetosBody');
    if (!tbody) return;

    atualizarIconesOrdenacao();
    atualizarSelectOrdenacaoMobileProjetos();

    const filtrados = obterProjetosFiltradosOrdenados();
    renderizarCardsMobileProjetos(filtrados);

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--cor-texto);">Nenhum projeto encontrado.</td></tr>`;
        return;
    }

    let html = '';
    filtrados.forEach(p => {
        const consideraHora = projetoConsideraTempo(p);
        const segAtuais = obterSegundosProjeto(p);

        const horas = Math.floor(segAtuais / 3600);
        const minutos = Math.floor((segAtuais % 3600) / 60);
        const tempoStr = consideraHora
            ? `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`
            : '--';

        const custoMat = obterCustoMateriais(p);
        const { statusCor, statusBg, textoStatus, badgeAnimacao } = obterEstiloStatusProjeto(p);
        let linhaExtraCss = '';

        if (p.status === 'crochetando') {
            linhaExtraCss = 'background: rgba(236, 72, 153, 0.05); border-left: 4px solid #ec4899;';
        }

        const precoExibicao = obterPrecoExibicaoProjeto(p, segAtuais);
        const precoSugeridoStr = precoExibicao > 0
            ? `R$ ${formatarParaMoedaSTR(precoExibicao)}`
            : '--';

        html += `
            <tr class="linha-projeto-clicavel" style="${linhaExtraCss}" onclick="acessarProjeto('${p.id}')" title="Abrir projeto">
                <td>
                    <div class="projeto-nome-celula">
                        ${p.imagemUrl ? `<img src="${p.imagemUrl}" class="projeto-thumb-mini" alt="">` : ''}
                        <span class="projeto-nome">${p.nomeProjeto}</span>
                        <button type="button" class="btn-icon btn-editar-nome-grid" onclick="abrirModalRenomearProjetoGrid('${p.id}', event)" title="Renomear projeto">
                            <span class="material-symbols-rounded">edit</span>
                        </button>
                    </div>
                </td>
                <td>${p.categoria || '-'}</td>
                <td style="text-align: center;">${formatarDataTela(p.criadoEm)}</td>
                <td style="text-align: center; font-weight: ${consideraHora ? '600' : '400'}; color: ${consideraHora ? 'var(--cor-titulo)' : 'var(--cor-texto)'};">${tempoStr}</td>
                <td style="text-align: right; font-weight: 800; color: var(--f1a-blue);">R$ ${formatarParaMoedaSTR(custoMat)}</td>
                <td style="text-align: right; font-weight: 800; color: var(--premium-gold);">${precoSugeridoStr}</td>
                <td style="text-align: center;">
                    <span class="status-projeto-badge" style="background: ${statusBg}; color: ${statusCor};${badgeAnimacao}">
                        ${textoStatus}
                    </span>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

/** ==============================
 * ACESSAR PROJETO (AJUSTADO)
 * ============================== */
window.acessarProjeto = function(id) {
    projetoAtualId = id;
    projetoAtual = listaProjetos.find(p => p.id === id);
    if (!projetoAtual) return;

    document.getElementById('wsNomeProjeto').innerText = projetoAtual.nomeProjeto;
    renderizarMateriaisProjeto();
    sincronizarCronometro();
    carregarFotoWorkspace();
    carregarAnotacoesWorkspace();
    resetarAbaWorkspace();

    const btnFinalizar = document.getElementById('btnFinalizarProjeto');
    const statusBadge = document.getElementById('wsStatusProjeto');
    
    const modoAtual = obterModoPrecificacao(projetoAtual);
    const permiteEditarPrecoConcluido = projetoAtual.status === 'concluido'
        && (modoAtual === MODOS_PRECIFICACAO.MEU_PRECO || modoAtual === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO);

    // BLOQUEIOS APENAS PARA TEMPO E MATERIAIS
    if(projetoAtual.status === 'concluido') {
        btnFinalizar.style.display = 'none';
        document.getElementById('btnPlayPause').disabled = true;
        document.getElementById('btnSalvarTempo').disabled = true;
        document.getElementById('btnAddMaterialWorkspace').disabled = true;
        document.getElementById('btnAjustarValoresWorkspace').disabled = !permiteEditarPrecoConcluido;
        
        statusBadge.innerText = 'CONCLUÍDO';
        statusBadge.style.background = 'rgba(0, 71, 255, 0.1)';
        statusBadge.style.color = 'var(--f1a-blue)';
    } else {
        btnFinalizar.style.display = 'flex';
        document.getElementById('btnPlayPause').disabled = false;
        document.getElementById('btnSalvarTempo').disabled = false;
        document.getElementById('btnAddMaterialWorkspace').disabled = false;
        document.getElementById('btnAjustarValoresWorkspace').disabled = false;
    }

    // A FOTO FICA SEMPRE DISPONÍVEL (Removido o bloqueio)
    document.getElementById('fileInputImagem').disabled = false;
    document.getElementById('lblSelecionarFoto').style.display = 'flex';

    // ANOTAÇÕES SEMPRE DISPONÍVEIS (leitura e edição, inclusive após conclusão)
    const txtAnot = document.getElementById('txtAnotacoesProjeto');
    if (txtAnot) {
        txtAnot.disabled = false;
        txtAnot.readOnly = false;
    }

    aplicarVisibilidadeModoPrecificacao();
    atualizarPainelCalculadora();

    document.getElementById('vistaListaProjetos').style.display = 'none';
    document.getElementById('vistaWorkspace').classList.remove('escondido');
    atualizarBalaoGlobal();
}

function aplicarVisibilidadeModoPrecificacao() {
    if (!projetoAtual) return;
    const modo = obterModoPrecificacao(projetoAtual);
    const consideraTempo = projetoConsideraTempo(projetoAtual);

    const secCron = document.getElementById('wsSecaoCronometro');
    if (secCron) secCron.style.display = consideraTempo ? '' : 'none';

    const badge = document.getElementById('calcModoBadge');
    if (badge) badge.innerText = obterTituloModoPrecificacao(modo);
}

function configurarCamposFormNovoProjeto(modo) {
    const grupos = {
        HORA_TRABALHADA: document.getElementById('grpCamposHoraTrabalhada'),
        MEU_PRECO: document.getElementById('grpCamposMeuPreco'),
        MEU_PRECO_TEMPO: document.getElementById('grpCamposMeuPrecoTempo')
    };
    Object.keys(grupos).forEach(key => {
        if (grupos[key]) grupos[key].classList.toggle('escondido', key !== modo);
    });

    const inputModo = document.getElementById('projModoPrecificacao');
    if (inputModo) inputModo.value = modo;

    const badge = document.getElementById('projModoBadge');
    if (badge) badge.innerText = obterTituloModoPrecificacao(modo);

    const valorHora = document.getElementById('projValorHora');
    const margem = document.getElementById('projMargem');
    const precoMP = document.getElementById('projPrecoVendaMP');
    const precoMPT = document.getElementById('projPrecoVendaMPT');

    if (valorHora) valorHora.required = modo === MODOS_PRECIFICACAO.HORA_TRABALHADA;
    if (margem) margem.required = modo === MODOS_PRECIFICACAO.HORA_TRABALHADA;
    if (precoMP) precoMP.required = modo === MODOS_PRECIFICACAO.MEU_PRECO;
    if (precoMPT) precoMPT.required = modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO;
}

function configurarCamposFormEditarConfig(modo) {
    const grupos = {
        HORA_TRABALHADA: document.getElementById('grpEditHoraTrabalhada'),
        MEU_PRECO: document.getElementById('grpEditMeuPreco'),
        MEU_PRECO_TEMPO: document.getElementById('grpEditMeuPrecoTempo')
    };
    Object.keys(grupos).forEach(key => {
        if (grupos[key]) grupos[key].classList.toggle('escondido', key !== modo);
    });

    const badge = document.getElementById('editModoBadge');
    if (badge) badge.innerText = obterTituloModoPrecificacao(modo);
}

window.voltarParaLista = function() {
    clearInterval(displayInterval);
    clearTimeout(anotacoesTimerSalvar);
    anotacoesTimerSalvar = null;
    anotacoesUltimoSalvo = '';
    document.getElementById('vistaWorkspace').classList.add('escondido');
    document.getElementById('vistaListaProjetos').style.display = 'block';
    projetoAtualId = null;
    projetoAtual = null;
    atualizarBalaoGlobal();
}

/** ==============================
 * ABAS DO WORKSPACE
 * ============================== */
function resetarAbaWorkspace() {
    const btnProjeto = document.querySelector('.ws-tab-btn[data-aba="projeto"]');
    trocarAbaWorkspace('projeto', btnProjeto);
}

window.trocarAbaWorkspace = function(aba, btn) {
    document.querySelectorAll('.ws-tab-btn').forEach(b => b.classList.remove('ativo'));
    if (btn) btn.classList.add('ativo');

    const painelProjeto = document.getElementById('wsPainelProjeto');
    const painelAnotacoes = document.getElementById('wsPainelAnotacoes');
    if (!painelProjeto || !painelAnotacoes) return;

    if (aba === 'anotacoes') {
        painelProjeto.classList.add('escondido');
        painelAnotacoes.classList.remove('escondido');
    } else {
        painelAnotacoes.classList.add('escondido');
        painelProjeto.classList.remove('escondido');
    }
}

/** ==============================
 * ANOTAÇÕES DO PROJETO
 * ============================== */
function carregarAnotacoesWorkspace() {
    const txt = document.getElementById('txtAnotacoesProjeto');
    if (!txt || !projetoAtual) return;

    const valor = projetoAtual.anotacoes || '';
    anotacoesUltimoSalvo = valor;
    txt.value = valor;
    txt.disabled = false;
    txt.readOnly = false;
    atualizarStatusSalvarAnotacoes('');
}

function sincronizarAnotacoesDoListener() {
    const txt = document.getElementById('txtAnotacoesProjeto');
    if (!txt || !projetoAtual) return;

    const valorRemoto = projetoAtual.anotacoes || '';
    if (txt.value === anotacoesUltimoSalvo && valorRemoto !== anotacoesUltimoSalvo) {
        anotacoesUltimoSalvo = valorRemoto;
        txt.value = valorRemoto;
    }
}

function atualizarStatusSalvarAnotacoes(estado) {
    const el = document.getElementById('wsStatusSalvarAnotacoes');
    if (!el) return;

    el.classList.remove('salvando', 'salvo', 'erro');
    if (estado === 'salvando') {
        el.innerText = 'Salvando...';
        el.classList.add('salvando');
    } else if (estado === 'salvo') {
        el.innerText = 'Salvo';
        el.classList.add('salvo');
    } else if (estado === 'erro') {
        el.innerText = 'Erro ao salvar';
        el.classList.add('erro');
    } else {
        el.innerText = '';
    }
}

window.agendarSalvarAnotacoes = function() {
    atualizarStatusSalvarAnotacoes('salvando');
    clearTimeout(anotacoesTimerSalvar);
    anotacoesTimerSalvar = setTimeout(salvarAnotacoesProjeto, 800);
}

async function salvarAnotacoesProjeto() {
    if (!projetoAtualId || !projetoAtual) return;

    const txt = document.getElementById('txtAnotacoesProjeto');
    if (!txt) return;

    const valor = txt.value;
    try {
        await db.collection("croche_projetos").doc(projetoAtualId).update({
            anotacoes: valor,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        anotacoesUltimoSalvo = valor;
        projetoAtual.anotacoes = valor;
        atualizarStatusSalvarAnotacoes('salvo');
        setTimeout(() => {
            if (txt.value === valor) atualizarStatusSalvarAnotacoes('');
        }, 2000);
    } catch (error) {
        console.error('Erro ao salvar anotações:', error);
        atualizarStatusSalvarAnotacoes('erro');
    }
}

/** ==============================
 * EXCLUIR PROJETO
 * ============================== */
window.abrirModalExcluirProjeto = function() {
    if (!projetoAtualId || !projetoAtual) {
        if (typeof mostrarToast === 'function') mostrarToast('Nenhum projeto selecionado.', 'erro');
        return;
    }
    const nome = projetoAtual.nomeProjeto || 'este projeto';
    const txt = document.getElementById('txtConfirmacaoExclusao');
    if (txt) {
        txt.innerHTML = `Tem certeza que deseja excluir <strong style="color: var(--cor-titulo);">"${nome}"</strong>? Esta ação não pode ser desfeita. O cronômetro, materiais registrados e foto desta peça serão removidos permanentemente.`;
    }
    const btnConfirmar = document.getElementById('btnConfirmarExclusaoProjeto');
    if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.innerHTML = '<span class="material-symbols-rounded">delete</span> Excluir';
    }
    document.getElementById('modalExcluirProjeto').classList.remove('escondido');
}

window.confirmarExclusaoProjeto = async function() {
    if (!projetoAtualId || !projetoAtual) {
        if (typeof mostrarToast === 'function') mostrarToast('Nenhum projeto selecionado.', 'erro');
        return;
    }

    const btn = document.getElementById('btnConfirmarExclusaoProjeto');
    const idExcluir = projetoAtualId;
    const nomeExcluido = projetoAtual.nomeProjeto || 'Projeto';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Excluindo...';
    }

    try {
        await db.collection("croche_projetos").doc(idExcluir).delete();
        fecharModal('modalExcluirProjeto');
        voltarParaLista();
        if (typeof mostrarToast === 'function') {
            mostrarToast(`"${nomeExcluido}" foi excluído com sucesso.`, 'sucesso');
        }
    } catch (error) {
        console.error('Erro ao excluir projeto:', error);
        if (typeof mostrarToast === 'function') {
            mostrarToast('Não foi possível excluir o projeto. Tente novamente.', 'erro');
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-rounded">delete</span> Excluir';
        }
    }
}

/** ==============================
 * GESTÃO DE IMAGENS (BASE64 + COMPRESSÃO)
 * ============================== */
function carregarFotoWorkspace() {
    const imgPreview = document.getElementById('imgPreview');
    const iconPlaceholder = document.getElementById('iconPhotoPlaceholder');
    const txtBtnFoto = document.getElementById('txtBtnFoto');

    if (projetoAtual.imagemUrl) {
        imgPreview.src = projetoAtual.imagemUrl;
        imgPreview.classList.remove('escondido');
        iconPlaceholder.classList.add('escondido');
        txtBtnFoto.innerText = "Trocar Foto";
    } else {
        imgPreview.src = "";
        imgPreview.classList.add('escondido');
        iconPlaceholder.classList.remove('escondido');
        txtBtnFoto.innerText = "Selecionar Foto";
    }
}

/** ==============================
 * FOCAR INPUT DE IMAGEM (LIBERADO)
 * ============================== */
window.focarFileInput = function() {
    // Agora permite clicar sempre, idependente do status
    document.getElementById('fileInputImagem').click();
}

window.previewImagem = async function(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    const btnLbl = document.getElementById('lblSelecionarFoto');
    document.getElementById('txtBtnFoto').innerText = "Processando Imagem...";
    btnLbl.style.pointerEvents = "none";
    btnLbl.style.opacity = "0.7";

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = async function() {
            // COMPRESSÃO DA IMAGEM PARA NÃO ESTOURAR O LIMITE DO FIREBASE (1MB)
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Converte para Base64 (Qualidade 70% para economizar banco de dados)
            const base64Image = canvas.toDataURL('image/jpeg', 0.7);

            // Mostra o preview Imediato
            document.getElementById('imgPreview').src = base64Image;
            document.getElementById('imgPreview').classList.remove('escondido');
            document.getElementById('iconPhotoPlaceholder').classList.add('escondido');

            // Salva a string Base64 direto no Firestore
            try {
                await db.collection("croche_projetos").doc(projetoAtualId).update({
                    imagemUrl: base64Image,
                    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
                });
                if(typeof mostrarToast === 'function') mostrarToast("Foto salva com sucesso!", "sucesso");
                document.getElementById('txtBtnFoto').innerText = "Trocar Foto";
            } catch (error) {
                console.error("Erro ao salvar foto no banco:", error);
                if(typeof mostrarToast === 'function') mostrarToast("Erro ao salvar foto (Muito pesada?)", "erro");
                document.getElementById('txtBtnFoto').innerText = "Tentar Novamente";
            } finally {
                btnLbl.style.pointerEvents = "auto";
                btnLbl.style.opacity = "1";
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Lógica para Zoom na Imagem
document.getElementById('imgPreview').onclick = function(e) {
    e.stopPropagation(); 
    const modal = document.getElementById('modalZoom');
    const imgZoomed = document.getElementById('imgZoomed');
    imgZoomed.src = this.src;
    modal.classList.remove('escondido');
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
}

window.fecharZoom = function() {
    const modal = document.getElementById('modalZoom');
    modal.classList.add('escondido');
    modal.style.display = 'none';
}

/** ==============================
 * CRONÔMETRO (SERVER-SIDE)
 * ============================== */
window.toggleCronometro = async function() {
    if (!projetoAtual) return;
    const agora = Date.now();
    const btn = document.getElementById('btnPlayPause');
    btn.disabled = true;

    try {
        if (projetoAtual.status === 'crochetando') {
            const inicioMs = projetoAtual.timerInicioMs || agora;
            const diffSegundos = Math.floor((agora - inicioMs) / 1000);
            const novoAcumulado = (projetoAtual.segundosAcumulados || ((projetoAtual.tempoTotalMinutos||0)*60)) + diffSegundos;
            const novosMinutos = Math.floor(novoAcumulado / 60);

            await db.collection("croche_projetos").doc(projetoAtualId).update({
                status: 'andamento',
                segundosAcumulados: novoAcumulado,
                tempoTotalMinutos: novosMinutos,
                timerInicioMs: null,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await db.collection("croche_projetos").doc(projetoAtualId).update({
                status: 'crochetando',
                timerInicioMs: agora,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (e) { console.error(e); } finally { btn.disabled = false; }
}

function sincronizarCronometro() {
    clearInterval(displayInterval);
    const btn = document.getElementById('btnPlayPause');
    const icone = document.getElementById('iconePlayPause');
    const texto = document.getElementById('textoPlayPause');
    const statusBadge = document.getElementById('wsStatusProjeto');

    const baseAcumulada = projetoAtual.segundosAcumulados || ((projetoAtual.tempoTotalMinutos || 0) * 60);

    if (projetoAtual.status === 'crochetando') {
        icone.innerText = 'pause';
        texto.innerText = 'Pausar';
        btn.style.background = '#ec4899'; 
        statusBadge.innerText = '🧶 CROCHETANDO';
        statusBadge.style.background = 'rgba(236, 72, 153, 0.2)';
        statusBadge.style.color = '#ec4899';
        
        displayInterval = setInterval(() => {
            const agora = Date.now();
            const inicioMs = projetoAtual.timerInicioMs || agora;
            const diff = Math.floor((agora - inicioMs) / 1000);
            segundosDecorridos = baseAcumulada + diff;
            atualizarDisplayCronometro();
            if (segundosDecorridos % 60 === 0) atualizarPainelCalculadora(); 
        }, 1000);
    } else {
        icone.innerText = 'play_arrow';
        texto.innerText = 'Retomar';
        btn.style.background = 'linear-gradient(135deg, var(--f1a-blue), #1e3a8a)';
        statusBadge.innerText = projetoAtual.status === 'concluido' ? 'CONCLUÍDO' : 'EM ANDAMENTO';
        
        segundosDecorridos = baseAcumulada;
        atualizarDisplayCronometro();
        atualizarPainelCalculadora();
    }
}

function atualizarDisplayCronometro() {
    const h = Math.floor(segundosDecorridos / 3600);
    const m = Math.floor((segundosDecorridos % 3600) / 60);
    const s = segundosDecorridos % 60;
    document.getElementById('displayCronometro').innerText = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

window.salvarTempoManual = async function() {
    const addMinutos = prompt("Digite quantos MINUTOS deseja adicionar ao projeto:");
    if (!addMinutos || isNaN(addMinutos)) return;
    const baseAcumulada = projetoAtual.segundosAcumulados || ((projetoAtual.tempoTotalMinutos || 0) * 60);
    const novoAcumulado = baseAcumulada + (parseInt(addMinutos) * 60);
    await db.collection("croche_projetos").doc(projetoAtualId).update({
        segundosAcumulados: novoAcumulado,
        tempoTotalMinutos: Math.floor(novoAcumulado / 60),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/** ==============================
 * POPUP FLUTUANTE GLOBAL
 * ============================== */
function iniciarBalaoGlobal() {
    const balaoHtml = `
        <div id="balaoCrochetando" style="position: fixed; bottom: 20px; right: 20px; background: #ec4899; color: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4); display: none; align-items: center; gap: 15px; z-index: 9999; cursor: pointer; transition: all 0.3s; border: 2px solid #be185d;" onclick="irParaProjetoAtivo()">
            <div style="display: flex; align-items: center; justify-content: center; background: white; color: #ec4899; width: 40px; height: 40px; border-radius: 50%;">
                <span class="material-symbols-rounded" style="animation: spin 3s linear infinite;">motion_photos_on</span>
            </div>
            <div>
                <span style="display: block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;">Atenção Artesã</span>
                <span style="display: block; font-size: 15px; font-weight: 700;" id="balaoNomeProjeto">Projeto Ativo</span>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', balaoHtml);
}

window.irParaProjetoAtivo = function() {
    const projetoRodando = listaProjetos.find(p => p.status === 'crochetando');
    if (projetoRodando) {
        acessarProjeto(projetoRodando.id);
    }
};

function atualizarBalaoGlobal() {
    const balao = document.getElementById('balaoCrochetando');
    if (!balao) return;
    const projetoRodando = listaProjetos.find(p => p.status === 'crochetando');
    if (projetoRodando && !projetoAtualId) {
        document.getElementById('balaoNomeProjeto').innerText = projetoRodando.nomeProjeto;
        balao.style.display = 'flex';
        if(!document.getElementById('cssPulse')) document.head.insertAdjacentHTML('beforeend', `<style id="cssPulse">@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }</style>`);
        balao.style.animation = 'pulse 2s infinite';
    } else {
        balao.style.display = 'none';
        balao.style.animation = 'none';
    }
}

/** ==============================
 * MODAIS E CRUD
 * ============================== */
window.abrirModalSelecionarModo = function() {
    document.getElementById('modalSelecionarModo').classList.remove('escondido');
}

window.selecionarModoNovoProjeto = async function(modo) {
    modoNovoProjetoSelecionado = modo;
    fecharModal('modalSelecionarModo');
    await abrirModalNovoProjeto();
}

window.abrirModalNovoProjeto = async function() {
    document.getElementById('formNovoProjeto').reset();
    document.getElementById('projMargem').value = 30;
    configurarCamposFormNovoProjeto(modoNovoProjetoSelecionado);
    await carregarEstoqueMateriais();
    exibirAvisoEstoqueNovoProjeto();
    document.getElementById('modalNovoProjeto').classList.remove('escondido');
}
window.fecharModal = function(idModal) { document.getElementById(idModal).classList.add('escondido'); }

window.salvarNovoProjeto = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnCriarProjeto');
    btn.innerHTML = `Aguarde...`; btn.disabled = true;

    const modo = document.getElementById('projModoPrecificacao').value || modoNovoProjetoSelecionado;
    const dados = {
        usuarioId: usuarioLogado.uid,
        nomeProjeto: document.getElementById('projNome').value.trim(),
        categoria: document.getElementById('projCategoria').value,
        modoPrecificacao: modo,
        segundosAcumulados: 0,
        tempoTotalMinutos: 0,
        materiaisUsados: [],
        status: 'andamento',
        outrosCustos: 0,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (modo === MODOS_PRECIFICACAO.HORA_TRABALHADA) {
        dados.valorHora = desformatarMoeda(document.getElementById('projValorHora').value);
        dados.margemLucro = parseFloat(document.getElementById('projMargem').value) || 0;
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO) {
        dados.precoVendaDesejado = desformatarMoeda(document.getElementById('projPrecoVendaMP').value);
        dados.valorHora = 0;
        dados.margemLucro = 0;
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO) {
        dados.precoVendaDesejado = desformatarMoeda(document.getElementById('projPrecoVendaMPT').value);
        dados.valorHora = 0;
        dados.margemLucro = 0;
    }
    try {
        const docRef = await db.collection("croche_projetos").add(dados);
        fecharModal('modalNovoProjeto');
        if(typeof mostrarToast === 'function') mostrarToast("Projeto iniciado!", "sucesso");
        acessarProjeto(docRef.id);
    } catch (error) { console.error(error); } finally { btn.innerHTML = `Criar e Começar`; btn.disabled = false; }
}

async function carregarEstoqueMateriais() {
    try {
        const snap = await db.collection(MATERIAIS_SYNC.colecaoFirestore).where("usuarioId", "==", usuarioLogado.uid).get();
        estoqueMateriais = [];
        snap.forEach(doc => estoqueMateriais.push({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error(e); }
}

function estoqueSemMateriaisOuVazio() {
    if (!estoqueMateriais.length) return true;
    return estoqueMateriais.every(m => obterEstoqueDisponivelMaterial(m) <= 0);
}

function exibirAvisoEstoqueNovoProjeto() {
    if (!estoqueSemMateriaisOuVazio()) return;
    const msg = 'Atenção: não há materiais cadastrados ou disponíveis em estoque. O cálculo de custos poderá ficar incorreto.';
    if (typeof mostrarToast === 'function') {
        mostrarToast(msg, 'aviso');
    } else {
        alert(msg);
    }
}

function obterRefMaterialEstoque(materialId) {
    return db.collection(MATERIAIS_SYNC.colecaoFirestore).doc(materialId);
}

function atualizarEstoqueLocal(materialId, novaQtd) {
    const mat = estoqueMateriais.find(m => m.id === materialId);
    if (mat) mat.qtdRendimento = novaQtd;
}

async function persistirQtdRendimentoMaterial(materialId, novaQtd, opcoes = {}) {
    const qtdSegura = Math.max(0, Number(novaQtd) || 0);
    const update = {
        qtdRendimento: qtdSegura,
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (opcoes.registrarUtilizacao) {
        update.ultimaUtilizacao = firebase.firestore.FieldValue.serverTimestamp();
    }

    await obterRefMaterialEstoque(materialId).update(update);
    atualizarEstoqueLocal(materialId, qtdSegura);
    return qtdSegura;
}

async function debitarEstoqueMaterial(materialId, quantidade) {
    const mat = estoqueMateriais.find(m => m.id === materialId);
    if (!mat) throw new Error('Material não encontrado no estoque.');
    const qtdAtual = obterEstoqueDisponivelMaterial(mat);
    const qtdDebitar = Number(quantidade) || 0;
    if (qtdDebitar <= 0) throw new Error('Quantidade inválida.');
    if (qtdDebitar > qtdAtual) throw new Error('Quantidade superior ao estoque disponível.');
    return persistirQtdRendimentoMaterial(
        materialId,
        qtdAtual - qtdDebitar,
        { registrarUtilizacao: true }
    );
}

async function devolverEstoqueMaterial(materialId, quantidade) {
    const mat = estoqueMateriais.find(m => m.id === materialId);
    if (!mat) throw new Error('Material não encontrado no estoque.');
    const qtdAtual = obterEstoqueDisponivelMaterial(mat);
    const qtdDevolver = Number(quantidade) || 0;
    if (qtdDevolver <= 0) throw new Error('Quantidade inválida.');
    return persistirQtdRendimentoMaterial(materialId, qtdAtual + qtdDevolver);
}

function formatarQuantidadeEstoque(qtd) {
    const n = Number(qtd) || 0;
    if (Number.isInteger(n)) return String(n);
    const arredondado = Math.round(n * 100) / 100;
    return String(arredondado).replace('.', ',');
}

function textoEstoqueComUnidade(mat) {
    if (!mat) return '';
    const qtd = formatarQuantidadeEstoque(mat.qtdRendimento);
    const unidade = mat.unidadeRendimento || '';
    return unidade ? `${qtd} ${unidade}` : qtd;
}

function atualizarExibicaoEstoqueDisponivel() {
    const bloco = document.getElementById('matEstoqueDisponivel');
    const nomeEl = document.getElementById('matNomeEstoque');
    const qtdEl = document.getElementById('matQtdDisponivel');
    if (!bloco || !nomeEl || !qtdEl) return;

    const mat = estoqueMateriais.find(m => m.id === document.getElementById('matSelect').value);
    if (!mat) {
        bloco.classList.add('escondido');
        nomeEl.innerText = '';
        qtdEl.innerText = '';
        return;
    }

    nomeEl.innerText = mat.nome || '';
    qtdEl.innerText = `Disponível: ${textoEstoqueComUnidade(mat)}`;
    bloco.classList.remove('escondido');
}

function obterEstoqueDisponivelMaterial(mat) {
    if (!mat) return 0;
    return Number(mat.qtdRendimento) || 0;
}

function quantidadeSuperiorAoEstoque(qtdUsada, matEstoque) {
    const qtd = Number(qtdUsada);
    if (isNaN(qtd)) return false;
    return qtd > obterEstoqueDisponivelMaterial(matEstoque);
}

window.limparErroValidacaoEstoque = function() {
    const el = document.getElementById('matErroEstoque');
    if (!el) return;
    el.innerText = '';
    el.classList.add('escondido');
}

function exibirErroValidacaoEstoque() {
    const el = document.getElementById('matErroEstoque');
    if (!el) return;
    el.innerText = 'Quantidade superior ao estoque disponível.';
    el.classList.remove('escondido');
}

window.abrirModalUsoMaterial = function() {
    if (!projetoAtual) return;
    if (projetoAtual.status === 'concluido') return alert("Projeto finalizado.");
    const select = document.getElementById('matSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o material...</option>';
    estoqueMateriais.forEach(m => { select.innerHTML += `<option value="${m.id}">${m.nome} (R$ ${formatarParaMoedaSTR(m.preco)})</option>`; });
    document.getElementById('formAddMaterial').reset();
    document.getElementById('lblMedidaHint').innerText = "...";
    limparErroValidacaoEstoque();
    atualizarExibicaoEstoqueDisponivel();
    const modal = document.getElementById('modalAddMaterial');
    if (!modal) return;
    modal.classList.remove('escondido');
}

window.atualizarHintMedida = function() {
    const mat = estoqueMateriais.find(m => m.id === document.getElementById('matSelect').value);
    document.getElementById('lblMedidaHint').innerText = mat ? mat.unidadeRendimento : "...";
    limparErroValidacaoEstoque();
    atualizarExibicaoEstoqueDisponivel();
}

window.salvarMaterialNoProjeto = async function(e) {
    e.preventDefault();
    const matEstoque = estoqueMateriais.find(m => m.id === document.getElementById('matSelect').value);
    if (!matEstoque) return;

    const qtdUsada = parseFloat(document.getElementById('matQtdUsada').value);
    if (quantidadeSuperiorAoEstoque(qtdUsada, matEstoque)) {
        exibirErroValidacaoEstoque();
        if (typeof mostrarToast === 'function') mostrarToast('Quantidade superior ao estoque disponível.', 'erro');
        return;
    }
    limparErroValidacaoEstoque();

    const qtdRendimentoOriginal = obterEstoqueDisponivelMaterial(matEstoque);
    let listaAtual = projetoAtual.materiaisUsados || [];
    const indiceExistente = listaAtual.findIndex(m => m.materialId === matEstoque.id);

    if (indiceExistente >= 0) {
        const itemExistente = listaAtual[indiceExistente];
        const novaQuantidade = itemExistente.quantidadeUsada + qtdUsada;
        const custoRecalculado = (matEstoque.preco / qtdRendimentoOriginal) * novaQuantidade;
        listaAtual[indiceExistente] = {
            ...itemExistente,
            quantidadeUsada: novaQuantidade,
            custoFracao: custoRecalculado
        };
    } else {
        const custoCalculado = (matEstoque.preco / qtdRendimentoOriginal) * qtdUsada;
        listaAtual.push({
            materialId: matEstoque.id,
            nome: matEstoque.nome,
            quantidadeUsada: qtdUsada,
            unidade: matEstoque.unidadeRendimento,
            custoFracao: custoCalculado
        });
    }

    try {
        await debitarEstoqueMaterial(matEstoque.id, qtdUsada);
        try {
            await db.collection("croche_projetos").doc(projetoAtualId).update({ materiaisUsados: listaAtual });
            fecharModal('modalAddMaterial');
        } catch (projectError) {
            await devolverEstoqueMaterial(matEstoque.id, qtdUsada);
            throw projectError;
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') mostrarToast('Não foi possível adicionar o material ao projeto.', 'erro');
    }
}

function renderizarMateriaisProjeto() {
    const container = document.getElementById('listaMateriaisProjeto');
    const lista = projetoAtual.materiaisUsados || [];
    let totalMateriais = 0; lista.forEach(m => totalMateriais += m.custoFracao);

    let html = `
        <div style="background: var(--bg-body); border-left: 4px solid var(--f1a-blue); padding: 12px 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 700; color: var(--cor-texto); text-transform: uppercase;">Custo Total (Estoque)</span>
            <span style="font-size: 18px; font-weight: 800; color: var(--cor-titulo);">R$ ${formatarParaMoedaSTR(totalMateriais)}</span>
        </div>`;

    if (lista.length === 0) {
        container.innerHTML = html + `<p style="color: var(--cor-texto); font-size: 13px; text-align:center;">Nenhum material adicionado.</p>`;
        return;
    }

    lista.forEach((item, index) => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-body); padding:10px 15px; border-radius:10px; margin-bottom:8px; border:1px solid var(--borda);">
                <div>
                    <span style="display:block; font-size:13px; font-weight:700; color:var(--cor-titulo);">${item.nome}</span>
                    <span style="font-size:11px; color:var(--cor-texto);">${item.quantidadeUsada} ${item.unidade}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:800; color:var(--f1a-blue); font-size:14px;">R$ ${formatarParaMoedaSTR(item.custoFracao)}</span>
                    ${projetoAtual.status !== 'concluido' ? `<button onclick="removerMaterialProjeto(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>` : ''}
                </div>
            </div>`;
    });
    container.innerHTML = html;
}

window.removerMaterialProjeto = async function(index) {
    if(!confirm("Remover este material do custo?")) return;
    let listaAtual = projetoAtual.materiaisUsados || [];
    const materialRemovido = listaAtual[index];
    if (!materialRemovido) return;

    listaAtual.splice(index, 1);

    try {
        if (materialRemovido.materialId) {
            await devolverEstoqueMaterial(materialRemovido.materialId, materialRemovido.quantidadeUsada);
        }
        try {
            await db.collection("croche_projetos").doc(projetoAtualId).update({ materiaisUsados: listaAtual });
        } catch (projectError) {
            if (materialRemovido.materialId) {
                await debitarEstoqueMaterial(materialRemovido.materialId, materialRemovido.quantidadeUsada);
            }
            throw projectError;
        }
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') mostrarToast('Não foi possível remover o material do projeto.', 'erro');
    }
}

function atualizarPainelCalculadora() {
    if (!projetoAtual) return;
    const calc = calcularPrecificacao(projetoAtual, segundosDecorridos);
    const modo = calc.modo;

    const blocos = {
        wsBlocoCustoMaterial: true,
        wsBlocoMaoObra: modo === MODOS_PRECIFICACAO.HORA_TRABALHADA,
        wsBlocoOutrosCustos: true,
        wsBlocoCustoTotal: modo !== MODOS_PRECIFICACAO.HORA_TRABALHADA,
        wsBlocoLucro: true,
        wsBlocoHoraReal: modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO,
        wsBlocoPrecoFinal: true
    };
    Object.keys(blocos).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('escondido', !blocos[id]);
    });

    const lblLucro = document.getElementById('lblCalcLucro');
    if (lblLucro) {
        if (modo === MODOS_PRECIFICACAO.HORA_TRABALHADA) {
            lblLucro.innerHTML = `Lucro (<span id="lblMargemLucro">${projetoAtual.margemLucro || 0}</span>%)`;
        } else {
            const pctLucro = (Math.round(calc.margemLucroPct * 10) / 10).toString().replace('.', ',');
            lblLucro.innerText = `Lucro (${pctLucro}%)`;
        }
    }

    const lblPreco = document.getElementById('lblCalcPrecoFinal');
    if (lblPreco) {
        lblPreco.innerText = modo === MODOS_PRECIFICACAO.HORA_TRABALHADA
            ? 'Preço Sugerido'
            : 'Preço de Venda';
    }

    document.getElementById('calcCustoMaterial').innerText = `R$ ${formatarParaMoedaSTR(calc.custoMat)}`;
    document.getElementById('calcMaoObra').innerText = `R$ ${formatarParaMoedaSTR(calc.custoMaoObra)}`;
    document.getElementById('calcOutrosCustos').innerText = `R$ ${formatarParaMoedaSTR(calc.outrosCustos)}`;
    document.getElementById('calcCustoTotal').innerText = `R$ ${formatarParaMoedaSTR(calc.custoTotal)}`;
    document.getElementById('calcLucro').innerText = `R$ ${formatarParaMoedaSTR(calc.valorLucro)}`;
    document.getElementById('calcPrecoFinal').innerText = `R$ ${formatarParaMoedaSTR(calc.precoFinal)}`;

    const elHoraReal = document.getElementById('calcValorHoraReal');
    if (elHoraReal) {
        elHoraReal.innerText = calc.valorHoraReal != null
            ? `R$ ${formatarParaMoedaSTR(calc.valorHoraReal)}`
            : '—';
    }
}

window.abrirModalEditarConfig = function() {
    const modo = obterModoPrecificacao(projetoAtual);
    const permiteEditarConcluido = projetoAtual.status === 'concluido'
        && (modo === MODOS_PRECIFICACAO.MEU_PRECO || modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO);
    if (projetoAtual.status === 'concluido' && !permiteEditarConcluido) return;
    configurarCamposFormEditarConfig(modo);

    if (modo === MODOS_PRECIFICACAO.HORA_TRABALHADA) {
        document.getElementById('projEditValorHora').value = formatarParaMoedaSTR(projetoAtual.valorHora || 0);
        document.getElementById('projEditMargem').value = projetoAtual.margemLucro || 0;
        document.getElementById('projEditOutrosCustosHT').value = formatarParaMoedaSTR(projetoAtual.outrosCustos || 0);
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO) {
        document.getElementById('projEditPrecoVenda').value = formatarParaMoedaSTR(projetoAtual.precoVendaDesejado || 0);
        document.getElementById('projEditOutrosCustosMP').value = formatarParaMoedaSTR(projetoAtual.outrosCustos || 0);
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO) {
        document.getElementById('projEditPrecoVendaMPT').value = formatarParaMoedaSTR(projetoAtual.precoVendaDesejado || 0);
        document.getElementById('projEditOutrosCustosMPT').value = formatarParaMoedaSTR(projetoAtual.outrosCustos || 0);
    }

    document.getElementById('modalEditarConfig').classList.remove('escondido');
}

window.salvarConfigProjeto = async function(e) {
    e.preventDefault();
    const modo = obterModoPrecificacao(projetoAtual);
    const update = {
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (modo === MODOS_PRECIFICACAO.HORA_TRABALHADA) {
        update.valorHora = desformatarMoeda(document.getElementById('projEditValorHora').value);
        update.margemLucro = parseFloat(document.getElementById('projEditMargem').value) || 0;
        update.outrosCustos = desformatarMoeda(document.getElementById('projEditOutrosCustosHT').value);
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO) {
        update.precoVendaDesejado = desformatarMoeda(document.getElementById('projEditPrecoVenda').value);
        update.outrosCustos = desformatarMoeda(document.getElementById('projEditOutrosCustosMP').value);
    } else if (modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO) {
        update.precoVendaDesejado = desformatarMoeda(document.getElementById('projEditPrecoVendaMPT').value);
        update.outrosCustos = desformatarMoeda(document.getElementById('projEditOutrosCustosMPT').value);
    }

    if (projetoAtual.status === 'concluido'
        && (modo === MODOS_PRECIFICACAO.MEU_PRECO || modo === MODOS_PRECIFICACAO.MEU_PRECO_TEMPO)) {
        const segFinais = projetoAtual.segundosAcumulados || ((projetoAtual.tempoTotalMinutos || 0) * 60);
        const calcAtualizado = calcularPrecificacao({ ...projetoAtual, ...update }, segFinais);
        update.precoSugerido = calcAtualizado.precoFinal;
    }

    await db.collection("croche_projetos").doc(projetoAtualId).update(update);
    Object.assign(projetoAtual, update);
    atualizarPainelCalculadora();
    renderizarTabelaProjetos();
    fecharModal('modalEditarConfig');
}

window.abrirModalRenomearProjeto = function() {
    if (!projetoAtualId || !projetoAtual) return;
    projetoRenomearId = projetoAtualId;
    const input = document.getElementById('projRenomearNome');
    if (input) input.value = projetoAtual.nomeProjeto || '';
    document.getElementById('modalRenomearProjeto').classList.remove('escondido');
};

window.abrirModalRenomearProjetoGrid = function(id, event) {
    if (event) event.stopPropagation();
    const projeto = listaProjetos.find(p => p.id === id);
    if (!projeto) return;
    projetoRenomearId = id;
    const input = document.getElementById('projRenomearNome');
    if (input) input.value = projeto.nomeProjeto || '';
    document.getElementById('modalRenomearProjeto').classList.remove('escondido');
};

window.salvarRenomearProjeto = async function(e) {
    e.preventDefault();
    const idRenomear = projetoRenomearId || projetoAtualId;
    if (!idRenomear) return;

    const novoNome = document.getElementById('projRenomearNome').value.trim();
    if (!novoNome) return;

    const btn = document.getElementById('btnSalvarRenomearProjeto');
    if (btn) { btn.disabled = true; btn.innerText = 'Salvando...'; }

    try {
        await db.collection("croche_projetos").doc(idRenomear).update({
            nomeProjeto: novoNome,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        const idx = listaProjetos.findIndex(p => p.id === idRenomear);
        if (idx >= 0) listaProjetos[idx].nomeProjeto = novoNome;

        if (projetoAtualId === idRenomear && projetoAtual) {
            projetoAtual.nomeProjeto = novoNome;
            const wsNome = document.getElementById('wsNomeProjeto');
            if (wsNome) wsNome.innerText = novoNome;
        }

        renderizarTabelaProjetos();
        fecharModal('modalRenomearProjeto');
        projetoRenomearId = null;
        if (typeof mostrarToast === 'function') mostrarToast('Nome atualizado!', 'sucesso');
    } catch (error) {
        console.error(error);
        if (typeof mostrarToast === 'function') mostrarToast('Não foi possível renomear o projeto.', 'erro');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = 'Salvar'; }
    }
}

window.abrirModalFinalizar = async function() {
    if(!confirm("Deseja concluir esta peça?")) return;
    const btn = document.getElementById('btnFinalizarProjeto');
    btn.disabled = true;

    try {
        let segFinais = projetoAtual.segundosAcumulados || ((projetoAtual.tempoTotalMinutos||0)*60);
        if (projetoAtual.status === 'crochetando') {
            segFinais += Math.floor((Date.now() - projetoAtual.timerInicioMs) / 1000);
        }

        const calc = calcularPrecificacao(projetoAtual, segFinais);
        const precoSugerido = calc.precoFinal;

        await db.collection("croche_projetos").doc(projetoAtualId).update({
            status: 'concluido',
            segundosAcumulados: segFinais, tempoTotalMinutos: Math.floor(segFinais / 60), timerInicioMs: null,
            precoSugerido: precoSugerido, dataConclusao: firebase.firestore.FieldValue.serverTimestamp()
        });
        voltarParaLista();
    } catch (err) { console.error(err); } finally { btn.disabled = false; }
}

window.aplicarMascaraMoeda = function(input) {
    let v = input.value.replace(/\D/g,'');
    if (v === "") { input.value = ""; return; }
    v = (v/100).toFixed(2) + ''; v = v.replace(".", ","); v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,"); v = v.replace(/(\d)(\d{3}),/g, "$1.$2,"); input.value = v;
}
function desformatarMoeda(valorStr) { return !valorStr ? 0 : parseFloat(valorStr.replace(/\./g, '').replace(',', '.')); }
function formatarParaMoedaSTR(valorNumero) {
    if (isNaN(valorNumero) || valorNumero === 0) return "0,00";
    return parseFloat(valorNumero).toFixed(2).replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
}

window.toggleDropdownPerfil = function(event) {
    event.preventDefault();
    event.stopPropagation();
    const menu = document.getElementById('dropdownPerfilLocal');
    if (!menu) return;
    const abrir = menu.classList.contains('escondido');
    document.querySelectorAll('.menu-perfil-flutuante').forEach(m => m.classList.add('escondido'));
    if (abrir) menu.classList.remove('escondido');
};

document.addEventListener('click', function(event) {
    const clicouNoPerfil = event.target.closest('.user-profile');
    const clicouNoDropdown = event.target.closest('#dropdownPerfilLocal');
    if (!clicouNoPerfil && !clicouNoDropdown) {
        document.querySelectorAll('.menu-perfil-flutuante').forEach(menu => menu.classList.add('escondido'));
    }

    if (!event.target.closest('.filtro-categoria-wrapper')) {
        const dropdownCat = document.getElementById('dropdownFiltroCategoria');
        if (dropdownCat) dropdownCat.classList.add('escondido');
    }
});

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.menu-perfil-flutuante').forEach(menu => menu.classList.add('escondido'));
        const dropdownCat = document.getElementById('dropdownFiltroCategoria');
        if (dropdownCat) dropdownCat.classList.add('escondido');
    }
});