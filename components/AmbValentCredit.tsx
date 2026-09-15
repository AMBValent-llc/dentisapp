import Image from "next/image";
import { cn } from "./ui";

export function AmbValentCredit({ dark = false }: { dark?: boolean }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center justify-end gap-2 whitespace-nowrap text-[.68rem] leading-none", dark ? "text-[#cbd8db]" : "text-muted")}>
      <span className="pt-px">Diseñado y desarrollado por</span>
      <span className={cn("inline-flex shrink-0 items-center rounded-lg", dark && "bg-white px-2 py-1")}>
        <Image className="block h-4.5 w-auto" src="/ambvalent-logo.svg" alt="AMBValent" width={105} height={30} />
      </span>
    </span>
  );
}
