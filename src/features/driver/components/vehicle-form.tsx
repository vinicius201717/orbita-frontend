'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button, FormField, Input, Select, ConfirmDialog } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { useNotify } from '@/providers/notification-provider';
import { driverApi } from '@/services/api/driver.api';
import { vehicleSchema, type VehicleInput } from '../schemas';
import type { Vehicle } from '../types';
import { CARGO_LABELS, VEHICLE_LABELS } from '../labels';
import { useDriverInvalidation } from '../queries';

export function VehicleForm({
  onSuccess,
  disabled = false,
  replacing = false,
}: {
  onSuccess?: (vehicle: Vehicle) => void;
  disabled?: boolean;
  replacing?: boolean;
}) {
  const [pending, setPending] = useState<VehicleInput | null>(null);
  const invalidate = useDriverInvalidation();
  const { notify } = useNotify();
  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      type: 'MOTORCYCLE',
      plate: '',
      brand: '',
      model: '',
      capacityUnits: 100,
      compatibleCategories: [],
    },
  });
  const mutation = useMutation({
    mutationFn: driverApi.vehicle,
    onSuccess: async (vehicle) => {
      await invalidate();
      notify('Veículo cadastrado.', 'success');
      setPending(null);
      form.reset();
      onSuccess?.(vehicle);
    },
  });
  const optionalNumber = { setValueAs: (value: string) => (value === '' ? undefined : Number(value)) };
  const submit = (data: VehicleInput) => {
    if (replacing) setPending(data);
    else mutation.mutate(data);
  };
  return (
    <>
      <form className="form vehicle-form" onSubmit={form.handleSubmit(submit)} noValidate>
        <fieldset disabled={disabled || mutation.isPending}>
          <legend>Dados do veículo</legend>
          <FormField id="vehicle-type" label="Tipo" error={form.formState.errors.type?.message}>
            <Select id="vehicle-type" {...form.register('type')}>
              {Object.entries(VEHICLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField id="vehicle-plate" label="Placa" error={form.formState.errors.plate?.message}>
            <Input id="vehicle-plate" autoCapitalize="characters" {...form.register('plate')} />
          </FormField>
          <FormField
            id="vehicle-brand"
            label="Marca (opcional)"
            error={form.formState.errors.brand?.message}
          >
            <Input id="vehicle-brand" {...form.register('brand')} />
          </FormField>
          <FormField
            id="vehicle-model"
            label="Modelo (opcional)"
            error={form.formState.errors.model?.message}
          >
            <Input id="vehicle-model" {...form.register('model')} />
          </FormField>
          <FormField
            id="vehicle-year"
            label="Ano (opcional)"
            error={form.formState.errors.year?.message}
          >
            <Input
              id="vehicle-year"
              type="number"
              min={1970}
              max={2100}
              {...form.register('year', optionalNumber)}
            />
          </FormField>
          <FormField
            id="vehicle-capacity"
            label="Capacidade em unidades"
            error={form.formState.errors.capacityUnits?.message}
          >
            <Input
              id="vehicle-capacity"
              type="number"
              min={1}
              max={100000}
              {...form.register('capacityUnits', { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            id="vehicle-weight"
            label="Peso máximo em gramas (opcional)"
            error={form.formState.errors.weightCapacityGrams?.message}
          >
            <Input
              id="vehicle-weight"
              type="number"
              min={1}
              {...form.register('weightCapacityGrams', optionalNumber)}
            />
          </FormField>
          <FormField
            id="vehicle-volume"
            label="Volume máximo em cm³ (opcional)"
            error={form.formState.errors.volumeCapacityCm3?.message}
          >
            <Input
              id="vehicle-volume"
              type="number"
              min={1}
              {...form.register('volumeCapacityCm3', optionalNumber)}
            />
          </FormField>
          <fieldset>
            <legend>Cargas compatíveis (opcional)</legend>
            {Object.entries(CARGO_LABELS).map(([value, label]) => (
              <label key={value}>
                <input type="checkbox" value={value} {...form.register('compatibleCategories')} />{' '}
                {label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" loading={mutation.isPending}>
            {replacing ? 'Cadastrar novo veículo ativo' : 'Cadastrar veículo'}
          </Button>
        </fieldset>
        {mutation.isError && <ErrorState error={mutation.error} />}
      </form>
      <ConfirmDialog
        open={pending !== null}
        title="Substituir veículo ativo?"
        description="O novo cadastro desativará o veículo anterior. A troca só é permitida sem rota atribuída."
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) mutation.mutate(pending);
        }}
        loading={mutation.isPending}
      />
    </>
  );
}
