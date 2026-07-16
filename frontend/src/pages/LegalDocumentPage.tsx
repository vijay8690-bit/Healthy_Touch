import { useEffect, useState } from 'react';
import type React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { getPublicLegalDocumentBySlug, type LegalDocument } from '@/services/legalDocument.service';

const formatDate = (value?: string) => {
  if (!value) return 'Not updated yet';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const renderInlineContent = (text: string, keyPrefix: string) => {
  const parts: React.ReactNode[] = [];
  const tokenPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|(https?:\/\/[^\s<>()]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text))) {
    const [raw, linkLabel, linkUrl, boldText, plainUrl] = match;
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (linkUrl || plainUrl) {
      const url = linkUrl || plainUrl;
      parts.push(
        <a
          key={`${keyPrefix}-url-${match.index}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {linkLabel || url}
        </a>
      );
    } else if (boldText) {
      parts.push(
        <strong key={`${keyPrefix}-bold-${match.index}`} className="font-semibold text-foreground">
          {boldText}
        </strong>
      );
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
};

const isHeadingLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 96) return false;
  if (/^#{1,4}\s+/.test(trimmed)) return true;
  if (/^(title|summary|overview|scope|terms|conditions|privacy|policy|contact|information)\b/i.test(trimmed)) return false;
  if (/[:.;,]$/.test(trimmed)) return false;
  return /^[A-Z0-9][A-Za-z0-9 &()/'-]+$/.test(trimmed);
};

const renderContentLine = (line: string, lineIndex: number) => {
  const trimmed = line.trim();

  if (!trimmed) {
    return <div key={lineIndex} className="h-3" />;
  }

  const markdownHeading = trimmed.match(/^(#{1,4})\s+(.+)$/);
  if (markdownHeading || isHeadingLine(trimmed)) {
    const text = markdownHeading ? markdownHeading[2] : trimmed;
    return (
      <h2 key={lineIndex} className="mb-3 mt-8 font-display text-2xl font-bold leading-snug text-foreground">
        {renderInlineContent(text, `${lineIndex}-heading`)}
      </h2>
    );
  }

  const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
  if (bullet) {
    return (
      <div key={lineIndex} className="my-2 flex gap-3 pl-1 text-base leading-7 text-foreground">
        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <div>{renderInlineContent(bullet[1], `${lineIndex}-bullet`)}</div>
      </div>
    );
  }

  const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
  if (numbered) {
    return (
      <div key={lineIndex} className="my-2 flex gap-3 text-base leading-7 text-foreground">
        <span className="min-w-7 font-semibold text-primary">{numbered[1]}.</span>
        <div>{renderInlineContent(numbered[2], `${lineIndex}-numbered`)}</div>
      </div>
    );
  }

  const labelled = trimmed.match(/^([A-Za-z][A-Za-z\s]{2,28})\s*:\s*(.+)$/);
  if (labelled) {
    return (
      <p key={lineIndex} className="my-4 rounded-md border-l-4 border-primary/50 bg-primary/5 px-4 py-3 text-base leading-7 text-foreground">
        <strong className="font-semibold text-foreground">{labelled[1]}:</strong>{' '}
        {renderInlineContent(labelled[2], `${lineIndex}-labelled`)}
      </p>
    );
  }

  return (
    <p key={lineIndex} className="my-4 text-base leading-7 text-foreground">
      {renderInlineContent(trimmed, `${lineIndex}-paragraph`)}
    </p>
  );
};

export default function LegalDocumentPage() {
  const { slug: routeSlug = '' } = useParams();
  const location = useLocation();
  const slug = routeSlug || location.pathname.split('/').filter(Boolean).pop() || '';
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    getPublicLegalDocumentBySlug(slug)
      .then((doc) => {
        if (mounted) setDocument(doc);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.response?.data?.message || 'This legal document is not available.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-10 pt-28 sm:pt-32 md:pb-16 lg:pt-44">
        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error || !document ? (
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold">Document unavailable</h1>
            <p className="mt-2 text-muted-foreground">{error || 'This legal document is not available.'}</p>
            <Button asChild className="mt-6">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        ) : (
          <article className="mx-auto max-w-4xl">
            <div className="border-b border-border pb-6">
              <div className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium capitalize text-primary">
                {document.category}
              </div>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1 className="font-display text-3xl font-bold tracking-normal text-foreground md:text-5xl">
                    {document.title}
                  </h1>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>Version {document.version || 1}</span>
                    <span>Last updated {formatDate(document.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 max-w-none text-foreground">
              {(document.content || 'Document content will be updated soon.').split('\n').map((line, index) => (
                renderContentLine(line, index)
              ))}
            </div>
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
