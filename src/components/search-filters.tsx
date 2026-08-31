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

export function SearchFilters({
  categories,
  specialties,
  initialCategory,
  initialSpecialty,
  initialCity,
  initialQ,
}: {
  categories: Category[];
  specialties: Specialty[];
  initialCategory?: string;
  initialSpecialty?: string;
  initialCity?: string;
  initialQ?: string;
}) {
  const [city, setCity] = useState(initialCity ?? "");
  const [geoState, setGeoState] = useState<GeoState>("idle");
  // Controlled (not just defaultValue) so the specialty dropdown below can
  // react to which category is currently picked, before the form is even
  // submitted.
  const [category, setCategory] = useState(initialCategory ?? "");
  const [specialty, setSpecialty] = useState(initialSpecialty ?? "");

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

        <Button type="submit" className="w-full justify-center">
          <Search className="size-4" />
          Search
        </Button>
      </form>
    </div>
  );
}
