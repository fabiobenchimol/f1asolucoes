const FORMATADOR_BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
});

export function formatarPreco(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? FORMATADOR_BRL.format(numero) : "Não informado";
}

export function obterPrecoPrincipal(smartphone) {
    const preco = smartphone?.preco || {};
    const valor = Number(preco.atual ?? preco.medio ?? preco.referencia);
    return {
        valor: Number.isFinite(valor) ? valor : null,
        formatado: formatarPreco(valor),
        tipo: preco.tipo || (preco.medio ? "médio" : "cadastrado"),
        faixa: preco.minimo != null && preco.maximo != null
            ? `${formatarPreco(preco.minimo)} — ${formatarPreco(preco.maximo)}`
            : "Faixa não informada"
    };
}

export function normalizarHistoricoPrecos(registros = []) {
    return registros
        .filter((item) => Number.isFinite(Number(item.valor)))
        .map((item) => ({
            valor: Number(item.valor),
            tipo: item.tipo || "cadastrado",
            fonte: item.fonte || "Não informada",
            coletadoEm: item.coletadoEm || null
        }))
        .sort((a, b) => {
            const dataA = a.coletadoEm?.toMillis?.() ?? new Date(a.coletadoEm || 0).getTime();
            const dataB = b.coletadoEm?.toMillis?.() ?? new Date(b.coletadoEm || 0).getTime();
            return dataA - dataB;
        });
}
