'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  PageHeader,
  Button,
  FormField,
  Input,
  Select,
  Textarea,
  Checkbox,
  Card,
  StatusBadge,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, SuccessMessage } from '@/components/feedback';
import { useAuth } from '@/providers/auth-provider';
import { useBranches } from '@/features/business/queries';
import { deliveryApi } from '@/services/api/delivery.api';
import { statusLabel } from '@/constants/status';
import { formatDate, formatDuration } from '@/lib/format';
import { deliverySchema, type DeliveryInput } from './schemas';
import { cargoCategories, type Delivery } from './types';
import { DeliveryAddressField, type DeliveryAddress } from '@/features/orders-address/address-field';
const optionalNumber = { setValueAs: (value: string) => (value === '' ? undefined : Number(value)) };
export function NewDeliveryPage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<DeliveryAddress | null>(null);
  const branches = useBranches();
  const client = useQueryClient();
  const [review, setReview] = useState<DeliveryInput | null>(null);
  const [created, setCreated] = useState<Delivery | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const request = useRef<{ key: string; signature: string } | null>(null);
  const form = useForm<DeliveryInput>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      branchId: '',
      customer: { name: '', phone: '', optIn: false },
      dropoff: { complement: '' },
      items: [{ name: '', quantity: 1 }],
      serviceLevel: 'SMART',
      category: 'AMBIENT',
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;
  const items = useFieldArray({ control, name: 'items' });
  async function create() {
    if (!review || pending) return;
    const signature = JSON.stringify(review);
    if (request.current?.signature !== signature)
      request.current = { signature, key: crypto.randomUUID() };
    setPending(true);
    setError(null);
    try {
      const delivery = await deliveryApi.create(review, request.current.key);
      setCreated(delivery);
      await client.invalidateQueries({ queryKey: ['deliveries'] });
      await client.invalidateQueries({ queryKey: ['business'] });
    } catch (cause) {
      setError(cause);
    } finally {
      setPending(false);
    }
  }
  if (!user?.businessId)
    return (
      <EmptyState title="Cadastre a empresa antes de criar uma entrega">
        <Link href="/app/onboarding">Configuração inicial</Link>
      </EmptyState>
    );
  if (branches.isPending) return <LoadingState message="Carregando unidades…" />;
  if (branches.error) return <ErrorState error={branches.error} retry={() => void branches.refetch()} />;
  const activeBranches = branches.data?.filter((branch) => branch.active) ?? [];
  if (!activeBranches.length)
    return (
      <EmptyState title="Cadastre uma unidade ativa">
        <Link href="/app/unidades/nova">Nova unidade</Link>
      </EmptyState>
    );
  if (created)
    return (
      <>
        <PageHeader title="Entrega registrada" />
        <SuccessMessage>Entrega registrada com sucesso.</SuccessMessage>
        <p>Código: {created.id}</p>
        <p>
          Distribuição: <StatusBadge status={created.status} />. Preparação:{' '}
          <StatusBadge status={created.readinessStatus} />.
        </p>
        <Link href={`/app/entregas/${created.id}`}>Ver entrega</Link>
        {' · '}
        <Button
          onClick={() => {
            form.reset();
            setLocation(null);
            setCreated(null);
            setReview(null);
            request.current = null;
          }}
        >
          Criar outra
        </Button>
      </>
    );
  if (review)
    return (
      <>
        <PageHeader
          title="Revise a entrega"
          description="Confira os dados antes de registrar. Prazos e valores serão validados e calculados pelo backend."
        />
        <Card title="Cliente e destino">
          <dl>
            <dt>Cliente</dt>
            <dd>{review.customer.name}</dd>
            <dt>Telefone</dt>
            <dd>{review.customer.phone || 'Não informado'}</dd>
            <dt>Autoriza mensagens</dt>
            <dd>{review.customer.optIn ? 'Sim' : 'Não'}</dd>
            <dt>Endereço confirmado</dt>
            <dd>{location?.address}</dd>
            <dt>Complemento</dt>
            <dd>{review.dropoff.complement || 'Não informado'}</dd>
          </dl>
        </Card>
        <Card title="Pedido">
          <dl>
            <dt>Unidade</dt>
            <dd>{activeBranches.find((branch) => branch.id === review.branchId)?.name}</dd>
            <dt>Modalidade</dt>
            <dd>
              <StatusBadge status={review.serviceLevel} />
            </dd>
            <dt>Categoria da carga</dt>
            <dd>
              <StatusBadge status={review.category} />
            </dd>
            <dt>Unidades de capacidade</dt>
            <dd>{review.capacityUnits ?? 'Padrão do backend'}</dd>
            <dt>Peso</dt>
            <dd>{review.weightGrams ? `${review.weightGrams} g` : 'Não informado'}</dd>
            <dt>Volume</dt>
            <dd>{review.volumeCm3 ? `${review.volumeCm3} cm³` : 'Não informado'}</dd>
            <dt>Temperatura</dt>
            <dd>{review.temperatureRequirement || 'Não informada'}</dd>
            <dt>Embalagem</dt>
            <dd>{review.packageType || 'Não informada'}</dd>
            <dt>Previsão de preparo</dt>
            <dd>{review.estimatedReadyAt ? formatDate(review.estimatedReadyAt) : 'Não informada'}</dd>
            <dt>Limite para coleta</dt>
            <dd>{review.pickupDeadline ? formatDate(review.pickupDeadline) : 'Padrão do backend'}</dd>
            <dt>Limite para entrega</dt>
            <dd>
              {review.deliveryDeadline ? formatDate(review.deliveryDeadline) : 'Padrão do backend'}
            </dd>
            <dt>Duração máxima</dt>
            <dd>
              {review.maxDeliveryDurationSeconds
                ? formatDuration(review.maxDeliveryDurationSeconds)
                : 'Padrão do backend'}
            </dd>
            <dt>Referência externa</dt>
            <dd>{review.externalReference || 'Gerada para este pedido'}</dd>
          </dl>
          <ul>
            {review.items.map((item, index) => (
              <li key={index}>
                {item.quantity} × {item.name}
              </li>
            ))}
          </ul>
        </Card>
        {!!error && <ErrorState error={error} />}
        <Button onClick={() => setReview(null)} disabled={pending}>
          Voltar e editar
        </Button>
        <Button onClick={() => void create()} loading={pending}>
          Registrar entrega
        </Button>
      </>
    );
  return (
    <>
      <PageHeader title="Nova entrega" description="Informe a coleta, o cliente e os itens do pedido." />
      <form
        onSubmit={handleSubmit((data) => {
          if (!location) { setError(new Error('Confirme o endereço e o ponto de entrega.')); return; }
          setReview(data);
          setError(null);
        })}
        noValidate
      >
        <fieldset>
          <legend>Unidade de coleta</legend>
          <FormField id="deliveryBranch" label="Unidade" error={errors.branchId?.message}>
            <Select {...register('branchId')} required>
              <option value="">Selecione a unidade</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} — {branch.address}
                </option>
              ))}
            </Select>
          </FormField>
        </fieldset>
        <fieldset>
          <legend>Cliente</legend>
          <FormField id="customerName" label="Nome do cliente" error={errors.customer?.name?.message}>
            <Input {...register('customer.name')} maxLength={120} required />
          </FormField>
          <FormField
            id="customerPhone"
            label="Telefone (opcional)"
            error={errors.customer?.phone?.message}
            hint="Formato internacional: +5562999999999."
          >
            <Input {...register('customer.phone')} type="tel" />
          </FormField>
          <FormField
            id="customerOptIn"
            label="O cliente autorizou o envio de mensagens sobre esta entrega"
          >
            <Checkbox {...register('customer.optIn')} />
          </FormField>
        </fieldset>
        <fieldset>
          <legend>Local da entrega</legend>
          <DeliveryAddressField value={location} onChange={(value) => {
            setLocation(value); setError(null);
            if (value) {
              form.setValue('dropoff.latitude', value.latitude, { shouldValidate: true });
              form.setValue('dropoff.longitude', value.longitude, { shouldValidate: true });
            }
          }} />
          <FormField
            id="dropoffComplement"
            label="Complemento e referência (opcional)"
            error={errors.dropoff?.complement?.message}
          >
            <Textarea {...register('dropoff.complement')} maxLength={500} />
          </FormField>
        </fieldset>
        <fieldset>
          <legend>Itens do pedido</legend>
          {items.fields.map((item, index) => (
            <div key={item.id} className="delivery-item-row">
              <FormField
                id={`item-${index}`}
                label={`Item ${index + 1}`}
                error={errors.items?.[index]?.name?.message}
              >
                <Input {...register(`items.${index}.name`)} maxLength={120} required />
              </FormField>
              <FormField
                id={`quantity-${index}`}
                label={`Quantidade do item ${index + 1}`}
                error={errors.items?.[index]?.quantity?.message}
              >
                <Input
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  required
                />
              </FormField>
              <Button
                onClick={() => items.remove(index)}
                disabled={items.fields.length === 1}
                aria-label={`Remover item ${index + 1}`}
              >
                Remover item
              </Button>
            </div>
          ))}
          {errors.items?.root?.message && <p role="alert">{errors.items.root.message}</p>}
          <Button
            onClick={() => items.append({ name: '', quantity: 1 })}
            disabled={items.fields.length >= 100}
          >
            Adicionar item
          </Button>
        </fieldset>
        <fieldset>
          <legend>Serviço e carga</legend>
          <FormField id="serviceLevel" label="Modalidade" error={errors.serviceLevel?.message}>
            <Select {...register('serviceLevel')}>
              <option value="ECONOMY">Econômica</option>
              <option value="SMART">Inteligente</option>
              <option value="EXPRESS">Expressa</option>
            </Select>
          </FormField>
          <p>
            Econômica favorece agrupamentos. Inteligente equilibra agrupamento e prazo. Expressa recebe
            prioridade de serviço. Disponibilidade, preço e prazo são definidos pelo backend.
          </p>
          <FormField id="cargoCategory" label="Categoria da carga" error={errors.category?.message}>
            <Select {...register('category')}>
              {cargoCategories.map((category) => (
                <option key={category} value={category}>
                  {statusLabel(category)}
                </option>
              ))}
            </Select>
          </FormField>
          <details><summary>Detalhes opcionais da carga</summary>
          <FormField
            id="capacityUnits"
            label="Unidades de capacidade (opcional)"
            hint="Deixe vazio para usar o padrão da operação."
            error={errors.capacityUnits?.message}
          >
            <Input
              {...register('capacityUnits', optionalNumber)}
              type="number"
              min={1}
              max={100000}
              step={1}
            />
          </FormField>
          <FormField
            id="weightGrams"
            label="Peso em gramas (opcional)"
            error={errors.weightGrams?.message}
          >
            <Input
              {...register('weightGrams', optionalNumber)}
              type="number"
              min={1}
              max={100000000}
              step={1}
            />
          </FormField>
          <FormField id="volumeCm3" label="Volume em cm³ (opcional)" error={errors.volumeCm3?.message}>
            <Input
              {...register('volumeCm3', optionalNumber)}
              type="number"
              min={1}
              max={1000000000}
              step={1}
            />
          </FormField>
          <FormField
            id="temperatureRequirement"
            label="Requisito de temperatura (opcional)"
            error={errors.temperatureRequirement?.message}
          >
            <Input {...register('temperatureRequirement')} maxLength={80} />
          </FormField>
          <FormField
            id="packageType"
            label="Tipo de embalagem (opcional)"
            error={errors.packageType?.message}
          >
            <Input {...register('packageType')} maxLength={80} />
          </FormField>
          </details>
        </fieldset>
        <details><summary>Prazos e referência opcionais</summary><fieldset>
          <legend>Prazos e referência</legend>
          <p>
            Horários no fuso do seu navegador. Deixe os limites vazios para usar os prazos definidos pelo
            backend.
          </p>
          <FormField
            id="estimatedReadyAt"
            label="Previsão de preparo"
            error={errors.estimatedReadyAt?.message}
          >
            <Input {...register('estimatedReadyAt')} type="datetime-local" />
          </FormField>
          <FormField
            id="pickupDeadline"
            label="Limite para coleta"
            error={errors.pickupDeadline?.message}
          >
            <Input {...register('pickupDeadline')} type="datetime-local" />
          </FormField>
          <FormField
            id="deliveryDeadline"
            label="Limite para entrega"
            error={errors.deliveryDeadline?.message}
          >
            <Input {...register('deliveryDeadline')} type="datetime-local" />
          </FormField>
          <FormField
            id="maxDeliveryDurationSeconds"
            label="Duração máxima em segundos"
            error={errors.maxDeliveryDurationSeconds?.message}
          >
            <Input
              {...register('maxDeliveryDurationSeconds', optionalNumber)}
              type="number"
              min={60}
              max={86400}
              step={1}
            />
          </FormField>
          <FormField
            id="externalReference"
            label="Referência externa"
            hint="Use uma referência única por pedido. Repetir uma referência recupera a entrega já existente."
            error={errors.externalReference?.message}
          >
            <Input {...register('externalReference')} maxLength={100} />
          </FormField>
        </fieldset>
        </details>
        {!!error && <ErrorState error={error} />}
        <Button type="submit">Revisar entrega</Button>
      </form>
    </>
  );
}
