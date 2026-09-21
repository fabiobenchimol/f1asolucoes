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
        await carregarBibliotecaClausulas();
        aplicarPermissaoBibliotecaClausulas();
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
    const secaoClausula = document.getElementById("secaoClausulaAdicional");
    if (secaoClausula) secaoClausula.classList.toggle("escondido", isRecibo);
    if (isRecibo) {
        const check = document.getElementById("checkIncluirClausula");
        if (check) check.checked = false;
        if (typeof window.alternarClausulaAdicional === "function") window.alternarClausulaAdicional();
    }
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
        if (milhares > 0) partes.push(milhares === 1 ? "mil" : obterGrupo(milhares) + " mil");
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

function percentualParaExtenso(numero) {
    const valor = Number(numero) || 0;
    const [intStr, decStr] = valor.toFixed(2).split(".");
    const intNum = parseInt(intStr, 10);
    const decNum = parseInt(decStr, 10);
    const inteiroExtenso = intNum === 0 ? "zero" : numeroParaExtenso(intNum, false);
    if (decNum === 0) return inteiroExtenso + " por cento";
    return inteiroExtenso + " vírgula " + numeroParaExtenso(decNum, false) + " por cento";
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
        if (document.getElementById("taxaTransacoes").value.trim() === "") return "Preencha a Taxa sobre o Recebido.";
        if (document.getElementById("taxaSpc").value.trim() === "") return "Preencha a Tarifa por Consulta na Mesa de Credito.";
        if (pacote === "personalizado") {
            if (document.getElementById("qtdCartoes").value.trim() === "") return "Preencha a Quantidade de Cartoes.";
            if (document.getElementById("valorTotal").value.trim() === "") return "Preencha o Valor Total do Pacote.";
        }
        const checkClausula = document.getElementById("checkIncluirClausula");
        if (checkClausula && checkClausula.checked) {
            const textoClausula = obterTextoClausulaEditor();
            if (!textoClausula) return "Informe o texto da cláusula adicional antes de gerar o contrato.";
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
        Object.keys(zip.files).forEach(function(nomeArquivo) {
            if (!/^word\/.*\.xml$/i.test(nomeArquivo)) return;
            const arquivoXml = zip.file(nomeArquivo);
            if (!arquivoXml) return;
            zip.file(nomeArquivo, arquivoXml.asText().replace(/\{\{/g, "{").replace(/\}\}/g, "}"));
        });
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
            let tTransStr = document.getElementById("taxaTransacoes").value;
            let tSpcStr = document.getElementById("taxaSpc").value;
            let numMan = parseFloat(tManStr.replace(/\./g, "").replace(",", ".")) || 0;
            let numPlas = parseFloat(tPlasStr.replace(/\./g, "").replace(",", ".")) || 0;
            let numTrans = parseFloat(tTransStr.replace(/\./g, "").replace(",", ".")) || 0;
            let numSpc = parseFloat(tSpcStr.replace(/\./g, "").replace(",", ".")) || 0;
            objSubst.taxa_manutencao = tManStr;
            objSubst.taxa_manutencao_extenso = numeroParaExtenso(numMan, true);
            objSubst.taxa_plastico = tPlasStr;
            objSubst.taxa_plastico_extenso = numeroParaExtenso(numPlas, true);
            objSubst.taxa_transacoes = tTransStr + "%";
            objSubst.taxa_transacoes_extenso = percentualParaExtenso(numTrans);
            objSubst.taxa_spc = tSpcStr;
            objSubst.taxa_spc_extenso = numeroParaExtenso(numSpc, true);

            let qNum = parseInt(pQtd.replace(/\D/g, "")) || 0;
            let uNum = parseFloat(pVal.replace(/\./g, "").replace(",", ".")) || 0;
            let tNum = parseFloat(pTot.replace(/\./g, "").replace(",", ".")) || 0;
            objSubst.qtd_cartoes = pQtd; objSubst.qtd_extenso = numeroParaExtenso(qNum, false);
            objSubst.valor_cartao = pVal; objSubst.valor_extenso = numeroParaExtenso(uNum, true);
            objSubst.valor_total = pTot; objSubst.valor_total_extenso = numeroParaExtenso(tNum, true);
            aplicarClausulaOpcionalNoDocumento(objSubst);
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

const COLECAO_CLAUSULAS = "contratos_clausulas";
let bibliotecaClausulas = [];

function obterEmpresaIdAtiva() {
    const visao = sessionStorage.getItem("visaoEmpresaAtiva");
    if (visao) return visao;
    const dataUsuario = (typeof dadosUsuarioLogado !== "undefined" && dadosUsuarioLogado) ? dadosUsuarioLogado : null;
    const emp = dataUsuario ? dataUsuario.empresaId : "";
    if (Array.isArray(emp)) return emp[0] || "";
    return emp || "";
}

function podeGerirBibliotecaClausulas() {
    const dataUsuario = (typeof dadosUsuarioLogado !== "undefined" && dadosUsuarioLogado) ? dadosUsuarioLogado : null;
    const perfil = String((dataUsuario && dataUsuario.perfil) || "").toLowerCase();
    return perfil === "master" || perfil === "admin" || perfil === "gerente";
}

function aplicarPermissaoBibliotecaClausulas() {
    const caixa = document.getElementById("caixaBtnNovaClausula");
    if (caixa) caixa.classList.toggle("escondido", !podeGerirBibliotecaClausulas());
}

async function carregarBibliotecaClausulas() {
    const select = document.getElementById("selectClausulaPronta");
    if (!select) return;
    const empresaId = obterEmpresaIdAtiva();
    bibliotecaClausulas = [];
    select.innerHTML = '<option value="">Selecione uma cláusula...</option>';
    if (!empresaId) return;

    try {
        const snap = await db.collection(COLECAO_CLAUSULAS).where("empresaId", "==", empresaId).get();
        snap.forEach((doc) => {
            const data = doc.data() || {};
            if (data.ativo === false) return;
            bibliotecaClausulas.push({
                id: doc.id,
                nome: data.nome || "",
                texto: data.texto || ""
            });
        });
        bibliotecaClausulas.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
        bibliotecaClausulas.forEach((item) => {
            const opt = document.createElement("option");
            opt.value = item.id;
            opt.textContent = item.nome;
            select.appendChild(opt);
        });
    } catch (erro) {
        console.error("Erro ao carregar biblioteca de clausulas:", erro);
    }
}

window.alternarClausulaAdicional = function() {
    const check = document.getElementById("checkIncluirClausula");
    const campos = document.getElementById("camposClausulaAdicional");
    if (!campos) return;
    const ativo = !!(check && check.checked);
    campos.classList.toggle("escondido", !ativo);
};

window.carregarClausulaSelecionada = function() {
    const select = document.getElementById("selectClausulaPronta");
    const editor = document.getElementById("editorClausula");
    if (!select || !editor) return;
    const id = select.value;
    if (!id) return;
    const item = bibliotecaClausulas.find((c) => c.id === id);
    if (!item) return;
    editor.innerHTML = item.texto || "";
};

window.aplicarFormatacaoClausula = function(evento, comando) {
    if (evento) evento.preventDefault();
    const editor = document.getElementById("editorClausula");
    if (editor) editor.focus();
    document.execCommand(comando, false, null);
};

window.abrirModalNovaClausula = function() {
    if (!podeGerirBibliotecaClausulas()) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Seu perfil nao pode cadastrar clausulas.", "erro");
        return;
    }
    const modal = document.getElementById("modalNovaClausula");
    const nome = document.getElementById("nomeNovaClausula");
    const texto = document.getElementById("textoNovaClausula");
    if (nome) nome.value = "";
    if (texto) texto.value = "";
    if (modal) modal.classList.remove("escondido");
};

window.fecharModalNovaClausula = function() {
    const modal = document.getElementById("modalNovaClausula");
    if (modal) modal.classList.add("escondido");
};

window.salvarNovaClausula = async function() {
    if (!podeGerirBibliotecaClausulas()) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Seu perfil nao pode cadastrar clausulas.", "erro");
        return;
    }
    const empresaId = obterEmpresaIdAtiva();
    if (!empresaId) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Selecione uma empresa ativa para salvar a clausula.", "erro");
        return;
    }
    const nome = (document.getElementById("nomeNovaClausula").value || "").trim();
    const textoBruto = (document.getElementById("textoNovaClausula").value || "").trim();
    if (!nome) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Informe o nome da clausula.", "erro");
        return;
    }
    if (!textoBruto) {
        if (typeof mostrarToast !== "undefined") mostrarToast("Informe o texto da clausula.", "erro");
        return;
    }

    const textoHtml = textoBruto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");

    try {
        const ref = await db.collection(COLECAO_CLAUSULAS).add({
            empresaId: empresaId,
            nome: nome,
            texto: textoHtml,
            ativo: true,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });
        await carregarBibliotecaClausulas();
        const select = document.getElementById("selectClausulaPronta");
        if (select) {
            select.value = ref.id;
            window.carregarClausulaSelecionada();
        }
        window.fecharModalNovaClausula();
        if (typeof mostrarToast !== "undefined") mostrarToast("Clausula salva na biblioteca.", "sucesso");
    } catch (erro) {
        console.error(erro);
        if (typeof mostrarToast !== "undefined") mostrarToast("Nao foi possivel salvar a clausula.", "erro");
    }
};

function obterTextoClausulaEditor() {
    const editor = document.getElementById("editorClausula");
    if (!editor) return "";
    return String(editor.innerText || editor.textContent || "").replace(/\u00a0/g, " ").trim();
}

function escaparXmlDocx(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function rPrClausula(fmt) {
    let xml = '<w:rFonts w:ascii="Aptos Display" w:eastAsia="Times New Roman" w:hAnsi="Aptos Display" w:cs="Times New Roman"/>';
    if (fmt.b) xml += "<w:b/><w:bCs/>";
    if (fmt.i) xml += "<w:i/><w:iCs/>";
    if (fmt.u) xml += '<w:u w:val="single"/>';
    xml += '<w:sz w:val="25"/><w:szCs w:val="25"/>';
    return xml;
}

function runTextoClausula(texto, fmt) {
    if (!texto) return "";
    return "<w:r><w:rPr>" + rPrClausula(fmt) + '</w:rPr><w:t xml:space="preserve">' + escaparXmlDocx(texto) + "</w:t></w:r>";
}

function runQuebraClausula(fmt) {
    return "<w:r><w:rPr>" + rPrClausula(fmt) + "</w:rPr><w:br/></w:r>";
}

function herdarFormatacaoClausula(no, fmt) {
    const proximo = { b: !!fmt.b, i: !!fmt.i, u: !!fmt.u };
    if (!no || no.nodeType !== 1) return proximo;
    const tag = String(no.tagName || "").toLowerCase();
    if (tag === "b" || tag === "strong") proximo.b = true;
    if (tag === "i" || tag === "em") proximo.i = true;
    if (tag === "u") proximo.u = true;
    const estilo = (no.getAttribute && no.getAttribute("style")) ? String(no.getAttribute("style")).toLowerCase() : "";
    if (estilo.indexOf("font-weight:bold") >= 0 || estilo.indexOf("font-weight: 700") >= 0 || estilo.indexOf("font-weight:700") >= 0) proximo.b = true;
    if (estilo.indexOf("font-style:italic") >= 0 || estilo.indexOf("font-style: italic") >= 0) proximo.i = true;
    if (estilo.indexOf("text-decoration:underline") >= 0 || estilo.indexOf("text-decoration: underline") >= 0) proximo.u = true;
    return proximo;
}

function converterNosParaRunsDocx(no, fmt) {
    let xml = "";
    if (!no) return xml;
    if (no.nodeType === 3) {
        const partes = String(no.nodeValue || "").replace(/\r/g, "").split("\n");
        partes.forEach((parte, idx) => {
            xml += runTextoClausula(parte, fmt);
            if (idx < partes.length - 1) xml += runQuebraClausula(fmt);
        });
        return xml;
    }
    if (no.nodeType !== 1) return xml;
    const tag = String(no.tagName || "").toLowerCase();
    if (tag === "br") return runQuebraClausula(fmt);
    const proximo = herdarFormatacaoClausula(no, fmt);
    const filhos = no.childNodes || [];
    for (let i = 0; i < filhos.length; i++) xml += converterNosParaRunsDocx(filhos[i], proximo);
    if ((tag === "div" || tag === "p" || tag === "li") && no.nextSibling) xml += runQuebraClausula(proximo);
    return xml;
}

function removerPrefixoNumeracaoCinco(container) {
    const texto = String(container.innerText || container.textContent || "").replace(/\u00a0/g, " ");
    if (!/^\s*5\.\s*/.test(texto)) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const primeiro = walker.nextNode();
    if (!primeiro) return;
    primeiro.nodeValue = String(primeiro.nodeValue || "").replace(/^\s*5\.\s*/, "");
}

function montarXmlParagrafoClausula(htmlEditor) {
    const tmp = document.createElement("div");
    tmp.innerHTML = htmlEditor || "";
    removerPrefixoNumeracaoCinco(tmp);
    let runs = "";
    const filhos = tmp.childNodes || [];
    for (let i = 0; i < filhos.length; i++) runs += converterNosParaRunsDocx(filhos[i], { b: false, i: false, u: false });
    const prefixo = runTextoClausula("5. ", { b: false, i: false, u: false });
    return (
        '<w:p><w:pPr>' +
        '<w:spacing w:before="100" w:beforeAutospacing="1" w:after="100" w:afterAutospacing="1" w:line="240" w:lineRule="auto"/>' +
        '<w:jc w:val="both"/>' +
        "</w:pPr>" +
        prefixo +
        runs +
        "</w:p>"
    );
}

function aplicarClausulaOpcionalNoDocumento(objSubst) {
    const check = document.getElementById("checkIncluirClausula");
    const incluir = !!(check && check.checked);
    if (!incluir) {
        objSubst.clausula_opcional = false;
        objSubst.clausula_opcional_xml = "";
        return;
    }
    const editor = document.getElementById("editorClausula");
    objSubst.clausula_opcional = true;
    objSubst.clausula_opcional_xml = montarXmlParagrafoClausula(editor ? editor.innerHTML : "");
}

window.toggleDropdownPerfil = function(event) {
    event.stopPropagation();
    const menu = document.getElementById("dropdownPerfilLocal");
    if (menu) menu.classList.toggle("escondido");
};
document.addEventListener("click", function() {
    document.querySelectorAll(".menu-perfil-flutuante").forEach(m => m.classList.add("escondido"));
});