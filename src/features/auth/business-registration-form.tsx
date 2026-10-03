'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessRegistrationSchema, type BusinessRegistration } from './schemas';
import { api, ApiError, requestJson } from '@/services/api/client';
import type { Branch } from '@/features/business/types';
import { useAuth } from '@/providers/auth-provider';
import { Button, FormField, Input, Select } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
const steps = ['Conta', 'Empresa', 'Primeira unidade', 'Revisão'];
const fields: FieldPath<BusinessRegistration>[][] = [
  ['name', 'email', 'phone', 'password', 'confirmPassword'],
  ['legalName', 'tradeName', 'document', 'businessPhone', 'businessEmail', 'category'],
  ['branchName', 'address', 'latitude', 'longitude', 'timezone'],
];
type AccountSnapshot = { id: string; email: string; password: string };
type BranchDraft = Pick<Branch, 'name' | 'address' | 'latitude' | 'longitude' | 'timezone'>;
export function BusinessRegistrationForm() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [progress, setProgress] = useState('');
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const accountCreated = account !== null;
  const [createdBusiness, setCreatedBusiness] = useState<string | null>(null);
  const [createdBranch, setCreatedBranch] = useState<string | null>(null);
  const [branchSubmission, setBranchSubmission] = useState<BranchDraft | null>(null);
  const { login, refresh } = useAuth();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BusinessRegistration>({
    resolver: zodResolver(businessRegistrationSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      legalName: '',
      tradeName: '',
      document: '',
      businessPhone: '',
      businessEmail: '',
      category: 'FOOD',
      branchName: 'Principal',
      address: '',
      timezone: 'America/Sao_Paulo',
    },
  });
  const text = (name: FieldPath<BusinessRegistration>, label: string, type = 'text') => (
    <FormField key={name} id={'business-' + name} label={label} error={errors[name]?.message}>
      <Input
        type={type}
        readOnly={
          (accountCreated && fields[0].includes(name)) ||
          (!!branchSubmission && fields[2].includes(name))
        }
        autoComplete={name === 'password' || name === 'confirmPassword' ? 'new-password' : undefined}
        {...register(name)}
      />
    </FormField>
  );
  const submit = handleSubmit(async (values) => {
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
            role: 'BUSINESS_OWNER',
          }),
        });
        registeredAccount = { id: registered.id, email: values.email, password: values.password };
        setAccount(registeredAccount);
        setProgress('Conta criada. Concluindo empresa e unidade…');
      }
      const user = await login(registeredAccount.email, registeredAccount.password);
      if (user.id !== registeredAccount.id || user.role !== 'BUSINESS_OWNER')
        throw new Error('A conta da sessão mudou. Entre na conta criada para concluir o cadastro.');
      if (createdBusiness && user.businessId !== createdBusiness)
        throw new Error('A empresa vinculada à conta mudou. Confira o cadastro no painel.');
      let businessId = createdBusiness || user.businessId;
      if (!businessId) {
        const company = await api.post<{ id: string }>('/businesses', {
          legalName: values.legalName,
          tradeName: values.tradeName,
          document: values.document,
          phone: values.businessPhone,
          email: values.businessEmail,
          category: values.category,
        });
        businessId = company.id;
        setCreatedBusiness(company.id);
        setProgress('Conta e empresa criadas. Cadastrando unidade…');
      }
      if (!createdBranch) {
        const draft = branchSubmission ?? {
          name: values.branchName,
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
          timezone: values.timezone,
        };
        const branches = await api.get<Branch[]>('/businesses/' + businessId + '/branches');
        const existing = branches.find(
          (branch) =>
            branch.name === draft.name &&
            branch.address === draft.address &&
            branch.latitude === draft.latitude &&
            branch.longitude === draft.longitude &&
            branch.timezone === draft.timezone,
        );
        if (existing) {
          setCreatedBranch(existing.id);
          setBranchSubmission(draft);
        } else {
          if (branchSubmission)
            throw new Error(
              'A unidade ainda não apareceu na consulta. Retome para consultar novamente ou confira o painel antes de fazer outro cadastro.',
            );
          setBranchSubmission(draft);
          try {
            const branch = await api.post<{ id: string }>(
              '/businesses/' + businessId + '/branches',
              draft,
            );
            setCreatedBranch(branch.id);
          } catch (cause) {
            if (
              cause instanceof ApiError &&
              cause.status >= 400 &&
              cause.status < 500 &&
              cause.status !== 408
            )
              setBranchSubmission(null);
            throw cause;
          }
        }
      }
      await refresh();
      router.push('/app/onboarding');
      router.refresh();
    } catch (cause) {
      setError(cause);
    }
  });
  return (
    <form onSubmit={submit} noValidate className="form registration-wizard">
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
            {text('phone', 'Telefone da conta (formato internacional)', 'tel')}
            {text('password', 'Senha', 'password')}
            {text('confirmPassword', 'Confirmar senha', 'password')}
          </>
        )}
        {step === 1 && (
          <>
            {text('legalName', 'Razão social')}
            {text('tradeName', 'Nome fantasia')}
            {text('document', 'Documento (somente dígitos)')}
            {text('businessPhone', 'Telefone da empresa', 'tel')}
            {text('businessEmail', 'E-mail da empresa', 'email')}
            <FormField id="business-category" label="Categoria" error={errors.category?.message}>
              <Select {...register('category')}>
                <option value="FOOD">Alimentação</option>
                <option value="PHARMACY">Farmácia</option>
                <option value="BEVERAGE_DISTRIBUTOR">Distribuidora de bebidas</option>
              </Select>
            </FormField>
          </>
        )}
        {step === 2 && (
          <>
            {text('branchName', 'Nome da unidade')}
            {text('address', 'Endereço completo — rua, número, bairro, cidade, estado e CEP')}
            <p>
              A conversão automática de endereço em coordenadas não está disponível. Informe as
              coordenadas do local da coleta.
            </p>
            <FormField id="business-latitude" label="Latitude" error={errors.latitude?.message}>
              <Input
                readOnly={!!branchSubmission}
                type="number"
                step="any"
                {...register('latitude', { valueAsNumber: true })}
              />
            </FormField>
            <FormField id="business-longitude" label="Longitude" error={errors.longitude?.message}>
              <Input
                readOnly={!!branchSubmission}
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
              />
            </FormField>
            {text('timezone', 'Fuso horário da unidade')}
          </>
        )}
        {step === 3 && (
          <dl>
            <dt>Responsável</dt>
            <dd>
              {getValues('name')} — {getValues('email')}
            </dd>
            <dt>Empresa</dt>
            <dd>
              {getValues('tradeName')} ({getValues('legalName')})
            </dd>
            <dt>Documento</dt>
            <dd>{getValues('document')}</dd>
            <dt>Contato da empresa</dt>
            <dd>
              {getValues('businessPhone')} — {getValues('businessEmail')}
            </dd>
            <dt>Unidade</dt>
            <dd>
              {getValues('branchName')} — {getValues('address')}
            </dd>
            <dt>Coordenadas</dt>
            <dd>
              {getValues('latitude')}, {getValues('longitude')}
            </dd>
            <dt>Fuso</dt>
            <dd>{getValues('timezone')}</dd>
          </dl>
        )}
      </fieldset>
      <p role="status">{progress}</p>
      {!!error && <ErrorState error={error} />}
      <div className="form-actions">
        {step > 0 && (
          <Button disabled={isSubmitting} onClick={() => setStep((value) => value - 1)}>
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
      <p>
        Se alguma etapa falhar depois da criação da conta, ela permanece criada. Retome aqui ou entre
        para concluir o onboarding.
      </p>
      {accountCreated && <p>Os dados da conta criada permanecem fixos durante a retomada.</p>}
      {branchSubmission && !createdBranch && (
        <p role="status">
          A confirmação da unidade está pendente. Retomar consulta as unidades existentes sem reenviar
          automaticamente o cadastro.
        </p>
      )}
    </form>
  );
}
