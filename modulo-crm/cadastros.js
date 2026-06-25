// ============================================================================
// MODULO: CRM & MENSAGEIRO
// ARQUIVO: cadastros.js
// ============================================================================

let listaMensagens = [];
let listaLojas = [];
let unsubscribeMensagens = null;
let unsubscribeLojas = null;

const ABA_STORAGE_KEY = "crmCadastrosAbaAtiva";
const ABA_PADRAO = "mensagens";
const TEXTO_UPLOAD_LOJAS_PADRAO = `
    <span class="material-symbols-rounded" style="font-size: 48px; color: var(--f1a-blue); margin-bottom: 10px;">upload_file</span>
    <h4 style="margin: 0; color: var(--cor-titulo);">Clique para Selecionar o Arquivo</h4>
    <p style="margin: 5px 0 0 0; color: var(--cor-texto); font-size: 13px;">Atualiza automaticamente os dados cruzando pelo código.</p>
`;

window.posAuthCallback = async function() {
    document.getElementById("corpoPagina").style.display = "";

    preencherCabecalhoUsuario();
    restaurarAbaAtiva();

    iniciarListenerMensagens();
    iniciarListenerLojas();
};

function preencherCabecalhoUsuario() {
    const nomeUsuario = (dadosUsuarioLogado && dadosUsuarioLogado.nome ? String(dadosUsuarioLogado.nome) : "Usuário").trim();
    const perfil = dadosUsuarioLogado?.perfil || perfilUsuario || "usuario";
    const nomeEl = document.getElementById("nomeUsuario");
    const cargoEl = document.getElementById("cargoUsuario");
    const iniciaisEl = document.getElementById("iniciaisUsuario");

    if (nomeEl) nomeEl.innerText = nomeUsuario;
    if (cargoEl) cargoEl.innerText = String(perfil).toUpperCase();
    if (iniciaisEl) iniciaisEl.innerText = obterIniciais(nomeUsuario);
}

function obterIniciais(nome) {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length === 0) return "--";
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return `${partes[0][0] || ""}${partes[1][0] || ""}`.toUpperCase();
}

function restaurarAbaAtiva() {
    const abaSalva = sessionStorage.getItem(ABA_STORAGE_KEY) || ABA_PADRAO;
    mudarAba(["mensagens", "lojas"].includes(abaSalva) ? abaSalva : ABA_PADRAO);
}

window.mudarAba = function(aba) {
    const abaAtiva = aba === "lojas" ? "lojas" : "mensagens";
    sessionStorage.setItem(ABA_STORAGE_KEY, abaAtiva);

    document.getElementById("btnAbaMensagens").classList.toggle("ativo", abaAtiva === "mensagens");
    document.getElementById("btnAbaLojas").classList.toggle("ativo", abaAtiva === "lojas");
    document.getElementById("abaMensagens").classList.toggle("escondido", abaAtiva !== "mensagens");
    document.getElementById("abaLojas").classList.toggle("escondido", abaAtiva !== "lojas");
};

function avisar(mensagem, tipo = "info") {
    if (typeof mostrarToast === "function") {
        mostrarToast(mensagem, tipo);
        return;
    }

    if (tipo === "erro") {
        alert(mensagem);
        return;
    }

    console.log(`[${tipo}] ${mensagem}`);
}

// ------------------------------------
// MODELOS DE MENSAGENS
// ------------------------------------
function iniciarListenerMensagens() {
    if (unsubscribeMensagens) unsubscribeMensagens();

    unsubscribeMensagens = db.collection("crm_modelos_msg")
        .where("usuarioId", "==", usuarioLogado.uid)
        .onSnapshot(
            snap => {
                listaMensagens = [];
                snap.forEach(doc => listaMensagens.push({ id: doc.id, ...doc.data() }));
                renderizarTabelaMensagens();
            },
            erro => {
                console.error("Erro ao carregar modelos de mensagem:", erro);
                avisar("Não foi possível carregar os modelos de mensagem.", "erro");
            }
        );
}

function renderizarTabelaMensagens() {
    const tbody = document.getElementById("tabelaMensagensBody");

    if (!listaMensagens.length) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:var(--cor-texto);">Nenhum modelo cadastrado.</td></tr>`;
        return;
    }

    tbody.innerHTML = listaMensagens.map(msg => {
        const tipoInfo = obterInfoTipoMensagem(msg.tipo);
        const texto = String(msg.texto || "");
        const textoCurto = texto.length > 60 ? `${texto.substring(0, 60)}...` : texto;

        return `
            <tr>
                <td style="font-weight:700; color:var(--cor-titulo);">${escapeHtml(msg.nome || "--")}</td>
                <td><span style="color:${tipoInfo.cor}; font-weight:800; font-size:11px; text-transform:uppercase;">${tipoInfo.rotulo}</span></td>
                <td style="color:var(--cor-texto); font-size:13px; font-style:italic;">"${escapeHtml(textoCurto)}"</td>
                <td style="text-align:center;">
                    <div style="display:flex; justify-content:center; gap:5px;">
                        <button class="btn-icon" onclick="editarMensagem('${msg.id}')" style="padding:5px;"><span class="material-symbols-rounded" style="font-size:18px;">edit</span></button>
                        <button class="btn-icon" onclick="excluirMensagem('${msg.id}')" style="padding:5px; color:#ef4444;"><span class="material-symbols-rounded" style="font-size:18px;">delete</span></button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function obterInfoTipoMensagem(tipo) {
    if (tipo === "cobranca") return { rotulo: "Cobrança", cor: "#ef4444" };
    if (tipo === "lembrete") return { rotulo: "Lembrete", cor: "var(--premium-gold)" };
    return { rotulo: "Aviso", cor: "var(--f1a-blue)" };
}

window.abrirModalMensagem = function() {
    document.getElementById("msgId").value = "";
    document.getElementById("msgNome").value = "";
    document.getElementById("msgTipo").value = "cobranca";
    document.getElementById("msgTexto").value = "";
    document.getElementById("tituloModalMensagem").innerText = "Novo Modelo";
    document.getElementById("modalMensagem").classList.remove("escondido");
};

window.fecharModal = function(id) {
    document.getElementById(id).classList.add("escondido");
};

window.salvarModeloMensagem = async function(e) {
    e.preventDefault();

    const btn = document.getElementById("btnSalvarMsg");
    btn.innerText = "Salvando...";
    btn.disabled = true;

    const id = document.getElementById("msgId").value;
    const dados = {
        usuarioId: usuarioLogado.uid,
        nome: document.getElementById("msgNome").value.trim(),
        tipo: document.getElementById("msgTipo").value,
        texto: document.getElementById("msgTexto").value.trim(),
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (id) {
            await db.collection("crm_modelos_msg").doc(id).update(dados);
            avisar("Modelo atualizado com sucesso.", "sucesso");
        } else {
            dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("crm_modelos_msg").add(dados);
            avisar("Modelo criado com sucesso.", "sucesso");
        }

        fecharModal("modalMensagem");
    } catch (err) {
        console.error("Erro ao salvar modelo:", err);
        avisar("Não foi possível salvar o modelo.", "erro");
    } finally {
        btn.innerText = "Salvar Modelo";
        btn.disabled = false;
    }
};

window.editarMensagem = function(id) {
    const msg = listaMensagens.find(item => item.id === id);
    if (!msg) return;

    document.getElementById("msgId").value = msg.id;
    document.getElementById("msgNome").value = msg.nome || "";
    document.getElementById("msgTipo").value = msg.tipo || "cobranca";
    document.getElementById("msgTexto").value = msg.texto || "";
    document.getElementById("tituloModalMensagem").innerText = "Editar Modelo";
    document.getElementById("modalMensagem").classList.remove("escondido");
};

window.excluirMensagem = async function(id) {
    if (!confirm("Deseja realmente excluir este modelo?")) return;

    try {
        await db.collection("crm_modelos_msg").doc(id).delete();
        avisar("Modelo excluído com sucesso.", "sucesso");
    } catch (erro) {
        console.error("Erro ao excluir modelo:", erro);
        avisar("Não foi possível excluir o modelo.", "erro");
    }
};

window.inserirVariavel = function(variavel) {
    const textarea = document.getElementById("msgTexto");
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;

    textarea.value = `${textarea.value.substring(0, inicio)}${variavel}${textarea.value.substring(fim)}`;
    textarea.focus();
    textarea.setSelectionRange(inicio + variavel.length, inicio + variavel.length);
};

window.formatarTexto = function(marcador) {
    const textarea = document.getElementById("msgTexto");
    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;
    const selecionado = textarea.value.substring(inicio, fim);
    const conteudo = selecionado || "";
    const textoFinal = `${marcador}${conteudo}${marcador}`;

    textarea.value = `${textarea.value.substring(0, inicio)}${textoFinal}${textarea.value.substring(fim)}`;
    textarea.focus();

    const cursor = selecionado ? inicio + textoFinal.length : inicio + marcador.length;
    textarea.setSelectionRange(cursor, cursor);
};

// ------------------------------------
// LOJAS (IMPORTAÇÃO EXCEL & FILTROS)
// ------------------------------------
function iniciarListenerLojas() {
    if (unsubscribeLojas) unsubscribeLojas();

    unsubscribeLojas = db.collection("crm_lojas")
        .where("usuarioId", "==", usuarioLogado.uid)
        .orderBy("codigo", "asc")
        .onSnapshot(
            snap => {
                listaLojas = [];
                snap.forEach(doc => listaLojas.push({ id: doc.id, ...doc.data() }));
                renderizarTabelaLojas(document.getElementById("filtroLojas")?.value || "");
            },
            erro => {
                console.error("Erro ao carregar lojas:", erro);
                avisar("Não foi possível carregar a base de lojas.", "erro");
            }
        );
}

window.renderizarTabelaLojas = function(termoFiltro = "") {
    const tbody = document.getElementById("tabelaLojasBody");
    const termoNormalizado = normalizarTexto(termoFiltro);

    const lojasFiltradas = termoNormalizado
        ? listaLojas.filter(loja => {
            const textoBusca = [
                loja.codigo,
                loja.nome,
                loja.rede,
                loja.cnpj,
                loja.cidade
            ].map(normalizarTexto).join(" ");

            return textoBusca.includes(termoNormalizado);
        })
        : [...listaLojas];

    if (!lojasFiltradas.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--cor-texto);">Nenhuma loja encontrada.</td></tr>`;
        document.getElementById("totalLojasCadastradas").innerText = "0";
        return;
    }

    tbody.innerHTML = lojasFiltradas.map(loja => `
        <tr>
            <td style="font-weight:800; color:var(--f1a-blue);">${escapeHtml(loja.codigo || "--")}</td>
            <td style="font-weight:700; color:var(--cor-titulo);">${escapeHtml(loja.nome || "--")}</td>
            <td>${escapeHtml(loja.rede || "--")}</td>
            <td style="font-size:12px;">${escapeHtml(loja.cnpj || "--")}</td>
            <td style="font-size:12px;">${escapeHtml(loja.cidade || "--")}</td>
            <td style="text-align:center;"><span class="status-badge badge-aprovada">Ativo</span></td>
        </tr>
    `).join("");

    document.getElementById("totalLojasCadastradas").innerText = String(lojasFiltradas.length);
};

window.filtrarLojas = function() {
    const termo = document.getElementById("filtroLojas").value;
    renderizarTabelaLojas(termo);
};

window.processarPlanilhaLojas = function(input) {
    const file = input.files[0];
    if (!file) return;

    const areaDrop = document.getElementById("areaDropLojas");
    setEstadoUploadLojas(true);

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const dadosExcel = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            salvarLojasNoBanco(dadosExcel);
        } catch (erro) {
            console.error("Erro ao processar planilha de lojas:", erro);
            setEstadoUploadLojas(false);
            input.value = "";
            avisar("Não foi possível ler a planilha enviada.", "erro");
        }
    };

    reader.onerror = function() {
        console.error("Erro ao ler arquivo de lojas.");
        setEstadoUploadLojas(false);
        input.value = "";
        avisar("O arquivo não pôde ser lido.", "erro");
    };

    reader.readAsArrayBuffer(file);
};

async function salvarLojasNoBanco(dadosExcel) {
    const batchArray = [];
    let currentBatch = db.batch();
    let count = 0;
    let registrosValidos = 0;

    dadosExcel.forEach(linha => {
        const codigoBruto = obterValorColuna(linha, ["codigo"]);
        const nome = obterValorColuna(linha, ["nome"]);
        const rede = obterValorColuna(linha, ["rede"]);
        const cnpj = obterValorColuna(linha, ["cpf cnpj", "cnpj"]);
        const cidade = obterValorColuna(linha, ["cidade"]);

        if (!codigoBruto || !nome) return;

        const codigoLimpo = String(codigoBruto).replace(/\.0$/, "").trim();
        const docRef = db.collection("crm_lojas").doc(`${usuarioLogado.uid}_${codigoLimpo}`);

        currentBatch.set(docRef, {
            usuarioId: usuarioLogado.uid,
            codigo: codigoLimpo,
            nome: String(nome).trim(),
            rede: String(rede || "").trim(),
            cnpj: String(cnpj || "").trim(),
            cidade: String(cidade || "").trim(),
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        registrosValidos += 1;
        count += 1;

        if (count === 400) {
            batchArray.push(currentBatch.commit());
            currentBatch = db.batch();
            count = 0;
        }
    });

    if (count > 0) batchArray.push(currentBatch.commit());

    try {
        if (batchArray.length) {
            await Promise.all(batchArray);
        }

        document.getElementById("feedbackImportacao").classList.remove("escondido");
        setTimeout(() => {
            document.getElementById("feedbackImportacao").classList.add("escondido");
        }, 5000);

        document.getElementById("fileUploadLojas").value = "";
        avisar(registrosValidos ? "Planilha processada com sucesso." : "Nenhum registro válido foi encontrado na planilha.", registrosValidos ? "sucesso" : "info");
    } catch (erro) {
        console.error("Erro ao salvar lojas no banco:", erro);
        avisar("Não foi possível salvar a base de lojas.", "erro");
    } finally {
        setEstadoUploadLojas(false);
    }
}

function setEstadoUploadLojas(processando) {
    const areaDrop = document.getElementById("areaDropLojas");
    areaDrop.style.opacity = processando ? "0.5" : "1";

    areaDrop.innerHTML = processando
        ? `<span class="material-symbols-rounded" style="font-size: 48px; color: var(--cor-texto); animation: spin 1s linear infinite;">sync</span><h4 style="margin: 0; color: var(--cor-titulo);">Processando Planilha...</h4>`
        : TEXTO_UPLOAD_LOJAS_PADRAO;
}

function obterValorColuna(obj, aliases) {
    const mapa = Object.entries(obj).reduce((acc, [chave, valor]) => {
        acc[normalizarTexto(chave)] = valor;
        return acc;
    }, {});

    for (const alias of aliases) {
        const valor = mapa[normalizarTexto(alias)];
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
            return valor;
        }
    }

    return "";
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(valor) {
    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
