'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, Input, Select, Textarea } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { businessSchema, branchSchema, type BusinessInput, type BranchInput } from './schemas';
export type { BusinessInput, BranchInput } from './schemas';
type Props<T> = {
  onSubmit: (values: T) => Promise<void>;
  initialValues?: Partial<T>;
  submitLabel?: string;
};
export function BusinessForm({
  onSubmit,
  initialValues,
  submitLabel = 'Salvar empresa',
}: Props<BusinessInput>) {
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessInput>({
    resolver: zodResolver(businessSchema),
    defaultValues: { category: 'FOOD', ...initialValues },
  });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          await onSubmit(values);
        } catch (cause) {
          setError(cause);
        }
      })}
      noValidate
    >
      <FormField id="legalName" label="Razão social" error={errors.legalName?.message}>
        <Input {...register('legalName')} autoComplete="organization" required maxLength={180} />
      </FormField>
      <FormField id="tradeName" label="Nome fantasia" error={errors.tradeName?.message}>
        <Input {...register('tradeName')} required maxLength={120} />
      </FormField>
      <FormField
        id="document"
        label="Documento da empresa"
        error={errors.document?.message}
        hint="De 11 a 14 dígitos, sem pontuação."
      >
        <Input {...register('document')} inputMode="numeric" required maxLength={14} />
      </FormField>
      <FormField
        id="businessPhone"
        label="Telefone da empresa"
        error={errors.phone?.message}
        hint="Formato internacional: +5562999999999."
      >
        <Input {...register('phone')} type="tel" autoComplete="tel" required />
      </FormField>
      <FormField id="businessEmail" label="E-mail da empresa" error={errors.email?.message}>
        <Input {...register('email')} type="email" autoComplete="email" required />
      </FormField>
      <FormField id="category" label="Categoria" error={errors.category?.message}>
        <Select {...register('category')}>
          <option value="FOOD">Alimentação</option>
          <option value="PHARMACY">Farmácia</option>
          <option value="BEVERAGE_DISTRIBUTOR">Distribuidora de bebidas</option>
        </Select>
      </FormField>
      {!!error && <ErrorState error={error} />}
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
export function BranchForm({
  onSubmit,
  initialValues,
  submitLabel = 'Cadastrar unidade',
}: Props<BranchInput>) {
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: { timezone: 'America/Sao_Paulo', ...initialValues },
  });
  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          await onSubmit(values);
        } catch (cause) {
          setError(cause);
        }
      })}
      noValidate
    >
      <FormField id="branchName" label="Nome da unidade" error={errors.name?.message}>
        <Input {...register('name')} required maxLength={120} />
      </FormField>
      <FormField
        id="branchAddress"
        label="Endereço completo"
        hint="Inclua rua, número, complemento, bairro, cidade, estado e CEP."
        error={errors.address?.message}
      >
        <Textarea {...register('address')} autoComplete="street-address" required maxLength={300} />
      </FormField>
      <p>
        A localização deve corresponder ao ponto de coleta. A busca automática de endereços não está
        disponível nesta integração.
      </p>
      <FormField id="branchLatitude" label="Latitude" error={errors.latitude?.message}>
        <Input
          {...register('latitude', { valueAsNumber: true })}
          type="number"
          step="any"
          min={-90}
          max={90}
          required
        />
      </FormField>
      <FormField id="branchLongitude" label="Longitude" error={errors.longitude?.message}>
        <Input
          {...register('longitude', { valueAsNumber: true })}
          type="number"
          step="any"
          min={-180}
          max={180}
          required
        />
      </FormField>
      <FormField id="branchTimezone" label="Fuso horário" error={errors.timezone?.message}>
        <Input {...register('timezone')} required />
      </FormField>
      {!!error && <ErrorState error={error} />}
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
