# Módulo ADM Cartão

## Objetivo

Responsável pelo controle operacional do negócio de aluguel de maquinetas.

---

# Estrutura Operacional

Fornecedor
↓
Entrada
↓
Estoque
↓
Saída
↓
Cliente
↓
Faturamento
↓
Recebimento

---

# Coleções Utilizadas

## adm_fornecedores

Cadastro de fornecedores.

Campos:

* razaoSocial
* nomeFantasia
* cnpj
* telefone
* email

---

## adm_produtos

Cadastro de marcas e modelos.

Campos:

* marca
* modelo

---

## adm_entradas

Registro de compras.

Campos:

* fornecedorId
* numeroNF
* rastreio
* produtos
* dataEntrada

---

## adm_estoque

Inventário individual.

Campos identificados:

* idMaquineta
* serial
* produtoId
* status

Status:

* disponivel
* alugada

---

## adm_saidas

Histórico de expedição.

Campos:

* maquinetaId
* lojaId
* dataSaida

---

## cartao_redes

Redes vinculadas ao aluguel.

Campos:

* redeId
* dataVinculo

---

## cartao_lojas

Lojas participantes.

Campos identificados:

* redeId
* custoAluguel

---

## adm_remessas

Controle logístico.

Campos:

* descricao
* arquivos
* dataRemessa
* status

---

## adm_cronograma_bim

Controle operacional.

Utilizado pelo módulo:

Controle Geral.

---

# Fluxo de Estoque

Fornecedor
↓
Entrada
↓
Estoque Disponível
↓
Saída
↓
Loja

---

# Fluxo de Aluguel

Rede
↓
Loja
↓
Maquineta
↓
Mensalidade
↓
Recebimento

---

# Dashboard de Eficiência

Indicadores oficiais:

* Total Compradas
* Máquinas Alugadas
* Taxa de Ocupação
* Receita Recorrente (MRR)

---

# Cálculo de Taxa de Ocupação

Taxa de Ocupação =
(Máquinas Alugadas ÷ Total de Máquinas) × 100

---

# Cálculo de Receita Recorrente

MRR =
Σ(custoAluguel das lojas ativas)

---

# Remessas

Padrão obrigatório:

Emb-Rede{codigo}-Loja{codigo}-Lote{numero} Nome.txt

Exemplo:

Emb-Rede001-Loja005-Lote001 Cliente XPTO.txt

Arquivos fora desse padrão devem ser rejeitados.

---

# Multiempresa

Todas as consultas devem respeitar:

empresaId

Empresa ativa:

visaoEmpresaAtiva

armazenada em:

sessionStorage

---

# Regras do Agente

Ao criar novas funcionalidades:

* Não alterar estrutura das coleções existentes.
* Preservar compatibilidade dos cálculos MRR.
* Preservar fluxo Entrada → Estoque → Saída.
* Preservar visaoEmpresaAtiva.
* Preservar padrão oficial de remessas.