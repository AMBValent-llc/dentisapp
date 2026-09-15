import Link from "next/link";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonBaseClass = "inline-flex min-h-11.5 items-center justify-center rounded-xl border px-4 py-2.5 font-extrabold no-underline transition hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0";
export const buttonClass = cn(buttonBaseClass, "border-primary bg-primary text-white shadow-[0_8px_18px_rgb(8_127_140/0.2)] hover:bg-primary-dark");
export const secondaryButtonClass = cn(buttonBaseClass, "border-line bg-white text-ink shadow-none hover:border-primary/40 hover:bg-primary-soft hover:text-primary-dark");
export const lightButtonClass = cn(buttonBaseClass, "border-white bg-white text-primary-dark shadow-none hover:bg-primary-soft");
export const fieldClass = "min-h-11.5 w-full rounded-xl border border-[#cbdadb] bg-white px-3.5 py-2.5 text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/12";
export const labelClass = "grid gap-1.5 text-sm font-bold text-[#29434b]";
export const cardClass = "rounded-[18px] border border-line bg-white shadow-soft";

export function ButtonLink({ href, children, secondary = false, variant, className }: { href: string; children: React.ReactNode; secondary?: boolean; variant?: "primary" | "secondary" | "light"; className?: string }) {
  const selectedVariant = variant ?? (secondary ? "secondary" : "primary");
  const variants = {
    primary: buttonClass,
    secondary: secondaryButtonClass,
    light: lightButtonClass,
  };
  return <Link className={cn(variants[selectedVariant], className)} href={href}>{children}</Link>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
    <div><p className="m-0 text-xs font-extrabold uppercase tracking-[.1em] text-primary">{eyebrow}</p><h1 className="my-1 text-[clamp(1.8rem,3vw,2.5rem)] font-bold">{title}</h1>{description && <span className="text-muted">{description}</span>}</div>
    {action}
  </div>;
}

export function FormField({ label, className, children, required }: { label: string; className?: string; children: React.ReactNode; required?: boolean }) {
  return <label className={cn(labelClass, className)}>{label}{required && <span className="sr-only"> (obligatorio)</span>}{children}</label>;
}
