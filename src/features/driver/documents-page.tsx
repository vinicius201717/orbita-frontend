'use client';
import { PageHeader } from '@/components/ui';
import { DocumentsPanel } from '@/features/documents/documents-panel';
import { useAuth } from '@/providers/auth-provider';
export function DriverDocumentsPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader
        title="Documentos do entregador"
        description="Envie seus arquivos e acompanhe o parecer da equipe."
      />
      {user?.driverId && <DocumentsPanel entityType="DRIVER" entityId={user.driverId} />}
    </>
  );
}
