"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Self-hosted from /public/leaflet (copied from node_modules/leaflet/dist/images)
// rather than imported through the bundler — static image imports resolve
// inconsistently between Turbopack and Webpack (object vs. string), so a
// plain public path sidesteps that entirely.
const icon = L.icon({
  iconUrl: "/leaflet/marker-icon.png",
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  shadowUrl: "/leaflet/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

type BusinessMapInnerProps = {
  latitude: number;
  longitude: number;
  name: string;
};

export default function BusinessMapInner({
  latitude,
  longitude,
  name,
}: BusinessMapInnerProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      scrollWheelZoom={false}
      // `isolate` contains Leaflet's internal pane z-indices (up to 1000,
      // for markers/popups) within this element's own stacking context —
      // without it they leak out and can render above fixed-position UI
      // elsewhere on the page, like the lead dialogs, blocking clicks.
      className="isolate h-64 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={icon}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}
