import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Clock,
  Download,
} from 'lucide-react';
import { GlassCard, Button, Badge, Modal, useToast } from '@/components/ui';
import { apiClient, type LinkDetails } from '@/api/client';

interface LinkHeaderProps {
  link: LinkDetails;
}

export const LinkHeader: React.FC<LinkHeaderProps> = ({ link }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      toast({
        type: 'success',
        title: 'Short Link Copied',
        message: `${link.shortUrl} has been copied to your clipboard.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Could not write to clipboard. Please copy manually.',
      });
    }
  };

  const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() <= Date.now() : false;

  return (
    <div className="space-y-4">
      {/* Back to Dashboard Navigation */}
      <div>
        <NavLink
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors focus-ring rounded-lg py-1 px-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </NavLink>
      </div>

      {/* Main Glass Header Card */}
      <GlassCard level="raised" className="p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-mono text-accent-cyan tracking-tight">
                /{link.shortCode}
              </h1>

              {link.isCustom && (
                <Badge variant="accent" size="sm">
                  custom slug
                </Badge>
              )}

              {link.expiresAt ? (
                <Badge variant={isExpired ? 'danger' : 'success'} size="sm">
                  <Clock className="h-3 w-3 mr-1 inline" />
                  {isExpired ? 'Expired' : 'Active'}
                </Badge>
              ) : (
                <Badge variant="default" size="sm">
                  Never Expires
                </Badge>
              )}
            </div>

            {/* Short URL (Live Redirect Link) */}
            <div className="flex items-center gap-2 max-w-xl text-xs text-slate-400">
              <span className="shrink-0 text-slate-500">Short Link:</span>
              <a
                href={link.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => apiClient.recordClick(link.shortCode)}
                className="font-mono text-accent-cyan hover:underline truncate transition-colors flex items-center gap-1 focus-ring rounded"
                title={`Test short link redirect: ${link.shortUrl}`}
              >
                <span className="truncate">{link.shortUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>

            {/* Target Destination URL (Rule 5: safely rendered as text/attribute, never HTML) */}
            <div className="flex items-center gap-2 max-w-xl text-xs text-slate-400">
              <span className="shrink-0 text-slate-500">Destination:</span>
              <a
                href={link.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-slate-300 hover:text-accent-cyan truncate underline underline-offset-2 transition-colors flex items-center gap-1 focus-ring rounded"
                title={link.originalUrl}
              >
                <span className="truncate">{link.originalUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          </div>

          {/* Quick-Copy & QR Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setQrModalOpen(true)}
              leftIcon={<QrCode className="h-4 w-4" />}
            >
              QR Code
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleCopy}
              className="shadow-glow-coral"
              leftIcon={
                copied ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <Copy className="h-4 w-4 text-white" />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy Short Link'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* QR Code Glass Modal */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title={`QR Code for /${link.shortCode}`}
        description="Scan with any mobile camera to test instantaneous redirection."
        maxWidth="sm"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white shadow-glass-base">
            <QRCodeSVG
              id="link-details-qr"
              value={link.shortUrl}
              size={180}
              level="H"
              includeMargin={false}
            />
          </div>

          <div className="text-center">
            <p className="font-mono text-xs text-slate-300 break-all">{link.shortUrl}</p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const svg = document.getElementById('link-details-qr');
              if (!svg) return;
              const svgData = new XMLSerializer().serializeToString(svg);
              const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const downloadLink = document.createElement('a');
              downloadLink.href = url;
              downloadLink.download = `${link.shortCode}-qr.svg`;
              downloadLink.click();
              URL.revokeObjectURL(url);
            }}
            leftIcon={<Download className="h-3.5 w-3.5" />}
          >
            Download SVG
          </Button>
        </div>
      </Modal>
    </div>
  );
};
