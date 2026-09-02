"use client";

import { useEffect, useState } from "react";
import { LocateFixed, Loader2, Search } from "lucide-react";
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
type Specialty = { id: string; name: string; slug: string; categoryId: string };
type GeoState = "idle" | "locating" | "done" | "denied" | "unsupported";

// Base UI's <Select.Value> only shows an item's label once that item has
// been rendered inside the (portal-mounted, opened-on-demand) popup — until
// then it falls back to the raw `value`. Passing `items` to the Select root
// gives it the value->label mapping up front, so the trigger shows "4+
// stars" instead of "4" even on a fresh page load where the popup has never
// been opened.
const RATING_ITEMS: Record<string, string> = { "3": "3+ stars", "4": "4+ stars" };

export function SearchFilters({
  categories,
  specialties,
  initialCategory,
  initialSpecialty,
  initialCity,
  initialQ,
  initialMinRating,
  initialOpenNow,
  initialVerifiedOnly,
}: {
  categories: Category[];
  specialties: Specialty[];
  initialCategory?: string;
  initialSpecialty?: string;
  initialCity?: string;
  initialQ?: string;
  initialMinRating?: string;
  initialOpenNow?: boolean;
  initialVerifiedOnly?: boolean;
}) {
  const [city, setCity] = useState(initialCity ?? "");
  const [geoState, setGeoState] = useState<GeoState>("idle");
  // Controlled (not just defaultValue) so the specialty dropdown below can
  // react to which category is currently picked, before the form is even
  // submitted.
  const [category, setCategory] = useState(initialCategory ?? "");
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");
  const [minRating, setMinRating] = useState(initialMinRating ?? "");

  const selectedCategory = categories.find((c) => c.slug === category);
  const availableSpecialties = specialties.filter(
    (s) => s.categoryId === selectedCategory?.id
  );

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

  // Autopick: if the browser already has geolocation permission granted
  // (e.g. the visitor used "near me" earlier), apply it automatically
  // instead of making them click again. Only checks existing permission
  // state, so it never triggers a fresh browser prompt on its own.
  useEffect(() => {
    if (initialCity) return;
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
  }, [initialCity]);

  return (
    <div className="flex w-full flex-col gap-2">
      <form
        action="/search"
        method="GET"
        className="flex w-full flex-col gap-4 rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Search</label>
          <Input
            name="q"
            defaultValue={initialQ}
            placeholder="Search businesses, categories, cities..."
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Category</label>
          <Select
            name="category"
            value={category}
            items={Object.fromEntries(categories.map((c) => [c.slug, c.name]))}
            onValueChange={(value) => {
              setCategory(value ?? "");
              // A specialty belongs to exactly one category — clear a stale
              // selection that no longer applies.
              setSpecialty("");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Specialty</label>
          <Select
            name="specialty"
            value={specialty}
            items={Object.fromEntries(availableSpecialties.map((s) => [s.slug, s.name]))}
            onValueChange={(value) => setSpecialty(value ?? "")}
            disabled={availableSpecialties.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={category ? "All specialties" : "Pick a category first"}
              />
            </SelectTrigger>
            <SelectContent>
              {availableSpecialties.map((s) => (
                <SelectItem key={s.id} value={s.slug}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">City</label>
          <div className="flex items-center gap-1">
            <Input
              name="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="City"
              className="flex-1"
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
          {(geoState === "denied" || geoState === "unsupported" || (geoState === "done" && city)) && (
            <p className="text-xs text-muted-foreground">
              {geoState === "denied" && "Location access denied — pick your city above instead."}
              {geoState === "unsupported" &&
                "Your browser doesn't support location detection — pick your city above instead."}
              {geoState === "done" && city && `Showing results near ${city}.`}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Rating</label>
          <Select
            name="minRating"
            value={minRating}
            items={RATING_ITEMS}
            onValueChange={(value) => setMinRating(value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Any rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3+ stars</SelectItem>
              <SelectItem value="4">4+ stars</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="openNow"
            value="true"
            defaultChecked={initialOpenNow}
            className="size-4 rounded border-border accent-primary"
          />
          Open now
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="verifiedOnly"
            value="true"
            defaultChecked={initialVerifiedOnly}
            className="size-4 rounded border-border accent-primary"
          />
          Verified only
        </label>

        <Button type="submit" className="w-full justify-center">
          <Search className="size-4" />
          Search
        </Button>
      </form>
    </div>
  );
}
