# Arquitetura Firebase - Plataforma F1A

## Visão Geral

A plataforma F1A utiliza Firebase como backend principal.

Serviços utilizados:

- Firebase Authentication
- Cloud Firestore
- Firebase Hosting

O Firebase é compartilhado por todos os módulos da plataforma.

---

# Arquitetura Geral

F1A Core
↓
Firebase Authentication
↓
Cloud Firestore
↓
Módulos de Negócio

---

# Inicialização

A inicialização do Firebase é responsabilidade exclusiva do Core.

Proibido:

```javascript
firebase.initializeApp()
```

dentro dos módulos.

---

# Estrutura Hierárquica

Toda a plataforma é baseada na hierarquia:

Empresa
↓
Rede
↓
Loja

Campos utilizados:

```javascript
empresaId
redeId
lojaId
```

---

# Compatibilidade Legada

Os campos:

```javascript
empresaId
redeId
lojaId
```

podem existir como:

```javascript
"empresa1"
```

ou

```javascript
[
  "empresa1",
  "empresa2"
]
```

Toda consulta deve tratar ambos os formatos.

---

# Coleções Globais

## usuarios

Responsável por autenticação e permissões.

### Campos

```javascript
uid

nome
email

perfil
status

empresaId
redeId
lojaId

modulosAcesso
ferramentasAcesso

primeiroAcesso
emailRecuperacao

criadoEm
atualizadoEm
```

### Perfis

```text
master
admin
gerente
vendedor
```

### Status

```text
ativo
bloqueado
```

---

## empresas

Empresas clientes da plataforma.

### Campos

```javascript
razaoSocial
nomeFantasia

cnpj

planoId

status

dataAtivacao
dataValidade
```

### Status

```text
ativa
bloqueada
cancelada
```

---

## planos

Planos SaaS.

### Campos

```javascript
nome
valor

limiteAdmins
limiteGerentes
limiteVendedores
```

---

## redes

Agrupamento de lojas.

### Campos

```javascript
empresaId

nome
codigo

gerenteId
indicacaoVendedorId
```

---

## lojas

Pontos de venda.

### Campos

```javascript
empresaId
redeId

nome
codigo

cnpj

cidade
bairro
```

---

## modulos_f1a

Catálogo oficial de módulos.

### Campos

```javascript
titulo
descricao

url
icon
cor

tipo
```

---

# CRM

## crm_modelos_msg

Modelos de mensagens.

### Campos

```javascript
nome
tipo
texto
usuarioId
```

---

## crm_lojas

Base CRM.

### Campos

```javascript
codigo
nome
usuarioId
```

---

## crm_remessas

Campanhas.

### Campos

```javascript
nome
tipo

modeloUsado

status

filaEnvios
```

---

## crm_comissoes_historico

Histórico de apuração.

---

## crm_comissoes_plasticos_vendas

Vendas de plásticos.

---

## crm_comissoes_faturas_importadas

Faturas utilizadas para comissão.

---

# ADM Cartão

## adm_fornecedores

```javascript
razaoSocial
nomeFantasia
cnpj
telefone
email
```

---

## adm_produtos

```javascript
marca
modelo
```

---

## adm_entradas

```javascript
fornecedorId

numeroNF
rastreio

produtos

dataEntrada
```

---

## adm_estoque

```javascript
serial
produtoId

status
```

### Status

```text
disponivel
alugada
```

---

## adm_saidas

```javascript
maquinetaId
lojaId

dataSaida
```

---

## adm_remessas

Controle logístico.

---

## adm_cronograma_bim

Controle operacional.

---

## cartao_redes

Redes participantes.

---

## cartao_lojas

```javascript
redeId
custoAluguel
```

---

# Pagamentos

## propostas

### Campos

```javascript
empresaId

gerenteId
vendedorId

status

historico

criadoEm
```

### Status

```text
pendente
aprovada
recusada
agendada
paga
cancelada
```

---

## remessas

(Borderôs)

### Campos

```javascript
codigo
identificador

empresaId
gerenteId

dataVencimento

status

historico
```

### Status

```text
aberta
paga
```

---

# Visitas

## visitas_agenda

### Campos

```javascript
promotoraId

data
turno

lojaId

horaInicio
horaFim

status

cartoesAprovados

checkinFoto
checkoutFoto

checkinGpsLat
checkinGpsLng

checkoutGpsLat
checkoutGpsLng
```

### Status

```text
pendente
andamento
concluido
```

---

## visitas_config_metas

### Campos

```javascript
horasSemana
horasMes

cartoesBase

tipoTransporte

gatilhosBonus

ajudaDeCusto
```

---

# Crochê

## croche_materiais

### Campos

```javascript
nome
categoria

preco

qtdRendimento

ultimaEntrada
ultimaUtilizacao

usuarioId
```

---

## croche_projetos

### Campos

```javascript
usuarioId

nomeProjeto
categoria

status

tempoTotalMinutos
segundosAcumulados
timerInicioMs

materiaisUsados

imagemUrl

precoSugerido
margemLucro
```

### Status

```text
andamento
crochetando
concluido
```

---

# Auditoria

Sempre que possível registrar:

```javascript
usuario
data
acao
```

---

# Timestamps

Padrão oficial:

```javascript
firebase.firestore.FieldValue.serverTimestamp()
```

Evitar:

```javascript
new Date()
Date.now()
```

para auditoria.

---

# Multiempresa

Toda nova coleção corporativa deve considerar:

```javascript
empresaId
```

---

# Master Vision

O sistema suporta simulação.

Campos identificados:

```javascript
f1a_simulated_uid
visaoEmpresaAtiva
```

Origem:

```javascript
sessionStorage
```

Toda consulta deve respeitar o contexto ativo.

---

# Regras Arquiteturais

1. Não duplicar dados sem necessidade.
2. Reutilizar coleções existentes.
3. Preservar compatibilidade legada.
4. Respeitar Empresa → Rede → Loja.
5. Respeitar Multiempresa.
6. Respeitar Master Vision.
7. Preservar histórico.
8. Utilizar timestamps do servidor.
9. Não inicializar Firebase fora do Core.
10. Toda evolução deve ser compatível com a arquitetura existente.