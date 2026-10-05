'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Button, FormField, Input, Textarea } from '@/components/ui';
import { ErrorState } from '@/components/feedback';
import { catalogApi } from '@/services/api/catalog.api';
import {
  productFormInput,
  productFormSchema,
  productPriceInput,
  type ProductFormValues,
} from './schemas';
import type { Product } from './types';
import styles from './catalog.module.css';

const suggestions = ['Lanches', 'Refeições', 'Bebidas', 'Sobremesas', 'Combos', 'Mercearia', 'Outros'];

export function ProductForm({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      description: product?.description ?? '',
      category: product?.category ?? '',
      price: product ? productPriceInput(product.priceCents) : '',
      available: product?.available ?? true,
    },
  });
  const save = useMutation({
    mutationFn: (values: ProductFormValues) => {
      const input = productFormInput(values);
      return product ? catalogApi.update(product.id, input) : catalogApi.create(input);
    },
    onSuccess: (saved) => onSaved(saved),
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    setFocus('name');
    return () => dialog?.close();
  }, [setFocus]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="product-form-title"
      aria-describedby="product-form-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!save.isPending) onClose();
      }}
    >
      <div className={styles.dialogHeading}>
        <div>
          <span className={styles.eyebrow}>SEU CATÁLOGO</span>
          <h2 id="product-form-title">{product ? 'Editar produto' : 'Novo produto'}</h2>
        </div>
        <Button
          className={styles.closeButton}
          aria-label="Fechar cadastro de produto"
          onClick={onClose}
          disabled={save.isPending}
        >
          ×
        </Button>
      </div>
      <p id="product-form-description" className={styles.formDescription}>
        {product
          ? 'Atualize as informações para os próximos pedidos.'
          : 'Cadastre uma vez. Depois, é só escolher ao montar um pedido.'}
      </p>
      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate>
        <fieldset disabled={save.isPending} className={styles.formFields}>
          <FormField id="product-name" label="Nome do produto" error={errors.name?.message}>
            <Input
              {...register('name')}
              placeholder="Ex.: X-bacon da casa"
              maxLength={120}
              autoComplete="off"
            />
          </FormField>
          <div className={styles.formRow}>
            <FormField id="product-price" label="Preço (R$)" error={errors.price?.message}>
              <Input
                {...register('price')}
                placeholder="Ex.: 24,90"
                inputMode="decimal"
                autoComplete="off"
                maxLength={16}
              />
            </FormField>
            <FormField
              id="product-category"
              label="Categoria"
              error={errors.category?.message}
              hint="Escolha uma sugestão ou escreva a sua."
            >
              <Input
                {...register('category')}
                list="product-categories"
                placeholder="Ex.: Lanches"
                maxLength={60}
                autoComplete="off"
              />
            </FormField>
          </div>
          <datalist id="product-categories">
            {[...new Set([...categories, ...suggestions])].map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <FormField
            id="product-description"
            label="Descrição (opcional)"
            hint="Ingredientes, tamanho ou detalhes que ajudam a identificar o item."
            error={errors.description?.message}
          >
            <Textarea
              {...register('description')}
              placeholder="Ex.: Pão, hambúrguer, queijo e bacon. Acompanha batata."
              maxLength={500}
              rows={3}
            />
          </FormField>
          <label className={styles.availabilityOption}>
            <input type="checkbox" {...register('available')} />
            <span>
              <strong>Disponível para pedidos</strong>
              <small>Desmarque quando o produto estiver em falta.</small>
            </span>
          </label>
        </fieldset>
        {save.error ? <ErrorState error={save.error} /> : null}
        <div className={styles.formActions}>
          <Button onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button type="submit" loading={save.isPending}>
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
