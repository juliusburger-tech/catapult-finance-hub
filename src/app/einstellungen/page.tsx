import fs from "node:fs";
import path from "node:path";

import Link from "next/link";

function readAppVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "—";
  } catch {
    return "—";
  }
}

export default function SettingsPage() {
  const version = readAppVersion();

  const paths = [
    { label: "SQLite-Datenbank", value: path.join("prisma", "finance.db") },
    { label: "BWA-Uploads (PDF)", value: path.join("public", "uploads", "bwa") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--color-primary)]">
          <span className="text-[var(--color-text-subtle)]">— </span>
          System
          <span className="text-[var(--color-text-subtle)]"> —</span>
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--color-text)] md:text-4xl">
          Einstellungen
        </h1>
        <p className="text-base text-[var(--color-text-muted)]">
          Internes Backoffice Catapult Finance Hub – lokaler Betrieb ohne Login.
        </p>
      </header>

      <section
        className="flex flex-col gap-4 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <h2 className="text-lg font-extrabold text-[var(--color-text)]">Version</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Paket-Version laut <code className="text-[var(--color-text)]">package.json</code>
          :{" "}
          <span className="font-semibold text-[var(--color-text)]">{version}</span>
        </p>
      </section>

      <section
        className="flex flex-col gap-4 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <h2 className="text-lg font-extrabold text-[var(--color-text)]">
          Datenpfade (relativ zum Projekt)
        </h2>
        <ul className="flex flex-col gap-3 text-sm text-[var(--color-text-muted)]">
          {paths.map((row) => (
            <li key={row.label} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="min-w-[10rem] font-medium text-[var(--color-text)]">
                {row.label}
              </span>
              <code className="break-all text-[var(--color-text)]">{row.value}</code>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="flex flex-col gap-4 rounded-[var(--radius-container-token)] border bg-[var(--color-surface)] p-6"
        style={{
          borderColor: "var(--color-border-token)",
          boxShadow: "var(--shadow-card-token)",
        }}
      >
        <h2 className="text-lg font-extrabold text-[var(--color-text)]">Sprünge</h2>
        <nav className="flex flex-col gap-2 text-sm font-medium">
          <Link className="text-[var(--color-primary)] hover:underline" href="/">
            Dashboard
          </Link>
          <Link className="text-[var(--color-primary)] hover:underline" href="/monatsueberblick">
            Monatsüberblick
          </Link>
          <Link className="text-[var(--color-primary)] hover:underline" href="/bwa">
            BWA-Archiv
          </Link>
          <Link className="text-[var(--color-primary)] hover:underline" href="/steuern">
            Steuern
          </Link>
        </nav>
      </section>

      <p className="text-xs leading-relaxed text-[var(--color-text-subtle)]">
        Backups: Datenbank-Datei und Ordner{" "}
        <code className="text-[var(--color-text-muted)]">public/uploads/bwa</code>{" "}
        bei Bedarf manuell sichern. Steuer- und Finanzwerte im Tool sind Schätzungen
        und ersetzen keine Beratung.
      </p>
    </div>
  );
}
