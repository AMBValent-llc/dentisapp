import Image from "next/image";
import { cn } from "./ui";

export function AmbValentCredit({ dark = false }: { dark?: boolean }) {
  return (
    <span className={cn("inline-flex min-h-10 items-center justify-end gap-2.5 whitespace-nowrap text-xs leading-tight", dark ? "text-[#cbd8db]" : "text-muted")}>
      <span>Diseñado y desarrollado por</span>
      <span className={cn("inline-flex shrink-0 items-center rounded-lg", dark && "bg-white px-2 py-1")}>
        <Image className="block h-8 w-auto" src="/ambvalent-logo.svg" alt="AMBValent" width={105} height={30} />
      </span>
    </span>
  );
}
