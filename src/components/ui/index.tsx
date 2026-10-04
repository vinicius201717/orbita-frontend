'use client';
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ReactNode,
  type ReactElement,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type TableHTMLAttributes,
} from 'react';
import { statusLabel } from '@/constants/status';
export function Button({
  loading,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={['button', props.className].filter(Boolean).join(' ')}
    >
      {loading ? 'Aguarde…' : children}
    </button>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['input', props.className].filter(Boolean).join(' ')} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={['select', props.className].filter(Boolean).join(' ')} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={['textarea', props.className].filter(Boolean).join(' ')} />;
}
export function FormField({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const described =
    [hint ? id + '-hint' : null, error ? id + '-error' : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            id,
            'aria-invalid': !!error,
            'aria-describedby': described,
          })
        : children}
      {hint && <p id={id + '-hint'}>{hint}</p>}
      {error && (
        <p id={id + '-error'} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="section-header">
      <h2>{title}</h2>
      {children}
    </header>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className="status-badge" data-status={status}>
      {statusLabel(status)}
    </span>
  );
}
export function Table({
  caption,
  children,
  ...props
}: TableHTMLAttributes<HTMLTableElement> & { caption?: string }) {
  return (
    <div className="table-container"><table {...props} className="data-table">
      {caption && <caption>{caption}</caption>}
      {children}
    </table></div>
  );
}
export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
    >
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="dialog-actions">
        <Button onClick={onCancel} disabled={loading}>
          Voltar
        </Button>
        <Button onClick={onConfirm} loading={loading}>
          Confirmar
        </Button>
      </div>
    </dialog>
  );
}
export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="checkbox" />;
}
export function FileInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="file" />;
}
