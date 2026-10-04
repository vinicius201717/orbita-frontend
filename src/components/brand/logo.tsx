import Image from 'next/image';
import styles from './logo.module.css';
export function Logo({
  compact = false,
  inverse = false,
  className = '',
}: {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${styles.logo} ${inverse ? styles.inverse : ''} ${className}`}
      aria-label="ORBITA — Entregas inteligentes"
    >
      <Image
        src="/brand/orbita-symbol.png"
        alt=""
        width={56}
        height={56}
        className={styles.symbol}
        priority
      />
      {!compact && (
        <span className={styles.wordmark}>
          <strong>ORBITA</strong>
          <span>ENTREGAS INTELIGENTES</span>
        </span>
      )}
    </span>
  );
}
