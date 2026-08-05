"use client";

import { useState } from "react";
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
// doesn't break the grid.
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

type GeoState = "idle" | "locating" | "done" | "denied" | "unsupported";

export function HomeSearch({ categories }: { categories: Category[] }) {
  const [city, setCity] = useState("");
  const [geoState, setGeoState] = useState<GeoState>("idle");

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
      { timeout: 10000 }
    );
  };

  const categoryHref = (slug: string) => {
    const params = new URLSearchParams({ category: slug });
    if (city) params.set("city", city);
    return `/search?${params.toString()}`;
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <form
        action="/search"
        method="GET"
        className="flex w-full max-w-xl flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:flex-wrap"
      >
        <Select name="category">
          <SelectTrigger className="w-full sm:w-48">
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
        <Input name="q" placeholder="What are you looking for?" className="h-8 flex-1" />
        <div className="flex flex-1 gap-1.5">
          <Input
            name="city"
            placeholder="City (e.g. Mumbai)"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="h-8 flex-1"
          />
          <Button
            type="button"
            variant="outline"
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
        <Button type="submit" className="sm:w-auto">
          Search
        </Button>
        {(geoState === "denied" || geoState === "unsupported" || (geoState === "done" && city)) && (
          <p className="text-xs text-muted-foreground sm:basis-full">
            {geoState === "denied" && "Location access denied — pick your city above instead."}
            {geoState === "unsupported" &&
              "Your browser doesn't support location detection — pick your city above instead."}
            {geoState === "done" && city && `Showing results near ${city}.`}
          </p>
        )}
      </form>

      <div className="grid w-full grid-cols-3 gap-3 sm:grid-cols-5">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.slug] ?? Store;
          return (
            <Link
              key={category.id}
              href={categoryHref(category.slug)}
              className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 text-center ring-1 ring-foreground/10 transition-colors hover:bg-muted"
            >
              <Icon className="size-6" />
              <span className="text-xs font-medium">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
