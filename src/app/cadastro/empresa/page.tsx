import { BusinessRegistrationForm } from '@/features/auth/business-registration-form';
export default function BusinessSignup() {
  return (
    <main className="auth-page">
      <h1>Cadastrar estabelecimento</h1>
      <BusinessRegistrationForm />
    </main>
  );
}
