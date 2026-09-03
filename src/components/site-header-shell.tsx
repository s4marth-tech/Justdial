"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Past this much scroll, the header collapses into a slim sticky bar. Never
// hover-driven — search is the primary action on a directory site, and
// hover doesn't exist on touch devices — so the trigger is scroll position,
// not pointer position, and it works identically on mobile.
const COLLAPSE_SCROLL_THRESHOLD = 120;

const TRANSITION = "transition-all duration-200 ease-out motion-reduce:transition-none";

export function SiteHeaderShell({ logo, nav }: { logo: ReactNode; nav: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  // Narrow-screen affordance once collapsed: a tap target showing an icon
  // plus placeholder text, not a bare icon — expands into the real input on
  // tap. The input itself is never removed from the page, only visually
  // swapped for this chip below the sm breakpoint.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const isCollapsed = window.scrollY > COLLAPSE_SCROLL_THRESHOLD;
      setCollapsed(isCollapsed);
      // Scrolling back to the top always restores the full bar, so a
      // visitor can never get stuck looking at just the tap-to-open chip.
      if (!isCollapsed) setMobileSearchOpen(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header is sticky and its height animates between the full and
  // collapsed sizes, so anything else on the page that's also sticky (the
  // search sidebar) needs to sit below its *current* height, not a
  // hardcoded guess — otherwise the header (higher z-index) paints over the
  // top of it once both are stuck. Publishing the live measured height as a
  // CSS variable lets that other element's `top` track it without any
  // prop-passing across the server/client boundary between them.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publishHeight = () => {
      document.documentElement.style.setProperty("--site-header-height", `${el.offsetHeight}px`);
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The input never unmounts — only its visibility class toggles — so the
  // `autoFocus` prop (mount-time only) can't pick up a later tap; focus it
  // imperatively instead when the tap reveals it.
  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const showRealInput = !collapsed || mobileSearchOpen;

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-background",
        TRANSITION,
        collapsed ? "py-1" : "py-3"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4",
          TRANSITION,
          collapsed ? "min-h-11" : "min-h-16"
        )}
      >
        {logo}

        <form
          action="/search"
          method="GET"
          className="order-3 flex w-full items-center gap-1 sm:order-none sm:mx-4 sm:w-auto sm:max-w-xs sm:flex-1"
        >
          {collapsed && !mobileSearchOpen && (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-muted-foreground sm:hidden"
              aria-label="Open search"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search...</span>
            </button>
          )}
          <Input
            ref={searchInputRef}
            name="q"
            placeholder="Search businesses, categories, cities..."
            aria-label="Search"
            className={cn(
              TRANSITION,
              collapsed ? "h-8 text-sm" : "h-10",
              showRealInput ? "block" : "hidden sm:block"
            )}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className={cn("shrink-0", showRealInput ? "inline-flex" : "hidden sm:inline-flex")}
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
        </form>

        <nav className="flex flex-wrap items-center gap-2">{nav}</nav>
      </div>
    </header>
  );
}
