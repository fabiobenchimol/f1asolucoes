import { calcularNotaGeral } from "../services/pontuacao.service.js";

const CATEGORIAS_RANKING = {
    geral: { rotulo: "Conjunto geral", nota: (item, perfil) => calcularNotaGeral(item, perfil) },
    camera: { rotulo: "Câmera", nota: (item) => item.notas?.camera },
    processamento: { rotulo: "Desempenho", nota: (item) => item.notas?.processamento },
    bateria: { rotulo: "Bateria", nota: (item) => item.notas?.bateria },
    gpu: { rotulo: "Jogos", nota: (item) => item.notas?.gpu },
    custoBeneficio: { rotulo: "Custo-benefício", nota: (item) => item.notas?.custoBeneficio },
    tela: { rotulo: "Tela", nota: (item) => item.notas?.tela },
    carregamento: { rotulo: "Carregamento", nota: (item) => item.notas?.carregamento }
};

function escapar(valor) {
    return String(valor ?? "—")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderizarRanking(container, catalogo, categoria = "geral", perfil = "geral") {
    if (!container) return;
    const configuracao = CATEGORIAS_RANKING[categoria] || CATEGORIAS_RANKING.geral;
    const itens = catalogo
        .map((item) => ({ item, nota: Number(configuracao.nota(item, perfil)) }))
        .filter(({ nota }) => Number.isFinite(nota))
        .sort((a, b) => b.nota - a.nota)
        .slice(0, 5);

    container.innerHTML = `
        <div class="ranking-head">
            <div><span class="eyebrow">Calculado pelos dados cadastrados</span><h3>Ranking: ${escapar(configuracao.rotulo)}</h3></div>
            <select id="rankingCategoria" name="rankingCategoria" aria-label="Categoria do ranking">
                ${Object.entries(CATEGORIAS_RANKING).map(([chave, item]) => `<option value="${chave}" ${chave === categoria ? "selected" : ""}>${escapar(item.rotulo)}</option>`).join("")}
            </select>
        </div>
        <ol class="ranking-list">
            ${itens.map(({ item, nota }, indice) => `<li><span class="ranking-position">${indice + 1}</span><button type="button" data-smartphone-id="${escapar(item.id)}"><strong>${escapar(item.nome)}</strong><small>${escapar(item.marca)} · ${escapar(item.variante)}</small></button><b>${nota.toFixed(1)}</b></li>`).join("")}
        </ol>`;
}
