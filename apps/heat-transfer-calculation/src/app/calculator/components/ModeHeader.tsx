'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type HeatTransferMode = 'storage' | 'pipe' | 'horizontal';

interface ModeHeaderProps {
  activeMode: HeatTransferMode;
  action?: ReactNode;
}

const MODES: Array<{ key: HeatTransferMode; label: string; href: string }> = [
  { key: 'storage', label: 'Storage Tank', href: '/calculator' },
  { key: 'pipe', label: 'Pipe', href: '/calculator/pipe' },
  { key: 'horizontal', label: 'Horizontal Tank', href: '/calculator/horizontal' },
];

export function ModeHeader({ activeMode, action }: ModeHeaderProps) {
  const activeLabel = MODES.find((mode) => mode.key === activeMode)?.label ?? 'Storage Tank';

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {MODES.map((mode) => (
              mode.key === activeMode ? (
                <span
                  key={mode.key}
                  className="text-xs font-semibold px-3 py-1 rounded bg-primary/10 text-primary"
                >
                  {mode.label}
                </span>
              ) : (
                <Link
                  key={mode.key}
                  href={mode.href}
                  className="text-xs px-3 py-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                >
                  {mode.label}
                </Link>
              )
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Heat Loss Calculator · {activeLabel}
          </p>
          {action}
        </div>
      </div>
    </div>
  );
}
