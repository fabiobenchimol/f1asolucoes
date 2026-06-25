# Regras de Negócio F1A

# Estrutura Hierárquica

O sistema F1A utiliza uma estrutura hierárquica obrigatória:

Empresa
↓
Rede
↓
Loja

Toda regra de acesso, visibilidade e filtragem deve respeitar essa hierarquia.

---

# Multiempresa

Usuários podem possuir acesso a:

- Uma empresa
- Múltiplas empresas
- Todas as empresas

Campo:

```javascript
empresaId
```

Formato oficial:

```javascript
[
  "empresa1",
  "empresa2"
]
```

Compatibilidade:

Também pode existir como string em registros legados.

---

# Multirrede

Campo:

```javascript
redeId
```

Formato:

```javascript
[
  "rede1",
  "rede2"
]
```

Compatibilidade:

Aceita string para registros antigos.

---

# Multiloja

Campo:

```javascript
lojaId
```

Formato:

```javascript
[
  "loja1",
  "loja2"
]
```

Compatibilidade:

Aceita string para registros antigos.

---

# Perfis Oficiais

Perfis identificados:

- master
- admin
- gerente
- vendedor

Hierarquia:

MASTER
↓
ADMIN
↓
GERENTE
↓
VENDEDOR

---

# Status de Usuário

Valores oficiais:

- ativo
- bloqueado

Usuários bloqueados não podem acessar o sistema.

---

# Estrutura SaaS

Coleções oficiais:

## empresas

Armazena clientes da plataforma.

Campos encontrados:

- razaoSocial
- nomeFantasia
- cnpj
- planoId
- status
- dataAtivacao
- dataValidade

Status:

- ativa
- bloqueada
- cancelada

---

## planos

Armazena os pacotes SaaS.

Campos encontrados:

- nome
- valor

Limites:

- admin
- gerente
- vendedor

---

## modulos_f1a

Registro central de módulos.

Campos:

- tipo
- titulo
- icon
- cor
- url
- desc

Tipos:

- comercial
- sistema

---

## redes

Representa agrupamentos de lojas.

Campos encontrados:

- empresaId
- nome
- codigo
- gerenteId
- indicacaoVendedorId

---

## lojas

Representa pontos de venda.

Campos encontrados:

- empresaId
- redeId
- nome
- codigo
- cnpj
- cidade
- bairro

---

# Controle de Acesso

Existem dois níveis de autorização.

## Módulos

Campo:

```javascript
modulosAcesso
```

Exemplos:

- crm
- contratos
- financeiro
- pagamentos
- visitas

---

## Ferramentas

Campo:

```javascript
ferramentasAcesso
```

Exemplos:

- executivo
- equipe
- dashboard

---

# Master Vision

Recurso exclusivo MASTER.

Permite:

- simular usuários
- simular permissões
- validar acesso
- testar módulos

Sem necessidade de login adicional.

---

# CRUD Oficial

Fluxo obrigatório:

Lista
↓
Novo
↓
Formulário
↓
Salvar
↓
Retornar para Lista

Implementação padrão:

viewLista
viewFormulario

---

# Toast Oficial

Não utilizar:

```javascript
alert()
```

Utilizar:

```javascript
mostrarToast(
  "Operação realizada",
  "sucesso"
);
```

Tipos:

- sucesso
- erro

---

# Regra Crítica

Novos módulos devem respeitar:

- empresaId
- redeId
- lojaId
- perfilUsuario
- modulosAcesso
- ferramentasAcesso

Nenhuma funcionalidade pode ignorar o modelo de segurança da plataforma.