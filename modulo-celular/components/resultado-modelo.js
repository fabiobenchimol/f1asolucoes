import { calcularNotaGeral, gerarResumo } from "../services/pontuacao.service.js";
import { obterPrecoPrincipal } from "../services/preco.service.js";

function escapar(valor) {
    return String(valor ?? "Não informado")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function valor(valor, sufixo = "") {
    return valor === null || valor === undefined || valor === "" ? "Não informado" : `${escapar(valor)}${sufixo}`;
}

function imagem(item, classe = "") {
    return item.imagemUrl
        ? `<img class="${classe}" src="${escapar(item.imagemUrl)}" alt="${escapar(item.nome)}" loading="lazy" data-fallback-imagem>`
        : `<div class="device-placeholder ${classe}"><span class="material-symbols-rounded">smartphone</span><strong>${escapar(item.nome)}</strong></div>`;
}

export function renderizarAparelhoSelecionado(container, item, perfil = "geral") {
    if (!container || !item) return;
    const preco = obterPrecoPrincipal(item);
    const resumo = gerarResumo(item, perfil);

    container.innerHTML = `
        <article class="device-hero card">
            <div class="device-hero-media">${imagem(item, "device-main-image")}</div>
            <div class="device-hero-content">
                <div class="eyebrow">${escapar(item.marca)} · ${escapar(item.anoLancamento)}</div>
                <h2>${escapar(item.nome)}</h2>
                <p class="device-variant">${escapar(item.variante)} · ${valor(item.ram, " GB RAM")}</p>
                <div class="spec-chips">
                    <span><span class="material-symbols-rounded">memory</span>${escapar(item.processador)}</span>
                    <span><span class="material-symbols-rounded">aspect_ratio</span>${valor(item.tela?.tamanho, '"')} ${valor(item.tela?.hz, " Hz")}</span>
                    <span><span class="material-symbols-rounded">photo_camera</span>${valor(item.camera?.principalMp, " MP")}</span>
                    <span><span class="material-symbols-rounded">battery_full</span>${valor(item.bateria?.mah, " mAh")}</span>
                </div>
                <div class="price-row">
                    <div><small>Preço ${escapar(preco.tipo)}</small><strong>${preco.formatado}</strong><span>${preco.faixa}</span></div>
                    <div class="score-ring" aria-label="Nota geral ${resumo.notaGeral} de 10"><strong>${resumo.notaGeral ?? "—"}</strong><small>/10</small></div>
                </div>
                <div class="hero-actions">
                    <button type="button" class="btn-primary" id="btnEncontrarEquivalentes"><span class="material-symbols-rounded">compare_arrows</span>Encontrar equivalentes</button>
                    <button type="button" class="btn-secondary" data-acao="detalhes" data-smartphone-id="${escapar(item.id)}"><span class="material-symbols-rounded">info</span>Ficha completa</button>
                </div>
                <p class="data-source"><span class="material-symbols-rounded">verified</span>${escapar(item.fonteDados?.rotulo || "Dado cadastrado")} · ${escapar(item.fonteDados?.observacao || "")}</p>
            </div>
        </article>`;
}

export function renderizarEquivalentes(container, itens, selecionados, perfil = "geral") {
    if (!container) return;
    if (!itens.length) {
        container.innerHTML = '<div class="empty-state">Nenhum equivalente atende aos critérios atuais.</div>';
        return;
    }

    container.innerHTML = itens.map((item) => {
        const preco = obterPrecoPrincipal(item);
        const resumo = gerarResumo(item, perfil);
        const marcado = selecionados.has(item.id);
        return `
            <article class="equivalent-card card">
                <div class="equivalent-media">${imagem(item)}</div>
                <div class="equivalent-header">
                    <div><small>${escapar(item.marca)}</small><h3>${escapar(item.nome)}</h3><span>${escapar(item.variante)}</span></div>
                    <div class="equivalence-index"><strong>${item.indiceEquivalencia}%</strong><small>equivalência</small></div>
                </div>
                <div class="equivalent-metrics">
                    <span><small>Nota geral</small><strong>${calcularNotaGeral(item, perfil) ?? "—"}</strong></span>
                    <span><small>Preço ${escapar(preco.tipo)}</small><strong>${preco.formatado}</strong></span>
                </div>
                <div class="pros-cons">
                    <div><strong>DESTAQUES</strong>${resumo.destaques.length ? resumo.destaques.map((texto) => `<span class="pro">✓ ${escapar(texto)}</span>`).join("") : "<span>Sem destaque calculável.</span>"}</div>
                    <div><strong>PONTOS DE ATENÇÃO</strong>${resumo.atencoes.length ? resumo.atencoes.map((texto) => `<span class="con">• ${escapar(texto)}</span>`).join("") : "<span>Nenhum abaixo do limite.</span>"}</div>
                </div>
                <div class="card-actions">
                    <label class="compare-check"><input type="checkbox" data-comparar-id="${escapar(item.id)}" ${marcado ? "checked" : ""}> Comparar</label>
                    <button type="button" class="btn-link" data-acao="detalhes" data-smartphone-id="${escapar(item.id)}">Ver ficha</button>
                </div>
            </article>`;
    }).join("");
}

export function renderizarFicha(container, item, perfil = "geral") {
    if (!container || !item) return;
    const preco = obterPrecoPrincipal(item);
    const resumo = gerarResumo(item, perfil);
    container.innerHTML = `
        <div class="modal-header">
            <div><small>${escapar(item.marca)}</small><h3 id="modalTitulo">${escapar(item.nome)} · ${escapar(item.variante)}</h3></div>
            <button type="button" class="btn-fechar" data-fechar-modal aria-label="Fechar"><span class="material-symbols-rounded">close</span></button>
        </div>
        <div class="modal-body detail-grid">
            <section class="detail-summary">${imagem(item)}<div><span class="score-large">${resumo.notaGeral ?? "—"}/10</span><p>${escapar(item.fonteDados?.observacao || "Dado cadastrado.")}</p></div></section>
            <section><h4>Especificações</h4><dl>
                <div><dt>Processador</dt><dd>${escapar(item.processador)}</dd></div>
                <div><dt>GPU</dt><dd>${escapar(item.gpu)}</dd></div>
                <div><dt>Memória</dt><dd>${valor(item.ram, " GB RAM")} · ${valor(item.armazenamento, " GB")}</dd></div>
                <div><dt>Tela</dt><dd>${escapar(item.tela?.tipo)} · ${valor(item.tela?.tamanho, '"')} · ${valor(item.tela?.hz, " Hz")}</dd></div>
                <div><dt>Câmeras</dt><dd>${valor(item.camera?.principalMp, " MP principal")} · ${valor(item.camera?.ultrawideMp, " MP ultrawide")} · ${valor(item.camera?.teleobjetivaMp, " MP tele")}</dd></div>
                <div><dt>Bateria</dt><dd>${valor(item.bateria?.mah, " mAh")} · ${valor(item.carregamento?.watts, " W")}</dd></div>
                <div><dt>Construção</dt><dd>${escapar(item.construcao?.material)} · ${escapar(item.construcao?.protecao)}</dd></div>
                <div><dt>Software</dt><dd>${escapar(item.software?.sistema)} · ${valor(item.software?.anosAtualizacoes, " anos cadastrados")}</dd></div>
                <div><dt>Preço</dt><dd>${preco.formatado} (${escapar(preco.tipo)}) · ${preco.faixa}</dd></div>
            </dl></section>
        </div>`;
}
