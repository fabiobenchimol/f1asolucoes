# Módulo Financeiro

## Objetivo

Responsável pela visualização financeira consolidada da operação.

---

# Indicadores Oficiais

KPIs:

- Vendas Totais
- Inadimplência
- Valores a Receber
- Juros e Multas

---

# Estrutura Hierárquica

Toda consulta deve respeitar:

Empresa
↓
Rede
↓
Loja

Campos:

- empresaId
- redeId
- lojaId

---

# Controle de Permissões

Módulo protegido por:

modulosAcesso

Identificador:

modulo_financeiro

Compatibilidade:

financeiro

---

# Relatório de Repasse

Campos:

- Loja
- Venda Bruta
- Encargos
- Líquido Repasse
- Status

---

# Indicadores Financeiros

## Vendas Totais

Soma das vendas processadas.

---

## Inadimplência

Percentual de clientes em atraso.

---

## A Receber

Total de valores pendentes.

---

## Juros e Multas

Receita adicional proveniente de atrasos.

---

# Master Vision

Permite visualização por:

- Empresa
- Rede
- Loja

Sem necessidade de troca de login.

---

# Exportação

Suporte oficial:

- Impressão
- PDF

---

# Regras do Agente

Ao alterar o financeiro:

- Respeitar hierarquia Empresa → Rede → Loja.
- Preservar indicadores oficiais.
- Preservar relatórios de repasse.
- Preservar Master Vision.
- Preservar compatibilidade financeiro/modulo_financeiro.