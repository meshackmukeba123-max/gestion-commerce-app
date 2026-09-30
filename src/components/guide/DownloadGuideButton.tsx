"use client";

import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { GUIDE_INTRO, GUIDE_SECTIONS, GUIDE_TITLE } from "@/lib/guide-content";
import type { GuideImage } from "@/lib/export/guide-pdf";

/** Charge une capture et la convertit en JPEG (fichier PDF bien plus léger qu'avec le PNG d'origine). */
async function loadImage(src: string): Promise<GuideImage> {
  const blob = await (await fetch(src)).blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.85), width: bitmap.width, height: bitmap.height, format: "JPEG" };
}

/** Génère le guide d'utilisation en PDF dans le navigateur et le télécharge. */
export function DownloadGuideButton() {
  const { activeStore } = useSession();
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function download() {
    setStatus("working");
    try {
      const sources = GUIDE_SECTIONS.flatMap((s) => s.blocks.flatMap((b) => (b.type === "screenshot" ? [b.src] : [])));
      const entries = await Promise.all(sources.map(async (src) => [src, await loadImage(src)] as const));
      const { buildGuidePdf } = await import("@/lib/export/guide-pdf");
      const doc = buildGuidePdf({
        title: GUIDE_TITLE,
        intro: GUIDE_INTRO,
        sections: GUIDE_SECTIONS,
        images: Object.fromEntries(entries),
        storeName: activeStore.storeName,
      });
      doc.save("guide-utilisation-gestion-commerce.pdf");
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status === "error" && <span className="text-sm text-red-600">Échec de la création du PDF, réessayez.</span>}
      <button onClick={download} disabled={status === "working"} className="btn-primary">
        {status === "working" ? "Création du PDF…" : "📄 Télécharger le guide (PDF)"}
      </button>
    </div>
  );
}
