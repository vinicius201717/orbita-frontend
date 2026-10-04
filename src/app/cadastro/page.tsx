import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import styles from './signup.module.css';

function StoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M4 10v9h16v-9" />
      <path d="M3 5h18l-2 5a3 3 0 0 1-4 1 3 3 0 0 1-6 0 3 3 0 0 1-4-1L3 5Z" />
      <path d="M9 19v-5h6v5" />
    </svg>
  );
}

function DriverIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.3 18h5.2l2.4-6H10l-2-3H5" />
      <path d="M15.7 12 14 8h3" />
      <path d="M12 18h3.7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

export default function Signup() {
  return (
    <main className={`${styles.page}`}>
      <div className={styles.background}>
        <div className={styles.glowTop} />
        <div className={styles.glowBottom} />

        <svg className={styles.orbitLine} viewBox="0 0 800 800" fill="none" aria-hidden="true">
          <path d="M-50 610C150 290 388 695 850 120" stroke="currentColor" strokeWidth="1" />
          <circle cx="162" cy="480" r="5" fill="currentColor" />
          <circle cx="515" cy="447" r="5" fill="currentColor" />
          <circle cx="716" cy="257" r="5" fill="currentColor" />
        </svg>
      </div>

      <header className={styles.header}>
        <Logo inverse />

        <Link href="/login" className={styles.headerLogin}>
          Entrar
        </Link>
      </header>

      <section className={styles.content}>
        <div className={styles.badge}>
          <span />
          Comece agora
        </div>

        <h1>
          Como você quer usar
          <br />a <span>ORBITA?</span>
        </h1>

        <p className={styles.description}>
          Escolha seu perfil para começarmos a configurar sua experiência dentro da nossa rede logística
          inteligente.
        </p>

        <div className={styles.cards}>
          <Link href="/cadastro/empresa" className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.iconContainer}>
                <StoreIcon />
              </div>

              <span className={styles.cardTag}>PARA EMPRESAS</span>
            </div>

            <div className={styles.cardContent}>
              <h2>Sou um estabelecimento</h2>

              <p>Quero enviar minhas entregas e utilizar a rede logística inteligente da ORBITA.</p>

              <ul>
                <li>
                  <span />
                  Solicite entregas quando precisar
                </li>

                <li>
                  <span />
                  Reduza atrasos e quilômetros desnecessários
                </li>

                <li>
                  <span />
                  Acompanhe toda a operação em tempo real
                </li>
              </ul>
            </div>

            <div className={styles.cardFooter}>
              <span>Cadastrar estabelecimento</span>

              <div className={styles.arrow}>
                <ArrowIcon />
              </div>
            </div>
          </Link>

          <Link href="/cadastro/entregador" className={`${styles.card} ${styles.featuredCard}`}>
            <div className={styles.cardTop}>
              <div className={`${styles.iconContainer} ${styles.driverIcon}`}>
                <DriverIcon />
              </div>

              <span className={styles.cardTag}>PARA ENTREGADORES</span>
            </div>

            <div className={styles.cardContent}>
              <h2>Sou entregador</h2>

              <p>Quero receber oportunidades de entrega e participar de rotas mais inteligentes.</p>

              <ul>
                <li>
                  <span />
                  Receba oportunidades compatíveis com você
                </li>

                <li>
                  <span />
                  Menos quilômetros vazios
                </li>

                <li>
                  <span />
                  Mais eficiência por hora e por km
                </li>
              </ul>
            </div>

            <div className={styles.cardFooter}>
              <span>Cadastrar como entregador</span>

              <div className={styles.arrow}>
                <ArrowIcon />
              </div>
            </div>
          </Link>
        </div>

        <div className={styles.login}>
          <span>Já possui uma conta?</span>

          <Link href="/login">
            Fazer login
            <ArrowIcon />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© ORBITA</span>

        <div className={styles.footerMessage}>
          <span className={styles.footerLine} />
          Mais entregas. Menos caminho.
        </div>
      </footer>
    </main>
  );
}
