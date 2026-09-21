type Marker = {
  id: number;
  /** position in percent of the image width/height */
  x: number;
  y: number;
  label: string;
  description: string;
};

export function AnnotatedScreenshot({
  src,
  alt,
  aspectRatio,
  markers,
}: {
  src: string;
  alt: string;
  aspectRatio: number;
  markers: Marker[];
}) {
  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-xl border border-black/10 dark:border-white/10" style={{ aspectRatio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover object-top" />
        {markers.map((m) => (
          <div
            key={m.id}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white shadow-lg ring-2 ring-emerald-600/40"
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            title={m.label}
          >
            {m.id}
          </div>
        ))}
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {markers.map((m) => (
          <li key={m.id} className="flex gap-2 text-sm">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              {m.id}
            </span>
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="text-neutral-500"> — {m.description}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
