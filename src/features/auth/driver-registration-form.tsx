'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverRegistrationSchema, type DriverRegistration } from './schemas';
import { api, ApiError, requestJson } from '@/services/api/client';
import type { DriverProfile } from '@/features/driver/types';
import { useAuth } from '@/providers/auth-provider';
import { Button, FormField, Input, Select } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
const steps = ['Conta', 'Veículo', 'Consentimentos', 'Revisão'];
const fields: FieldPath<DriverRegistration>[][] = [
  ['name', 'email', 'phone', 'password', 'confirmPassword'],
  ['type', 'plate', 'brand', 'model', 'capacityUnits'],
  ['gpsConsent'],
];
type AccountSnapshot = { id: string; email: string; password: string };
type VehicleDraft = Pick<DriverRegistration, 'type' | 'plate' | 'capacityUnits'> & {
  brand?: string;
  model?: string;
};
export function DriverRegistrationForm() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const accountCreated = account !== null;
  const [vehicleCreated, setVehicleCreated] = useState(false);
  const [vehicleSubmission, setVehicleSubmission] = useState<VehicleDraft | null>(null);
  const [consentCreated, setConsentCreated] = useState(false);
  const { login, refresh } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DriverRegistration>({
    resolver: zodResolver(driverRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      type: 'MOTORCYCLE',
      plate: '',
      brand: '',
      model: '',
      capacityUnits: 100,
      gpsConsent: false,
    },
  });
  const text = (name: FieldPath<DriverRegistration>, label: string, type = 'text') => (
    <FormField key={name} id={'driver-signup-' + name} label={label} error={errors[name]?.message}>
      <Input
        type={type}
        readOnly={
          (accountCreated && fields[0].includes(name)) ||
          (!!vehicleSubmission && fields[1].includes(name))
        }
        autoComplete={name === 'password' || name === 'confirmPassword' ? 'new-password' : undefined}
        {...register(name)}
      />
    </FormField>
  );
  return (
    <form
      noValidate
      className="form registration-wizard"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          let registeredAccount = account;
          if (!registeredAccount) {
            const registered = await requestJson<{ id: string }>('/api/session/register', {
              method: 'POST',
              body: JSON.stringify({
                name: values.name,
                email: values.email,
                phone: values.phone,
                password: values.password,
                role: 'DRIVER',
              }),
            });
            registeredAccount = { id: registered.id, email: values.email, password: values.password };
            setAccount(registeredAccount);
          }
          const user = await login(registeredAccount.email, registeredAccount.password);
          if (user.id !== registeredAccount.id || user.role !== 'DRIVER')
            throw new Error('A conta da sessão mudou. Entre na conta criada para concluir o cadastro.');
          if (!vehicleCreated) {
            const draft = vehicleSubmission ?? {
              type: values.type,
              plate: values.plate,
              brand: values.brand || undefined,
              model: values.model || undefined,
              capacityUnits: values.capacityUnits,
            };
            const profile = await api.get<DriverProfile>('/driver/me');
            if (profile.userId !== registeredAccount.id)
              throw new Error(
                'A conta da sessão mudou. Entre na conta criada para concluir o cadastro.',
              );
            const plate = draft.plate.replace(/-/g, '').toUpperCase();
            if (
              profile.vehicles.some((vehicle) => vehicle.plate.replace(/-/g, '').toUpperCase() === plate)
            ) {
              setVehicleCreated(true);
              setVehicleSubmission(draft);
            } else {
              if (vehicleSubmission)
                throw new Error(
                  'O veículo ainda não apareceu na consulta. Retome para consultar novamente ou confira o perfil antes de fazer outro cadastro.',
                );
              setVehicleSubmission(draft);
              try {
                await api.post('/driver/vehicles', draft);
                setVehicleCreated(true);
              } catch (cause) {
                if (
                  cause instanceof ApiError &&
                  cause.status >= 400 &&
                  cause.status < 500 &&
                  cause.status !== 408
                )
                  setVehicleSubmission(null);
                throw cause;
              }
            }
          }
          if (values.gpsConsent && !consentCreated) {
            await api.post('/driver/consent', { granted: true });
            setConsentCreated(true);
          }
          await refresh();
          router.push('/app/entregador/onboarding');
          router.refresh();
        } catch (cause) {
          setError(cause);
        }
      })}
    >
      <ol aria-label="Etapas">
        {steps.map((label, index) => (
          <li key={label} aria-current={index === step ? 'step' : undefined}>
            {label}
          </li>
        ))}
      </ol>
      <p>
        Etapa {step + 1} de {steps.length}: {steps[step]}
      </p>
      <fieldset disabled={isSubmitting}>
        <legend>{steps[step]}</legend>
        {step === 0 && (
          <>
            {text('name', 'Nome')}
            {text('email', 'E-mail', 'email')}
            {text('phone', 'Telefone (formato internacional)', 'tel')}
            {text('password', 'Senha', 'password')}
            {text('confirmPassword', 'Confirmar senha', 'password')}
          </>
        )}
        {step === 1 && (
          <>
            <FormField id="driver-signup-type" label="Tipo de veículo" error={errors.type?.message}>
              <Select {...register('type')} disabled={!!vehicleSubmission}>
                <option value="MOTORCYCLE">Moto</option>
                <option value="CAR">Carro</option>
                <option value="UTILITY">Utilitário</option>
                <option value="VAN">Van</option>
              </Select>
            </FormField>
            {text('plate', 'Placa (letras maiúsculas)')}
            {text('brand', 'Marca (opcional)')}
            {text('model', 'Modelo (opcional)')}
            <FormField
              id="driver-signup-capacity"
              label="Capacidade em unidades"
              error={errors.capacityUnits?.message}
            >
              <Input
                readOnly={!!vehicleSubmission}
                type="number"
                min={1}
                {...register('capacityUnits', { valueAsNumber: true })}
              />
            </FormField>
          </>
        )}
        {step === 2 && (
          <>
            <FormField
              id="driver-signup-gps"
              label="Autorizo o uso da minha localização durante a operação logística"
            >
              <Input type="checkbox" {...register('gpsConsent')} disabled={consentCreated} />
            </FormField>
            <p>
              Você pode registrar ou revogar essa autorização no perfil. Ela é necessária para ficar
              disponível.
            </p>
            <p>
              Rastreamento contínuo em segundo plano deverá ser realizado pelo aplicativo companion
              Android/iOS.
            </p>
            <p>
              Verificação e consentimento de WhatsApp exigem atendimento administrativo. O cadastro web
              não ativa essa integração.
            </p>
            <p>
              <Link href="/termos">Termos</Link> e <Link href="/privacidade">privacidade</Link>:
              documentos preliminares pendentes de revisão. O serviço ainda não possui registro de aceite
              jurídico.
            </p>
          </>
        )}
        {step === 3 && (
          <dl>
            <dt>Nome</dt>
            <dd>{getValues('name')}</dd>
            <dt>Contato</dt>
            <dd>
              {getValues('email')} — {getValues('phone')}
            </dd>
            <dt>Veículo</dt>
            <dd>
              {getValues('type')} — {getValues('plate')}
            </dd>
            <dt>Capacidade</dt>
            <dd>{getValues('capacityUnits')}</dd>
            <dt>Autorização de localização</dt>
            <dd>{getValues('gpsConsent') ? 'Sim' : 'Não'}</dd>
          </dl>
        )}
      </fieldset>
      {accountCreated && <p role="status">Conta criada. Retome para concluir as etapas restantes.</p>}
      {accountCreated && <p>Os dados da conta criada permanecem fixos durante a retomada.</p>}
      {vehicleSubmission && !vehicleCreated && (
        <p role="status">
          A confirmação do veículo está pendente. Retomar consulta o perfil sem reenviar automaticamente
          o cadastro.
        </p>
      )}
      {!!error && <ErrorState error={error} />}
      <div className="form-actions">
        {step > 0 && (
          <Button onClick={() => setStep((value) => value - 1)} disabled={isSubmitting}>
            Voltar
          </Button>
        )}
        {step < 3 ? (
          <Button
            onClick={async () => {
              if (await trigger(fields[step])) setStep((value) => value + 1);
            }}
          >
            Continuar
          </Button>
        ) : (
          <Button type="submit" loading={isSubmitting}>
            {accountCreated ? 'Retomar cadastro' : 'Criar minha conta'}
          </Button>
        )}
      </div>
      <p>O envio de documentos e a análise serão apresentados no onboarding.</p>
    </form>
  );
}
