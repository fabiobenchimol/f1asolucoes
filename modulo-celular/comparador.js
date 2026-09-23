import { carregarCatalogo, buscarSmartphones } from "./services/smartphones.service.js";
import { encontrarEquivalentes } from "./services/equivalencia.service.js";
import { PERFIS_USO, calcularNotaGeral } from "./services/pontuacao.service.js";
import { obterPrecoPrincipal } from "./services/preco.service.js";
import { renderizarSugestoes, ocultarSugestoes } from "./components/busca-modelo.js";
import { renderizarAparelhoSelecionado, renderizarEquivalentes, renderizarFicha } from "./components/resultado-modelo.js";
import { renderizarComparativo, obterExplicacaoComparativo } from "./components/comparativo.js";
import { renderizarRanking } from "./components/ranking.js";

const estado = {
    catalogo: [],
    origemCatalogo: "demonstracao",
    empresaId: "",
    aparelhoSelecionado: null,
    equivalentes: [],
    selecionados: new Set(),
    perfil: "geral",
    rankingCategoria: "geral",
    inicializado: false
};

const elementos = {};
let temporizadorBusca = null;

function escaparHtml(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterGlobal(nome) {
    try {
        if (nome === "db" && typeof db !== "undefined") return db;
        if (nome === "dadosUsuarioLogado" && typeof dadosUsuarioLogado !== "undefined") return dadosUsuarioLogado;
        if (nome === "perfilUsuario" && typeof perfilUsuario !== "undefined") return perfilUsuario;
    } catch (_) {
        return null;
    }
    return null;
}

function avisar(mensagem, tipo = "sucesso") {
    if (typeof window.mostrarToast === "function") window.mostrarToast(mensagem, tipo);
    else console[tipo === "erro" ? "error" : "info"](mensagem);
}

function mapearElementos() {
    [
        "corpoPagina", "buscaSmartphone", "limparBusca", "autocompleteResultados", "catalogoStatus",
        "aparelhoSelecionado", "equivalentes", "listaEquivalentes", "btnCompararSelecionados",
        "contadorSelecionados", "comparacao", "tabelaComparacao", "perfilUso", "filtroMarca",
        "filtroPreco", "filtroNota", "filtroRam", "rankingConteudo", "modalDetalhes",
        "modalDetalhesConteudo", "modalExplicacao", "tituloExplicacao", "listaExplicacao",
        "perfilUsuario", "dropdownPerfilLocal"
    ].forEach((id) => { elementos[id] = document.getElementById(id); });
}

function resolverEmpresaAtiva(usuario) {
    const empresas = Array.isArray(usuario?.empresaId)
        ? usuario.empresaId.map(String)
        : (usuario?.empresaId ? [String(usuario.empresaId)] : []);
    const memorizada = sessionStorage.getItem("visaoEmpresaAtiva");
    if (memorizada && (usuario?.perfil === "master" || empresas.includes(memorizada))) return memorizada;
    const empresa = empresas[0] || "";
    if (empresa) sessionStorage.setItem("visaoEmpresaAtiva", empresa);
    return empresa;
}

async function configurarEmpresa(usuario) {
    const container = document.getElementById("containerSeletorVisaoEmpresa");
    if (!container) return;

    let ids = Array.isArray(usuario?.empresaId) ? usuario.empresaId.map(String) : (usuario?.empresaId ? [String(usuario.empresaId)] : []);
    const firestore = obterGlobal("db");
    if (usuario?.perfil === "master" && firestore?.collection) {
        try {
            const snapshot = await firestore.collection("empresas").get();
            ids = snapshot.docs.map((doc) => doc.id);
        } catch (erro) {
            console.warn("Comparador: não foi possível listar todas as empresas.", erro);
        }
    }
    if (estado.empresaId && !ids.includes(estado.empresaId)) ids.unshift(estado.empresaId);

    const nomes = new Map();
    if (firestore?.collection) {
        await Promise.all(ids.map(async (id) => {
            try {
                const doc = await firestore.collection("empresas").doc(id).get();
                const dados = doc.exists ? doc.data() : {};
                nomes.set(id, dados.nomeFantasia || dados.razaoSocial || `Empresa ${id.slice(0, 5)}`);
            } catch (_) {
                nomes.set(id, `Empresa ${id.slice(0, 5)}`);
            }
        }));
    }

    const icone = document.createElement("span");
    icone.className = "material-symbols-rounded";
    icone.textContent = "domain";
    container.replaceChildren(icone);

    if (ids.length > 1) {
        const select = document.createElement("select");
        select.setAttribute("aria-label", "Empresa ativa");
        ids.forEach((id) => {
            const option = document.createElement("option");
            option.value = id;
            option.textContent = nomes.get(id) || `Empresa ${id.slice(0, 5)}`;
            option.selected = id === estado.empresaId;
            select.appendChild(option);
        });
        select.addEventListener("change", () => {
            sessionStorage.setItem("visaoEmpresaAtiva", select.value);
            window.location.reload();
        });
        container.appendChild(select);
    } else {
        const nome = document.createElement("span");
        nome.textContent = nomes.get(estado.empresaId) || "Empresa ativa";
        container.appendChild(nome);
    }
}

function configurarPerfilUsuario(usuario) {
    const nome = usuario?.nome || "Usuário";
    const perfil = usuario?.perfil || obterGlobal("perfilUsuario") || "usuário";
    document.getElementById("nomeUsuario").textContent = nome;
    document.getElementById("cargoUsuario").textContent = String(perfil).toUpperCase();
    document.getElementById("iniciaisUsuario").textContent = nome.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] || "").join("").toUpperCase() || "--";
}

function configurarPerfisUso() {
    elementos.perfilUso.innerHTML = Object.entries(PERFIS_USO)
        .map(([id, perfil]) => `<option value="${id}">${perfil.nome}</option>`)
        .join("");
}

function atualizarStatusCatalogo() {
    const textoOrigem = estado.origemCatalogo === "firestore"
        ? "Firestore + fallback demonstrativo"
        : "dados demonstrativos de validação";
    elementos.catalogoStatus.textContent = `${estado.catalogo.length} versões disponíveis · Fonte atual: ${textoOrigem}. Preços estimados são identificados nos cards.`;
}

function selecionarAparelho(id, rolar = true) {
    const item = estado.catalogo.find((smartphone) => smartphone.id === id);
    if (!item) return;

    estado.aparelhoSelecionado = item;
    estado.equivalentes = [];
    estado.selecionados = new Set([item.id]);
    elementos.buscaSmartphone.value = `${item.nome} ${item.variante}`;
    elementos.limparBusca.hidden = false;
    ocultarSugestoes(elementos.autocompleteResultados);
    renderizarAparelhoSelecionado(elementos.aparelhoSelecionado, item, estado.perfil);
    elementos.aparelhoSelecionado.hidden = false;
    elementos.equivalentes.hidden = true;
    elementos.comparacao.hidden = true;
    atualizarContadorComparacao();
    if (rolar) elementos.aparelhoSelecionado.scrollIntoView({ behavior: "smooth", block: "start" });
}

function pesquisar(termo) {
    const resultados = buscarSmartphones(estado.catalogo, termo);
    renderizarSugestoes(elementos.autocompleteResultados, resultados);
}

function obterEquivalentesFiltrados() {
    const marca = elementos.filtroMarca.value;
    const precoMaximo = Number(elementos.filtroPreco.value) || Infinity;
    const notaMinima = Number(elementos.filtroNota.value) || 0;
    const ramMinima = Number(elementos.filtroRam.value) || 0;

    return estado.equivalentes.filter((item) => {
        const preco = obterPrecoPrincipal(item).valor ?? Infinity;
        const nota = calcularNotaGeral(item, estado.perfil) ?? 0;
        return (!marca || item.marca === marca) && preco <= precoMaximo && nota >= notaMinima && Number(item.ram || 0) >= ramMinima;
    });
}

function preencherFiltroMarcas() {
    const marcas = [...new Set(estado.equivalentes.map((item) => item.marca))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    elementos.filtroMarca.innerHTML = '<option value="">Todas</option>' + marcas.map((marca) => `<option value="${escaparHtml(marca)}">${escaparHtml(marca)}</option>`).join("");
}

function renderizarListaEquivalentes() {
    renderizarEquivalentes(elementos.listaEquivalentes, obterEquivalentesFiltrados(), estado.selecionados, estado.perfil);
    ativarFallbackImagens(elementos.listaEquivalentes);
}

function encontrar(rolar = true) {
    if (!estado.aparelhoSelecionado) return;
    estado.equivalentes = encontrarEquivalentes(estado.aparelhoSelecionado, estado.catalogo, {
        perfil: estado.perfil,
        limite: 12,
        indiceMinimo: 52,
        incluirMesmaMarca: true
    });
    preencherFiltroMarcas();
    renderizarListaEquivalentes();
    elementos.equivalentes.hidden = false;
    if (rolar) elementos.equivalentes.scrollIntoView({ behavior: "smooth", block: "start" });
}

function atualizarContadorComparacao() {
    const total = estado.selecionados.size;
    elementos.contadorSelecionados.textContent = String(total);
    elementos.btnCompararSelecionados.disabled = total < 2;
}

function alternarComparacao(id, marcado) {
    if (marcado) estado.selecionados.add(id);
    else if (id !== estado.aparelhoSelecionado?.id) estado.selecionados.delete(id);
    atualizarContadorComparacao();
}

function compararSelecionados() {
    const itens = [...estado.selecionados]
        .map((id) => estado.catalogo.find((item) => item.id === id))
        .filter(Boolean);
    renderizarComparativo(elementos.tabelaComparacao, itens, estado.perfil);
    elementos.comparacao.hidden = false;
    elementos.comparacao.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderizarRankingAtual() {
    renderizarRanking(elementos.rankingConteudo, estado.catalogo, estado.rankingCategoria, estado.perfil);
}

function abrirFicha(id) {
    const item = estado.catalogo.find((smartphone) => smartphone.id === id);
    if (!item) return;
    renderizarFicha(elementos.modalDetalhesConteudo, item, estado.perfil);
    elementos.modalDetalhes.classList.remove("escondido");
    document.body.classList.add("modal-open");
    ativarFallbackImagens(elementos.modalDetalhesConteudo);
}

function fecharModal(modal) {
    modal?.classList.add("escondido");
    if (document.querySelectorAll(".modal-overlay:not(.escondido)").length === 0) document.body.classList.remove("modal-open");
}

function abrirExplicacao(id, categoria) {
    const item = estado.catalogo.find((smartphone) => smartphone.id === id);
    if (!item) return;
    const explicacao = obterExplicacaoComparativo(item, categoria);
    elementos.tituloExplicacao.textContent = explicacao.titulo;
    elementos.listaExplicacao.innerHTML = "";
    explicacao.criterios.forEach((criterio) => {
        const li = document.createElement("li");
        li.textContent = criterio;
        elementos.listaExplicacao.appendChild(li);
    });
    elementos.modalExplicacao.classList.remove("escondido");
    document.body.classList.add("modal-open");
}

function ativarFallbackImagens(raiz = document) {
    raiz.querySelectorAll("img[data-fallback-imagem]").forEach((imagem) => {
        imagem.addEventListener("error", () => {
            const placeholder = document.createElement("div");
            placeholder.className = "device-placeholder";
            placeholder.innerHTML = '<span class="material-symbols-rounded">smartphone</span><strong>Imagem indisponível</strong>';
            imagem.replaceWith(placeholder);
        }, { once: true });
    });
}

function recalcularPerfil() {
    estado.perfil = elementos.perfilUso.value;
    if (estado.aparelhoSelecionado) {
        renderizarAparelhoSelecionado(elementos.aparelhoSelecionado, estado.aparelhoSelecionado, estado.perfil);
        if (estado.equivalentes.length) encontrar(false);
        if (!elementos.comparacao.hidden) compararSelecionados();
    }
    renderizarRankingAtual();
}

function configurarEventos() {
    elementos.buscaSmartphone.addEventListener("input", () => {
        clearTimeout(temporizadorBusca);
        elementos.limparBusca.hidden = !elementos.buscaSmartphone.value;
        temporizadorBusca = setTimeout(() => pesquisar(elementos.buscaSmartphone.value), 250);
    });
    elementos.buscaSmartphone.addEventListener("focus", () => {
        if (elementos.buscaSmartphone.value.trim().length >= 2) pesquisar(elementos.buscaSmartphone.value);
    });
    elementos.limparBusca.addEventListener("click", () => {
        elementos.buscaSmartphone.value = "";
        elementos.limparBusca.hidden = true;
        ocultarSugestoes(elementos.autocompleteResultados);
        elementos.buscaSmartphone.focus();
    });
    elementos.autocompleteResultados.addEventListener("click", (evento) => {
        const alvo = evento.target.closest("[data-smartphone-id]");
        if (alvo) selecionarAparelho(alvo.dataset.smartphoneId);
    });
    document.querySelector(".search-examples").addEventListener("click", (evento) => {
        if (evento.target.tagName !== "BUTTON") return;
        elementos.buscaSmartphone.value = evento.target.textContent;
        elementos.limparBusca.hidden = false;
        pesquisar(evento.target.textContent);
        elementos.buscaSmartphone.focus();
    });
    elementos.aparelhoSelecionado.addEventListener("click", (evento) => {
        if (evento.target.closest("#btnEncontrarEquivalentes")) encontrar();
        const detalhes = evento.target.closest('[data-acao="detalhes"]');
        if (detalhes) abrirFicha(detalhes.dataset.smartphoneId);
    });
    elementos.listaEquivalentes.addEventListener("change", (evento) => {
        if (evento.target.matches("[data-comparar-id]")) alternarComparacao(evento.target.dataset.compararId, evento.target.checked);
    });
    elementos.listaEquivalentes.addEventListener("click", (evento) => {
        const detalhes = evento.target.closest('[data-acao="detalhes"]');
        if (detalhes) abrirFicha(detalhes.dataset.smartphoneId);
    });
    elementos.btnCompararSelecionados.addEventListener("click", compararSelecionados);
    ["filtroMarca", "filtroPreco", "filtroNota", "filtroRam"].forEach((id) => {
        document.getElementById(id).addEventListener(id.startsWith("filtroP") || id === "filtroNota" ? "input" : "change", renderizarListaEquivalentes);
    });
    elementos.perfilUso.addEventListener("change", recalcularPerfil);
    elementos.tabelaComparacao.addEventListener("click", (evento) => {
        const botao = evento.target.closest("[data-explicar-id]");
        if (botao) abrirExplicacao(botao.dataset.explicarId, botao.dataset.categoria);
    });
    elementos.rankingConteudo.addEventListener("change", (evento) => {
        if (evento.target.id !== "rankingCategoria") return;
        estado.rankingCategoria = evento.target.value;
        renderizarRankingAtual();
    });
    elementos.rankingConteudo.addEventListener("click", (evento) => {
        const item = evento.target.closest("[data-smartphone-id]");
        if (item) selecionarAparelho(item.dataset.smartphoneId);
    });
    document.addEventListener("click", (evento) => {
        if (!evento.target.closest(".search-box")) ocultarSugestoes(elementos.autocompleteResultados);
        if (!evento.target.closest("#perfilUsuario")) {
            elementos.dropdownPerfilLocal.classList.add("escondido");
            elementos.perfilUsuario.setAttribute("aria-expanded", "false");
        }
        const fecharDetalhes = evento.target.closest("[data-fechar-modal]");
        const fecharExplicacao = evento.target.closest("[data-fechar-explicacao]");
        if (fecharDetalhes || evento.target === elementos.modalDetalhes) fecharModal(elementos.modalDetalhes);
        if (fecharExplicacao || evento.target === elementos.modalExplicacao) fecharModal(elementos.modalExplicacao);
    });
    document.getElementById("btnMenu").addEventListener("click", () => window.toggleSidebarF1A?.());
    document.getElementById("overlayMobile").addEventListener("click", () => window.toggleSidebarF1A?.());
    document.getElementById("btnTemaGlobal").addEventListener("click", () => window.alternarTemaGlobal?.());
    document.querySelector("[data-ir-lobby]").addEventListener("click", () => { window.location.href = "../lobby.html"; });
    elementos.perfilUsuario.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const aberto = elementos.dropdownPerfilLocal.classList.toggle("escondido") === false;
        elementos.perfilUsuario.setAttribute("aria-expanded", String(aberto));
    });
    document.getElementById("btnAlterarNome").addEventListener("click", (evento) => {
        evento.preventDefault();
        window.alterarNomeExibicao?.();
    });
    document.getElementById("btnSair").addEventListener("click", (evento) => {
        evento.preventDefault();
        window.sair?.();
    });
}

async function iniciarModulo() {
    if (estado.inicializado) return;
    estado.inicializado = true;
    mapearElementos();
    const usuario = obterGlobal("dadosUsuarioLogado");
    const autenticado = window.firebase?.auth?.().currentUser;
    if (!autenticado || !usuario) {
        estado.inicializado = false;
        return;
    }

    try {
        estado.empresaId = resolverEmpresaAtiva(usuario);
        if (!estado.empresaId && usuario.perfil !== "master") throw new Error("Nenhuma empresa ativa foi identificada.");
        configurarPerfilUsuario(usuario);
        configurarPerfisUso();
        configurarEventos();
        await configurarEmpresa(usuario);

        const resultado = await carregarCatalogo({ db: obterGlobal("db"), empresaId: estado.empresaId });
        estado.catalogo = resultado.itens;
        estado.origemCatalogo = resultado.origem;
        atualizarStatusCatalogo();
        renderizarRankingAtual();
        elementos.corpoPagina.style.display = "";
    } catch (erro) {
        console.error("Falha ao iniciar Comparador de Smartphones:", erro);
        elementos.corpoPagina.style.display = "";
        elementos.catalogoStatus.textContent = "Não foi possível carregar o catálogo.";
        avisar(erro.message || "Falha ao iniciar o comparador.", "erro");
    }
}

window.posAuthCallback = iniciarModulo;

if (window.firebase?.auth?.().currentUser) {
    queueMicrotask(iniciarModulo);
}
