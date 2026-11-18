import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Copy,
  Check,
  Calendar,
  Trash2,
  ExternalLink,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Search,
  Plus,
} from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, useToast } from '@/components/ui';
import { apiClient, type LinkItem } from '@/api/client';

interface LinkTableProps {
  items: LinkItem[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  loading: boolean;
  searchQuery: string;
  onPageChange: (newPage: number) => void;
  onSearchChange: (query: string) => void;
  onEditExpiry: (link: LinkItem) => void;
  onDeleteLink: (link: LinkItem) => void;
  onCreateNew?: () => void;
}

export const LinkTable: React.FC<LinkTableProps> = ({
  items,
  total,
  page,
  totalPages,
  pageSize,
  loading,
  searchQuery,
  onPageChange,
  onSearchChange,
  onEditExpiry,
  onDeleteLink,
  onCreateNew,
}) => {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (link: LinkItem) => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopiedCode(link.shortCode);
      toast({
        type: 'success',
        title: 'Copied to Clipboard',
        message: `Short link /${link.shortCode} copied!`,
      });
      setTimeout(() => {
        setCopiedCode((prev) => (prev === link.shortCode ? null : prev));
      }, 2000);
    } catch {
      toast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not access clipboard. Please copy manually.',
      });
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) {
      return { text: 'Never', variant: 'default' as const, isExpired: false };
    }
    const isExpired = new Date(expiresAt).getTime() <= Date.now();
    return {
      text: formatDate(expiresAt),
      variant: isExpired ? ('danger' as const) : ('success' as const),
      isExpired,
    };
  };

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by code or destination URL..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl glass-base text-slate-100 placeholder-slate-400 focus-ring border border-white/10"
            aria-label="Search links"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {onCreateNew && (
          <Button
            variant="primary"
            size="md"
            onClick={onCreateNew}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Link
          </Button>
        )}
      </div>

      {/* Main Glass Table Container */}
      <GlassCard level="raised" className="overflow-hidden p-0 border border-white/15">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/10 bg-white/5 uppercase tracking-wider text-[10px] text-slate-400 font-semibold">
              <tr>
                <th scope="col" className="py-3.5 px-4 sm:px-6">Short Code</th>
                <th scope="col" className="py-3.5 px-4 sm:px-6">Destination URL</th>
                <th scope="col" className="py-3.5 px-4 text-center">Clicks</th>
                <th scope="col" className="py-3.5 px-4 hidden md:table-cell">Created</th>
                <th scope="col" className="py-3.5 px-4 hidden sm:table-cell">Expires</th>
                <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                // Skeleton Rows
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-4 px-4 sm:px-6">
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <Skeleton className="h-4 w-48 sm:w-64 rounded-md" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Skeleton className="h-5 w-12 mx-auto rounded-full" />
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <Skeleton className="h-4 w-20 rounded-md" />
                    </td>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <Skeleton className="h-8 w-24 ml-auto rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={6} className="py-16 px-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-4">
                      {searchQuery ? (
                        <Search className="h-6 w-6 text-slate-400" />
                      ) : (
                        <Sparkles className="h-6 w-6 text-accent-indigo" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-200">
                      {searchQuery ? 'No matching links found' : 'No short links yet'}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      {searchQuery
                        ? `No results matching "${searchQuery}". Clear your search query or check the short code.`
                        : 'Generate your first short link on the home page or via the button below.'}
                    </p>
                    <div className="mt-5 flex justify-center gap-3">
                      {searchQuery ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onSearchChange('')}
                        >
                          Clear Search
                        </Button>
                      ) : (
                        <NavLink to="/">
                          <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                            Shorten a Link
                          </Button>
                        </NavLink>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Table Rows
                items.map((link) => {
                  const expiry = getExpiryStatus(link.expiresAt);
                  const isCopied = copiedCode === link.shortCode;

                  return (
                    <tr
                      key={link.shortCode}
                      className="transition-colors hover:bg-white/[0.04] group"
                    >
                      {/* Short Code */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <NavLink
                            to={`/links/${link.shortCode}`}
                            className="font-mono font-semibold text-accent-cyan hover:underline text-xs sm:text-sm focus-ring rounded"
                            title={`Inspect details for /${link.shortCode}`}
                          >
                            /{link.shortCode}
                          </NavLink>
                          <a
                            href={link.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => apiClient.recordClick(link.shortCode)}
                            className="text-slate-500 hover:text-accent-cyan transition-colors p-0.5 rounded focus-ring"
                            title={`Test short link redirect: ${link.shortUrl}`}
                            aria-label={`Test short link redirect: ${link.shortUrl}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {link.isCustom && (
                            <Badge variant="accent" size="sm">
                              custom
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Destination URL */}
                      <td className="py-3.5 px-4 sm:px-6 max-w-[200px] sm:max-w-xs md:max-w-sm">
                        <div className="relative group/dest flex items-center gap-1.5">
                          <span
                            className="truncate block text-slate-300 font-mono text-xs select-all"
                            title={link.originalUrl}
                          >
                            {link.originalUrl}
                          </span>
                          <a
                            href={link.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded focus-ring shrink-0"
                            aria-label={`Open destination URL: ${link.originalUrl}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>

                      {/* Clicks */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-200 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                          <MousePointerClick className="h-3 w-3 text-accent-indigo" />
                          {link.clicks.toLocaleString()}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-400">
                        {formatDate(link.createdAt)}
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <Badge variant={expiry.variant} size="sm">
                          {expiry.isExpired && <Clock className="h-3 w-3 mr-1 inline" />}
                          {expiry.text}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Copy Action */}
                          <button
                            type="button"
                            onClick={() => handleCopy(link)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors focus-ring"
                            aria-label={`Copy short URL for ${link.shortCode}`}
                            title="Copy short URL"
                          >
                            {isCopied ? (
                              <Check className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          {/* Edit Expiry Action */}
                          <button
                            type="button"
                            onClick={() => onEditExpiry(link)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-accent-cyan hover:bg-white/10 transition-colors focus-ring"
                            aria-label={`Edit expiration for ${link.shortCode}`}
                            title="Edit expiration"
                          >
                            <Calendar className="h-4 w-4" />
                          </button>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => onDeleteLink(link)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-ring"
                            aria-label={`Delete link ${link.shortCode}`}
                            title="Delete link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-t border-white/10 bg-white/5 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{startIndex}</span> to{' '}
            <span className="font-semibold text-slate-200">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> links
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-ring"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 py-1 font-mono text-xs text-slate-200 bg-white/5 rounded-md border border-white/10">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-ring"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
