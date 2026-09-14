export function KpiCard({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: string; tone?: "default" | "danger" | "warning" | "success" }) {
  const toneClass = {
    default: "text-neutral-900 dark:text-white",
    danger: "text-red-600",
    warning: "text-amber-600",
    success: "text-emerald-600",
  }[tone];

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
