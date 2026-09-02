"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Briefcase, LocateFixed, Loader2 } from "lucide-react";
import { findNearestCity } from "@/lib/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "jd-intent-prompted";

type Intent = "customer" | "owner";
type GeoState = "idle" | "locating" | "done" | "denied" | "unsupported";

export function LandingIntentDialog({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <Suspense fallback={null}>
      <LandingIntentDialogInner isLoggedIn={isLoggedIn} />
    </Suspense>
  );
}

function LandingIntentDialogInner({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  // useSearchParams (unlike reading window.location.search once) re-renders
  // when the "Retake setup" link changes the URL via client-side navigation
  // — a plain effect keyed only on isLoggedIn would miss that entirely,
  // since isLoggedIn doesn't change when the query param does.
  const searchParams = useSearchParams();
  const forceOpen = searchParams.get("setup") === "1";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [city, setCity] = useState("");
  const [geoState, setGeoState] = useState<GeoState>("idle");

  useEffect(() => {
    // One-time check against localStorage (an external system) to decide
    // whether to show the prompt on first visit — can't read localStorage
    // during SSR, so this has to happen post-mount in an effect. Logged-in
    // visitors already have an account, so the "set up your account" flow
    // never applies to them.
    //
    // `?setup=1` (from the header's "Retake setup" link) force-reopens it
    // even if it was already dismissed.
    if (!isLoggedIn && (forceOpen || !localStorage.getItem(STORAGE_KEY))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }
    if (forceOpen) {
      router.replace("/", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, forceOpen]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const handleUseLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestCity(position.coords.latitude, position.coords.longitude);
        setCity(nearest.name);
        setGeoState("done");
      },
      () => setGeoState("denied"),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const canContinue = name.trim().length > 0 && intent !== null;

  const handleContinue = () => {
    if (!canContinue || !intent) return;
    dismiss();
    const params = new URLSearchParams({ intent, name: name.trim() });
    if (city.trim()) params.set("city", city.trim());
    router.push(`/signup?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="w-full max-w-md p-6 md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">Let&apos;s get you set up</DialogTitle>
          <DialogDescription>Quick setup, takes fifteen seconds.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="intent-name">Your name</Label>
          <Input
            id="intent-name"
            placeholder="e.g. Priya Nair"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-xs font-normal text-muted-foreground">I&apos;m here to&hellip;</Label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setIntent("customer")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border-2 p-4 text-left transition-colors",
                intent === "customer"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <Search className="size-5" />
              <span className="font-heading text-base">Find something</span>
              <span className="text-xs opacity-80">Search local businesses</span>
            </button>
            <button
              type="button"
              onClick={() => setIntent("owner")}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border-2 p-4 text-left transition-colors",
                intent === "owner"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              <Briefcase className="size-5" />
              <span className="font-heading text-base">List my business</span>
              <span className="text-xs opacity-80">Get discovered nearby</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="intent-city">City</Label>
          <div className="flex gap-2">
            <Input
              id="intent-city"
              placeholder="Enter your city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleUseLocation}
              disabled={geoState === "locating"}
              className="shrink-0 whitespace-nowrap"
            >
              {geoState === "locating" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LocateFixed className="size-4" />
              )}
              {geoState === "denied" ? "Try again" : "Use my location"}
            </Button>
          </div>
          {geoState === "denied" && (
            <p className="text-xs text-destructive">
              Location access was denied — enter your city above, or try again.
            </p>
          )}
          {geoState === "unsupported" && (
            <p className="text-xs text-destructive">
              Your browser doesn&apos;t support location detection — enter your city above.
            </p>
          )}
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
