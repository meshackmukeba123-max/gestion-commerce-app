import { AnnotatedScreenshot } from "@/components/guide/AnnotatedScreenshot";
import { DownloadGuideButton } from "@/components/guide/DownloadGuideButton";
import { GUIDE_INTRO, GUIDE_SECTIONS, GUIDE_TITLE } from "@/lib/guide-content";

export default function GuidePage() {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">{GUIDE_TITLE}</h1>
          <DownloadGuideButton />
        </div>
        <p className="text-sm text-neutral-500">{GUIDE_INTRO}</p>
        <ol className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {GUIDE_SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </div>

      {GUIDE_SECTIONS.map((section, i) => {
        const tips = section.blocks.filter((b) => b.type === "tip");
        return (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-lg font-semibold">
              {i + 1}. {section.title}
            </h2>
            {section.blocks.map((block, j) => {
              if (block.type === "text") {
                return (
                  <p key={j} className={`text-sm text-neutral-500 ${j > 0 ? "pt-4" : ""}`}>
                    {block.text}
                  </p>
                );
              }
              if (block.type === "screenshot") {
                const shot = (
                  <AnnotatedScreenshot
                    key={j}
                    src={block.src}
                    alt={block.alt}
                    aspectRatio={block.width / block.height}
                    markers={block.markers.map((m, k) => ({ id: k + 1, ...m }))}
                  />
                );
                return block.narrow ? (
                  <div key={j} className="max-w-xl">
                    {shot}
                  </div>
                ) : (
                  shot
                );
              }
              return null;
            })}
            {tips.length > 0 && (
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {tips.map((tip, k) =>
                  tip.type === "tip" ? (
                    <li key={k}>
                      <b>{tip.title}</b> {tip.text}
                    </li>
                  ) : null
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
