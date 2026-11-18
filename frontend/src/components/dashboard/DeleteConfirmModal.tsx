import React, { useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';
import type { LinkItem } from '@/api/client';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkItem | null;
  onConfirm: (shortCode: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  link,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!link) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm(link.shortCode);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Short Link"
      description="This action is irreversible and immediately terminates link redirection."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Deleting short link <strong className="font-mono text-white">/{link.shortCode}</strong>{' '}
            will invalidate all existing QR codes and redirects. Any incoming traffic will
            receive an HTTP 404 response.
          </p>
        </div>

        <div>
          <span className="text-xs text-slate-400 block mb-1">Target Destination</span>
          <div className="text-xs font-mono text-slate-300 break-all p-2.5 rounded-lg bg-white/5 border border-white/10">
            {link.originalUrl}
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs">
            {error}
          </div>
        )}

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="md"
            onClick={handleDelete}
            isLoading={loading}
          >
            Delete Link
          </Button>
        </div>
      </div>
    </Modal>
  );
};
