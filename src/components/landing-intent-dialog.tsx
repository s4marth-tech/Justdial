"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STORAGE_KEY = "jd-intent-prompted";

export function LandingIntentDialog({
  isLoggedIn,
  canManageBusiness,
}: {
  isLoggedIn: boolean;
  canManageBusiness: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // One-time check against localStorage (an external system) to decide
    // whether to show the prompt on first visit — can't read localStorage
    // during SSR, so this has to happen post-mount in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const chooseListBusiness = () => {
    dismiss();
    if (canManageBusiness) {
      router.push("/dashboard/businesses/new");
    } else if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What brings you to JustDial?</DialogTitle>
          <DialogDescription>We&apos;ll take you to the right place.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={chooseListBusiness}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted"
          >
            <Building2 className="size-6" />
            <span className="font-medium">I want to list my business</span>
            <span className="text-xs text-muted-foreground">Get found by customers near you</span>
          </button>
          <button type="button" onClick={dismiss} className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted">
            <Search className="size-6" />
            <span className="font-medium">I&apos;m looking for something</span>
            <span className="text-xs text-muted-foreground">Search local businesses</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
