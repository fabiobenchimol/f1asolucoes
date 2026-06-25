// ============================================================================
// F1A CARTÕES - CONTROLE GERAL
// controle-geral.js
// ============================================================================

const NOME_DA_COLECAO = "adm_cronograma_bim";

let listaCompleta = [];
let listaFiltrada = [];

let unsubscribeControle = null;

// ============================================================================
// AUTH / INIT
// ============================================================================

window.posAuthCallback = async function () {

    try {

        const corpo =
            document.getElementById("corpoPagina");

        if (corpo) {
            corpo.style.display = "";
        }

        await preencherPerfilUsuario();

        iniciarListenerControle();

        configurarListenersGlobais();

    } catch (error) {

        console.error(
            "Erro no carregamento:",
            error
        );

        mostrarToast(
            "Erro ao carregar módulo.",
            "erro"
        );
    }
};

// ============================================================================
// FALLBACK AUTH
// ============================================================================

firebase.auth().onAuthStateChanged(async (user) => {

    if (!user) {

        window.location.href = "../index.html";
        return;
    }

    const corpo =
        document.getElementById("corpoPagina");

    if (
        corpo &&
        corpo.style.display === "none"
    ) {

        if (
            typeof window.posAuthCallback === "function"
        ) {

            await window.posAuthCallback();
        }
    }
});

// ============================================================================
// PERFIL USUARIO
// ============================================================================

async function preencherPerfilUsuario() {

    try {

        let dadosUsuario = null;

        if (
            typeof dadosUsuarioLogado !== "undefined" &&
            dadosUsuarioLogado
        ) {

            dadosUsuario = dadosUsuarioLogado;

        } else {

            const user =
                firebase.auth().currentUser;

            if (!user) return;

            const snap = await db
                .collection("usuarios")
                .doc(user.uid)
                .get();

            if (snap.exists) {
                dadosUsuario = snap.data();
            }
        }

        if (!dadosUsuario) {

            setTimeout(
                preencherPerfilUsuario,
                800
            );

            return;
        }

        const nome =
            dadosUsuario.nome ||
            dadosUsuario.displayName ||
            "Usuário";

        const perfil =
            (
                dadosUsuario.perfil ||
                "Usuário"
            ).toUpperCase();

        const iniciais = nome
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(p => p.charAt(0))
            .join("")
            .toUpperCase();

        const nomeEl =
            document.getElementById(
                "nomeUsuario"
            );

        const cargoEl =
            document.getElementById(
                "cargoUsuario"
            );

        const iniciaisEl =
            document.getElementById(
                "iniciaisUsuario"
            );

        if (nomeEl) {
            nomeEl.innerText = nome;
        }

        if (cargoEl) {
            cargoEl.innerText = perfil;
        }

        if (iniciaisEl) {
            iniciaisEl.innerText =
                iniciais || "US";
        }

    } catch (error) {

        console.error(
            "Erro ao preencher perfil:",
            error
        );
    }
}

// ============================================================================
// FIRESTORE
// ============================================================================

function iniciarListenerControle() {

    if (unsubscribeControle) {
        unsubscribeControle();
    }

    unsubscribeControle = db
        .collection(NOME_DA_COLECAO)
        .onSnapshot((snapshot) => {

            listaCompleta = snapshot.docs.map(doc => ({

                id: doc.id,
                ...doc.data()

            }));

            listaCompleta.sort((a, b) => {

                const dataA =
                    obterTimestamp(a.dataCriacao);

                const dataB =
                    obterTimestamp(b.dataCriacao);

                return dataB - dataA;
            });

            listaFiltrada = [...listaCompleta];

            renderizarTabela();

        }, (error) => {

            console.error(
                "Erro firestore:",
                error
            );

            mostrarToast(
                "Erro ao carregar registros.",
                "erro"
            );
        });
}

// ============================================================================
// RENDER TABELA
// ============================================================================

function renderizarTabela() {

    const tbody =
        document.getElementById(
            "listaRegistros"
        );

    if (!tbody) return;

    if (!listaFiltrada.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:40px;
                        color:var(--cor-texto);
                    "
                >
                    Nenhum registro encontrado.
                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = listaFiltrada.map((item) => {

        return `

            <tr>

                <td>
                    ${formatarData(item.dataCriacao)}
                </td>

                <td>
                    ${item.rede || "-"}
                </td>

                <td>
                    ${item.nomeEmpresa || "-"}
                </td>

                <td style="text-align:right;">

                    <span class="texto-azul-claro">

                        ${item.faixaInicial || "-"}

                        →

                        ${item.faixaFinal || "-"}

                    </span>

                </td>

                <td style="text-align:center;">

                    <strong>

                        ${item.quantidadeCartoes || 0}

                    </strong>

                </td>

                <td>

                    ${item.tipoTarifa || "-"}

                </td>

                <td>

                    ${item.modeloMaquineta || "-"}

                </td>

                <td>

                    ${renderDetalhes(item)}

                </td>

                <td style="text-align:center;">

                    <div
                        style="
                            display:flex;
                            justify-content:center;
                            gap:8px;
                        "
                    >

                        <button
                            class="btn-acao"
                            onclick="editarRegistro('${item.id}')"
                        >

                            <span class="material-symbols-rounded">
                                edit
                            </span>

                        </button>

                        <button
                            class="btn-acao delete"
                            onclick="excluirRegistro('${item.id}')"
                        >

                            <span class="material-symbols-rounded">
                                delete
                            </span>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    }).join("");
}

// ============================================================================
// DETALHES
// ============================================================================

function renderDetalhes(item) {

    let html = "";

    if (item.bimImpresso) {

        html += `
            <span class="detalhe-badge ok">
                BIM
            </span>
        `;
    }

    if (item.etiquetaOk) {

        html += `
            <span class="detalhe-badge info">
                ETIQUETA
            </span>
        `;
    }

    if (item.revisado) {

        html += `
            <span class="detalhe-badge ok">
                REVISADO
            </span>
        `;
    }

    if (!html) {

        html = `
            <span class="detalhe-badge pendente">
                PENDENTE
            </span>
        `;
    }

    return html;
}

// ============================================================================
// FILTRO
// ============================================================================

window.filtrarRegistros = function () {

    const termo = document
        .getElementById("inputBuscaGeral")
        .value
        .trim()
        .toLowerCase();

    if (!termo) {

        listaFiltrada = [...listaCompleta];

        renderizarTabela();
        return;
    }

    listaFiltrada = listaCompleta.filter((item) => {

        return (

            (item.rede || "")
                .toLowerCase()
                .includes(termo)

            ||

            (item.nomeEmpresa || "")
                .toLowerCase()
                .includes(termo)

        );
    });

    renderizarTabela();
};

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

window.toggleMenuExportar = function () {

    const menu =
        document.getElementById(
            "dropdownExportar"
        );

    if (!menu) return;

    menu.classList.toggle("escondido");
};

window.exportarRelatorio = function (tipo) {

    mostrarToast(
        `Exportação ${tipo} iniciada.`,
        "sucesso"
    );

    document
        .getElementById("dropdownExportar")
        ?.classList.add("escondido");
};

// ============================================================================
// MODAL ORIGINAL
// ============================================================================

window.abrirModalRegistro = async function () {

    const modal =
        document.getElementById(
            "modalCadastroRegistro"
        );

    if (!modal) {

        console.error(
            "Modal original não encontrado."
        );

        mostrarToast(
            "Modal de cadastro não encontrado.",
            "erro"
        );

        return;
    }

    modal.classList.remove("escondido");
};

// ============================================================================
// EDIÇÃO
// ============================================================================

window.editarRegistro = async function (id) {

    try {

        const doc = await db
            .collection(NOME_DA_COLECAO)
            .doc(id)
            .get();

        if (!doc.exists) {

            mostrarToast(
                "Registro não encontrado.",
                "erro"
            );

            return;
        }

        const item = doc.data();

        if (
            typeof preencherFormularioEdicao ===
            "function"
        ) {

            preencherFormularioEdicao(
                item,
                id
            );

            return;
        }

        console.warn(
            "Função preencherFormularioEdicao inexistente."
        );

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Erro ao editar registro.",
            "erro"
        );
    }
};

// ============================================================================
// EXCLUSÃO
// ============================================================================

window.excluirRegistro = async function (id) {

    const confirmar = confirm(
        "Deseja realmente excluir este registro?"
    );

    if (!confirmar) return;

    try {

        await db
            .collection(NOME_DA_COLECAO)
            .doc(id)
            .delete();

        mostrarToast(
            "Registro excluído com sucesso.",
            "sucesso"
        );

    } catch (error) {

        console.error(error);

        mostrarToast(
            "Erro ao excluir registro.",
            "erro"
        );
    }
};

// ============================================================================
// HELPERS
// ============================================================================

function formatarData(data) {

    if (!data) return "-";

    try {

        if (
            typeof data.toDate === "function"
        ) {

            data = data.toDate();
        }

        return new Date(data)
            .toLocaleDateString("pt-BR");

    } catch {

        return "-";
    }
}

function obterTimestamp(valor) {

    if (!valor) return 0;

    try {

        if (
            typeof valor.toDate === "function"
        ) {

            return valor
                .toDate()
                .getTime();
        }

        return new Date(valor).getTime();

    } catch {

        return 0;
    }
}

// ============================================================================
// DROPDOWN PERFIL
// ============================================================================

window.toggleDropdownPerfil = function (event) {

    event.stopPropagation();

    const dropdown =
        document.getElementById(
            "dropdownPerfilLocal"
        );

    if (!dropdown) return;

    dropdown.classList.toggle(
        "escondido"
    );
};

// ============================================================================
// LISTENERS GLOBAIS
// ============================================================================

function configurarListenersGlobais() {

    document.addEventListener("click", (event) => {

        const dropdownPerfil =
            document.getElementById(
                "dropdownPerfilLocal"
            );

        if (
            dropdownPerfil &&
            !event.target.closest(
                ".user-profile"
            )
        ) {

            dropdownPerfil.classList.add(
                "escondido"
            );
        }

        const dropdownExportar =
            document.getElementById(
                "dropdownExportar"
            );

        if (
            dropdownExportar &&
            !event.target.closest(
                "#boxExportar"
            )
        ) {

            dropdownExportar.classList.add(
                "escondido"
            );
        }
    });
}

// ============================================================================
// TOAST FALLBACK
// ============================================================================

function mostrarToast(
    mensagem,
    tipo = "sucesso"
) {

    if (
        typeof window.mostrarToastGlobal ===
        "function"
    ) {

        window.mostrarToastGlobal(
            mensagem,
            tipo
        );

        return;
    }

    console.log(
        `[${tipo}] ${mensagem}`
    );
}