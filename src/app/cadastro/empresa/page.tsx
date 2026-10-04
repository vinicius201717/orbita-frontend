import { BusinessRegistrationForm } from '@/features/auth/business-registration-form';
import { AuthShell } from '@/components/layout/auth-shell';
export default function BusinessSignup() {
  return (
    <AuthShell title="Cadastrar estabelecimento" description="Sua empresa conectada a uma nova forma de entregar.">
      <BusinessRegistrationForm />
    </AuthShell>
  );
}
