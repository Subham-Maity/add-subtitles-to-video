"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Crown, Warning } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface FeatureGateErrorDetail {
  statusCode: number;
  message: string;
  feature?: string;
  upgrade_url?: string;
}

export function FeatureGateModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<FeatureGateErrorDetail | null>(null);

  useEffect(() => {
    const handleFeatureGateError = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        let details = customEvent.detail;
        if (details && details.message && typeof details.message === "object") {
          details = details.message;
        }
        setErrorDetails(details);
        setIsOpen(true);
      }
    };

    window.addEventListener("feature-gate-error", handleFeatureGateError);
    return () => {
      window.removeEventListener("feature-gate-error", handleFeatureGateError);
    };
  }, []);

  const handleUpgradeRedirect = () => {
    setIsOpen(false);
    router.push("/settings/billing");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
            <Crown size={24} weight="duotone" />
          </div>
          <DialogTitle className="text-center text-lg font-bold">Premium Feature Gated</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-center text-xs text-zinc-400 leading-relaxed">
          {errorDetails?.message || "Your organization plan does not include access to this feature, or you have reached your monthly usage limit."}
          {errorDetails?.feature && (
            <p className="mt-3 font-mono text-[10px] text-zinc-500 bg-zinc-950 py-1 px-2 rounded inline-block uppercase">
              Feature: {errorDetails.feature}
            </p>
          )}
        </div>
        <DialogFooter className="mt-4 gap-2 sm:gap-0 justify-center">
          <button
            onClick={() => setIsOpen(false)}
            className="lg-btn-secondary w-full sm:w-auto"
            style={{ height: "36px" }}
          >
            Not Now
          </button>
          <button
            onClick={handleUpgradeRedirect}
            className="lg-btn-primary w-full sm:w-auto"
            style={{ height: "36px" }}
          >
            Upgrade Plan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
