import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'ORBITA — Entregas inteligentes',
  description:
    'Conecte seu estabelecimento à operação de entregas. Organize pedidos, acompanhe rotas e mantenha tudo no mesmo lugar.',
};

const steps = [
  {
    number: '01',
    title: 'Prepare a saída.',
    description:
      'Cadastre a entrega, informe os detalhes e sinalize quando o pedido estiver pronto para coleta.',
  },
  {
    number: '02',
    title: 'Conecte o caminho.',
    description:
      'As ofertas e rotas conectam o pedido à operação do entregador, com cada parada organizada.',
  },
  {
    number: '03',
    title: 'Acompanhe a chegada.',
    description:
      'Consulte o andamento da entrega e mantenha o histórico da operação acessível no seu painel.',
  },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <div className={styles.page}>
      <a href="#conteudo" className={styles.skip}>
        Ir para o conteúdo
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Início ORBITA">
          <Logo inverse />
        </Link>
        <nav aria-label="Navegação principal" className={styles.navigation}>
          <a href="#como-funciona" className={styles.sectionLink}>
            Como funciona
          </a>
          <a href="#para-voce" className={styles.sectionLink}>
            Para você
          </a>
          <Link href="/login" className={styles.login}>
            Entrar <Arrow />
          </Link>
        </nav>
      </header>
      <main id="conteudo">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span /> ENTREGA É CONEXÃO.
            </p>
            <h1 id="hero-title">
              Mais entregas.
              <br />
              <em>Menos caminho.</em>
            </h1>
            <p className={styles.heroDescription}>
              Seu negócio, os entregadores e cada destino na mesma órbita. Uma forma mais simples de
              organizar sua operação de entregas.
            </p>
            <div className={styles.heroActions}>
              <Link href="/cadastro" className={styles.primary}>
                Começar na ORBITA <Arrow />
              </Link>
              <a href="#como-funciona" className={styles.textLink}>
                Conheça a operação <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className={styles.heroNote}>Para estabelecimentos e entregadores.</p>
          </div>
          <div
            className={styles.routeVisual}
            role="img"
            aria-label="Ilustração de uma rota conectando estabelecimento, coleta e destino."
          >
            <div className={styles.mapGrid} />
            <svg className={styles.routeDrawing} viewBox="0 0 560 480" fill="none" aria-hidden="true">
              <defs>
                <linearGradient
                  id="route-gradient"
                  x1="88"
                  y1="380"
                  x2="455"
                  y2="100"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#00C896" />
                  <stop offset="1" stopColor="#00E676" />
                </linearGradient>
              </defs>
              <path
                d="M-30 178 146 178 246 78H580M-10 318H164L310 172H580M74 500V380L358 96V-10M220 510V370L450 140V-10"
                stroke="#1A302B"
                strokeWidth="20"
              />
              <path
                d="M-30 178 146 178 246 78H580M-10 318H164L310 172H580M74 500V380L358 96V-10M220 510V370L450 140V-10"
                stroke="#263E33"
                strokeWidth="1"
              />
              <path
                d="M96 376V330Q96 302 125 302H187Q207 302 223 286L322 186Q338 170 362 170H414Q446 170 446 138V112"
                stroke="#00E676"
                strokeOpacity=".09"
                strokeWidth="26"
                strokeLinecap="round"
              />
              <path
                d="M96 376V330Q96 302 125 302H187Q207 302 223 286L322 186Q338 170 362 170H414Q446 170 446 138V112"
                stroke="url(#route-gradient)"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <circle cx="96" cy="376" r="15" fill="#09291D" stroke="#00E676" strokeWidth="3" />
              <circle cx="96" cy="376" r="5" fill="#00E676" />
              <circle cx="279" cy="229" r="11" fill="#00E676" />
              <circle cx="279" cy="229" r="24" stroke="#00E676" strokeOpacity=".24" />
              <circle cx="446" cy="112" r="15" fill="#09291D" stroke="#00E676" strokeWidth="3" />
              <circle cx="446" cy="112" r="5" fill="#00E676" />
            </svg>
            <span className={`${styles.routeLabel} ${styles.origin}`}>
              <small>PONTO DE PARTIDA</small>
              <strong>Seu estabelecimento</strong>
            </span>
            <span className={`${styles.routeLabel} ${styles.courier}`}>
              <span className={styles.routeDot} />
              Coleta e percurso
            </span>
            <span className={`${styles.routeLabel} ${styles.destination}`}>
              <small>CADA PEDIDO, UM DESTINO</small>
              <strong>A conexão se completa.</strong>
            </span>
            <span className={styles.visualCaption}>
              UMA OPERAÇÃO CONECTADA <span aria-hidden="true">↗</span>
            </span>
          </div>
        </section>
        <div className={styles.promiseStrip} aria-label="Pilares da ORBITA">
          <span>Do pedido à entrega.</span>
          <span>Visibilidade no percurso.</span>
          <span>Tudo na mesma órbita.</span>
        </div>
        <section className={styles.how} id="como-funciona" aria-labelledby="how-title">
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>DO INÍCIO AO DESTINO</p>
            <h2 id="how-title">
              Menos etapas soltas.
              <br />
              Mais conexão.
            </h2>
            <p>Um fluxo para quem prepara, para quem leva e para quem acompanha.</p>
          </div>
          <ol className={styles.steps}>
            {steps.map((step) => (
              <li key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.audiences} id="para-voce" aria-labelledby="audience-title">
          <div className={styles.audienceHeading}>
            <p className={styles.eyebrow}>SEU LUGAR NA ORBITA</p>
            <h2 id="audience-title">
              Duas pontas.
              <br />A mesma direção.
            </h2>
          </div>
          <article className={styles.audience}>
            <span className={styles.audienceIndex}>PARA ESTABELECIMENTOS</span>
            <h3>
              Sua operação
              <br />
              em movimento.
            </h3>
            <p>
              Organize unidades e entregas, acompanhe os pedidos e consulte os indicadores do seu negócio
              em um único painel.
            </p>
            <Link href="/cadastro/empresa">
              Cadastrar meu estabelecimento <Arrow />
            </Link>
          </article>
          <article className={styles.audience}>
            <span className={styles.audienceIndex}>PARA ENTREGADORES</span>
            <h3>
              O próximo destino
              <br />
              começa aqui.
            </h3>
            <p>
              Gerencie sua disponibilidade, consulte ofertas, siga as paradas da rota e acompanhe seus
              ganhos pela plataforma.
            </p>
            <Link href="/cadastro/entregador">
              Quero ser entregador <Arrow />
            </Link>
          </article>
        </section>
        <section className={styles.cta} aria-labelledby="cta-title">
          <div>
            <p className={styles.eyebrow}>VAMOS CONECTAR?</p>
            <h2 id="cta-title">Entre na sua próxima órbita.</h2>
          </div>
          <Link href="/cadastro" className={styles.primary}>
            Criar minha conta <Arrow />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.brand} aria-label="Início ORBITA">
          <Logo inverse />
        </Link>
        <p>
          Entregas inteligentes.
          <br />
          Mais entregas. Menos caminho.
        </p>
        <nav aria-label="Informações">
          <Link href="/termos">Termos de uso</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/login">Acessar minha conta</Link>
        </nav>
      </footer>
    </div>
  );
}
