// ============================================================================
// MODULO: GERADOR DE CONTRATOS E DOCUMENTOS - contratos.js
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    const corpo = document.getElementById("corpoPagina");
    if (corpo) corpo.style.display = "";
});

const __contratosAuthFallbackInit = () => {
    if (!window.firebase || !firebase.apps || !firebase.apps.length) {
        setTimeout(__contratosAuthFallbackInit, 80);
        return;
    }
    firebase.auth().onAuthStateChanged(async (user) => {
        const emModuloContratos = window.location.pathname.toLowerCase().includes("/modulo-contratos/");
        if (!emModuloContratos) return;

        if (!user) {
            window.location.replace("../index.html");
            return;
        }

        const loadingInit = document.getElementById("loadingInit");
        if (loadingInit) loadingInit.style.display = "none";
        const corpo = document.getElementById("corpoPagina");
        if (corpo) corpo.style.display = "flex";

        if (typeof window.posAuthCallback === "function") {
            try { await window.posAuthCallback(); } catch (e) { console.error(e); }
        }
    });
};
__contratosAuthFallbackInit();

window.posAuthCallback = async function() {
    try {
        let perfil = "";
        let modulos = [];
        const userAtual = (firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : (typeof usuarioLogado !== "undefined" ? usuarioLogado : null);

        if (typeof dadosUsuarioLogado !== "undefined" && dadosUsuarioLogado) {
            perfil = dadosUsuarioLogado.perfil || "";
            modulos = dadosUsuarioLogado.modulosAcesso || [];
        } else if (userAtual) {
            const docUser = await db.collection("usuarios").doc(userAtual.uid).get();
            if (docUser.exists) {
                const data = docUser.data() || {};
                perfil = data.perfil || "";
                modulos = data.modulosAcesso || [];
                window.dadosUsuarioLogado = data;
            }
        }

        if (!perfil && (!modulos || modulos.length === 0)) return;

        if (perfil !== "master" && !modulos.includes("contratos")) {
            alert("Acesso Negado: Nao possui o Modulo de Contratos habilitado.");
            window.location.replace("../lobby.html");
            return;
        }

        tentarPreencherPerfil();
    } catch (erro) {
        console.error("Erro ao validar permissoes do utilizador:", erro);
        window.location.replace("../lobby.html");
    }

    const hoje = new Date();
    const dataPadrao = hoje.toISOString().split("T")[0];
    if (document.getElementById("dataEscolhida")) document.getElementById("dataEscolhida").value = dataPadrao;
    if (document.getElementById("dataEscolhidaRecibo")) document.getElementById("dataEscolhidaRecibo").value = dataPadrao;
};

function tentarPreencherPerfil() {
    const nomeEl = document.getElementById("nomeUsuario");
    const cargoEl = document.getElementById("cargoUsuario");
    const iniciaisEl = document.getElementById("iniciaisUsuario");

    const dataUsuario = (typeof dadosUsuarioLogado !== "undefined" && dadosUsuarioLogado) ? dadosUsuarioLogado : null;
    const nomeFonte = (dataUsuario && dataUsuario.nome) ? String(dataUsuario.nome).trim() : "";
    if (nomeFonte) {
        const nome = nomeFonte;
        const perfil = dataUsuario?.perfil || perfilUsuario || "usuario";
        if (nomeEl) nomeEl.innerText = nome;
        if (cargoEl) cargoEl.innerText = String(perfil).toUpperCase();
        if (iniciaisEl) {
            const iniciais = nome.trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "--";
            iniciaisEl.innerText = iniciais;
        }
    } else {
        const userAtual = (firebase.auth && firebase.auth().currentUser) ? firebase.auth().currentUser : (typeof usuarioLogado !== "undefined" ? usuarioLogado : null);
        if (userAtual) {
            db.collection("usuarios").doc(userAtual.uid).get().then((docUser) => {
                if (docUser.exists) {
                    const data = docUser.data() || {};
                    window.dadosUsuarioLogado = data;
                    const nome = String(data.nome || "").trim();
                    const perfil = data.perfil || perfilUsuario || "usuario";
                    if (nomeEl) nomeEl.innerText = nome || "Usuario";
                    if (cargoEl) cargoEl.innerText = String(perfil).toUpperCase();
                    if (iniciaisEl) {
                        const iniciais = (nome || "US").trim().split(/\s+/).slice(0, 2).map(p => p[0] || "").join("").toUpperCase() || "--";
                        iniciaisEl.innerText = iniciais;
                    }
                } else {
                    setTimeout(tentarPreencherPerfil, 400);
                }
            }).catch(() => setTimeout(tentarPreencherPerfil, 400));
        } else {
            setTimeout(tentarPreencherPerfil, 400);
        }
    }
}

window.buscarDadosCNPJ = async function() {
    let cnpjDigitado = document.getElementById("cnpj").value.replace(/\D/g, "");
    if (cnpjDigitado.length !== 14) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Por favor, digite um CNPJ completo com 14 digitos.", "erro");
        return;
    }

    document.getElementById("cliente").value = "A procurar dados na Receita...";

    try {
        let resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigitado}`);
        if (resposta.ok) {
            const dados = await resposta.json();
            preencherInputsBusca(dados.razao_social, dados.nome_fantasia, dados.municipio, dados.uf, dados.cep);
            return;
        }

        let respostaB = await fetch(`https://publica.cnpj.ws/cnpj/${cnpjDigitado}`);
        if (respostaB.ok) {
            const dadosB = await respostaB.json();
            preencherInputsBusca(dadosB.razao_social, dadosB.estabelecimento.nome_fantasia, dadosB.estabelecimento.cidade.nome, dadosB.estabelecimento.estado.sigla, dadosB.estabelecimento.cep);
            return;
        }
        throw new Error("CNPJ nao encontrado.");
    } catch (erro) {
        if (typeof mostrarToast !== "undefined") mostrarToast("A Receita Federal esta instavel ou o CNPJ nao existe.", "erro");
        document.getElementById("cliente").value = "";
    }
};

function preencherInputsBusca(razao, fantasia, cidade, uf, cepBruto) {
    document.getElementById("cliente").value = razao || "";
    document.getElementById("fantasia").value = fantasia || "";
    document.getElementById("cidade").value = cidade || "";
    document.getElementById("uf").value = uf || "";
    let cep = cepBruto ? cepBruto.toString().replace(/\D/g, "") : "";
    if (cep.length === 8) cep = cep.substring(0, 5) + "-" + cep.substring(5);
    document.getElementById("cep").value = cep;
}

window.adaptarTela = function() {
    const doc = document.getElementById("modeloContrato").value;
    const isRecibo = doc === "Recibo.docx";
    document.getElementById("dadosEndereco").classList.toggle("escondido", isRecibo);
    document.getElementById("campoFantasia").classList.toggle("escondido", isRecibo);
    document.getElementById("secaoValores").classList.toggle("escondido", isRecibo);
    document.getElementById("dataContratoContainer").classList.toggle("escondido", isRecibo);
    document.getElementById("dataRecibo").classList.toggle("escondido", !isRecibo);
};

window.verificarPacote = function() {
    const escolha = document.getElementById("pacoteCartoes").value;
    const cx = document.getElementById("caixaPersonalizada");
    if (escolha === "personalizado") cx.classList.remove("escondido"); else cx.classList.add("escondido");
};

window.aplicarMascaraCEP = function(campo) { let v = campo.value.replace(/\D/g, ""); v = v.replace(/^(\d{5})(\d)/, "$1-$2"); campo.value = v; };
window.aplicarMascaraCpfCnpj = function(campo) {
    let v = campo.value.replace(/\D/g, "");
    if (v.length <= 11) { v = v.replace(/(\d{3})(\d)/, "$1.$2"); v = v.replace(/(\d{3})(\d)/, "$1.$2"); v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2"); }
    else { v = v.replace(/^(\d{2})(\d)/, "$1.$2"); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3"); v = v.replace(/\.(\d{3})(\d)/, ".$1/$2"); v = v.replace(/(\d{4})(\d)/, "$1-$2"); }
    campo.value = v;
};

window.aplicarMascaraMoeda = function(campo) {
    let v = campo.value.replace(/\D/g, "");
    if (v === "") { campo.value = ""; return; }
    v = (parseInt(v) / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    campo.value = v;
};

window.calcularTotalPersonalizado = function() {
    let qtd = parseInt(document.getElementById("qtdCartoes").value.replace(/\D/g, "")) || 0;
    let unit = parseFloat(document.getElementById("valorUnitario").value.replace(/\./g, "").replace(",", ".")) || 0;
    if (qtd > 0 && unit > 0) document.getElementById("valorTotal").value = (qtd * unit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.calcularUnitarioPersonalizado = function() {
    let qtd = parseInt(document.getElementById("qtdCartoes").value.replace(/\D/g, "")) || 0;
    let total = parseFloat(document.getElementById("valorTotal").value.replace(/\./g, "").replace(",", ".")) || 0;
    if (qtd > 0 && total > 0) document.getElementById("valorUnitario").value = (total / qtd).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function formatarDataPorExtenso(dataDoCalendario) {
    if (!dataDoCalendario) return "";
    const partes = dataDoCalendario.split("-");
    const meses = ["janeiro", "fevereiro", "marco", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    return partes[2] + " de " + meses[parseInt(partes[1]) - 1] + " de " + partes[0];
}

function numeroParaExtenso(numero, isMoeda = false) {
    if (numero === 0) return isMoeda ? "zero reais" : "zero";
    const unid = ["", "um", "dois", "tres", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const esp = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dez = ["", "dez", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const cent = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    function obterGrupo(n) {
        if (n === 100) return "cem";
        let c = Math.floor(n / 100); let d = Math.floor((n % 100) / 10); let u = n % 10;
        let pal = [];
        if (c > 0) pal.push(cent[c]);
        if (d === 1) { pal.push(esp[u]); } else {
            if (d > 1) pal.push(dez[d]);
            if (u > 0) pal.push(unid[u]);
        }
        return pal.join(" e ");
    }

    let [intStr, decStr] = numero.toFixed(2).split(".");
    let intNum = parseInt(intStr, 10); let decNum = parseInt(decStr, 10);
    let partes = [];

    if (intNum > 0) {
        let milhoes = Math.floor(intNum / 1000000); let milhares = Math.floor((intNum % 1000000) / 1000); let centavosInt = intNum % 1000;
        if (milhoes > 0) partes.push(obterGrupo(milhoes) + (milhoes === 1 ? " milhao" : " milhoes"));
        if (milhares > 0) partes.push((milhares === 1 ? "um mil" : obterGrupo(milhares)) + " mil");
        if (centavosInt > 0) {
            let txt = obterGrupo(centavosInt);
            if (partes.length > 0 && (centavosInt <= 100 || centavosInt % 100 === 0)) partes.push("e " + txt); else partes.push(txt);
        }
    }

    let res = partes.join(", ").replace(/, e /g, " e ");
    if (isMoeda) {
        if (intNum === 1) res += " real"; else if (intNum > 1) res += " reais";
        if (decNum > 0) {
            let txtDec = obterGrupo(decNum);
            if (intNum > 0) res += " e " + txtDec + (decNum === 1 ? " centavo" : " centavos"); else res = txtDec + (decNum === 1 ? " centavo" : " centavos");
        }
    }
    return res.trim();
}

function validarCampos() {
    const documento = document.getElementById("modeloContrato").value;
    const cliente = document.getElementById("cliente").value.trim();
    const pacote = document.getElementById("pacoteCartoes").value;
    if (cliente === "") return "Preencha a Razao Social ou Nome do Cliente.";

    if (documento === "Contrato_ceocard.docx") {
        if (pacote === "0") return "Selecione um Plano Contratado.";
        const cnpj = document.getElementById("cnpj").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const uf = document.getElementById("uf").value.trim();
        if (cnpj === "") return "Para gerar um contrato, o CPF/CNPJ e obrigatorio.";
        if (cidade === "") return "Para gerar um contrato, preencha a Cidade.";
        if (uf === "") return "Para gerar um contrato, preencha a UF.";
        if (document.getElementById("taxaManutencao").value.trim() === "") return "Preencha o valor da Manutencao de Fatura.";
        if (document.getElementById("taxaPlastico").value.trim() === "") return "Preencha o valor da Taxa de Plastico.";
        if (pacote === "personalizado") {
            if (document.getElementById("qtdCartoes").value.trim() === "") return "Preencha a Quantidade de Cartoes.";
            if (document.getElementById("valorTotal").value.trim() === "") return "Preencha o Valor Total do Pacote.";
        }
    }
    return null;
}

window.gerarDocumento = async function() {
    const erroValidacao = validarCampos();
    if (erroValidacao !== null) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Atencao: " + erroValidacao, "erro");
        return;
    }

    const docCaminho = document.getElementById("modeloContrato").value;
    try {
        const resposta = await fetch(docCaminho);
        if (!resposta.ok) throw new Error(`O ficheiro modelo (${docCaminho}) nao foi encontrado no servidor.`);

        const conteudo = await resposta.arrayBuffer();
        const zip = new PizZip(conteudo);
        const documento = new window.docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: "{", end: "}" } });

        const vCli = document.getElementById("cliente").value.toUpperCase().trim();
        const vFan = document.getElementById("fantasia").value.toUpperCase().trim();
        let dataSel = (docCaminho === "Recibo.docx") ? document.getElementById("dataEscolhidaRecibo").value : document.getElementById("dataEscolhida").value;
        const vDataExt = formatarDataPorExtenso(dataSel);

        let objSubst = {
            cliente: vCli, fantasia: vFan, has_fantasia: vFan !== "",
            cidade: document.getElementById("cidade").value, UF: document.getElementById("uf").value.toUpperCase(),
            CEP: document.getElementById("cep").value, CNPJ: document.getElementById("cnpj").value, data: vDataExt
        };

        if (docCaminho === "Contrato_ceocard.docx") {
            let pQtd = "", pVal = "", pTot = "";
            const esc = document.getElementById("pacoteCartoes").value;
            if (esc === "500") { pQtd = "500"; pVal = "17,00"; pTot = "8.500,00"; }
            else if (esc === "1000") { pQtd = "1.000"; pVal = "13,00"; pTot = "13.000,00"; }
            else if (esc === "2000") { pQtd = "2.000"; pVal = "11,00"; pTot = "22.000,00"; }
            else if (esc === "personalizado") {
                pQtd = document.getElementById("qtdCartoes").value;
                pVal = document.getElementById("valorUnitario").value;
                pTot = document.getElementById("valorTotal").value;
            }

            let tManStr = document.getElementById("taxaManutencao").value;
            let tPlasStr = document.getElementById("taxaPlastico").value;
            let numMan = parseFloat(tManStr.replace(/\./g, "").replace(",", ".")) || 0;
            let numPlas = parseFloat(tPlasStr.replace(/\./g, "").replace(",", ".")) || 0;
            objSubst.taxa_manutencao = tManStr;
            objSubst.taxa_manutencao_extenso = numeroParaExtenso(numMan, true);
            objSubst.taxa_plastico = tPlasStr;
            objSubst.taxa_plastico_extenso = numeroParaExtenso(numPlas, true);

            let qNum = parseInt(pQtd.replace(/\D/g, "")) || 0;
            let uNum = parseFloat(pVal.replace(/\./g, "").replace(",", ".")) || 0;
            let tNum = parseFloat(pTot.replace(/\./g, "").replace(",", ".")) || 0;
            objSubst.qtd_cartoes = pQtd; objSubst.qtd_extenso = numeroParaExtenso(qNum, false);
            objSubst.valor_cartao = pVal; objSubst.valor_extenso = numeroParaExtenso(uNum, true);
            objSubst.valor_total = pTot; objSubst.valor_total_extenso = numeroParaExtenso(tNum, true);
        }

        documento.render(objSubst);
        const nomeParaArquivo = vFan !== "" ? vFan : vCli;
        const prefixo = (docCaminho === "Recibo.docx") ? "RECIBO" : "CONTRATO";
        saveAs(documento.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `${prefixo} - ${nomeParaArquivo}.docx`);

        if (typeof mostrarToast !== "undefined") mostrarToast("Documento gerado com sucesso!", "sucesso");
    } catch (erro) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Erro ao processar o ficheiro Word. Verifique os modelos base.", "erro");
        console.error(erro);
    }
};

window.toggleDropdownPerfil = function(event) {
    event.stopPropagation();
    const menu = document.getElementById("dropdownPerfilLocal");
    if (menu) menu.classList.toggle("escondido");
};
document.addEventListener("click", function() {
    document.querySelectorAll(".menu-perfil-flutuante").forEach(m => m.classList.add("escondido"));
});