import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-full">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col bg-[var(--color-bg)]">
        <div className="flex flex-1 flex-col px-8 py-8">{children}</div>
      </div>
    </div>
  );
}
