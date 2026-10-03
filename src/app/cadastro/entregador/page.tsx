import { DriverRegistrationForm } from '@/features/auth/driver-registration-form';
export default function DriverSignup() {
  return (
    <main className="auth-page">
      <h1>Cadastrar como entregador</h1>
      <DriverRegistrationForm />
    </main>
  );
}
