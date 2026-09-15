import React from "react";
import { cn } from "./ui";

export function AmbValentCredit({ dark = false }: { dark?: boolean }) {
  return (
    <span className={cn("text-xs leading-relaxed", dark ? "text-[#cbd8db]" : "text-muted")}>
      © 2026{" "}
      <a
        className={cn(
          "font-bold underline decoration-current/50 underline-offset-2 transition-colors hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
          dark ? "text-white focus-visible:outline-white" : "text-primary-dark focus-visible:outline-primary",
        )}
        href="https://ambvalent.com"
      >
        AMBVALENT LLC
      </a>
      . TODOS LOS DERECHOS RESERVADOS.
    </span>
  );
}
