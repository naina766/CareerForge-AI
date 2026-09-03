import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { ScoreBadge } from './ScoreBadge';

export interface CitationItem {
  id: string;
  sourceType: string;
  sourceId: string;
  section?: string;
  snippet: string;
  relevanceScore?: number;
}

export interface EvidenceCardProps {
  citations: CitationItem[];
  title?: string;
  className?: string;
}

export function EvidenceCard({
  citations,
  title = 'Grounded in your profile',
  className = '',
}: EvidenceCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className={`border border-purple-500/20 bg-purple-950/10 rounded-xl overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-purple-300 hover:bg-purple-900/20 transition-colors focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-white">{title}</span>
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
            {citations.length} {citations.length === 1 ? 'source' : 'sources'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-purple-400">
          <span className="text-[11px] font-medium">{isOpen ? 'Hide evidence' : 'View evidence'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-purple-500/20 space-y-2.5 bg-black/20">
          {citations.map((c, idx) => (
            <div
              key={c.id || idx}
              className="p-3 rounded-lg bg-[#0b0f19] border border-gray-800 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between text-gray-400">
                <div className="flex items-center gap-1.5 font-medium text-gray-200">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {c.sourceType ? c.sourceType.replace(/_/g, ' ') : 'Profile'}{' '}
                    {c.section ? `• ${c.section}` : ''}
                  </span>
                </div>
                {c.relevanceScore !== undefined && (
                  <ScoreBadge score={c.relevanceScore * (c.relevanceScore <= 1 ? 100 : 1)} size="sm" showLabel={false} />
                )}
              </div>
              <p className="text-gray-300 leading-relaxed font-mono text-[11px] bg-gray-900/60 p-2 rounded border border-gray-800/80">
                "{c.snippet}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
