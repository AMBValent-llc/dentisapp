import Image from "next/image";
import { cn } from "./ui";

export function AmbValentCredit({ dark = false }: { dark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[.68rem]", dark ? "text-[#cbd8db]" : "text-muted")}>
      <span>Diseñado y desarrollado por</span>
      <span className={cn("inline-flex rounded-lg px-2 py-1", dark && "bg-white")}>
        <Image className="h-5 w-auto" src="/ambvalent-logo.svg" alt="AMBValent" width={105} height={30} />
      </span>
    </span>
  );
}
