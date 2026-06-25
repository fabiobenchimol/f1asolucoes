// ============================================================================
// MÓDULO: CRM - COMISSÕES
// ARQUIVO: comissoes.js
// ============================================================================

let empresaContextoId = null;
let vendedoresBase = [];
let redesBase = [];
let lojasBase = [];
let historicoBase = [];
let vendasPlasticosBase = [];
let faturasImportadasBase = [];
let resultadosApuracao = [];
let vendedorSelecionado = null;

let ordenacaoHistorico = { coluna: "mes", asc: false };
let ordenacaoResultados = { coluna: "rede", asc: true };

const STORAGE_COMISSOES_VENDEDOR = "crm_comissoes_vendedor";
const STORAGE_COMISSOES_MES = "crm_comissoes_mes";

window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";
    preencherCabecalhoUsuario();

    empresaContextoId = obterEmpresaContexto();

    configurarMesAtual();
    configurarMascaraValorUnitario();
    await carregarBasesIniciais();
};

function preencherCabecalhoUsuario() {
    const nome = dadosUsuarioLogado?.nome || "Usuário";
    const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuário";
    const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(parte => parte[0] || "").join("").toUpperCase() || "--";

    const nomeEl = document.getElementById("nomeUsuario");
    const cargoEl = document.getElementById("cargoUsuario");
    const iniciaisEl = document.getElementById("iniciaisUsuario");

    if (nomeEl) nomeEl.innerText = nome;
    if (cargoEl) cargoEl.innerText = String(perfil).toUpperCase();
    if (iniciaisEl) iniciaisEl.innerText = iniciais;
}

function obterEmpresaContexto() {
    const empresaMemorizada = sessionStorage.getItem("visaoEmpresaAtiva");
    if (empresaMemorizada) return String(empresaMemorizada);

    const empresaId = dadosUsuarioLogado?.empresaId;
    if (Array.isArray(empresaId) && empresaId.length) return String(empresaId[0]);
    if (empresaId) return String(empresaId);
    return null;
}

function configurarMesAtual() {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
    const mesSalvo = sessionStorage.getItem(STORAGE_COMISSOES_MES);
    const campoMes = document.getElementById("filtroMesReferencia");
    const campoMesPlastico = document.getElementById("plasticoMesReferencia");

    if (campoMes && !campoMes.value) campoMes.value = mesSalvo || mesAtual;
    if (campoMesPlastico && !campoMesPlastico.value) campoMesPlastico.value = mesSalvo || mesAtual;
}

function configurarMascaraValorUnitario() {
    const campo = document.getElementById("plasticoValorUnitario");
    if (!campo) return;
    campo.addEventListener("input", () => {
        if (typeof aplicarMascaraMoeda === "function") aplicarMascaraMoeda(campo);
    });
}

function configurarEventosPagina() {
    const campoMes = document.getElementById("filtroMesReferencia");
    if (campoMes) {
        campoMes.addEventListener("change", () => {
            sessionStorage.setItem(STORAGE_COMISSOES_MES, campoMes.value || "");
            renderizarHistoricoMensal();
            aplicarApuracaoPersistida();
        });
    }
}

async function carregarBasesIniciais() {
    await Promise.all([
        carregarVendedores(),
        carregarRedesELojas(),
        carregarHistoricoEVendas(),
        carregarFaturasImportadas()
    ]);
    configurarEventosPagina();
}

async function carregarVendedores() {
    try {
        const snap = await db.collection("usuarios").get();
        vendedoresBase = [];

        snap.forEach(doc => {
            const dados = doc.data();
            const perfil = String(dados.perfil || "").toLowerCase();
            if (perfil !== "vendedor") return;
            if (!usuarioPertenceEmpresa(dados, empresaContextoId)) return;

            vendedoresBase.push({
                id: doc.id,
                nome: dados.nome || "Vendedor",
                perfil
            });
        });

        vendedoresBase.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        popularSelectVendedores();
    } catch (erro) {
        console.error("Erro ao carregar vendedores:", erro);
        avisar("Não foi possível carregar os vendedores.", "erro");
    }
}

async function carregarRedesELojas() {
    try {
        const [redesSnap, lojasSnap] = await Promise.all([
            db.collection("redes").get(),
            db.collection("lojas").get()
        ]);

        redesBase = [];
        lojasBase = [];

        redesSnap.forEach(doc => {
            const dados = doc.data();
            if (!registroPertenceEmpresa(dados, empresaContextoId)) return;
            redesBase.push({ id: doc.id, ...dados });
        });

        lojasSnap.forEach(doc => {
            const dados = doc.data();
            if (!registroPertenceEmpresa(dados, empresaContextoId)) return;
            lojasBase.push({ id: doc.id, ...dados });
        });
    } catch (erro) {
        console.error("Erro ao carregar redes/lojas:", erro);
        avisar("Não foi possível carregar as redes e lojas.", "erro");
    }
}

async function carregarHistoricoEVendas() {
    try {
        const [historicoSnap, vendasSnap] = await Promise.all([
            db.collection("crm_comissoes_historico").get(),
            db.collection("crm_comissoes_plasticos_vendas").get()
        ]);

        historicoBase = [];
        vendasPlasticosBase = [];

        historicoSnap.forEach(doc => {
            const dados = doc.data();
            if (!registroPertenceEmpresa(dados, empresaContextoId)) return;
            historicoBase.push({ id: doc.id, ...dados });
        });

        vendasSnap.forEach(doc => {
            const dados = doc.data();
            if (!registroPertenceEmpresa(dados, empresaContextoId)) return;
            vendasPlasticosBase.push({ id: doc.id, ...dados });
        });
    } catch (erro) {
        console.error("Erro ao carregar histórico de comissões:", erro);
        historicoBase = [];
        vendasPlasticosBase = [];
    }
}

async function carregarFaturasImportadas() {
    try {
        const snap = await db.collection("crm_comissoes_faturas_importadas").get();
        faturasImportadasBase = [];

        snap.forEach(doc => {
            const dados = doc.data();
            if (!registroPertenceEmpresa(dados, empresaContextoId)) return;
            faturasImportadasBase.push({ id: doc.id, ...dados });
        });
    } catch (erro) {
        console.error("Erro ao carregar bases de faturas importadas:", erro);
        faturasImportadasBase = [];
    }
}

function popularSelectVendedores() {
    const select = document.getElementById("filtroVendedor");
    if (!select) return;
    const vendedorSalvo = sessionStorage.getItem(STORAGE_COMISSOES_VENDEDOR) || "";

    select.innerHTML = '<option value="">Selecione o Vendedor...</option>';
    vendedoresBase.forEach(vendedor => {
        const selected = vendedor.id === vendedorSalvo ? "selected" : "";
        select.innerHTML += `<option value="${vendedor.id}" ${selected}>${escapeHtml(vendedor.nome)}</option>`;
    });

    if (vendedorSalvo) {
        vendedorSelecionado = vendedoresBase.find(vendedor => vendedor.id === vendedorSalvo) || null;
        if (vendedorSelecionado) {
            atualizarResumoRedes();
            popularSelectRedesPlasticos();
            renderizarHistoricoMensal();
            aplicarApuracaoPersistida();
        }
    }
}

window.selecionarVendedorComissao = async function() {
    const vendedorId = document.getElementById("filtroVendedor").value;
    vendedorSelecionado = vendedoresBase.find(vendedor => vendedor.id === vendedorId) || null;
    sessionStorage.setItem(STORAGE_COMISSOES_VENDEDOR, vendedorId || "");

    atualizarResumoRedes();
    popularSelectRedesPlasticos();
    renderizarHistoricoMensal();
    aplicarApuracaoPersistida();
};

function obterRedesDoVendedor() {
    if (!vendedorSelecionado) return [];

    return redesBase.filter(rede => {
        const indicacao = String(rede.indicacaoVendedorId || "");
        const legado = String(rede.vendedorId || "");
        return indicacao === vendedorSelecionado.id || (!indicacao && legado === vendedorSelecionado.id);
    });
}

function obterLojasDoVendedor() {
    const redeIds = new Set(obterRedesDoVendedor().map(rede => rede.id));
    return lojasBase.filter(loja => redeIds.has(loja.redeId));
}

function atualizarResumoRedes() {
    const container = document.getElementById("listaRedesComissionadas");
    if (!container) return;

    const redes = obterRedesDoVendedor();
    const lojas = obterLojasDoVendedor();

    if (!vendedorSelecionado || !redes.length) {
        container.innerHTML = '<span class="tag-loja">Nenhuma rede vinculada</span>';
        return;
    }

    container.innerHTML = redes.map(rede => {
        const quantidadeLojas = lojas.filter(loja => loja.redeId === rede.id).length;
        return `<span class="tag-loja">${escapeHtml(rede.nome || "Rede sem nome")} • ${quantidadeLojas} loja(s)</span>`;
    }).join("");
}

function popularSelectRedesPlasticos() {
    const select = document.getElementById("plasticoRede");
    if (!select) return;

    const redes = obterRedesDoVendedor();
    select.innerHTML = '<option value="">Selecione a Rede...</option>';
    redes.forEach(rede => {
        select.innerHTML += `<option value="${rede.id}">${escapeHtml(rede.nome || "Rede sem nome")}</option>`;
    });
}

function resetarResultadoApuracao() {
    resultadosApuracao = [];
    atualizarKpis({
        faturasGeradas: 0,
        faturasPagas: 0,
        faturasAbertas: 0,
        comissaoTotal: 0
    });
    renderizarTabelaResultados();
}

function obterMesReferenciaAtual() {
    return document.getElementById("filtroMesReferencia")?.value || "";
}

function obterBaseImportadaDoMes(mesReferencia = obterMesReferenciaAtual()) {
    return faturasImportadasBase.find(item => item.mesReferencia === mesReferencia) || null;
}

function aplicarApuracaoPersistida() {
    if (!vendedorSelecionado) {
        resetarResultadoApuracao();
        return;
    }

    const baseImportada = obterBaseImportadaDoMes();
    if (!baseImportada || !Array.isArray(baseImportada.resumoPorLoja) || !baseImportada.resumoPorLoja.length) {
        resetarResultadoApuracao();
        return;
    }

    apurarComissaoPorResumo(baseImportada.resumoPorLoja, { salvarHistorico: false });
}

function atualizarKpis(resumo) {
    document.getElementById("kpiFaturasGeradas").innerText = String(resumo.faturasGeradas || 0);
    document.getElementById("kpiFaturasPagas").innerText = String(resumo.faturasPagas || 0);
    document.getElementById("kpiFaturasAbertas").innerText = String(resumo.faturasAbertas || 0);
    document.getElementById("kpiComissaoTotal").innerText = formatarMoeda(resumo.comissaoTotal || 0);
}

function renderizarHistoricoMensal() {
    const tbody = document.getElementById("tabelaHistoricoMensal");
    if (!tbody) return;

    if (!vendedorSelecionado) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--cor-texto);">Selecione um vendedor para visualizar o histórico.</td></tr>';
        return;
    }

    const agregados = agregarHistoricoPorMes();
    if (!agregados.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--cor-texto);">Nenhum histórico encontrado para este vendedor.</td></tr>';
        return;
    }

    ordenarHistoricoLocal(agregados);
    tbody.innerHTML = agregados.map(item => `
        <tr>
            <td>${formatarMes(item.mes)}</td>
            <td>${formatarMoeda(item.faturas)}</td>
            <td>${formatarMoeda(item.plasticos)}</td>
            <td style="text-align:center;"><span class="status-badge badge-aprovada">${escapeHtml(item.status)}</span></td>
        </tr>
    `).join("");
}

function agregarHistoricoPorMes() {
    const mapa = new Map();

    historicoBase
        .filter(item => item.vendedorId === vendedorSelecionado?.id)
        .forEach(item => {
            const mes = item.mesReferencia || "sem-mes";
            if (!mapa.has(mes)) {
                mapa.set(mes, { mes, faturas: 0, plasticos: 0, status: "Gerada" });
            }

            const atual = mapa.get(mes);
            if (item.tipo === "faturas") atual.faturas += Number(item.valorComissao || 0);
            if (item.tipo === "plasticos") atual.plasticos += Number(item.valorComissao || 0);
            atual.status = item.status || atual.status;
        });

    return Array.from(mapa.values());
}

function ordenarHistoricoLocal(lista) {
    const { coluna, asc } = ordenacaoHistorico;
    lista.sort((a, b) => {
        const valorA = a[coluna];
        const valorB = b[coluna];
        if (valorA === valorB) return 0;
        return (valorA > valorB ? 1 : -1) * (asc ? 1 : -1);
    });
}

window.ordenarHistorico = function(coluna) {
    if (ordenacaoHistorico.coluna === coluna) ordenacaoHistorico.asc = !ordenacaoHistorico.asc;
    else {
        ordenacaoHistorico.coluna = coluna;
        ordenacaoHistorico.asc = coluna === "mes" ? false : true;
    }
    renderizarHistoricoMensal();
};

function renderizarTabelaResultados() {
    const tbody = document.getElementById("tabelaComissoesBody");
    if (!tbody) return;

    if (!resultadosApuracao.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--cor-texto);">Nenhum cálculo realizado ainda.</td></tr>';
        return;
    }

    const lista = [...resultadosApuracao];
    ordenarResultadosLocal(lista);

    tbody.innerHTML = lista.map(item => `
        <tr>
            <td>${escapeHtml(item.redeNome)} / ${escapeHtml(item.lojaNome)}</td>
            <td style="text-align:center;">${item.faturasGeradas}</td>
            <td style="text-align:center;">${item.faturasPagas}</td>
            <td style="text-align:center;">${item.faturasAbertas}</td>
            <td style="text-align:right;">${formatarMoeda(item.valorComissao)}</td>
        </tr>
    `).join("");
};

function ordenarResultadosLocal(lista) {
    const { coluna, asc } = ordenacaoResultados;
    lista.sort((a, b) => {
        const valorA = a[coluna];
        const valorB = b[coluna];
        if (valorA === valorB) return 0;
        return (valorA > valorB ? 1 : -1) * (asc ? 1 : -1);
    });
}

window.ordenarResultado = function(coluna) {
    if (ordenacaoResultados.coluna === coluna) ordenacaoResultados.asc = !ordenacaoResultados.asc;
    else {
        ordenacaoResultados.coluna = coluna;
        ordenacaoResultados.asc = true;
    }
    renderizarTabelaResultados();
};

window.gerarComissaoFaturas = function() {
    if (!vendedorSelecionado) {
        avisar("Selecione um vendedor antes de gerar a comissão.", "erro");
        return;
    }

    const baseImportada = obterBaseImportadaDoMes();
    if (baseImportada && Array.isArray(baseImportada.resumoPorLoja) && baseImportada.resumoPorLoja.length) {
        apurarComissaoPorResumo(baseImportada.resumoPorLoja, { salvarHistorico: true });
        return;
    }

    abrirSeletorArquivoFaturas();
};

function abrirSeletorArquivoFaturas() {
    let input = document.getElementById("inputArquivoFaturas");
    if (!input) {
        input = document.createElement("input");
        input.type = "file";
        input.id = "inputArquivoFaturas";
        input.accept = ".txt,.csv,.xls,.xlsx";
        input.className = "escondido";
        input.addEventListener("change", processarArquivoFaturas);
        document.body.appendChild(input);
    }

    input.value = "";
    input.click();
}

async function processarArquivoFaturas(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const nomeArquivo = String(file.name || "").toLowerCase();
        let linhas = [];

        if (nomeArquivo.endsWith(".txt")) {
            const texto = await file.text();
            linhas = parseRelatorioFaturasTxt(texto);
        } else {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            linhas = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        }

        const mesReferencia = obterMesReferenciaAtual();
        if (!mesReferencia) {
            avisar("Selecione o mês de referência antes de importar o arquivo.", "erro");
            return;
        }

        const resumoPorLoja = construirResumoImportacaoFaturas(linhas);
        await salvarBaseFaturasImportadas({
            mesReferencia,
            origemArquivo: file.name || "arquivo_importado",
            resumoPorLoja
        });

        await carregarFaturasImportadas();
        aplicarApuracaoPersistida();
        avisar("Arquivo de faturas salvo com sucesso para este mês.", "sucesso");
    } catch (erro) {
        console.error("Erro ao processar arquivo de faturas:", erro);
        avisar("Não foi possível ler o arquivo de faturas.", "erro");
    }
}

async function apurarComissaoFaturas(linhas) {
    const redes = obterRedesDoVendedor();
    const lojas = obterLojasDoVendedor();

    if (!redes.length || !lojas.length) {
        avisar("Esse vendedor não possui redes e lojas vinculadas para comissão.", "erro");
        return;
    }

    const mapaLojas = construirMapaLojas(lojas);
    const apuracao = new Map();

    linhas.forEach(linha => {
        const loja = encontrarLojaDaFatura(linha, mapaLojas);
        if (!loja) return;

        const rede = redes.find(item => item.id === loja.redeId);
        if (!rede) return;

        const chave = loja.id;
        if (!apuracao.has(chave)) {
            apuracao.set(chave, {
                lojaId: loja.id,
                lojaNome: loja.nome || "Loja sem nome",
                redeNome: rede.nome || "Rede sem nome",
                faturasGeradas: 0,
                faturasPagas: 0,
                faturasAbertas: 0,
                valorComissao: 0,
                taxaManutencao: Number(rede.taxaManutencao || 0),
                percentualComissao: Number(rede.pctComissaoFatura || 0)
            });
        }

        const item = apuracao.get(chave);
        item.faturasGeradas += 1;

        if (faturaEstaPaga(linha)) {
            item.faturasPagas += 1;
        } else {
            item.faturasAbertas += 1;
        }
    });

    resultadosApuracao = Array.from(apuracao.values()).map(item => ({
        ...item,
        valorComissao: item.faturasPagas * item.taxaManutencao * (item.percentualComissao / 100)
    }));

    const resumo = resultadosApuracao.reduce((acc, item) => {
        acc.faturasGeradas += item.faturasGeradas;
        acc.faturasPagas += item.faturasPagas;
        acc.faturasAbertas += item.faturasAbertas;
        acc.comissaoTotal += item.valorComissao;
        return acc;
    }, { faturasGeradas: 0, faturasPagas: 0, faturasAbertas: 0, comissaoTotal: 0 });

    atualizarKpis(resumo);
    renderizarTabelaResultados();

    await salvarHistoricoComissao({
        tipo: "faturas",
        mesReferencia: document.getElementById("filtroMesReferencia").value,
        valorComissao: resumo.comissaoTotal,
        status: "Gerada",
        resumo,
        itens: resultadosApuracao
    });

    avisar("Comissão de faturas gerada com sucesso.", "sucesso");
    await carregarHistoricoEVendas();
    renderizarHistoricoMensal();
}

function construirResumoImportacaoFaturas(linhas) {
    const mapaLojas = construirMapaLojas(lojasBase);
    const resumo = new Map();

    linhas.forEach(linha => {
        const loja = encontrarLojaDaFatura(linha, mapaLojas);
        if (!loja) return;

        const rede = redesBase.find(item => item.id === loja.redeId);
        const chave = loja.id;

        if (!resumo.has(chave)) {
            resumo.set(chave, {
                lojaId: loja.id,
                lojaCodigo: loja.codigo || "",
                lojaNome: loja.nome || "Loja sem nome",
                redeId: loja.redeId || "",
                redeCodigo: rede?.codigo || linha.redeCodigo || "",
                redeNome: rede?.nome || "Rede sem nome",
                faturasGeradas: 0,
                faturasPagas: 0,
                faturasAbertas: 0
            });
        }

        const item = resumo.get(chave);
        item.faturasGeradas += 1;
        if (faturaEstaPaga(linha)) item.faturasPagas += 1;
        else item.faturasAbertas += 1;
    });

    return Array.from(resumo.values());
}

async function salvarBaseFaturasImportadas(dados) {
    const docId = construirIdBaseImportada(dados.mesReferencia);
    await db.collection("crm_comissoes_faturas_importadas").doc(docId).set({
        empresaId: empresaContextoId || null,
        mesReferencia: dados.mesReferencia,
        origemArquivo: dados.origemArquivo || "arquivo_importado",
        resumoPorLoja: dados.resumoPorLoja || [],
        importadoPorId: usuarioLogado?.uid || null,
        importadoPorNome: dadosUsuarioLogado?.nome || "Usuário",
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function construirIdBaseImportada(mesReferencia) {
    return `${sanitizeId(empresaContextoId || "global")}_${sanitizeId(mesReferencia || "sem_mes")}`;
}

async function apurarComissaoPorResumo(resumoPorLoja, opcoes = {}) {
    const redes = obterRedesDoVendedor();
    const lojas = obterLojasDoVendedor();

    if (!vendedorSelecionado || !redes.length || !lojas.length) {
        resetarResultadoApuracao();
        if (opcoes.salvarHistorico) avisar("Esse vendedor não possui redes e lojas vinculadas para comissão.", "erro");
        return;
    }

    const mapaRedes = new Map(redes.map(rede => [rede.id, rede]));
    const lojaIdsPermitidos = new Set(lojas.map(loja => loja.id));

    resultadosApuracao = resumoPorLoja
        .filter(item => lojaIdsPermitidos.has(item.lojaId))
        .map(item => {
            const rede = mapaRedes.get(item.redeId);
            const taxaManutencao = Number(rede?.taxaManutencao || 0);
            const percentualComissao = Number(rede?.pctComissaoFatura || 0);

            return {
                ...item,
                rede: item.redeNome || "",
                geradas: Number(item.faturasGeradas || 0),
                pagas: Number(item.faturasPagas || 0),
                abertas: Number(item.faturasAbertas || 0),
                taxaManutencao,
                percentualComissao,
                valorComissao: Number(item.faturasPagas || 0) * taxaManutencao * (percentualComissao / 100)
            };
        });

    const resumo = resultadosApuracao.reduce((acc, item) => {
        acc.faturasGeradas += Number(item.faturasGeradas || 0);
        acc.faturasPagas += Number(item.faturasPagas || 0);
        acc.faturasAbertas += Number(item.faturasAbertas || 0);
        acc.comissaoTotal += Number(item.valorComissao || 0);
        return acc;
    }, { faturasGeradas: 0, faturasPagas: 0, faturasAbertas: 0, comissaoTotal: 0 });

    atualizarKpis(resumo);
    renderizarTabelaResultados();

    if (opcoes.salvarHistorico) {
        await salvarHistoricoComissao({
            tipo: "faturas",
            mesReferencia: obterMesReferenciaAtual(),
            valorComissao: resumo.comissaoTotal,
            status: "Gerada",
            resumo,
            itens: resultadosApuracao
        });

        avisar("Comissão de faturas gerada com sucesso.", "sucesso");
        await carregarHistoricoEVendas();
        renderizarHistoricoMensal();
    }
}

function construirMapaLojas(lojas) {
    const mapa = new Map();
    lojas.forEach(loja => {
        const chaves = [
            loja.id,
            loja.codigo,
            loja.cnpj,
            loja.nome,
            loja.redeCodigo,
            loja.codigoRede
        ].map(normalizarTexto).filter(Boolean);

        chaves.forEach(chave => mapa.set(chave, loja));
    });
    return mapa;
}

function encontrarLojaDaFatura(linha, mapaLojas) {
    if (linha.__layout === "pagamentos_faturas_txt") {
        const chaveLoja = normalizarTexto(linha.lojaCodigo);
        if (chaveLoja && mapaLojas.has(chaveLoja)) return mapaLojas.get(chaveLoja);
        return null;
    }

    const valores = Object.entries(linha).reduce((acc, [chave, valor]) => {
        const chaveNormalizada = normalizarTexto(chave);
        acc[chaveNormalizada] = valor;
        return acc;
    }, {});

    const candidatos = [
        valores["origem"],
        valores["codigo loja"],
        valores["codigo"],
        valores["loja"],
        valores["nome loja"],
        valores["cnpj"],
        valores["cpf cnpj"]
    ];

    for (const candidato of candidatos) {
        const chave = normalizarTexto(candidato);
        if (chave && mapaLojas.has(chave)) return mapaLojas.get(chave);
    }

    return null;
}

function faturaEstaPaga(linha) {
    if (linha.__layout === "pagamentos_faturas_txt") {
        return Number(linha.totalPagoNumero || 0) > 0;
    }

    const valores = Object.entries(linha).reduce((acc, [chave, valor]) => {
        acc[normalizarTexto(chave)] = normalizarTexto(valor);
        return acc;
    }, {});

    const textoStatus = [
        valores["status"],
        valores["situacao"],
        valores["sit"],
        valores["paga"],
        valores["pagamento"],
        valores["baixada"]
    ].filter(Boolean).join(" ");

    return ["paga", "pago", "baixada", "liquidada", "recebida", "quitada"].some(status => textoStatus.includes(status));
}

function parseRelatorioFaturasTxt(texto) {
    return texto
        .split(/\r?\n/)
        .map(linha => linha.replace(/\u0000/g, "").trim())
        .filter(Boolean)
        .map(parseLinhaCsvTexto)
        .filter(colunas => colunas.length >= 32 && normalizarTexto(colunas[18]))
        .map(colunas => ({
            __layout: "pagamentos_faturas_txt",
            clienteNome: limparValorTxt(colunas[18]),
            cpfCnpj: limparValorTxt(colunas[19]),
            situacao: limparValorTxt(colunas[20]),
            atraso: parseInt(String(colunas[21] || "0").trim(), 10) || 0,
            saldoDevedor: limparValorTxt(colunas[22]),
            saldoDevedorNumero: extrairValorMoeda(colunas[22]),
            totalPago: limparValorTxt(colunas[23]),
            totalPagoNumero: extrairValorMoeda(colunas[23]),
            totalCompra: limparValorTxt(colunas[24]),
            totalCompraNumero: extrairValorMoeda(colunas[24]),
            telefone: limparValorTxt(colunas[25]),
            endereco: limparValorTxt(colunas[26]),
            enderecoComplemento: limparValorTxt(colunas[27]),
            redeCodigo: limparValorTxt(colunas[28]),
            clienteCodigo: limparValorTxt(colunas[29]),
            limite: limparValorTxt(colunas[30]),
            limiteNumero: extrairValorMoeda(colunas[30]),
            lojaCodigo: limparValorTxt(colunas[31])
        }));
}

function parseLinhaCsvTexto(linha) {
    const valores = [];
    let atual = "";
    let entreAspas = false;

    for (let i = 0; i < linha.length; i += 1) {
        const char = linha[i];

        if (char === '"') {
            if (entreAspas && linha[i + 1] === '"') {
                atual += '"';
                i += 1;
            } else {
                entreAspas = !entreAspas;
            }
            continue;
        }

        if (char === "," && !entreAspas) {
            valores.push(atual);
            atual = "";
            continue;
        }

        atual += char;
    }

    valores.push(atual);
    return valores;
}

function limparValorTxt(valor) {
    return String(valor || "").replace(/^"|"$/g, "").trim();
}

window.gerarComissaoPlasticos = async function() {
    if (!vendedorSelecionado) {
        avisar("Selecione um vendedor antes de gerar a comissão.", "erro");
        return;
    }

    const mesReferencia = document.getElementById("filtroMesReferencia").value;
    const vendasMes = vendasPlasticosBase.filter(venda =>
        venda.vendedorId === vendedorSelecionado.id && venda.mesReferencia === mesReferencia
    );

    if (!vendasMes.length) {
        avisar("Não existem vendas de plásticos lançadas para esse mês.", "erro");
        return;
    }

    const valorTotal = vendasMes.reduce((acc, venda) => acc + Number(venda.valorComissao || 0), 0);

    await salvarHistoricoComissao({
        tipo: "plasticos",
        mesReferencia,
        valorComissao: valorTotal,
        status: "Gerada",
        resumo: { quantidadeLancamentos: vendasMes.length },
        itens: vendasMes
    });

    avisar("Comissão de plásticos gerada com sucesso.", "sucesso");
    await carregarHistoricoEVendas();
    renderizarHistoricoMensal();
}

window.abrirLancamentoPlasticos = function() {
    document.getElementById("cardLancamentoPlasticos").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("plasticoRede").focus();
};

window.salvarLancamentoPlasticos = async function() {
    if (!vendedorSelecionado) {
        avisar("Selecione um vendedor antes de lançar a venda.", "erro");
        return;
    }

    const redeId = document.getElementById("plasticoRede").value;
    const quantidade = parseInt(document.getElementById("plasticoQuantidade").value || "0", 10);
    const valorUnitario = extrairValorMoeda(document.getElementById("plasticoValorUnitario").value);
    const mesReferencia = document.getElementById("plasticoMesReferencia").value;

    if (!redeId || !quantidade || !valorUnitario || !mesReferencia) {
        avisar("Preencha todos os campos da venda de plásticos.", "erro");
        return;
    }

    const rede = redesBase.find(item => item.id === redeId);
    if (!rede) {
        avisar("Rede não encontrada para este lançamento.", "erro");
        return;
    }

    const valorBase = quantidade * valorUnitario;
    const percentual = Number(rede.pctComissaoPlastico || 0);
    const valorComissao = valorBase * (percentual / 100);

    try {
        await db.collection("crm_comissoes_plasticos_vendas").add({
            empresaId: empresaContextoId || null,
            vendedorId: vendedorSelecionado.id,
            vendedorNome: vendedorSelecionado.nome,
            redeId,
            redeNome: rede.nome || "Rede sem nome",
            quantidade,
            valorUnitario,
            valorBase,
            percentualComissao: percentual,
            valorComissao,
            mesReferencia,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        avisar("Venda de plásticos registrada com sucesso.", "sucesso");
        limparFormularioPlasticos();
        await carregarHistoricoEVendas();
    } catch (erro) {
        console.error("Erro ao salvar venda de plásticos:", erro);
        avisar("Não foi possível registrar a venda de plásticos.", "erro");
    }
}

async function salvarHistoricoComissao(dados) {
    const mes = dados.mesReferencia || document.getElementById("filtroMesReferencia").value || "sem-mes";
    const docId = construirIdHistorico(vendedorSelecionado.id, mes, dados.tipo);

    await db.collection("crm_comissoes_historico").doc(docId).set({
        empresaId: empresaContextoId || null,
        vendedorId: vendedorSelecionado.id,
        vendedorNome: vendedorSelecionado.nome,
        tipo: dados.tipo,
        mesReferencia: mes,
        valorComissao: Number(dados.valorComissao || 0),
        status: dados.status || "Gerada",
        resumo: dados.resumo || {},
        itens: dados.itens || [],
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function construirIdHistorico(vendedorId, mes, tipo) {
    return `${sanitizeId(empresaContextoId || "global")}_${sanitizeId(vendedorId)}_${sanitizeId(mes)}_${sanitizeId(tipo)}`;
}

function limparFormularioPlasticos() {
    document.getElementById("plasticoRede").value = "";
    document.getElementById("plasticoQuantidade").value = "";
    document.getElementById("plasticoValorUnitario").value = "";
    configurarMesAtual();
}

function usuarioPertenceEmpresa(dadosUsuario, empresaId) {
    if (!empresaId) return true;
    const valor = dadosUsuario?.empresaId;
    if (Array.isArray(valor)) return valor.map(item => String(item)).includes(String(empresaId));
    return String(valor || "") === String(empresaId);
}

function registroPertenceEmpresa(dados, empresaId) {
    if (!empresaId) return true;
    return String(dados?.empresaId || "") === String(empresaId);
}

function extrairValorMoeda(valor) {
    return parseFloat(String(valor || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarMes(valor) {
    if (!valor || !valor.includes("-")) return valor || "--";
    const [ano, mes] = valor.split("-");
    return `${mes}/${ano}`;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function sanitizeId(valor) {
    return String(valor || "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
}

function escapeHtml(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function avisar(mensagem, tipo = "sucesso") {
    if (typeof mostrarToast === "function") {
        mostrarToast(mensagem, tipo);
    } else if (tipo === "erro") {
        alert(mensagem);
    } else {
        console.log(mensagem);
    }
}
