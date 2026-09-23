export const CATEGORIAS = [
    "tela", "camera", "processamento", "gpu", "bateria", "carregamento",
    "construcao", "conectividade", "software", "atualizacoes",
    "armazenamento", "custoBeneficio"
];

export const ROTULOS_CATEGORIAS = {
    tela: "Tela",
    camera: "Câmera",
    processamento: "Processamento",
    gpu: "GPU / jogos",
    bateria: "Bateria",
    carregamento: "Carregamento",
    construcao: "Construção",
    conectividade: "Conectividade",
    software: "Software",
    atualizacoes: "Atualizações",
    armazenamento: "Armazenamento",
    custoBeneficio: "Custo-benefício"
};

export const PESOS_GERAIS = Object.freeze({
    tela: 1.05,
    camera: 1.15,
    processamento: 1.1,
    gpu: 0.8,
    bateria: 1,
    carregamento: 0.65,
    construcao: 0.75,
    conectividade: 0.65,
    software: 0.85,
    atualizacoes: 0.75,
    armazenamento: 0.55,
    custoBeneficio: 1.1
});

export const PERFIS_USO = Object.freeze({
    geral: { nome: "Uso diário", pesos: PESOS_GERAIS },
    fotografia: { nome: "Fotografia", pesos: { ...PESOS_GERAIS, camera: 2.4, tela: 1.2, processamento: 1, bateria: 0.9, carregamento: 0.45 } },
    video: { nome: "Vídeo", pesos: { ...PESOS_GERAIS, camera: 2.1, armazenamento: 1.4, processamento: 1.35, bateria: 1.2, tela: 1.15 } },
    jogos: { nome: "Jogos", pesos: { ...PESOS_GERAIS, gpu: 2.2, processamento: 2, tela: 1.6, bateria: 1.35, carregamento: 1.05, camera: 0.35 } },
    trabalho: { nome: "Trabalho", pesos: { ...PESOS_GERAIS, processamento: 1.4, bateria: 1.45, software: 1.35, atualizacoes: 1.25, armazenamento: 1.2 } },
    redesSociais: { nome: "Redes sociais", pesos: { ...PESOS_GERAIS, camera: 1.65, tela: 1.45, bateria: 1.15, conectividade: 1.1 } },
    bateria: { nome: "Bateria", pesos: { ...PESOS_GERAIS, bateria: 2.5, carregamento: 1.8, tela: 0.9, camera: 0.55 } },
    custoBeneficio: { nome: "Custo-benefício", pesos: { ...PESOS_GERAIS, custoBeneficio: 2.8, bateria: 1.1, processamento: 1.2, camera: 0.9 } },
    avancado: { nome: "Usuário avançado", pesos: { ...PESOS_GERAIS, processamento: 1.7, gpu: 1.4, tela: 1.4, camera: 1.3, conectividade: 1.25, armazenamento: 1.2 } }
});

export function limitarNota(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Math.min(10, Math.max(0, numero)) : null;
}

export function calcularNotaGeral(smartphone, perfil = "geral") {
    const pesos = PERFIS_USO[perfil]?.pesos || PESOS_GERAIS;
    let soma = 0;
    let totalPesos = 0;

    CATEGORIAS.forEach((categoria) => {
        const nota = limitarNota(smartphone?.notas?.[categoria]);
        const peso = Number(pesos[categoria]) || 0;
        if (nota === null || peso <= 0) return;
        soma += nota * peso;
        totalPesos += peso;
    });

    return totalPesos ? Number((soma / totalPesos).toFixed(1)) : null;
}

export function explicarNota(smartphone, categoria) {
    const nota = limitarNota(smartphone?.notas?.[categoria]);
    if (nota === null) return ["Sem dados suficientes para explicar esta nota."];

    const explicacoes = {
        tela: [`${smartphone.tela?.tipo || "Tipo não informado"}, ${smartphone.tela?.hz ?? "?"} Hz`, `${smartphone.tela?.brilhoNits ?? "?"} nits de brilho informado`],
        camera: [`Principal ${smartphone.camera?.principalMp ?? "?"} MP`, `Ultrawide ${smartphone.camera?.ultrawideMp || "não informada"} MP`, `Teleobjetiva ${smartphone.camera?.teleobjetivaMp || "não informada"} MP`, `Vídeo ${smartphone.camera?.video || "não informado"}`],
        processamento: [smartphone.processador || "Processador não informado"],
        gpu: [smartphone.gpu || "GPU não informada"],
        bateria: [`Capacidade informada: ${smartphone.bateria?.mah ?? "?"} mAh`],
        carregamento: [`Com fio: ${smartphone.carregamento?.watts ?? "?"} W`, `Sem fio: ${smartphone.carregamento?.semFioWatts || "não disponível"} W`],
        construcao: [smartphone.construcao?.material || "Material não informado", smartphone.construcao?.protecao || "Proteção não informada"],
        conectividade: [smartphone.conectividade?.cincoG ? "Compatível com 5G" : "5G não informado", smartphone.conectividade?.wifi || "Wi‑Fi não informado", `Bluetooth ${smartphone.conectividade?.bluetooth || "não informado"}`],
        software: [smartphone.software?.sistema || "Sistema não informado"],
        atualizacoes: [`Política cadastrada: ${smartphone.software?.anosAtualizacoes ?? "não informada"} anos`],
        armazenamento: [`${smartphone.armazenamento ?? "?"} GB de armazenamento`, `${smartphone.ram ?? "?"} GB de RAM`],
        custoBeneficio: [`Nota considera o preço de referência (${smartphone.preco?.tipo || "origem não informada"}) e o conjunto técnico cadastrado.`]
    };

    return explicacoes[categoria] || ["Critérios detalhados não cadastrados."];
}

export function gerarResumo(smartphone, perfil = "geral") {
    const avaliadas = CATEGORIAS
        .map((categoria) => ({ categoria, nota: limitarNota(smartphone?.notas?.[categoria]) }))
        .filter((item) => item.nota !== null)
        .sort((a, b) => b.nota - a.nota);

    return {
        notaGeral: calcularNotaGeral(smartphone, perfil),
        destaques: avaliadas.filter((item) => item.nota >= 9).slice(0, 4).map((item) => ROTULOS_CATEGORIAS[item.categoria]),
        atencoes: avaliadas.filter((item) => item.nota < 8.3).reverse().slice(0, 3).map((item) => ROTULOS_CATEGORIAS[item.categoria])
    };
}
