"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { GoogleMapsOverlay } from "@deck.gl/google-maps";
import { HeatmapLayer } from "@deck.gl/aggregation-layers";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { fetchIssueHeatmap, type HeatmapPoint } from "@/lib/heatmap";

const BENGALURU_CENTER = { lat: 12.9716, lng: 77.5946 };
const DEFAULT_ZOOM = 11;
const MAP_CONTAINER_STYLE = { width: "100%", height: "600px" };

const HEATMAP_COLOR_RANGE: [number, number, number][] = [
  [255, 255, 204],
  [255, 200, 140],
  [194, 80, 46],
  [139, 45, 22],
];

function buildHeatmapLayer(points: HeatmapPoint[]) {
  return new HeatmapLayer<HeatmapPoint>({
    id: "issue-heatmap",
    data: points,
    getPosition: (point) => [point.lng, point.lat],
    getWeight: (point) => point.weight,
    radiusPixels: 45,
    intensity: 1.2,
    threshold: 0.04,
    colorRange: HEATMAP_COLOR_RANGE,
  });
}

export function IssueHeatmap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [points, setPoints] = useState<HeatmapPoint[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    const result = await fetchIssueHeatmap();
    setPoints(result.items);
    setDataError(result.error);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    const overlay = new GoogleMapsOverlay({ layers: [] });
    overlay.setMap(map);
    overlayRef.current = overlay;
    setMapReady(true);
  }, []);

  useEffect(() => {
    if (!mapReady || !overlayRef.current || points.length === 0) return;
    overlayRef.current.setProps({
      layers: [buildHeatmapLayer(points)],
    });
  }, [mapReady, points]);

  useEffect(() => {
    return () => {
      overlayRef.current?.setMap(null);
      overlayRef.current?.finalize();
      overlayRef.current = null;
    };
  }, []);

  const loading = dataLoading || (!isLoaded && !loadError && Boolean(apiKey));
  const configError = !apiKey
    ? "Google Maps API key is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local."
    : loadError
      ? "Google Maps failed to load. Check your API key and that the Maps JavaScript API is enabled."
      : null;

  if (configError) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 rounded-3xl border border-border-subtle bg-gradient-to-br from-cream to-surface-white p-8 text-center">
        <AlertCircle className="h-8 w-8 text-tag-red-text" />
        <p className="max-w-md text-sm text-ink-muted">{configError}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 rounded-3xl border border-border-subtle bg-gradient-to-br from-cream to-surface-white">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-ink-muted">Loading live issue heatmap…</p>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 rounded-3xl border border-tag-red-text/30 bg-tag-red-bg p-8 text-center">
        <AlertCircle className="h-8 w-8 text-tag-red-text" />
        <p className="text-sm font-semibold text-tag-red-text">Could not load issue locations</p>
        <p className="max-w-md text-xs text-tag-red-text/80">{dataError}</p>
        <button type="button" onClick={() => void loadData()} className="btn-ghost mt-2">
          Retry
        </button>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 rounded-3xl border border-border-subtle bg-gradient-to-br from-cream to-surface-white p-8 text-center">
        <MapPin className="h-8 w-8 text-ink-muted" />
        <p className="text-sm font-semibold text-ink">No located issues yet</p>
        <p className="max-w-md text-xs text-ink-muted">
          Citizen issues with GPS coordinates or a saved location will appear here as a heatmap.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border-subtle">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={BENGALURU_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onMapLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      />
      <div className="flex items-center justify-between border-t border-border-subtle bg-cream/80 px-4 py-2.5 text-xs text-ink-muted">
        <span>
          <span className="font-semibold text-ink">{points.length}</span> located issue
          {points.length === 1 ? "" : "s"}
        </span>
        <span>Intensity weighted by citizen voices</span>
      </div>
    </div>
  );
}
