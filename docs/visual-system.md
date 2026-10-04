# Sistema visual ORBITA

## Direção

A interface combina um canvas escuro de marca com superfícies claras para operação. O preto profundo mantém a linguagem espacial da ORBITA; o verde sinaliza ação, progresso e conexão; os painéis claros dão prioridade à leitura de dados, formulários e tabelas.

O conteúdo usa Inter. Sora aparece em títulos, wordmarks e números de destaque. Os arquivos locais ficam em `src/styles/fonts/` e são carregados por `next/font/local`, sem dependência de CDN.

## Tokens

| Token                | Valor     | Uso                               |
| -------------------- | --------- | --------------------------------- |
| `--color-brand`      | `#00E676` | ação primária, foco e progresso   |
| `--color-brand-dark` | `#00C896` | gradientes e estados de apoio     |
| `--color-ink`        | `#0A0F14` | navegação, landing e autenticação |
| `--color-slate`      | `#1A2228` | bordas e superfícies escuras      |
| `--color-canvas`     | `#F3F6F5` | fundo operacional                 |
| `--color-surface`    | `#FFFFFF` | cards e campos                    |
| `--color-line`       | `#E0E7E4` | divisórias                        |
| `--color-text`       | `#1A2D25` | texto principal                   |

Os valores ficam em `src/styles/tokens.css`; reset, tipografia e estados globais ficam em `src/styles/base.css` e `src/styles/components.css`. Cada área usa CSS Module quando precisa de composição própria: `home.module.css`, `auth.module.css` e `dashboard.module.css`.

## Logo e arquivos de marca

`src/components/brand/logo.tsx` é a única entrada de logo para a aplicação. Ele usa o símbolo transparente em `public/brand/orbita-symbol.png`, com variação compacta para espaços estreitos e wordmark textual acessível. O arquivo original fornecido pelo produto permanece em `public/brand/orbita-symbol-original.png`; o painel de identidade visual fica em `public/brand/orbita-visual-identity.png`.

O componente é aplicado na landing, shell de autenticação, sidebar, rodapé e metadados de ícone. Não se deve redesenhar o símbolo em CSS ou substituir sua proporção. A alternativa textual continua presente como nome acessível para leitores de tela.

## Regras de uso

- Use `Button`, `Input`, `Select`, `Textarea`, `FormField`, `Card`, `PageHeader`, `Table` e `StatusBadge` para manter estados, foco e espaçamento consistentes.
- Use CSS Modules para layout e responsividade; classes globais devem ficar restritas a semântica reutilizável.
- A navegação é preta e persistente em desktop, com menu lateral sobreposto em telas estreitas. O conteúdo operacional tem largura fluida e tabelas rolam horizontalmente sem quebrar o viewport.
- Verde é reservado para ação e estado positivo. Mensagens de erro continuam com cor e texto explícitos; nunca dependa só da cor.
- Respeite `prefers-reduced-motion`, foco visível, `aria-label` em ícones e `alt` vazio para o símbolo quando o wordmark já identifica a marca.

## Fonte dos arquivos

O símbolo e o painel foram copiados dos arquivos fornecidos em `C:\Users\Vinicius\Downloads` para o repositório. O fundo branco do símbolo foi removido para uso sobre superfícies claras e escuras mantendo a forma e o gradiente verde; o original permanece junto para auditoria visual. Sora e Inter foram incorporadas em formato WOFF2 com os textos de licença OFL correspondentes.
