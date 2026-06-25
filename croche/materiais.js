// ============================================================================
// MODULO: PONTO DE OURO (CROCHE)
// ARQUIVO: materiais.js
// ============================================================================

let listaMateriais = [];
let unsubscribeMateriais = null;
let unsubscribeCategorias = null;
let unsubscribeUnidades = null;
let unsubscribeMarcas = null;
let unsubscribeLojas = null;

let listaCategoriasUsuario = [];
let listaUnidadesUsuario = [];
let listaMarcasUsuario = [];
let listaLojasUsuario = [];

let fotoMaterialPendente = null;

const CATEGORIAS_PADRAO = [
    'Fio/Linha',
    'Enchimento',
    'Acessório',
    'Embalagem',
    'Outros'
];

const UNIDADES_PADRAO = [
    { value: 'g', label: 'Gramas (g)' },
    { value: 'm', label: 'Metros (m)' },
    { value: 'cm', label: 'Centímetros (cm)' },
    { value: 'un', label: 'Unidades (un)' },
    { value: 'rol', label: 'Rolos (rol)' },
    { value: 'pacote', label: 'Pacotes' }
];

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let filtroBusca = sessionStorage.getItem('materiaisFiltroBusca') || "";
let filtroCategoria = sessionStorage.getItem('materiaisFiltroCategoria') || "";
let sortCol = sessionStorage.getItem('materiaisSortCol') || 'nome';
let sortAsc = sessionStorage.getItem('materiaisSortAsc') === 'false' ? false : true;

let materialAcaoAtivoId = null;

window.sair = function () {

    firebase.auth().signOut().then(() => {

        sessionStorage.clear();
        window.location.replace('../index.html');
    });
};

// ============================================================================
// CALLBACK PRINCIPAL
// ============================================================================

window.posAuthCallback = async function () {

    document.getElementById("corpoPagina").style.display = "";

    garantirToast();
    preencherDadosUsuario();
    restaurarEstadoFiltros();

    iniciarListenerMateriais();
    iniciarListenerCategorias();
    iniciarListenerUnidades();
    iniciarListenerMarcas();
    iniciarListenerLojas();
    iniciarMonitoramentoBalao();
};

// ============================================================================
// USUARIO
// ============================================================================

function preencherDadosUsuario() {

    if (!dadosUsuarioLogado?.nome) return;

    const nome = dadosUsuarioLogado.nome;

    const nomeEl = document.getElementById('nomeUsuario');
    const iniciaisEl = document.getElementById('iniciaisUsuario');

    if (nomeEl) {
        nomeEl.innerText = nome;
    }

    if (iniciaisEl) {
        iniciaisEl.innerText = nome.substring(0, 2).toUpperCase();
    }
}

// ============================================================================
// FILTROS / ESTADO
// ============================================================================

function restaurarEstadoFiltros() {

    const inputBusca = document.getElementById('filtroTexto');
    const selectCategoria = document.getElementById('filtroCategoria');

    if (inputBusca) {
        inputBusca.value = filtroBusca;
    }

    if (selectCategoria) {
        selectCategoria.value = filtroCategoria;
    }

    atualizarSelectOrdenacaoMobile();
}

function salvarEstadoFiltros() {

    sessionStorage.setItem('materiaisFiltroBusca', filtroBusca);
    sessionStorage.setItem('materiaisFiltroCategoria', filtroCategoria);
    sessionStorage.setItem('materiaisSortCol', sortCol);
    sessionStorage.setItem('materiaisSortAsc', sortAsc);
}

// ============================================================================
// TOAST
// ============================================================================

function garantirToast() {

    if (typeof window.mostrarToast === 'function') return;

    window.mostrarToast = function (mensagem, tipo = 'sucesso') {

        let container = document.getElementById('toastContainer');

        if (!container) {

            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';

            document.body.appendChild(container);
        }

        const toast = document.createElement('div');

        toast.className = 'toast';

        toast.style.borderLeftColor =
            tipo === 'erro'
                ? '#ef4444'
                : '#10b981';

        toast.innerHTML = `
            <span class="material-symbols-rounded"
                  style="color:${tipo === 'erro' ? '#ef4444' : '#10b981'};">
                ${tipo === 'erro' ? 'error' : 'check_circle'}
            </span>

            <strong>${mensagem}</strong>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.remove(), 4000);
    };
}

// ============================================================================
// UTILITARIOS
// ============================================================================

function converterParaData(valor) {

    if (!valor) return null;

    if (typeof valor.toDate === 'function') {
        return valor.toDate();
    }

    if (typeof valor.seconds === 'number') {
        return new Date(valor.seconds * 1000);
    }

    const tentativa = new Date(valor);

    return Number.isNaN(tentativa.getTime())
        ? null
        : tentativa;
}

function paraMillis(valor) {

    const data = converterParaData(valor);

    return data
        ? data.getTime()
        : 0;
}

function formatarDataTela(valor) {

    const data = converterParaData(valor);

    return data
        ? data.toLocaleDateString('pt-BR')
        : '-';
}

function formataMoeda(valor) {

    const numero = Number(valor || 0);

    return numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

window.aplicarMascaraMoeda = function(input) {

    let v = input.value.replace(/\D/g, '');

    if (v === "") {
        input.value = "";
        return;
    }

    v = (v / 100).toFixed(2) + '';

    v = v.replace('.', ',');
    v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
    v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");

    input.value = v;
};

function desformatarMoeda(valorStr) {

    if (!valorStr) return 0;

    return parseFloat(
        valorStr
            .replace(/\./g, '')
            .replace(',', '.')
    );
}

// ============================================================================
// FIRESTORE
// ============================================================================

function iniciarListenerMateriais() {

    if (unsubscribeMateriais) {
        unsubscribeMateriais();
    }

    unsubscribeMateriais = db.collection("croche_materiais")
        .where("usuarioId", "==", usuarioLogado.uid)
        .onSnapshot((snap) => {

            listaMateriais = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            renderizarTabelaMateriais();

        }, (error) => {

            console.error("Erro ao carregar materiais:", error);

            mostrarToast(
                "Erro ao carregar materiais.",
                "erro"
            );
        });
}

function obterListaCategoriasUnificada() {

    const map = new Map();

    CATEGORIAS_PADRAO.forEach((nome) => {
        map.set(nome.toLowerCase(), nome);
    });

    listaCategoriasUsuario.forEach((item) => {

        const nome = String(item.nome || '').trim();

        if (!nome) return;

        const chave = nome.toLowerCase();

        if (!map.has(chave)) {
            map.set(chave, nome);
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
    );
}

function obterListaUnidadesUnificada() {

    const map = new Map();

    UNIDADES_PADRAO.forEach((item) => {
        map.set(item.value.toLowerCase(), item);
    });

    listaUnidadesUsuario.forEach((item) => {

        const nome = String(item.nome || '').trim();

        if (!nome) return;

        const chave = nome.toLowerCase();

        if (!map.has(chave)) {
            map.set(chave, { value: nome, label: nome });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
    );
}

function preencherSelectCategorias(select, valorSelecionado) {

    if (!select) return;

    const valorAtual = valorSelecionado !== undefined
        ? valorSelecionado
        : select.value;

    const categorias = obterListaCategoriasUnificada();
    let opcoes = [...categorias];
    const ehFiltro = select.id === 'filtroCategoria';

    if (
        !ehFiltro &&
        valorAtual &&
        !opcoes.some((nome) => nome === valorAtual)
    ) {
        opcoes.push(valorAtual);
        opcoes.sort((a, b) =>
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }

    select.innerHTML = ehFiltro
        ? '<option value="">Todas Categorias</option>'
        : '<option value="">Selecione...</option>';

    opcoes.forEach((nome) => {
        select.innerHTML += `<option value="${nome}">${nome}</option>`;
    });

    if (valorAtual && opcoes.some((nome) => nome === valorAtual)) {
        select.value = valorAtual;
    } else if (ehFiltro) {
        select.value = valorAtual || '';
    } else {
        select.value = '';
    }
}

function preencherSelectUnidades(select, valorSelecionado) {

    if (!select) return;

    const valorAtual = valorSelecionado !== undefined
        ? valorSelecionado
        : select.value;

    const unidades = obterListaUnidadesUnificada();
    let opcoes = [...unidades];

    if (
        valorAtual &&
        !opcoes.some((item) => item.value === valorAtual)
    ) {
        opcoes.push({ value: valorAtual, label: valorAtual });
        opcoes.sort((a, b) =>
            a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
        );
    }

    select.innerHTML = '';

    opcoes.forEach((item) => {
        select.innerHTML += `<option value="${item.value}">${item.label}</option>`;
    });

    if (
        valorAtual &&
        opcoes.some((item) => item.value === valorAtual)
    ) {
        select.value = valorAtual;
    } else if (opcoes.length) {
        select.value = opcoes[0].value;
    }
}

function atualizarSelectsCategorias(valorMatCategoria, valorFiltroCategoria) {

    preencherSelectCategorias(
        document.getElementById('matCategoria'),
        valorMatCategoria
    );

    preencherSelectCategorias(
        document.getElementById('filtroCategoria'),
        valorFiltroCategoria !== undefined
            ? valorFiltroCategoria
            : filtroCategoria
    );
}

function atualizarSelectUnidades(valorUnidade) {

    preencherSelectUnidades(
        document.getElementById('matUnidade'),
        valorUnidade
    );
}

function preencherSelectMarcas(select, valorSelecionado) {

    if (!select) return;

    const valorAtual = valorSelecionado !== undefined
        ? valorSelecionado
        : select.value;

    const marcas = listaMarcasUsuario
        .map((item) => String(item.nome || '').trim())
        .filter(Boolean)
        .sort((a, b) =>
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );

    let opcoes = [...marcas];

    if (
        valorAtual &&
        !opcoes.some((nome) => nome === valorAtual)
    ) {
        opcoes.push(valorAtual);
        opcoes.sort((a, b) =>
            a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
        );
    }

    select.innerHTML = '<option value="">Selecione...</option>';

    opcoes.forEach((nome) => {
        select.innerHTML += `<option value="${nome}">${nome}</option>`;
    });

    if (valorAtual && opcoes.some((nome) => nome === valorAtual)) {
        select.value = valorAtual;
    } else {
        select.value = '';
    }
}

function atualizarSelectMarcas(valorMarca) {

    preencherSelectMarcas(
        document.getElementById('matMarca'),
        valorMarca || ''
    );
}

function preencherSelectLojas(select, valorSelecionado) {

    if (!select) return;

    const valorAtual = valorSelecionado !== undefined
        ? valorSelecionado
        : select.value;

    const lojas = [...listaLojasUsuario].sort((a, b) =>
        String(a.nome || '').localeCompare(
            String(b.nome || ''),
            'pt-BR',
            { sensitivity: 'base' }
        )
    );

    select.innerHTML = '<option value="">Selecione...</option>';

    lojas.forEach((loja) => {
        select.innerHTML += `<option value="${loja.id}">${loja.nome || '-'}</option>`;
    });

    if (valorAtual && lojas.some((loja) => loja.id === valorAtual)) {
        select.value = valorAtual;
    } else {
        select.value = '';
    }
}

function atualizarSelectLojas(valorLojaId) {

    preencherSelectLojas(
        document.getElementById('entradaLoja'),
        valorLojaId || ''
    );
}

function obterNomeLojaPorId(lojaId) {

    const loja = listaLojasUsuario.find((item) => item.id === lojaId);

    return loja ? (loja.nome || '') : '';
}

function iniciarListenerMarcas() {

    if (unsubscribeMarcas) {
        unsubscribeMarcas();
    }

    unsubscribeMarcas = db.collection('croche_marcas')
        .where('usuarioId', '==', usuarioLogado.uid)
        .onSnapshot((snap) => {

            listaMarcasUsuario = snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            const marcaSelect = document.getElementById('matMarca');
            const valorMarca = marcaSelect ? marcaSelect.value : '';

            atualizarSelectMarcas(valorMarca);

        }, (error) => {
            console.error('Erro ao carregar marcas:', error);
        });
}

function iniciarListenerLojas() {

    if (unsubscribeLojas) {
        unsubscribeLojas();
    }

    unsubscribeLojas = db.collection('croche_lojas')
        .where('usuarioId', '==', usuarioLogado.uid)
        .onSnapshot((snap) => {

            listaLojasUsuario = snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            const lojaSelect = document.getElementById('entradaLoja');
            const valorLoja = lojaSelect ? lojaSelect.value : '';

            atualizarSelectLojas(valorLoja);

        }, (error) => {
            console.error('Erro ao carregar lojas:', error);
        });
}

window.abrirModalNovaMarca = function () {

    const form = document.getElementById('formNovaMarca');

    if (form) {
        form.reset();
    }

    document.getElementById('modalNovaMarca')
        .classList.remove('escondido');
};

window.abrirModalNovaLoja = function () {

    const form = document.getElementById('formNovaLoja');

    if (form) {
        form.reset();
    }

    document.getElementById('modalNovaLoja')
        .classList.remove('escondido');
};

window.salvarNovaMarca = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarNovaMarca');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const nome = document.getElementById('novaMarcaNome').value.trim();

    if (!nome) {

        mostrarToast('Informe o nome da marca.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    const jaExiste = listaMarcasUsuario.some(
        (item) => String(item.nome || '').toLowerCase() === nome.toLowerCase()
    );

    if (jaExiste) {

        mostrarToast('Esta marca já existe.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    try {

        await db.collection('croche_marcas').add({
            nome,
            usuarioId: usuarioLogado.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('modalNovaMarca')
            .classList.add('escondido');

        const marcaSelect = document.getElementById('matMarca');

        if (marcaSelect) {
            marcaSelect.value = nome;
        }

        mostrarToast('Marca cadastrada!', 'sucesso');

    } catch (error) {

        console.error('Erro ao salvar marca:', error);
        mostrarToast('Erro ao salvar marca.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

window.salvarNovaLoja = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarNovaLoja');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const nome = document.getElementById('novaLojaNome').value.trim();
    const endereco = document.getElementById('novaLojaEndereco').value.trim();

    if (!nome) {

        mostrarToast('Informe o nome da loja.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    const jaExiste = listaLojasUsuario.some(
        (item) => String(item.nome || '').toLowerCase() === nome.toLowerCase()
    );

    if (jaExiste) {

        mostrarToast('Esta loja já existe.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    try {

        const docRef = await db.collection('croche_lojas').add({
            nome,
            endereco,
            usuarioId: usuarioLogado.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('modalNovaLoja')
            .classList.add('escondido');

        const lojaSelect = document.getElementById('entradaLoja');

        if (lojaSelect) {
            lojaSelect.value = docRef.id;
        }

        mostrarToast('Loja cadastrada!', 'sucesso');

    } catch (error) {

        console.error('Erro ao salvar loja:', error);
        mostrarToast('Erro ao salvar loja.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

function resetarPreviewFotoMaterial() {

    fotoMaterialPendente = null;

    const imgPreview = document.getElementById('matImgPreview');
    const iconPlaceholder = document.getElementById('matIconPhotoPlaceholder');
    const areaUpload = document.getElementById('matAreaPreviewImagem');
    const fileInput = document.getElementById('matFileInputImagem');

    if (fileInput) {
        fileInput.value = '';
    }

    if (imgPreview) {
        imgPreview.src = '';
        imgPreview.classList.add('escondido');
    }

    if (iconPlaceholder) {
        iconPlaceholder.classList.remove('escondido');
    }

    if (areaUpload) {
        areaUpload.classList.remove('upload-processando');
    }
}

function aplicarPreviewFotoMaterial(base64Image) {

    const imgPreview = document.getElementById('matImgPreview');
    const iconPlaceholder = document.getElementById('matIconPhotoPlaceholder');
    const areaUpload = document.getElementById('matAreaPreviewImagem');

    if (base64Image) {
        imgPreview.src = base64Image;
        imgPreview.classList.remove('escondido');
        iconPlaceholder.classList.add('escondido');
    } else {
        imgPreview.src = '';
        imgPreview.classList.add('escondido');
        iconPlaceholder.classList.remove('escondido');
    }

    if (areaUpload) {
        areaUpload.classList.remove('upload-processando');
    }
}

window.focarFileInputMaterial = function () {
    document.getElementById('matFileInputImagem').click();
};

window.previewFotoMaterial = async function (input) {

    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const areaUpload = document.getElementById('matAreaPreviewImagem');

    if (areaUpload) {
        areaUpload.classList.add('upload-processando');
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        const img = new Image();

        img.onload = function () {

            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const base64Image = canvas.toDataURL('image/jpeg', 0.7);

            fotoMaterialPendente = base64Image;
            aplicarPreviewFotoMaterial(base64Image);
        };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
};

function iniciarListenerCategorias() {

    if (unsubscribeCategorias) {
        unsubscribeCategorias();
    }

    unsubscribeCategorias = db.collection('croche_categorias')
        .where('usuarioId', '==', usuarioLogado.uid)
        .onSnapshot((snap) => {

            listaCategoriasUsuario = snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            const matSelect = document.getElementById('matCategoria');
            const valorMat = matSelect ? matSelect.value : '';

            atualizarSelectsCategorias(valorMat);

        }, (error) => {
            console.error('Erro ao carregar categorias:', error);
        });
}

function iniciarListenerUnidades() {

    if (unsubscribeUnidades) {
        unsubscribeUnidades();
    }

    unsubscribeUnidades = db.collection('croche_unidades')
        .where('usuarioId', '==', usuarioLogado.uid)
        .onSnapshot((snap) => {

            listaUnidadesUsuario = snap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
            }));

            const unidadeSelect = document.getElementById('matUnidade');
            const valorUnidade = unidadeSelect ? unidadeSelect.value : 'g';

            atualizarSelectUnidades(valorUnidade);

        }, (error) => {
            console.error('Erro ao carregar unidades:', error);
        });
}

window.abrirModalNovaCategoria = function () {

    const form = document.getElementById('formNovaCategoria');

    if (form) {
        form.reset();
    }

    document.getElementById('modalNovaCategoria')
        .classList.remove('escondido');
};

window.abrirModalNovaUnidade = function () {

    const form = document.getElementById('formNovaUnidade');

    if (form) {
        form.reset();
    }

    document.getElementById('modalNovaUnidade')
        .classList.remove('escondido');
};

window.salvarNovaCategoria = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarNovaCategoria');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const nome = document.getElementById('novaCategoriaNome').value.trim();

    if (!nome) {

        mostrarToast('Informe o nome da categoria.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    const jaExiste = obterListaCategoriasUnificada().some(
        (item) => item.toLowerCase() === nome.toLowerCase()
    );

    if (jaExiste) {

        mostrarToast('Esta categoria já existe.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    try {

        await db.collection('croche_categorias').add({
            nome,
            usuarioId: usuarioLogado.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('modalNovaCategoria')
            .classList.add('escondido');

        const matSelect = document.getElementById('matCategoria');

        if (matSelect) {
            matSelect.value = nome;
        }

        mostrarToast('Categoria cadastrada!', 'sucesso');

    } catch (error) {

        console.error('Erro ao salvar categoria:', error);
        mostrarToast('Erro ao salvar categoria.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

window.salvarNovaUnidade = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarNovaUnidade');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const nome = document.getElementById('novaUnidadeNome').value.trim();

    if (!nome) {

        mostrarToast('Informe o nome da medida.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    const jaExiste = obterListaUnidadesUnificada().some(
        (item) => item.value.toLowerCase() === nome.toLowerCase()
    );

    if (jaExiste) {

        mostrarToast('Esta medida já existe.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    try {

        await db.collection('croche_unidades').add({
            nome,
            usuarioId: usuarioLogado.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('modalNovaUnidade')
            .classList.add('escondido');

        const unidadeSelect = document.getElementById('matUnidade');

        if (unidadeSelect) {
            unidadeSelect.value = nome;
        }

        mostrarToast('Medida cadastrada!', 'sucesso');

    } catch (error) {

        console.error('Erro ao salvar unidade:', error);
        mostrarToast('Erro ao salvar medida.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

// ============================================================================
// FILTROS
// ============================================================================

window.filtrarListaMateriais = function () {

    filtroBusca = document.getElementById('filtroTexto')
        .value
        .trim()
        .toLowerCase();

    filtroCategoria = document.getElementById('filtroCategoria')
        .value;

    salvarEstadoFiltros();

    renderizarTabelaMateriais();
};

// ============================================================================
// ORDENACAO
// ============================================================================

window.ordenarMateriais = function (coluna) {

    if (sortCol === coluna) {
        sortAsc = !sortAsc;
    } else {
        sortCol = coluna;
        sortAsc = true;
    }

    salvarEstadoFiltros();
    atualizarSelectOrdenacaoMobile();

    renderizarTabelaMateriais();
};

window.aplicarOrdenacaoMobile = function () {

    const select = document.getElementById('filtroOrdenacaoMobile');

    if (!select) return;

    const valor = select.value;
    const separador = valor.lastIndexOf('-');
    const coluna = valor.slice(0, separador);
    const direcao = valor.slice(separador + 1);

    sortCol = coluna;
    sortAsc = direcao !== 'desc';

    salvarEstadoFiltros();

    renderizarTabelaMateriais();
};

function atualizarSelectOrdenacaoMobile() {

    const select = document.getElementById('filtroOrdenacaoMobile');

    if (!select) return;

    const valor = `${sortCol}-${sortAsc ? 'asc' : 'desc'}`;

    if (select.querySelector(`option[value="${valor}"]`)) {
        select.value = valor;
    }
}

function ehViewportMobileMateriais() {

    return window.matchMedia('(max-width: 768px)').matches;
}

function obterMateriaisFiltradosOrdenados() {

    const filtrados = listaMateriais.filter((mat) => {

        const nome = String(mat.nome || '')
            .toLowerCase();

        const categoria = String(mat.categoria || '');

        const matchBusca = nome.includes(filtroBusca);

        const matchCategoria =
            !filtroCategoria ||
            categoria === filtroCategoria;

        return matchBusca && matchCategoria;
    });

    filtrados.sort((a, b) => {

        let vA = a[sortCol] || '';
        let vB = b[sortCol] || '';

        if (sortCol === 'estoque') {

            vA = Number(a.qtdRendimento || 0);
            vB = Number(b.qtdRendimento || 0);

        } else if (
            sortCol === 'ultimaEntrada' ||
            sortCol === 'ultimaUtilizacao'
        ) {

            vA = paraMillis(a[sortCol]);
            vB = paraMillis(b[sortCol]);
        }

        if (
            typeof vA === 'string' ||
            typeof vB === 'string'
        ) {

            const comparacao = String(vA).localeCompare(
                String(vB),
                'pt-BR',
                { sensitivity: 'base' }
            );

            return sortAsc
                ? comparacao
                : -comparacao;
        }

        if (vA < vB) return sortAsc ? -1 : 1;
        if (vA > vB) return sortAsc ? 1 : -1;

        return 0;
    });

    return filtrados;
}

function renderizarCardsMobileMateriais(filtrados) {

    const container = document.getElementById('listaMateriaisMobile');

    if (!container) return;

    if (filtrados.length === 0) {

        container.innerHTML = `
            <div class="material-card-mobile-vazio">
                Nenhum material encontrado.
            </div>
        `;

        return;
    }

    container.innerHTML = filtrados.map((mat) => `
        <article class="material-card-mobile">

            <h4 class="material-card-mobile-nome">
                ${mat.nome || '-'}
            </h4>

            <dl class="material-card-mobile-dados">

                <div class="material-card-mobile-linha">
                    <dt>Categoria</dt>
                    <dd>${mat.categoria || '-'}</dd>
                </div>

                <div class="material-card-mobile-linha">
                    <dt>Estoque</dt>
                    <dd>
                        <span class="estoque-chip">
                            ${mat.qtdRendimento || 0}
                        </span>
                    </dd>
                </div>

                <div class="material-card-mobile-linha">
                    <dt>Custo</dt>
                    <dd>${formataMoeda(mat.preco || 0)}</dd>
                </div>

                <div class="material-card-mobile-linha">
                    <dt>Última Utilização</dt>
                    <dd>${formatarDataTela(mat.ultimaUtilizacao)}</dd>
                </div>

            </dl>

            <button
                type="button"
                class="material-card-mobile-acoes acao-principal"
                onclick="toggleMenuAcoes('${mat.id}', event)"
                aria-label="Abrir menu de ações do material">

                <span class="material-symbols-rounded">more_vert</span>
                Ações

            </button>

        </article>
    `).join('');
}

// ============================================================================
// RENDERIZACAO
// ============================================================================

function renderizarTabelaMateriais() {

    const tbody = document.getElementById('tabelaMateriaisBody');

    if (!tbody) return;

    const filtrados = obterMateriaisFiltradosOrdenados();

    renderizarCardsMobileMateriais(filtrados);

    if (filtrados.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    style="text-align:center;padding:40px;color:var(--cor-texto);">

                    Nenhum material encontrado.

                </td>
            </tr>
        `;

        return;
    }

    tbody.innerHTML = filtrados.map((mat) => {

        const linhaMobile = ehViewportMobileMateriais()
            ? ' material-linha-mobile'
            : '';

        const toqueLinhaMobile = ehViewportMobileMateriais()
            ? ` onclick="abrirMenuAcoesLinhaMaterial('${mat.id}', event)"`
            : '';

        return `
            <tr class="material-linha${linhaMobile}"
                data-material-id="${mat.id}"${toqueLinhaMobile}>

                <td>
                    <span class="material-nome">
                        ${mat.nome || '-'}
                    </span>
                </td>

                <td>
                    ${mat.categoria || '-'}
                </td>

                <td style="text-align:right;">
                    ${formataMoeda(mat.preco || 0)}
                </td>

                <td style="text-align:right;">

                    <span class="status-badge badge-aprovada estoque-chip">
                        ${mat.qtdRendimento || 0}
                    </span>

                </td>

                <td class="col-ultima-entrada">
                    ${formatarDataTela(mat.ultimaEntrada)}
                </td>

                <td class="col-ultima-utilizacao">
                    ${formatarDataTela(mat.ultimaUtilizacao)}
                </td>

                <td class="acoes-celula col-acoes menu-pontinhos-wrapper"
                    onclick="event.stopPropagation()">

                    <button
                        type="button"
                        class="btn-icon acao-principal"
                        onclick="toggleMenuAcoes('${mat.id}', event)"
                        aria-label="Abrir menu de ações">

                        <span class="material-symbols-rounded">
                            more_vert
                        </span>

                    </button>

                </td>

            </tr>
        `;

    }).join('');
}

// ============================================================================
// MENU ACOES
// ============================================================================

window.abrirMenuAcoesLinhaMaterial = function (id, event) {

    if (!ehViewportMobileMateriais()) return;

    event.stopPropagation();

    toggleMenuAcoes(id, event);
};

window.toggleMenuAcoes = function (id, event) {

    event.stopPropagation();

    const menu = document.getElementById('menuAcoesMateriaisGlobal');

    if (!menu) return;

    const ancora =
        event.currentTarget ||
        event.target.closest('button') ||
        event.target.closest('tr[data-material-id]');

    const jaAberto =
        menu.classList.contains('show-menu-material') &&
        materialAcaoAtivoId === id;

    fecharTodosMenusAcoes();

    if (jaAberto) return;

    materialAcaoAtivoId = id;

    menu.classList.add('show-menu-material');

    posicionarMenuAcoes(menu, ancora);

    menu.setAttribute('aria-hidden', 'false');
};

function fecharTodosMenusAcoes() {

    const menu = document.getElementById('menuAcoesMateriaisGlobal');

    materialAcaoAtivoId = null;

    if (!menu) return;

    menu.classList.remove('show-menu-material');
    menu.classList.remove('open-up');

    menu.style.maxHeight = '';
    menu.style.left = '';
    menu.style.top = '';
    menu.style.bottom = '';
    menu.style.visibility = '';
    menu.style.display = '';

    menu.setAttribute('aria-hidden', 'true');
}

window.fecharTodosMenusAcoes = fecharTodosMenusAcoes;

// ============================================================================
// POSICIONAMENTO MENU
// ============================================================================

function posicionarMenuAcoes(menu, ancora) {

    if (!ancora || !menu) return;

    const margem = 8;
    const larguraMenu = 220;
    const rectAncora = ancora.getBoundingClientRect();
    const ancoraLinha = ancora.matches('tr[data-material-id]');

    menu.style.width = `${larguraMenu}px`;
    menu.style.maxWidth = `${larguraMenu}px`;

    let left;

    if (ancoraLinha) {
        left = (window.innerWidth - larguraMenu) / 2;
    } else {
        left = rectAncora.right - larguraMenu;
    }

    if (left < margem) {
        left = margem;
    }

    if (left + larguraMenu > window.innerWidth - margem) {
        left = window.innerWidth - larguraMenu - margem;
    }

    let top = rectAncora.bottom + margem;
    const alturaEstimada = 210;
    const abreParaCima =
        top + alturaEstimada > window.innerHeight - margem &&
        rectAncora.top > alturaEstimada + margem;

    if (abreParaCima) {
        top = rectAncora.top - alturaEstimada - margem;
    }

    menu.classList.toggle('open-up', abreParaCima);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.style.bottom = 'auto';
    menu.style.right = 'auto';
    menu.style.visibility = 'visible';
    menu.style.display = 'block';
    menu.style.maxHeight = '240px';
}

// ============================================================================
// MODAIS
// ============================================================================

window.abrirModalMaterial = function () {

    document.getElementById('formMaterial').reset();

    document.getElementById('materialId').value = "";

    document.getElementById('tituloModalMaterial').innerText =
        "Cadastrar Material";

    resetarPreviewFotoMaterial();
    atualizarSelectUnidades('g');
    atualizarSelectMarcas('');

    document.getElementById('modalMaterial')
        .classList.remove('escondido');
};

window.abrirModalEntrada = function (id) {

    if (!id) {
        mostrarToast('Material não identificado.', 'erro');
        return;
    }

    document.getElementById('entradaMatId').value = id;
    document.getElementById('qtdEntrada').value = "";
    document.getElementById('precoUnitarioEntrada').value = "";
    document.getElementById('valorTotalEntrada').value = "";
    atualizarSelectLojas('');

    document.getElementById('modalEntrada')
        .classList.remove('escondido');
};

window.calcularValorTotalEntrada = function () {

    const qtdRaw = document.getElementById('qtdEntrada').value;
    const qtd = parseFloat(String(qtdRaw).replace(',', '.'));
    const precoUnitario = desformatarMoeda(
        document.getElementById('precoUnitarioEntrada').value
    );
    const campoTotal = document.getElementById('valorTotalEntrada');

    if (!Number.isFinite(qtd) || qtd <= 0 || !Number.isFinite(precoUnitario)) {
        campoTotal.value = '';
        return;
    }

    const total = qtd * precoUnitario;
    campoTotal.value = total.toFixed(2).replace('.', ',');
};

function formatarMoedaInput(valor) {

    const numero = Number(valor || 0);

    return numero.toFixed(2).replace('.', ',');
}

window.salvarMaterial = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarMaterial');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const materialId = document.getElementById('materialId').value.trim();
    const nome = document.getElementById('matNome').value.trim();
    const categoria = document.getElementById('matCategoria').value;
    const marca = document.getElementById('matMarca').value || '';
    const unidadeRendimento = document.getElementById('matUnidade').value;

    if (!nome || !categoria) {

        mostrarToast('Preencha os campos obrigatórios.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    try {

        const dados = {
            nome,
            categoria,
            marca,
            unidadeRendimento,
            usuarioId: usuarioLogado.uid,
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (fotoMaterialPendente) {
            dados.fotoMaterial = fotoMaterialPendente;
        }

        if (materialId) {

            await db.collection('croche_materiais')
                .doc(materialId)
                .update(dados);

            mostrarToast('Material atualizado com sucesso!', 'sucesso');

        } else {

            dados.qtdRendimento = 0;
            dados.preco = 0;
            dados.criadoEm = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('croche_materiais').add(dados);

            mostrarToast('Material cadastrado com sucesso!', 'sucesso');
        }

        fecharModalBase();

    } catch (error) {

        console.error('Erro ao salvar material:', error);

        mostrarToast('Erro ao salvar material.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

window.abrirModalEditarMaterial = function (id) {

    if (!id) {
        mostrarToast('Material não identificado.', 'erro');
        return;
    }

    const mat = listaMateriais.find((item) => item.id === id);

    if (!mat) {
        mostrarToast('Material não encontrado.', 'erro');
        return;
    }

    document.getElementById('formMaterial').reset();
    document.getElementById('materialId').value = id;
    document.getElementById('matNome').value = mat.nome || '';
    atualizarSelectsCategorias(mat.categoria || '', filtroCategoria);
    atualizarSelectUnidades(mat.unidadeRendimento || 'un');
    atualizarSelectMarcas(mat.marca || '');

    fotoMaterialPendente = null;
    aplicarPreviewFotoMaterial(mat.fotoMaterial || '');

    const fileInput = document.getElementById('matFileInputImagem');
    if (fileInput) {
        fileInput.value = '';
    }

    document.getElementById('tituloModalMaterial').innerText = 'Editar Material';

    document.getElementById('modalMaterial')
        .classList.remove('escondido');
};

window.excluirMaterial = async function (id) {

    if (!id) {
        mostrarToast('Material não identificado.', 'erro');
        return;
    }

    if (!confirm('Deseja excluir este material?')) return;

    try {

        await db.collection('croche_materiais').doc(id).delete();

        mostrarToast('Material excluído.', 'sucesso');

    } catch (error) {

        console.error('Erro ao excluir material:', error);

        mostrarToast('Erro ao excluir material.', 'erro');
    }
};

window.salvarEntrada = async function (event) {

    event.preventDefault();

    const btn = document.getElementById('btnSalvarEntrada');
    const txtOrig = btn.innerHTML;

    btn.innerHTML = 'Salvando...';
    btn.disabled = true;

    const id = document.getElementById('entradaMatId').value.trim();
    const qtdRaw = document.getElementById('qtdEntrada').value;
    const qtd = parseFloat(String(qtdRaw).replace(',', '.'));
    const precoUnitario = desformatarMoeda(
        document.getElementById('precoUnitarioEntrada').value
    );
    const lojaId = document.getElementById('entradaLoja').value.trim();

    const mat = listaMateriais.find((item) => item.id === id);

    if (!id || !mat) {

        mostrarToast('Material não identificado.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    if (!Number.isFinite(qtd) || qtd <= 0) {

        mostrarToast('Informe uma quantidade válida.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    if (!Number.isFinite(precoUnitario) || precoUnitario <= 0) {

        mostrarToast('Informe um preço unitário válido.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    if (!lojaId) {

        mostrarToast('Selecione a loja.', 'erro');
        btn.innerHTML = txtOrig;
        btn.disabled = false;
        return;
    }

    const valorTotal = qtd * precoUnitario;
    const lojaNome = obterNomeLojaPorId(lojaId);

    try {

        const batch = db.batch();
        const matRef = db.collection('croche_materiais').doc(id);

        batch.update(matRef, {
            qtdRendimento: (Number(mat.qtdRendimento) || 0) + qtd,
            ultimaEntrada: firebase.firestore.FieldValue.serverTimestamp(),
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        const movRef = db.collection('croche_movimentacoes').doc();

        batch.set(movRef, {
            materialId: id,
            materialNome: mat.nome || '',
            tipo: 'entrada',
            quantidade: qtd,
            precoUnitario,
            valorTotal,
            lojaId,
            lojaNome,
            projetoId: '',
            projetoNome: '',
            usuarioId: usuarioLogado.uid,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        mostrarToast('Entrada registrada com sucesso!', 'sucesso');

        fecharModalBase();

    } catch (error) {

        console.error('Erro ao registrar entrada:', error);

        mostrarToast('Erro ao registrar entrada.', 'erro');

    } finally {

        btn.innerHTML = txtOrig;
        btn.disabled = false;
    }
};

window.abrirModalHistorico = async function (id) {

    if (!id) {
        mostrarToast('Material não identificado.', 'erro');
        return;
    }

    const mat = listaMateriais.find((item) => item.id === id);

    if (!mat) {
        mostrarToast('Material não encontrado.', 'erro');
        return;
    }

    const titulo = document.getElementById('tituloModalHistorico');
    const conteudo = document.getElementById('historicoConteudo');

    if (titulo) {
        titulo.innerText = `Histórico — ${mat.nome || 'Material'}`;
    }

    if (conteudo) {
        conteudo.innerHTML = `
            <p style="text-align:center;color:var(--cor-texto);padding:30px 0;">
                Carregando...
            </p>
        `;
    }

    document.getElementById('modalHistorico')
        .classList.remove('escondido');

    try {

        const snap = await db.collection('croche_movimentacoes')
            .where('usuarioId', '==', usuarioLogado.uid)
            .where('materialId', '==', id)
            .get();

        if (!conteudo) return;

        const movimentacoes = snap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => paraMillis(b.criadoEm) - paraMillis(a.criadoEm));

        if (movimentacoes.length === 0) {

            conteudo.innerHTML = `
                <p style="text-align:center;color:var(--cor-texto);padding:30px 0;">
                    Nenhuma movimentação encontrada.
                </p>
            `;

            return;
        }

        conteudo.innerHTML = movimentacoes.map((mov) => {
            const tipo = String(mov.tipo || '').toLowerCase();
            const ehEntrada = tipo === 'entrada';
            const badgeClass = ehEntrada
                ? 'badge-mov-entrada'
                : 'badge-mov-saida';
            const badgeTexto = ehEntrada ? 'Entrada' : 'Saída';

            if (ehEntrada) {

                return `
                    <article class="historico-item">
                        <div class="historico-item-cabecalho">
                            <span class="${badgeClass}">${badgeTexto}</span>
                            <span class="historico-item-data">
                                ${formatarDataTela(mov.criadoEm)}
                            </span>
                        </div>
                        <div class="historico-item-dados">
                            <span><span class="historico-label">Qtd:</span> ${mov.quantidade || 0}</span>
                            <span><span class="historico-label">Loja:</span> ${mov.lojaNome || '-'}</span>
                            <span><span class="historico-label">Unit:</span> ${formataMoeda(mov.precoUnitario || 0)}</span>
                            <span><span class="historico-label">Total:</span> ${formataMoeda(mov.valorTotal || 0)}</span>
                        </div>
                    </article>
                `;
            }

            return `
                <article class="historico-item">
                    <div class="historico-item-cabecalho">
                        <span class="${badgeClass}">${badgeTexto}</span>
                        <span class="historico-item-data">
                            ${formatarDataTela(mov.criadoEm)}
                        </span>
                    </div>
                    <div class="historico-item-dados">
                        <span><span class="historico-label">Qtd:</span> ${mov.quantidade || 0}</span>
                        <span><span class="historico-label">Projeto:</span> ${mov.projetoNome || '-'}</span>
                    </div>
                </article>
            `;

        }).join('');

    } catch (error) {

        console.error('Erro ao carregar histórico:', error);

        if (conteudo) {
            conteudo.innerHTML = `
                <p style="text-align:center;color:#ef4444;padding:30px 0;">
                    Erro ao carregar histórico.
                </p>
            `;
        }

        mostrarToast('Erro ao carregar histórico.', 'erro');
    }
};

window.fecharModalBase = function () {

    document.querySelectorAll('.modal-overlay')
        .forEach((modal) => {

            modal.classList.add('escondido');
        });
};

// ============================================================================
// PERFIL (CORRIGIDO)
// ============================================================================

window.toggleDropdownPerfil = function(event) {

    event.preventDefault();
    event.stopPropagation();

    const menu = document.getElementById('dropdownPerfilLocal');

    if (!menu) return;

    const abrir = menu.classList.contains('escondido');

    document.querySelectorAll('.menu-perfil-flutuante').forEach((m) => {
        m.classList.add('escondido');
    });

    if (abrir) {
        menu.classList.remove('escondido');
    }
};

// ============================================================================
// LISTENERS GLOBAIS
// ============================================================================

document.addEventListener('click', function(event) {

    const clicouNoPerfil = event.target.closest('.user-profile');
    const clicouNoDropdown = event.target.closest('#dropdownPerfilLocal');

    if (!clicouNoPerfil && !clicouNoDropdown) {

        document.querySelectorAll('.menu-perfil-flutuante')
            .forEach((menu) => {
                menu.classList.add('escondido');
            });
    }

    if (
        !event.target.closest('.acao-principal') &&
        !event.target.closest('.dropdown-materiais')
    ) {
        fecharTodosMenusAcoes();
    }

    if (
        event.target &&
        event.target.classList &&
        event.target.classList.contains('modal-overlay')
    ) {
        fecharModalBase();
    }
});

document.addEventListener('keydown', function (event) {

    if (event.key === 'Escape') {

        fecharModalBase();
        fecharTodosMenusAcoes();

        document.querySelectorAll('.menu-perfil-flutuante')
            .forEach((menu) => {
                menu.classList.add('escondido');
            });
    }
});

document.addEventListener('scroll', function () {

    fecharTodosMenusAcoes();

}, true);

window.addEventListener('resize', function () {

    fecharTodosMenusAcoes();
});

// ============================================================================
// MENU DROPDOWN GLOBAL
// ============================================================================

(function iniciarMenuAcoesGlobal() {

    const menu = document.getElementById('menuAcoesMateriaisGlobal');

    if (!menu) return;

    menu.addEventListener('click', (event) => {

        const botao = event.target.closest('[data-acao]');

        if (!botao || !materialAcaoAtivoId) return;

        event.stopPropagation();

        const acao = botao.getAttribute('data-acao');
        const idMaterial = materialAcaoAtivoId;

        fecharTodosMenusAcoes();

        if (typeof window[acao] === 'function') {
            window[acao](idMaterial);
        }
    });
})();

// ============================================================================
// AVISO GLOBAL
// ============================================================================

function iniciarMonitoramentoBalao() {

    db.collection("croche_projetos")
        .where("usuarioId", "==", usuarioLogado.uid)
        .where("status", "==", "crochetando")
        .onSnapshot((snap) => {

            let balao = document.getElementById('balaoCrochetando');

            if (snap.empty) {

                if (balao) {
                    balao.remove();
                }

                return;
            }

            const docAtivo = snap.docs[0];
            const projetoAtivo = docAtivo.data();
            const projetoId = docAtivo.id;
            const urlProjeto = `projetos.html?id=${encodeURIComponent(projetoId)}`;

            if (!balao) {

                const balaoHtml = `
                    <div id="balaoCrochetando"
                         onclick="window.location.href='${urlProjeto}'"

                         style="
                            position:fixed;
                            bottom:20px;
                            right:20px;
                            background:#ec4899;
                            color:white;
                            padding:15px 20px;
                            border-radius:12px;
                            box-shadow:0 10px 25px rgba(236,72,153,.4);
                            display:flex;
                            align-items:center;
                            gap:15px;
                            z-index:9999;
                            cursor:pointer;
                            border:2px solid #be185d;
                         ">

                        <span class="material-symbols-rounded">
                            motion_photos_on
                        </span>

                        <span id="balaoNomeProjetoGlobal"
                              style="font-weight:700;">

                            ${projetoAtivo.nomeProjeto}

                        </span>

                    </div>
                `;

                document.body.insertAdjacentHTML(
                    'beforeend',
                    balaoHtml
                );

            } else {

                document.getElementById('balaoNomeProjetoGlobal')
                    .innerText = projetoAtivo.nomeProjeto;
                balao.onclick = function() { window.location.href = urlProjeto; };
            }
        });
}