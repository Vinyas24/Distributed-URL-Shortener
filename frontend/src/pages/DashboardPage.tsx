import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  RefreshCw,
  Link as LinkIcon,
  MousePointerClick,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard, Button, useToast } from '@/components/ui';
import { LinkTable } from '@/components/dashboard/LinkTable';
import { EditExpiryModal } from '@/components/dashboard/EditExpiryModal';
import { DeleteConfirmModal } from '@/components/dashboard/DeleteConfirmModal';
import { apiClient, type LinkItem } from '@/api/client';

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [deletingLink, setDeletingLink] = useState<LinkItem | null>(null);

  const PAGE_SIZE = 5;

  // Query links with React Query
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['links', page, searchQuery],
    queryFn: () => apiClient.listUrls({ page, size: PAGE_SIZE, search: searchQuery }),
  });

  // Expiry Mutation
  const expiryMutation = useMutation({
    mutationFn: ({ shortCode, newExpiry }: { shortCode: string; newExpiry: string | null }) =>
      apiClient.updateExpiry(shortCode, newExpiry),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast({
        type: 'success',
        title: 'Expiration Updated',
        message: `Expiration updated for short link /${updated.shortCode}`,
      });
      setEditingLink(null);
    },
    onError: (err: unknown) => {
      toast({
        type: 'error',
        title: 'Update Failed',
        message: err instanceof Error ? err.message : 'Could not update link expiration',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (shortCode: string) => apiClient.deleteUrl(shortCode),
    onSuccess: (_, shortCode) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      toast({
        type: 'success',
        title: 'Link Deleted',
        message: `Short link /${shortCode} has been permanently deleted.`,
      });
      setDeletingLink(null);
    },
    onError: (err: unknown) => {
      toast({
        type: 'error',
        title: 'Delete Failed',
        message: err instanceof Error ? err.message : 'Could not delete link',
      });
    },
  });

  const items = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Calculate summary metrics
  const totalClicks = items.reduce((acc, curr) => acc + (curr.clicks || 0), 0);
  const activeCount = items.filter(
    (l) => !l.expiresAt || new Date(l.expiresAt).getTime() > Date.now()
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-accent-cyan">
              Live Production Analytics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 dark:text-slate-100 [data-theme=light]:text-slate-900">
            Link Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-400 [data-theme=light]:text-slate-600">
            Manage your shortened URLs, inspect click analytics, and edit expiration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            isLoading={isRefetching}
            aria-label="Refresh dashboard links"
            leftIcon={<RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>

          <NavLink to="/">
            <Button variant="primary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Create Link
            </Button>
          </NavLink>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard level="base" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Links</span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
              {total.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-accent-indigo">
            <LinkIcon className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard level="base" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Total Clicks</span>
            <div className="mt-1 text-2xl font-bold font-mono text-slate-100">
              {totalClicks.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-accent-violet">
            <MousePointerClick className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard level="base" className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium">Active Links</span>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              {activeCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
        </GlassCard>
      </div>

      {/* Paginated Glass Table */}
      <LinkTable
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        loading={isLoading}
        searchQuery={searchQuery}
        onPageChange={setPage}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setPage(1);
        }}
        onEditExpiry={setEditingLink}
        onDeleteLink={setDeletingLink}
      />

      {/* Edit Expiry Modal */}
      <EditExpiryModal
        isOpen={!!editingLink}
        onClose={() => setEditingLink(null)}
        link={editingLink}
        onSave={async (shortCode, newExpiry) => {
          await expiryMutation.mutateAsync({ shortCode, newExpiry });
        }}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingLink}
        onClose={() => setDeletingLink(null)}
        link={deletingLink}
        onConfirm={async (shortCode) => {
          await deleteMutation.mutateAsync(shortCode);
        }}
      />
    </div>
  );
};

export default DashboardPage;
