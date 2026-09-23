function escapar(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function imagemOuPlaceholder(item) {
    if (item.imagemUrl) {
        return `<img src="${escapar(item.imagemUrl)}" alt="${escapar(item.nome)}" loading="lazy" data-fallback-imagem>`;
    }
    return `<span class="phone-placeholder" aria-hidden="true">${escapar(item.marca?.slice(0, 2).toUpperCase() || "SP")}</span>`;
}

export function renderizarSugestoes(container, itens) {
    if (!container) return;
    if (!itens.length) {
        container.innerHTML = '<div class="autocomplete-vazio">Nenhum modelo encontrado.</div>';
        container.hidden = false;
        return;
    }

    container.innerHTML = itens.map((item) => `
        <button type="button" class="autocomplete-item" data-smartphone-id="${escapar(item.id)}" role="option">
            <span class="autocomplete-imagem">${imagemOuPlaceholder(item)}</span>
            <span class="autocomplete-conteudo">
                <strong>${escapar(item.nome)}</strong>
                <small>${escapar(item.marca)} · ${escapar(item.variante)} · ${escapar(item.ram)} GB RAM · ${escapar(item.anoLancamento)}</small>
            </span>
            <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>
        </button>
    `).join("");
    container.hidden = false;
}

export function ocultarSugestoes(container) {
    if (!container) return;
    container.hidden = true;
    container.innerHTML = "";
}
