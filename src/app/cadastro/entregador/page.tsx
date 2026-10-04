import { DriverRegistrationForm } from '@/features/auth/driver-registration-form';
import { AuthShell } from '@/components/layout/auth-shell';
export default function DriverSignup() {
  return (
    <AuthShell title="Cadastrar como entregador" description="Crie sua conta, informe seu veículo e prepare-se para rodar.">
      <DriverRegistrationForm />
    </AuthShell>
  );
}
