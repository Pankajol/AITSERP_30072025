"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const markerIcon = new L.Icon({
  iconUrl: "/marker.png", // optional custom marker
  iconSize: [32, 32],
});

export default function MapPreview({ latitude, longitude }) {
  if (!latitude || !longitude) return null;

  const position = [latitude, longitude];

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border">
      <MapContainer center={position} zoom={16} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='© OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={markerIcon}>
          <Popup>Your Location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
