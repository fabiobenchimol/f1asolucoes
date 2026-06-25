# Fluxo de Autenticação - Plataforma F1A

## Visão Geral

O sistema F1A utiliza Firebase Authentication como mecanismo principal de autenticação.

O controle de autenticação é centralizado no Core da plataforma.

Nenhum módulo possui autenticação própria.

---

# Arquitetura

Login
↓
Firebase Authentication
↓
Validação Usuário
↓
Validação Empresa
↓
Validação Permissões
↓
Carregamento Perfil
↓
posAuthCallback()
↓
Módulo

---

# Responsabilidades do Core

O Core é responsável por:

- Login
- Logout
- Persistência de sessão
- Recuperação de senha
- Primeiro acesso
- Carregamento do usuário
- Router Guards
- Master Vision

---

# Sessão

Persistência oficial:

```javascript
firebase.auth.Auth.Persistence.SESSION
```

---

# Comportamento

Quando o navegador é encerrado:

```text
Sessão encerrada
```

O usuário deve autenticar novamente.

---

# Login Corporativo

O sistema utiliza login corporativo.

Exemplo:

```text
joaosilva
```

Convertido internamente para:

```text
joaosilva@sistemaf1a.com.br
```

---

# Estrutura do Usuário

Coleção:

```text
usuarios
```

Campos relevantes:

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
```

---

# Validação de Usuário

Após autenticar:

O sistema consulta:

```text
usuarios
```

---

# Status Permitidos

## ativo

Acesso liberado.

---

## bloqueado

Acesso negado.

---

# Validação de Empresa

Após validar usuário:

Validar empresa.

Coleção:

```text
empresas
```

---

# Status Permitidos

## ativa

Acesso liberado.

---

## bloqueada

Acesso negado.

---

## cancelada

Acesso negado.

---

# Primeiro Acesso

Campo:

```javascript
primeiroAcesso
```

---

# Fluxo

Usuário criado
↓
primeiroAcesso = true
↓
Login
↓
Cadastro de e-mail pessoal
↓
Troca de senha
↓
Atualização de cadastro
↓
primeiroAcesso = false
↓
Acesso normal

---

# Objetivos

Garantir:

- senha pessoal
- recuperação de acesso
- identificação do usuário

---

# E-mail de Recuperação

Campo:

```javascript
emailRecuperacao
```

---

# Recuperação de Senha

Fluxo:

Usuário
↓
Solicita recuperação
↓
Firebase Auth
↓
E-mail enviado
↓
Redefinição de senha

---

# Carregamento do Usuário

Após autenticação:

Carregar:

```javascript
usuarioLogado
```

---

# Dados Disponíveis

```javascript
uid
nome
perfil

empresaId
redeId
lojaId

modulosAcesso
ferramentasAcesso
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
string
```

ou

```javascript
array
```

Sempre normalizar.

---

# Controle de Permissões

Realizado através de:

```javascript
modulosAcesso
```

e

```javascript
ferramentasAcesso
```

---

# Perfis Oficiais

```text
master
admin
gerente
vendedor
```

---

# Hierarquia

MASTER
↓
ADMIN
↓
GERENTE
↓
VENDEDOR

---

# Router Guards

Responsabilidade exclusiva do Core.

O Router Guard valida:

- login
- empresa
- perfil
- módulo
- ferramenta

---

# Fluxo de Proteção

Usuário
↓
Autenticado?
↓
Usuário ativo?
↓
Empresa ativa?
↓
Permissão módulo?
↓
Permissão ferramenta?
↓
Acesso liberado

---

# Master Vision

Funcionalidade exclusiva MASTER.

Permite:

- simular usuário
- simular empresa
- simular permissões

---

# Variáveis Identificadas

```javascript
f1a_simulated_uid
```

e

```javascript
visaoEmpresaAtiva
```

---

# Armazenamento

```javascript
sessionStorage
```

---

# Contexto Simulado

Quando existir:

```javascript
f1a_simulated_uid
```

O sistema opera no contexto do usuário simulado.

---

# Callback Oficial

Após autenticação:

Executar:

```javascript
window.posAuthCallback = async function() {

}
```

---

# Fluxo Completo

Login
↓
Firebase Auth
↓
Validação Usuário
↓
Validação Empresa
↓
Validação Permissões
↓
Carregamento Usuário
↓
Aplicação Tema
↓
Carregamento Sidebar
↓
posAuthCallback()
↓
Módulo

---

# Logout

Responsabilidade exclusiva do Core.

Fluxo:

Logout
↓
Encerrar Firebase Session
↓
Limpar Session Storage
↓
Redirecionar Login

---

# Boas Práticas

Sempre:

✓ validar usuário

✓ validar empresa

✓ validar permissões

✓ validar contexto Master Vision

✓ utilizar SESSION persistence

✓ utilizar posAuthCallback()

---

# Proibições

Nunca:

✗ autenticar dentro dos módulos

✗ criar Router Guard paralelo

✗ armazenar senha no Firestore

✗ ignorar empresa ativa

✗ ignorar permissões

✗ ignorar primeiro acesso

✗ ignorar Master Vision

---

# Resumo

A autenticação do F1A é baseada em:

Firebase Authentication
+
Coleção usuarios
+
Coleção empresas
+
IAM
+
Master Vision
+
Core.js

Todo módulo deve consumir essa estrutura e jamais substituí-la.