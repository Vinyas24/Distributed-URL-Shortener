import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { Calendar, Trash2 } from 'lucide-react';
import type { LinkItem } from '@/api/client';

interface EditExpiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkItem | null;
  onSave: (shortCode: string, newExpiry: string | null) => Promise<void>;
}

export const EditExpiryModal: React.FC<EditExpiryModalProps> = ({
  isOpen,
  onClose,
  link,
  onSave,
}) => {
  const [expiryValue, setExpiryValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (link?.expiresAt) {
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const date = new Date(link.expiresAt);
      const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setExpiryValue(localIso);
    } else {
      setExpiryValue('');
    }
    setError(null);
  }, [link, isOpen]);

  if (!link) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let isoDate: string | null = null;
    if (expiryValue) {
      const parsed = new Date(expiryValue);
      if (isNaN(parsed.getTime())) {
        setError('Invalid date format');
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        setError('Expiration date must be in the future');
        return;
      }
      isoDate = parsed.toISOString();
    }

    setLoading(true);
    try {
      await onSave(link.shortCode, isoDate);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update expiration');
    } finally {
      setLoading(false);
    }
  };

  const handleClearExpiry = async () => {
    setLoading(true);
    try {
      await onSave(link.shortCode, null);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to clear expiration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Link Expiration"
      description={`Update the expiration timestamp for short link /${link.shortCode}`}
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Short Code
          </label>
          <div className="font-mono text-sm px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-accent-cyan">
            /{link.shortCode}
          </div>
        </div>

        <Input
          label="Expiration Date & Time"
          type="datetime-local"
          value={expiryValue}
          onChange={(e) => {
            setExpiryValue(e.target.value);
            if (error) setError(null);
          }}
          error={error || undefined}
          helperText="Leave empty or click 'Remove Expiration' to keep the link active indefinitely."
          leftAddon={<Calendar className="h-4 w-4 text-slate-400" />}
        />

        <div className="pt-4 flex items-center justify-between border-t border-white/10">
          {link.expiresAt ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearExpiry}
              disabled={loading}
              className="text-rose-400 hover:text-rose-300"
              leftIcon={<Trash2 className="h-4 w-4" />}
            >
              Remove Expiration
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
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
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
