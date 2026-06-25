# Padrão de Interface - Plataforma F1A

## Visão Geral

A plataforma F1A utiliza um Design System próprio chamado:

```text
Infinity Blue
```

O objetivo é garantir:

- Consistência visual
- Facilidade de uso
- Escalabilidade
- Responsividade
- Aparência corporativa premium

Toda nova tela deve seguir este padrão.

---

# Princípios de UX

Toda interface deve ser:

✓ Simples

✓ Objetiva

✓ Responsiva

✓ Consistente

✓ Escalável

✓ Reutilizável

---

# Estrutura Global

Toda página segue:

```html
<body>

<header>

<aside class="sidebar">

<main>

<section>

</body>
```

---

# Estrutura de Conteúdo

Padrão recomendado:

```html
<div class="mesa-container">

    <div class="page-header">

    </div>

    <div class="page-content">

    </div>

</div>
```

---

# Header

Toda página deve possuir:

- Título
- Subtítulo (opcional)
- Ações principais

Exemplo:

```html
<div class="page-header">
    <h1>Cadastro de Clientes</h1>
    <p>Gerenciamento da base comercial</p>
</div>
```

---

# Sidebar

Responsabilidade exclusiva do Core.

A Sidebar:

- Não deve ser recriada
- Não deve ser duplicada
- Não deve possuir versões paralelas

---

# Menu Lateral

Organização recomendada:

```text
Dashboard

CRM

ADM Cartão

Contratos

Financeiro

Pagamentos

Visitas

Crochê

Administração
```

---

# Área Principal

Responsável por:

- Dashboards
- Formulários
- Relatórios
- Cadastros
- Operações

---

# Cards

Componente principal da plataforma.

Estrutura:

```html
<div class="card">

</div>
```

---

# Características

- Fundo branco
- Cantos arredondados
- Sombra leve
- Espaçamento interno

---

# KPI Cards

Utilizados em dashboards.

Estrutura:

```html
<div class="kpi-card">

</div>
```

---

# Componentes Esperados

- Ícone
- Título
- Valor
- Indicador

---

# Tabelas

Estrutura oficial:

```html
<div class="tabela-container">

    <div class="tabela-wrapper">

        <table class="tabela-dados">

        </table>

    </div>

</div>
```

---

# Regras de Tabela

Sempre possuir:

✓ Cabeçalho

✓ Hover

✓ Responsividade

✓ Estado vazio

✓ Ordenação quando aplicável

---

# Estado Vazio

Padrão:

```text
Nenhum registro encontrado.
```

Nunca deixar áreas vazias sem feedback.

---

# Formulários

Estrutura:

```html
<div class="form-group">

    <label>

    <input>

</div>
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

# Tipos de Campo

Preferenciais:

```html
input
select
textarea
checkbox
radio
```

---

# Botões

Categorias oficiais:

## Primário

```html
btn-primary
```

Ação principal.

---

## Secundário

```html
btn-secondary
```

Ações auxiliares.

---

## Perigo

```html
btn-danger
```

Exclusões.

---

# Ícones

Biblioteca oficial:

```text
Material Symbols Rounded
```

Não misturar bibliotecas.

---

# Dropdown

Classes identificadas:

```html
dropbtn-f1a

dropdown-content-f1a

show-dropdown-f1a
```

Sempre reutilizar.

---

# Toast

Sistema oficial:

```javascript
mostrarToast(
    mensagem,
    tipo
)
```

Tipos:

```text
sucesso
erro
```

---

# Modais

Sempre priorizar:

- Modal reutilizável
- Estrutura única
- Consistência visual

---

# Loader

Mensagens padrão:

```text
Carregando...
```

ou

```text
Buscando dados...
```

---

# Dashboard Executivo

Componentes obrigatórios:

- KPI Cards
- Gráficos
- Tabelas
- Indicadores

---

# Dashboard Operacional

Componentes:

- Tabelas
- Cards
- Filtros
- Ações rápidas

---

# Login

Estrutura oficial:

```text
Split Layout
```

---

# Organização

```text
Painel Institucional
+
Painel de Acesso
```

---

# Painel Institucional

Exibe:

- Marca
- Benefícios
- Informações corporativas

---

# Painel de Acesso

Exibe:

- Login
- Recuperação de senha
- Primeiro acesso

---

# Responsividade

Obrigatória.

---

## Desktop

```text
>= 1200px
```

---

## Tablet

```text
768px - 1199px
```

---

## Mobile

```text
< 768px
```

---

# Mobile First

Toda nova tela deve ser validada para:

- Cards
- Tabelas
- Formulários
- Modais

---

# Espaçamento

Escala oficial:

```css
8px
12px
16px
24px
32px
48px
```

---

# Bordas

Escala recomendada:

```css
6px
8px
12px
16px
```

---

# Sombras

Utilizar sombras suaves.

Evitar:

- Sombras exageradas
- Efeitos chamativos

---

# Animações

Permitidas:

- Fade
- Slide suave
- Hover discreto

---

# Animações Proibidas

Evitar:

- Bounce
- Shake
- Zoom agressivo
- Flash

---

# Dark Mode

Responsabilidade do Core.

Utilizar:

```javascript
alternarTemaGlobal()

aplicarTemaGlobal()
```

---

# Variáveis CSS

Sempre utilizar variáveis.

Evitar:

```css
background: #000;
color: #fff;
```

hardcoded.

---

# Master Vision

Quando ativo:

Destacar visualmente:

- Usuário simulado
- Empresa simulada

Evitar ambiguidades.

---

# Crochê

Exceção visual permitida.

Pode utilizar:

```css
--premium-gold

--croche-rose
```

Mantendo compatibilidade com Infinity Blue.

---

# Consistência Visual

Antes de criar qualquer tela:

Perguntar:

1. Parece parte do F1A?
2. Reutiliza componentes existentes?
3. Segue Infinity Blue?
4. Funciona em mobile?
5. Respeita Dark Mode?

Se alguma resposta for "não", revisar a implementação.

---

# Regra Final

Toda nova interface deve parecer ter sido criada pela equipe original da plataforma.

O usuário não deve conseguir distinguir uma tela nova de uma tela já existente.