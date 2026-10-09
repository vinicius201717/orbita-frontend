'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormField, Input, Select } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { DeliveryAddressField, type DeliveryAddress } from '@/features/orders-address/address-field';
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
  const [location, setLocation] = useState<DeliveryAddress | null>(
    initialValues?.address && initialValues.latitude != null && initialValues.longitude != null
      ? {
          address: initialValues.address,
          latitude: initialValues.latitude,
          longitude: initialValues.longitude,
        }
      : null,
  );
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: { timezone: 'America/Sao_Paulo', ...initialValues },
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!location) {
          setError(new Error('Confirme o endereço e o ponto de coleta antes de salvar.'));
          return;
        }
        void handleSubmit(async (values) => {
          setError(null);
          try {
            await onSubmit(values);
          } catch (cause) {
            setError(cause);
          }
        })(event);
      }}
    >
      <FormField id="branchName" label="Nome da unidade" error={errors.name?.message}>
        <Input {...register('name')} placeholder="Ex.: Loja Centro" required maxLength={120} />
      </FormField>
      <DeliveryAddressField
        label="Endereço da unidade de coleta"
        allowCurrentPosition
        value={location}
        onChange={(value) => {
          setLocation(value);
          setError(null);
          if (value) {
            setValue('address', value.address, { shouldValidate: true });
            setValue('latitude', value.latitude, { shouldValidate: true });
            setValue('longitude', value.longitude, { shouldValidate: true });
          }
        }}
      />
      <FormField id="branchTimezone" label="Fuso horário da loja" error={errors.timezone?.message}>
        <Select {...register('timezone')}>
          <option value="America/Sao_Paulo">Horário de Brasília</option>
          <option value="America/Manaus">Horário de Manaus</option>
          <option value="America/Rio_Branco">Horário do Acre</option>
          <option value="America/Noronha">Horário de Fernando de Noronha</option>
          {initialValues?.timezone &&
            !['America/Sao_Paulo', 'America/Manaus', 'America/Rio_Branco', 'America/Noronha'].includes(
              initialValues.timezone,
            ) && <option value={initialValues.timezone}>{initialValues.timezone}</option>}
        </Select>
      </FormField>
      {!!error && <ErrorState error={error} />}
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
