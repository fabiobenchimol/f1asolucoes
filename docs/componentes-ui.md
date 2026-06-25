# Componentes UI - Plataforma F1A

## Visão Geral

Este documento descreve os componentes reutilizáveis oficiais da plataforma F1A.

Objetivos:

- Padronização visual
- Reutilização
- Escalabilidade
- Consistência de UX
- Compatibilidade com Infinity Blue

---

# Estrutura de Componentes

A plataforma é composta por:

```text
Layout
↓
Containers
↓
Cards
↓
Tabelas
↓
Formulários
↓
Ações
↓
Feedback
```

---

# Sidebar

## Responsabilidade

Navegação principal da plataforma.

## Controle

Responsabilidade exclusiva do Core.

## Características

- Menu hierárquico
- Responsivo
- Compatível com Master Vision
- Compatível com Dark Mode

## Proibições

Nunca:

- duplicar sidebar
- recriar sidebar
- criar menu paralelo

---

# Header

## Objetivo

Exibir contexto da página.

## Estrutura

```html
<div class="page-header">
    <h1>Título</h1>
    <p>Descrição</p>
</div>
```

## Componentes

- título
- subtítulo
- ações

---

# Mesa Container

## Estrutura Oficial

```html
<div class="mesa-container">

</div>
```

## Responsabilidade

Container principal da página.

---

# Card

## Estrutura

```html
<div class="card">

</div>
```

## Uso

- formulários
- filtros
- relatórios
- dashboards

---

# KPI Card

## Estrutura

```html
<div class="kpi-card">

</div>
```

## Componentes

- ícone
- título
- valor
- indicador

---

# Indicadores

Exemplos:

```text
Vendas

Receita

Produção

Clientes

Contratos

Inadimplência
```

---

# Tabela

## Estrutura Oficial

```html
<div class="tabela-container">

    <div class="tabela-wrapper">

        <table class="tabela-dados">

        </table>

    </div>

</div>
```

---

# Recursos Esperados

✓ Responsividade

✓ Hover

✓ Estado vazio

✓ Ordenação

✓ Paginação

---

# Estado Vazio

Mensagem padrão:

```text
Nenhum registro encontrado.
```

---

# Form Group

## Estrutura

```html
<div class="form-group">

    <label>

    <input>

</div>
```

---

# Inputs

Permitidos:

```html
input
select
textarea
```

---

# Campos Obrigatórios

Todo campo deve possuir:

```html
id
name
label
```

---

# Botão Primário

## Classe

```html
btn-primary
```

## Uso

Ação principal.

Exemplos:

- Salvar
- Confirmar
- Gerar

---

# Botão Secundário

## Classe

```html
btn-secondary
```

## Uso

Ações auxiliares.

---

# Botão Perigo

## Classe

```html
btn-danger
```

## Uso

Exclusões.

---

# Dropdown

## Classes Oficiais

```html
dropbtn-f1a

dropdown-content-f1a

show-dropdown-f1a
```

---

# Uso

- perfil
- filtros
- ações rápidas

---

# Modal

## Objetivo

Interações temporárias.

## Características

- reutilizável
- responsivo
- consistente

---

# Modal de Confirmação

Uso:

- exclusões
- cancelamentos
- ações críticas

---

# Modal de Formulário

Uso:

- cadastro rápido
- edição rápida

---

# Toast

## Função Oficial

```javascript
mostrarToast(
    mensagem,
    tipo
)
```

---

# Tipos

## Sucesso

```javascript
mostrarToast(
    "Registro salvo",
    "sucesso"
)
```

---

## Erro

```javascript
mostrarToast(
    "Falha ao salvar",
    "erro"
)
```

---

# Loader

## Mensagens Oficiais

```text
Carregando...
```

ou

```text
Buscando dados...
```

---

# Grid Responsiva

## Estrutura

```html
<div class="grid">

</div>
```

---

# Uso

- cards
- indicadores
- dashboards

---

# Filtros

## Estrutura Recomendada

```html
<div class="card filtro-card">

</div>
```

---

# Componentes

- data inicial
- data final
- empresa
- rede
- loja

---

# Master Vision Banner

## Objetivo

Indicar contexto simulado.

## Exibir

- usuário simulado
- empresa simulada

---

# Dashboard Executivo

## Componentes

- KPI Cards
- Gráficos
- Ranking
- Indicadores

---

# Dashboard Operacional

## Componentes

- Filtros
- Tabelas
- Ações rápidas

---

# Planner de Visitas

## Componentes

```text
SEG
TER
QUA
QUI
SEX
SAB
DOM
```

Turnos:

```text
Manhã
Almoço
Tarde
```

---

# Cards Financeiros

Indicadores:

```text
Vendas Totais

Inadimplência

A Receber

Juros e Multas
```

---

# Cards Comerciais

Indicadores:

```text
Clientes

Propostas

Contratos

Produção
```

---

# Cards Operacionais

Indicadores:

```text
Estoque

Entradas

Saídas

MRR
```

---

# Componente de Imagem

Utilizado principalmente no Crochê.

Campos:

```javascript
imagemUrl
```

---

# Portfólio

Exibe:

- foto
- nome
- categoria
- preço

---

# Compatibilidade Mobile

Todo componente deve funcionar em:

```text
Desktop
Tablet
Mobile
```

---

# Dark Mode

Todo componente deve utilizar:

```css
var(...)
```

Nunca utilizar cores fixas.

---

# Ícones

Biblioteca oficial:

```text
Material Symbols Rounded
```

Não misturar bibliotecas.

---

# Regras do Agente

Antes de criar qualquer componente:

1. Verificar se já existe equivalente.
2. Reutilizar componentes existentes.
3. Respeitar Infinity Blue.
4. Respeitar responsividade.
5. Respeitar Dark Mode.
6. Respeitar Master Vision.
7. Respeitar acessibilidade.

Nunca criar componentes incompatíveis com a identidade visual da plataforma.

Toda nova interface deve utilizar este catálogo como referência principal.

# Reutilização Obrigatória

Antes de criar qualquer componente visual:

1. Procurar componente equivalente em módulos existentes.
2. Procurar página semelhante.
3. Reutilizar HTML existente.
4. Reutilizar CSS existente.
5. Reutilizar JavaScript existente.

É proibido recriar:

- Sidebar
- Header principal
- Dropdown do usuário
- Dark Mode
- Menu lateral
- Sistema de notificações

Quando existir um componente oficial, sua reutilização é obrigatória.