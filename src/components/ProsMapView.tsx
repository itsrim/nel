import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MockProfessional } from "../data/mockProfessionals";
import { proFullName } from "../data/mockProfessionals";
import {
  DEFAULT_MAP_ZOOM,
  proCoordinates,
} from "../lib/proCoordinates";
import "leaflet/dist/leaflet.css";

interface ProsMapViewProps {
  professionals: MockProfessional[];
  selectedId: string | null;
  mapCenter: [number, number];
  mapZoom?: number;
  onSelect: (id: string) => void;
  onDeselect: () => void;
}

function pinIcon(selected: boolean, label: string): L.DivIcon {
  return L.divIcon({
    className: "pros-leaflet-pin-wrap",
    html: `<span class="pros-leaflet-pin-label">${label}</span><span class="pros-leaflet-pin-dot${selected ? " pros-leaflet-pin-dot--selected" : ""}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function ProsMapView({
  professionals,
  selectedId,
  mapCenter,
  mapZoom = DEFAULT_MAP_ZOOM,
  onSelect,
  onDeselect,
}: ProsMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onDeselectRef = useRef(onDeselect);

  onSelectRef.current = onSelect;
  onDeselectRef.current = onDeselect;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.setView(mapCenter, mapZoom);

    map.on("click", () => {
      onDeselectRef.current();
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView(mapCenter, mapZoom, { animate: false });
  }, [mapCenter, mapZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (professionals.length === 0) return;

    for (const pro of professionals) {
      const { lat, lng } = proCoordinates(pro);
      const position = L.latLng(lat, lng);

      const marker = L.marker(position, {
        icon: pinIcon(selectedId === pro.id, pro.firstName),
        riseOnHover: true,
      });

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectRef.current(pro.id);
      });

      marker.bindTooltip(proFullName(pro), {
        direction: "top",
        offset: [0, -10],
        opacity: 0.95,
      });

      marker.addTo(map);
      markersRef.current.set(pro.id, marker);
    }
  }, [professionals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const pro of professionals) {
      const marker = markersRef.current.get(pro.id);
      if (marker) {
        marker.setIcon(pinIcon(selectedId === pro.id, pro.firstName));
      }
    }

    if (!selectedId) return;
    const pro = professionals.find((p) => p.id === selectedId);
    if (!pro) return;
    const { lat, lng } = proCoordinates(pro);
    map.panTo([lat, lng], { animate: true });
  }, [selectedId, professionals]);

  return (
    <div ref={containerRef} className="pros-map-leaflet" aria-label="Carte OpenStreetMap" />
  );
}
