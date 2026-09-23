import { CATEGORIAS, ROTULOS_CATEGORIAS, calcularNotaGeral, explicarNota } from "../services/pontuacao.service.js";
import { obterPrecoPrincipal } from "../services/preco.service.js";

function escapar(valor) {
    return String(valor ?? "—")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderizarComparativo(container, smartphones, perfil = "geral") {
    if (!container) return;
    if (smartphones.length < 2) {
        container.innerHTML = '<div class="empty-state">Selecione pelo menos dois aparelhos para comparar.</div>';
        return;
    }

    const cabecalho = smartphones.map((item) => `
        <th><span>${escapar(item.marca)}</span><strong>${escapar(item.nome)}</strong><small>${escapar(item.variante)}</small></th>
    `).join("");

    const linhas = CATEGORIAS.map((categoria) => `
        <tr>
            <th>${escapar(ROTULOS_CATEGORIAS[categoria])}</th>
            ${smartphones.map((item) => {
                const nota = item.notas?.[categoria];
                return `<td><button type="button" class="score-button" data-explicar-id="${escapar(item.id)}" data-categoria="${categoria}" title="Por que esta nota?">${nota ?? "—"}<span class="score-bar"><i style="width:${Math.max(0, Math.min(100, Number(nota || 0) * 10))}%"></i></span></button></td>`;
            }).join("")}
        </tr>`).join("");

    container.innerHTML = `
        <div class="comparison-scroll">
            <table class="comparison-table">
                <thead><tr><th>Critério</th>${cabecalho}</tr></thead>
                <tbody>
                    ${linhas}
                    <tr class="overall-row"><th>Nota geral</th>${smartphones.map((item) => `<td>${calcularNotaGeral(item, perfil) ?? "—"}</td>`).join("")}</tr>
                    <tr><th>Preço</th>${smartphones.map((item) => `<td>${obterPrecoPrincipal(item).formatado}<small class="price-kind">${escapar(obterPrecoPrincipal(item).tipo)}</small></td>`).join("")}</tr>
                </tbody>
            </table>
        </div>`;
}

export function obterExplicacaoComparativo(smartphone, categoria) {
    return {
        titulo: `${ROTULOS_CATEGORIAS[categoria] || categoria}: ${smartphone?.notas?.[categoria] ?? "—"}`,
        criterios: explicarNota(smartphone, categoria)
    };
}
