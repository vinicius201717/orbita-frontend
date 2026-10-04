# Contrato de identidade implementado

Este documento era uma proposta durante a auditoria inicial. O contrato foi implementado no backend e integrado ao BFF.

`GET /api/v1/auth/me` exige o token da sessão e retorna somente a identidade pública da conta autenticada:

```ts
{
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'BUSINESS_OWNER' | 'BUSINESS_STAFF' | 'DRIVER';
  businessId: string | null;
  driverId: string | null;
  phone: string | null;
}
```

O backend seleciona os campos explicitamente e valida conta ativa, exclusão e versão de autenticação. O endpoint não recebe um ID do cliente, não retorna hash de senha e não expõe tokens.

O frontend usa o mesmo contrato depois de `POST /api/session/login`. `PATCH /api/v1/auth/me` atualiza nome e telefone; `POST /api/v1/auth/change-password` verifica a senha atual, incrementa a versão de autenticação, revoga refresh tokens e encerra sessões anteriores. As regressões estão em `test/integration/frontend-identity.spec.ts` no backend.
