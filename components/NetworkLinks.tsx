import React from 'react';
import type { NetworkLink } from '@/lib/network';

export interface NetworkLinksProps {
  links: NetworkLink[];
}

/** Bloque « En Ododex también »: enlaces a la misma provincia en otras webs de la red. Sin enlaces no pinta nada. */
export function NetworkLinks({ links }: NetworkLinksProps) {
  if (links.length === 0) return null;
  return (
    <section aria-labelledby="network-links-title">
      <h2 id="network-links-title" className="text-xl font-bold mb-3">
        En Ododex también
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          // Son páginas de otra sección: <a> normal, sin next/link ni basePath propio.
          <a key={link.href} href={link.href} className="link-card">
            <span className="link-card-name">{link.texto}</span>
            <span className="link-card-arrow" aria-hidden="true">
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
