"use client";

import dynamic from "next/dynamic";

const BusinessMapInner = dynamic(() => import("./business-map-inner"), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />,
});

export function BusinessMap(props: { latitude: number; longitude: number; name: string }) {
  return <BusinessMapInner {...props} />;
}
