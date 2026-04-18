import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          404
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-2xl font-black tracking-tight text-[var(--color-text)]">
          Seite nicht gefunden
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Diese Adresse gibt es im Finance Hub nicht. Prüfe die URL oder nutze
          den Button unten.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Zum Dashboard</Link>
      </Button>
    </div>
  );
}
