"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Utensils,
  Zap,
  Wrench,
  Stethoscope,
  Scissors,
  Dumbbell,
  Sparkles,
  Truck,
  Camera,
  Store,
  LocateFixed,
  Loader2,
  Scale,
  Calculator,
} from "lucide-react";
import { findNearestCity } from "@/lib/cities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string; slug: string };

// Keyed by slug (unique) rather than the free-text `icon` column, with a
// generic fallback so a future category added without an icon mapping here
// doesn't break the grid. 8 of these 11 keys (everything but doctors/
// lawyers/accountants) are for categories that have no businesses and
// aren't shown anywhere right now — left in place rather than pruned so
// the map doesn't need rebuilding if one of those categories comes back.
const CATEGORY_ICONS: Record<string, typeof Utensils> = {
  restaurants: Utensils,
  electricians: Zap,
  plumbers: Wrench,
  doctors: Stethoscope,
  "salons-spas": Scissors,
  "gyms-fitness": Dumbbell,
  "home-cleaning": Sparkles,
  "packers-movers": Truck,
  "wedding-photographers": Camera,
  lawyers: Scale,
  accountants: Calculator,
};

// The only categories with real businesses right now — see
// src/lib/categories.ts. Kept as its own explicit list (not derived from
// whatever `categories` happens to be passed in) so this stays correct on
// its own even if the caller's category.findMany() filtering changes.
const FEATURED_CATEGORY_SLUGS = ["doctors", "lawyers", "accountants"];

type GeoState = "idle" | "locating" | "done" | "denied" | "unsupported";

export function HomeSearch({ categories }: { categories: Category[] }) {
  const [city, setCity] = useState("");
  const [geoState, setGeoState] = useState<GeoState>("idle");

  const featuredCategories = FEATURED_CATEGORY_SLUGS.map((slug) =>
    categories.find((category) => category.slug === slug)
  ).filter((category): category is Category => category !== undefined);

  const handleNearMe = () => {
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

  // Autopick: if location access is already granted from a previous visit,
  // fill the city in automatically instead of waiting for a "near me" click.
  // Only reads existing permission state, so it never prompts on its own.
  useEffect(() => {
    if (!("permissions" in navigator) || !("geolocation" in navigator)) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        if (!cancelled && status.state === "granted") handleNearMe();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryHref = (slug: string) => {
    const params = new URLSearchParams({ category: slug });
    if (city) params.set("city", city);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <div className="flex w-full max-w-3xl flex-col items-center gap-2">
      <form
        action="/search"
        method="GET"
        className="flex w-full flex-col gap-2 rounded-3xl bg-card p-3 shadow-lg shadow-foreground/5 sm:flex-row sm:items-stretch sm:rounded-full"
      >
        <Select name="category">
          <SelectTrigger className="w-full border-none bg-transparent font-medium shadow-none sm:w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.slug}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden w-px shrink-0 bg-border sm:block" />
        <Input
          name="q"
          placeholder="What are you looking for?"
          className="h-9 flex-1 border-none bg-transparent shadow-none"
        />
        <div className="hidden w-px shrink-0 bg-border sm:block" />
        <div className="flex flex-1 items-center gap-1 sm:max-w-48">
          <Input
            name="city"
            placeholder="City"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-9 flex-1 border-none bg-transparent shadow-none"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={handleNearMe}
            disabled={geoState === "locating"}
            aria-label="Use my current location"
            title="Use my current location"
          >
            {geoState === "locating" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LocateFixed className="size-4" />
            )}
          </Button>
        </div>
        <Button type="submit" size="lg" className="shrink-0 rounded-full px-6">
          Search
        </Button>
      </form>
      {(geoState === "denied" || geoState === "unsupported" || (geoState === "done" && city)) && (
        <p className="text-xs text-muted-foreground">
          {geoState === "denied" && "Location access denied — pick your city above instead."}
          {geoState === "unsupported" &&
            "Your browser doesn't support location detection — pick your city above instead."}
          {geoState === "done" && city && `Showing results near ${city}.`}
        </p>
      )}
      </div>

      <div className="w-full">
        <h6 className="mb-4 text-xs font-medium tracking-wide text-primary/80 uppercase">
          Browse by category
        </h6>
        {/* Fixed at 3 columns to match FEATURED_CATEGORY_SLUGS' 3 entries —
            a wider sm:grid-cols-6 here (left from when there were 6 featured
            categories) would leave empty, lopsided column tracks on any
            screen past the phone breakpoint. */}
        <div className="grid w-full grid-cols-3 gap-4">
          {featuredCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.slug] ?? Store;
            return (
              <Link
                key={category.id}
                href={categoryHref(category.slug)}
                className="flex flex-col items-center gap-3 rounded-xl bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="size-6" />
                </span>
                <span className="font-heading text-sm">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
