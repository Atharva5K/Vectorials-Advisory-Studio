import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("glass-card mesh relative overflow-hidden rounded-[28px] p-6 md:p-8", className)}>{children}</section>;
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500",
        className
      )}
      {...props}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-stone-300 bg-white/70 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function Pill({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <span className={cn("inline-flex items-center rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-xs font-medium text-stone-700", className)}>{children}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-stone-200/80", className)}>
      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-teal-700 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function MetricTile({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "teal" | "amber" | "blue" }) {
  const toneMap = {
    default: "bg-white/70 text-stone-800",
    teal: "bg-teal-50 text-teal-900",
    amber: "bg-amber-50 text-amber-900",
    blue: "bg-sky-50 text-sky-900"
  };

  return (
    <div className={cn("rounded-[22px] border border-white/70 p-4 shadow-sm", toneMap[tone])}>
      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function ToneBadge({ score }: { score: number }) {
  const tone = score >= 75 ? "bg-emerald-100 text-emerald-800" : score >= 50 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800";
  const label = score >= 75 ? "Strong" : score >= 50 ? "Moderate" : "Watchlist";
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", tone)}>{label}</span>;
}