# Firebase e Arquitetura Core F1A

## Visão Geral

O sistema F1A utiliza:

* Firebase Authentication
* Firestore Database
* Firebase Hosting

Toda autenticação e controle de sessão são centralizados no arquivo:

```text
core.js
```

Nenhum módulo pode inicializar Firebase diretamente.

---

# Regra Arquitetural Absoluta

Somente o core.js pode:

* Inicializar Firebase
* Validar autenticação
* Gerenciar sessão
* Controlar tema global
* Controlar logout
* Carregar dados globais do usuário
* Validar permissões
* Executar Router Guards

---

# Estrutura de Usuários

Coleção:

```text
usuarios
```

Campos identificados:

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
```

---

# Perfis Oficiais

Perfis encontrados:

```text
master
admin
gerente
vendedor
```

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

Valores identificados:

```text
ativo
bloqueado
```

Quando:

```text
status = bloqueado
```

o sistema encerra a sessão automaticamente.

---

# Multiempresa

O sistema utiliza Tenant Isolation.

Campo:

```javascript
empresaId
```

Características:

* Pode armazenar múltiplas empresas.
* Usuários podem possuir acesso a mais de uma empresa.
* O sistema utiliza visaoEmpresaAtiva para alternância.

---

# Regra de Compatibilidade

O sistema possui vacina de retrocompatibilidade.

Campos:

```javascript
empresaId
redeId
lojaId
```

Devem sempre ser arrays.

Caso venham como string, o core converte automaticamente.

---

# Empresas

Coleção:

```text
empresas
```

Status identificados:

```text
ativa
bloqueada
cancelada
```

Empresas bloqueadas impedem acesso ao sistema.

---

# Controle de Licenças

Módulos:

```javascript
modulosAcesso
```

Ferramentas:

```javascript
ferramentasAcesso
```

São utilizados pelo Router Guard.

---

# Router Guard

O core.js valida acesso às páginas.

Exemplos:

Financeiro:

```text
modulosAcesso = financeiro
```

Contratos:

```text
modulosAcesso = contratos
```

Visitas:

```text
modulosAcesso = visitas
```

Dashboard:

```text
ferramentasAcesso = executivo
```

Equipe:

```text
ferramentasAcesso = equipe
```

---

# Callback Oficial

Após autenticação o sistema pode executar:

```javascript
posAuthCallback()
```

Todo novo módulo deve utilizar esse padrão.

---

# CRUD Oficial

Criar:

```javascript
addDoc()
```

Consultar:

```javascript
getDocs()
```

Atualizar:

```javascript
updateDoc()
```

Excluir:

```javascript
deleteDoc()
```

---

# Tratamento de Erros

Obrigatório:

```javascript
try {
}
catch(error) {
}
```

Toda operação Firebase deve possuir tratamento de exceções.

---

# Toast Oficial

Não utilizar alert() para operações comuns.

Utilizar:

```javascript
mostrarToast(
    "Operação realizada",
    "sucesso"
);
```

Alertas são reservados para:

* Falhas críticas
* Bloqueios
* Erros fatais
* Segurança

```
```
