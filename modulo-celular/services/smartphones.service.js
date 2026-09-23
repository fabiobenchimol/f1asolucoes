import { SMARTPHONES_SEED } from "../data/smartphones.seed.js";

const LIMITE_CATALOGO = 250;

export function normalizarTexto(valor = "") {
    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\+/g, " plus ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function criarTermosBusca(smartphone) {
    const completo = normalizarTexto([
        smartphone.marca,
        smartphone.modelo,
        smartphone.variante,
        smartphone.ram && `${smartphone.ram} gb ram`,
        smartphone.armazenamento && `${smartphone.armazenamento} gb`
    ].filter(Boolean).join(" "));

    return new Set([
        completo,
        completo.replace(/\s+/g, ""),
        normalizarTexto(smartphone.modelo),
        normalizarTexto(smartphone.modelo).replace(/\s+/g, "")
    ]);
}

export function prepararSmartphone(documento, id) {
    const smartphone = { id: id || documento.id, ...documento };
    smartphone.termosBusca = Array.from(criarTermosBusca(smartphone));
    return smartphone;
}

function deduplicar(lista) {
    return Array.from(new Map(lista.map((item) => [item.id, item])).values());
}

export async function carregarCatalogo({ db, empresaId }) {
    const seed = SMARTPHONES_SEED.map((item) => prepararSmartphone(item));
    if (!db?.collection || !empresaId) {
        return { itens: seed, origem: "demonstracao" };
    }

    try {
        const consultas = [
            db.collection("smartphones").where("empresaId", "==", empresaId).where("ativo", "==", true).limit(LIMITE_CATALOGO).get(),
            db.collection("smartphones").where("empresaId", "==", "global").where("ativo", "==", true).limit(LIMITE_CATALOGO).get()
        ];
        const resultados = await Promise.allSettled(consultas);
        const firestore = [];

        resultados.forEach((resultado) => {
            if (resultado.status !== "fulfilled") return;
            resultado.value.forEach((doc) => firestore.push(prepararSmartphone(doc.data(), doc.id)));
        });

        if (!firestore.length) return { itens: seed, origem: "demonstracao" };
        return { itens: deduplicar([...firestore, ...seed]), origem: "firestore" };
    } catch (erro) {
        console.warn("Comparador: catálogo Firestore indisponível; usando dados demonstrativos.", erro);
        return { itens: seed, origem: "demonstracao" };
    }
}

export function buscarSmartphones(catalogo, termo, limite = 8) {
    const normalizado = normalizarTexto(termo);
    const compacto = normalizado.replace(/\s+/g, "");
    if (normalizado.length < 2) return [];

    return catalogo
        .map((item) => {
            const termos = item.termosBusca?.length ? item.termosBusca : Array.from(criarTermosBusca(item));
            let relevancia = 0;
            termos.forEach((texto) => {
                if (texto === normalizado || texto === compacto) relevancia = Math.max(relevancia, 100);
                else if (texto.startsWith(normalizado) || texto.startsWith(compacto)) relevancia = Math.max(relevancia, 80);
                else if (texto.includes(normalizado) || texto.includes(compacto)) relevancia = Math.max(relevancia, 60);
                else {
                    const palavras = normalizado.split(" ").filter(Boolean);
                    if (palavras.every((palavra) => texto.includes(palavra))) relevancia = Math.max(relevancia, 45);
                }
            });
            return { item, relevancia };
        })
        .filter(({ relevancia }) => relevancia > 0)
        .sort((a, b) => b.relevancia - a.relevancia || a.item.modelo.localeCompare(b.item.modelo, "pt-BR"))
        .slice(0, limite)
        .map(({ item }) => item);
}
