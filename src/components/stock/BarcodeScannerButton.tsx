"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";

const SCANNER_ID = "barcode-scanner-region";

export function BarcodeScannerButton({ onDetected }: { onDetected: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            onDetected(decodedText);
            setOpen(false);
          },
          () => {}
        )
        .catch(() => setError("Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur."));
    });

    return () => {
      cancelled = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
  }, [open, onDetected]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary shrink-0" title="Scanner un code-barres/QR">
        📷
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Scanner un code">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div id={SCANNER_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />
        <p className="mt-3 text-center text-xs text-neutral-500">Visez le code-barres ou QR code du produit avec la caméra.</p>
      </Modal>
    </>
  );
}
