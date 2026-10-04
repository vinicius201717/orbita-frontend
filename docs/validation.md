# Validação técnica — 04/10/2026

| Verificação                                            | Resultado                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------- |
| TypeScript estrito e tipos de rotas                    | `npm run typecheck` passou                                      |
| ESLint sem warnings                                    | `npm run lint` passou                                           |
| Build Next.js de produção                              | passou após sincronização de contratos, allowlist e assets       |
| Schemas, componentes, sessão, concorrência e segurança | 61 testes em 11 arquivos passaram                               |
| Backend integrado                                      | 35 testes de integração em 7 suítes e 28 unitários passaram     |
| Navegador Edge via Playwright                          | 4 cenários passaram com login e operações reais                 |
| Dependências de produção                               | `npm audit --omit=dev`: zero vulnerabilidades reportadas        |

## Fluxos percorridos

O navegador abriu landing, login, cadastros, termos e privacidade. Formulários inválidos foram rejeitados e acessos sem sessão às três áreas redirecionaram para login. A tentativa com credenciais inválidas retornou `401` sem criar cookie.

No cenário operacional, contas reais foram criadas com a API e autenticadas pelo próprio `/api/session/login` do frontend. A interface empresarial criou uma entrega expressa e marcou a preparação; a administração aprovou o entregador; o entregador aceitou a oferta, iniciou a rota, registrou chegada/coleta, confirmou o código e finalizou a rota. A empresa recebeu o estado entregue via invalidação realtime.

As telas de documentos consultam a política real, aceitam multipart com limite de 5 MB, listam metadados sem chave de storage, baixam pelo BFF e exibem reenvio/análise conforme o papel. As telas de WhatsApp exibem o status real e permitem consentimento somente onde o contrato autoriza.

## Limites da evidência

O alerta transitivo de desenvolvimento `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` continua registrado no `npm audit` completo; não há correção compatível publicada para a cadeia sem trocar a major do Next. Ele não é dependência de runtime.

Google Maps, WhatsApp Cloud, e-mail, pagamentos, push, cookies Secure em domínio público, múltiplas instâncias e comportamento de GPS físico não foram homologados com credenciais externas. A publicação em branches Git entrega o código e os contratos; não ativa esses provedores.
