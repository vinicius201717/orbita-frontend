import Link from 'next/link';
export default function Signup() {
  return (
    <main>
      <h1>Como você quer usar a ORBITA?</h1>
      <section>
        <h2>Sou um estabelecimento</h2>
        <p>Quero enviar minhas entregas e utilizar a rede logística da ORBITA.</p>
        <Link href="/cadastro/empresa">Cadastrar estabelecimento</Link>
      </section>
      <section>
        <h2>Sou entregador</h2>
        <p>Quero receber oportunidades de entrega e rotas inteligentes.</p>
        <Link href="/cadastro/entregador">Cadastrar como entregador</Link>
      </section>
      <p>
        <Link href="/login">Já tenho uma conta</Link>
      </p>
    </main>
  );
}
