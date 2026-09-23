import { calcularNotaGeral, CATEGORIAS } from "./pontuacao.service.js";
import { obterPrecoPrincipal } from "./preco.service.js";

export const PESOS_EQUIVALENCIA = Object.freeze({
    preco: 1.15,
    notasTecnicas: 3.4,
    ram: 0.55,
    armazenamento: 0.45,
    telaHz: 0.55,
    brilhoTela: 0.35,
    cameraPrincipal: 0.35,
    cameraUltrawide: 0.25,
    cameraTeleobjetiva: 0.35,
    bateria: 0.65,
    carregamento: 0.55,
    construcao: 0.35,
    conectividade: 0.35,
    atualizacoes: 0.45,
    anoLancamento: 0.6
});

function similaridadeNumerica(a, b, tolerancia) {
    const numeroA = Number(a);
    const numeroB = Number(b);
    if (!Number.isFinite(numeroA) || !Number.isFinite(numeroB)) return null;
    return Math.max(0, 1 - Math.abs(numeroA - numeroB) / Math.max(tolerancia, numeroA, numeroB, 1));
}

function similaridadeBooleana(a, b) {
    if (typeof a !== "boolean" || typeof b !== "boolean") return null;
    return a === b ? 1 : 0;
}

function similaridadeNotas(origem, candidato, perfil) {
    const comparacoes = CATEGORIAS
        .map((categoria) => similaridadeNumerica(origem?.notas?.[categoria], candidato?.notas?.[categoria], 3))
        .filter((valor) => valor !== null);

    if (!comparacoes.length) return null;
    const mediaCategorias = comparacoes.reduce((soma, valor) => soma + valor, 0) / comparacoes.length;
    const geralOrigem = calcularNotaGeral(origem, perfil);
    const geralCandidato = calcularNotaGeral(candidato, perfil);
    const geral = similaridadeNumerica(geralOrigem, geralCandidato, 3);
    return geral === null ? mediaCategorias : (mediaCategorias * 0.75) + (geral * 0.25);
}

export function calcularIndiceEquivalencia(origem, candidato, perfil = "geral") {
    if (!origem || !candidato || origem.id === candidato.id) return 0;

    const precoOrigem = obterPrecoPrincipal(origem).valor;
    const precoCandidato = obterPrecoPrincipal(candidato).valor;
    const criterios = {
        preco: similaridadeNumerica(precoOrigem, precoCandidato, Math.max(precoOrigem || 0, precoCandidato || 0, 1500)),
        notasTecnicas: similaridadeNotas(origem, candidato, perfil),
        ram: similaridadeNumerica(origem.ram, candidato.ram, 12),
        armazenamento: similaridadeNumerica(origem.armazenamento, candidato.armazenamento, 512),
        telaHz: similaridadeNumerica(origem.tela?.hz, candidato.tela?.hz, 120),
        brilhoTela: similaridadeNumerica(origem.tela?.brilhoNits, candidato.tela?.brilhoNits, 3000),
        cameraPrincipal: similaridadeNumerica(origem.camera?.principalMp, candidato.camera?.principalMp, 100),
        cameraUltrawide: similaridadeNumerica(origem.camera?.ultrawideMp, candidato.camera?.ultrawideMp, 50),
        cameraTeleobjetiva: similaridadeNumerica(origem.camera?.teleobjetivaMp, candidato.camera?.teleobjetivaMp, 50),
        bateria: similaridadeNumerica(origem.bateria?.mah, candidato.bateria?.mah, 2500),
        carregamento: similaridadeNumerica(origem.carregamento?.watts, candidato.carregamento?.watts, 100),
        construcao: origem.construcao?.protecao && candidato.construcao?.protecao
            ? (origem.construcao.protecao === candidato.construcao.protecao ? 1 : 0.6)
            : null,
        conectividade: similaridadeBooleana(origem.conectividade?.cincoG, candidato.conectividade?.cincoG),
        atualizacoes: similaridadeNumerica(origem.software?.anosAtualizacoes, candidato.software?.anosAtualizacoes, 7),
        anoLancamento: similaridadeNumerica(origem.anoLancamento, candidato.anoLancamento, 5)
    };

    let pontos = 0;
    let pesosDisponiveis = 0;
    Object.entries(PESOS_EQUIVALENCIA).forEach(([criterio, peso]) => {
        const similaridade = criterios[criterio];
        if (similaridade === null || similaridade === undefined) return;
        pontos += similaridade * peso;
        pesosDisponiveis += peso;
    });

    return pesosDisponiveis ? Math.round((pontos / pesosDisponiveis) * 100) : 0;
}

export function encontrarEquivalentes(origem, catalogo, opcoes = {}) {
    const { perfil = "geral", limite = 8, incluirMesmaMarca = true, indiceMinimo = 55 } = opcoes;
    return catalogo
        .filter((item) => item.ativo !== false && item.id !== origem?.id)
        .filter((item) => incluirMesmaMarca || item.marca !== origem.marca)
        .map((item) => ({ ...item, indiceEquivalencia: calcularIndiceEquivalencia(origem, item, perfil) }))
        .filter((item) => item.indiceEquivalencia >= indiceMinimo)
        .sort((a, b) => b.indiceEquivalencia - a.indiceEquivalencia)
        .slice(0, limite);
}
