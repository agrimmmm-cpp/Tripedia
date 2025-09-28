// src/pages/Index.tsx
import React, { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";

// If not imported globally, uncomment:
// import "leaflet/dist/leaflet.css";

// Backend base URL
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

type LatLng = { lat: number; lng: number };
type Candidate = {
  place_id: string;
  name: string;
  rating?: number | null;
  user_ratings_total?: number;
  address?: string | null;
  photo_url?: string | null;
  location?: LatLng;
  detourMinutes?: number | null;
  theme?: string;
  stargaze?: {            // for stargaze_auto theme
    eta_iso: string;
    cloud_cover_percent: number;
    zodiac?: string[];
  };
};
type CandidatesByTheme = Record<string, Candidate[]>;

type DiscoverResponse = {
  base: { distanceText: string | null; durationText: string | null; polyline: string | null };
  parameters: { days: number; themes: string[]; sampleEveryMeters: number; searchRadiusMeters: number };
  candidates: CandidatesByTheme;
};

type FinalRouteResponse = {
  polyline: string | null;
  legs?: { start_address: string; end_address: string; distance_text?: string; duration_text?: string }[];
  totals?: { distance_meters: number; duration_seconds: number };
  waypoint_order?: number[]; // order of waypoints after optimize:true
};

const ALL_THEMES = [
  "hikes","waterfalls","lakes","cafes","viewpoints","parks","food","museums","stargaze_auto"
] as const;

/* ---------------- helpers ---------------- */
function decodePolyline(encoded: string): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coords: [number, number][] = [];
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += dlng;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

function boundsFromCoords(
  coords: Array<[number, number]> | undefined,
  markers?: { lat: number; lng: number }[]
) {
  const pts: [number, number][] = [];
  if (coords) pts.push(...coords);
  if (markers) { for (const m of markers) pts.push([m.lat, m.lng]); }
  if (!pts.length) return null;

  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
  for (const [la, ln] of pts) {
    if (la < minLat) minLat = la;
    if (ln < minLng) minLng = ln;
    if (la > maxLat) maxLat = la;
    if (ln > maxLng) maxLng = ln;
  }
  return [[minLat, minLng], [maxLat, maxLng]] as const;
}

function FitTo({
  baseCoords, finalCoords, markers,
}: { baseCoords?: [number, number][]; finalCoords?: [number, number][]; markers?: LatLng[] }) {
  const map = useMap();
  React.useEffect(() => {
    const all: [number, number][] = [
      ...(baseCoords || []),
      ...(finalCoords || []),
      ...((markers || []).map<[number, number]>(m => [m.lat, m.lng])),
    ];
    const b = boundsFromCoords(all);
    if (b) map.fitBounds(b as any, { padding: [36, 36] });
  }, [baseCoords, finalCoords, markers, map]);
  return null;
}

function formatKm(meters?: number) {
  if (meters == null) return "—";
  const km = meters / 1000;
  return `${km.toFixed(km < 100 ? 1 : 0)} km`;
}
function formatDuration(sec?: number) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}

/* ---------------- page ---------------- */
const Index: React.FC = () => {
  // inputs (no hard-coded cities)
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState<number>(2);
  const [depart, setDepart] = useState<"" | "now">("");

  const [themes, setThemes] = useState<Record<string, boolean>>({
    hikes: true, cafes: true,
  });
  // ensure all chips exist in state
  ALL_THEMES.forEach(t => { if (!(t in themes)) themes[t] = themes[t] ?? false; });
  const selectedThemes = useMemo(
    () => Object.entries(themes).filter(([, v]) => v).map(([k]) => k),
    [themes]
  );

  // async state
  const [discovering, setDiscovering] = useState(false);
  const [building, setBuilding] = useState(false);

  // route state
  const [base, setBase] = useState<DiscoverResponse["base"] | null>(null);
  const [candidates, setCandidates] = useState<CandidatesByTheme>({});
  const [finalPolyline, setFinalPolyline] = useState<string | null>(null);
  const [finalTotals, setFinalTotals] = useState<FinalRouteResponse["totals"] | null>(null);
  const [finalOrder, setFinalOrder] = useState<number[] | null>(null);
  const [finalStopCards, setFinalStopCards] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // map computed
  const baseCoords = useMemo(
    () => (base?.polyline ? decodePolyline(base.polyline) : undefined),
    [base]
  );
  const finalCoords = useMemo(
    () => (finalPolyline ? decodePolyline(finalPolyline) : undefined),
    [finalPolyline]
  );
  const markerPts: LatLng[] = useMemo(() => {
    const out: LatLng[] = [];
    Object.values(candidates).forEach(list =>
      list?.forEach(p => p.location && out.push(p.location))
    );
    return out;
  }, [candidates]);

  /* ---------------- actions ---------------- */
  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setOrigin(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      (err) => alert(err.message || "Could not get your location.")
    );
  }

  function swapEnds() {
    setOrigin(prev => {
      const oldOrigin = prev;
      setDestination(oldDest => {
        setOrigin(oldDest);
        return oldOrigin;
      });
      return oldOrigin;
    });
  }

  async function discover() {
    if (!origin || !destination) return alert("Enter origin and destination");
    if (selectedThemes.length === 0) return alert("Pick at least one theme");

    setDiscovering(true);
    setSelectedIds(new Set());
    setFinalPolyline(null);
    setFinalTotals(null);
    setFinalOrder(null);
    setFinalStopCards([]);
    try {
      const url = new URL(`${API_BASE}/api/discover-stops`);
      url.searchParams.set("origin", origin);
      url.searchParams.set("destination", destination);
      url.searchParams.set("days", String(days));
      if (depart) url.searchParams.set("departure_time", depart);
      url.searchParams.set("themes", selectedThemes.join(","));
      const r = await fetch(url.toString());
      const data: DiscoverResponse = await r.json();
      if (r.status !== 200) throw new Error((data as any).error || "Failed to discover");
      setBase(data.base);
      setCandidates(data.candidates || {});
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to discover stops.");
    } finally {
      setDiscovering(false);
    }
  }

  async function buildFinal() {
    if (!origin || !destination) return;
    if (selectedIds.size === 0) return alert("Select at least one stop");

    setBuilding(true);
    try {
      const providedIds = Array.from(selectedIds);
      const r = await fetch(`${API_BASE}/api/final-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          selectedPlaceIds: providedIds,
          mode: "driving",
          departure_time: depart || undefined,
        }),
      });
      const data: FinalRouteResponse = await r.json();
      if (r.status !== 200) throw new Error((data as any).error || "Failed to build");

      setFinalPolyline(data.polyline || null);
      setFinalTotals(data.totals || null);
      setFinalOrder(data.waypoint_order || null);

      // Build ordered list matching optimized route
      const allCandidateMap = new Map<string, Candidate>();
      Object.entries(candidates).forEach(([theme, list]) => {
        list?.forEach(c => allCandidateMap.set(c.place_id, { ...c, theme }));
      });

      const orderedIds = (data.waypoint_order && data.waypoint_order.length)
        ? data.waypoint_order.map(i => providedIds[i])
        : providedIds;

      const resolved: Candidate[] = orderedIds
        .map(id => allCandidateMap.get(id))
        .filter(Boolean) as Candidate[];

      setFinalStopCards(resolved);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to build final route.");
    } finally {
      setBuilding(false);
    }
  }

  function toggleTheme(t: string, val: boolean) {
    setThemes(s => ({ ...s, [t]: val }));
  }
  function toggleStop(id: string, checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Open in Google Maps (public URL works best with lat,lng waypoints)
  const openInGoogleMaps = () => {
    const o = origin?.trim();
    const d = destination?.trim();
    if (!o || !d) {
      alert("Enter origin and destination");
      return;
    }
    // Build waypoints from coordinates (fallback to name if missing)
    const MAX_WAYPOINTS = 23; // origin+destination + up to 23
    const ordered = finalStopCards
      .map((s) => {
        if (s.location && typeof s.location.lat === "number" && typeof s.location.lng === "number") {
          return `${s.location.lat},${s.location.lng}`;
        }
        return s.name || "";
      })
      .filter(Boolean)
      .slice(0, MAX_WAYPOINTS);

    const qs = new URLSearchParams({
      api: "1",
      origin: o,
      destination: d,
      travelmode: "driving",
    });
    if (ordered.length) qs.set("waypoints", ordered.join("|"));

    const url = `https://www.google.com/maps/dir/?${qs.toString()}`;
    window.open(url, "_blank", "noopener");
  };

  function clearAll() {
    setSelectedIds(new Set());
    setFinalPolyline(null);
    setFinalTotals(null);
    setFinalOrder(null);
    setFinalStopCards([]);
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="h-screen grid grid-rows-[64px_1fr] bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <span className="grid place-items-center size-10 rounded-xl bg-slate-800 text-cyan-300">✈️</span>
        <span className="text-lg font-semibold">Tripidea</span>
        <div className="text-xs text-slate-400">Directions + Places + Stargaze (server-only keys)</div>
      </header>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-[560px_1fr] lg:grid-cols-[600px_1fr] min-h-0">
        {/* Sidebar */}
        <aside className="md:border-r border-slate-800 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Sticky planner controls */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50 sticky top-0 z-10">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">Plan</div>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <label className="text-sm text-slate-300">Start</label>
                  <div className="flex gap-2">
                    <input
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="address or lat,lng"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm placeholder:text-slate-500"
                    />
                    <button
                      onClick={useMyLocation}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm hover:bg-slate-700"
                    >
                      Current location
                    </button>
                  </div>
                </div>

                <div className="grid gap-1">
                  <label className="text-sm text-slate-300">End</label>
                  <div className="flex gap-2">
                    <input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="address or lat,lng"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={swapEnds}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm hover:bg-slate-700"
                    >
                      Swap
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-sm text-slate-300">Days</label>
                    <input
                      type="number"
                      min={1}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm text-slate-300">Departure</label>
                    <select
                      value={depart}
                      onChange={(e) => setDepart(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="now">Now (traffic-aware)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-300 mb-2">Themes</div>
                  <div className="flex flex-wrap gap-2">
                    {ALL_THEMES.map((t) => (
                      <button
                        key={t}
                        onClick={() => toggleTheme(t, !themes[t])}
                        className={`px-3 py-1.5 rounded-full border text-sm transition
                          ${themes[t]
                            ? "border-cyan-400/70 text-cyan-300 bg-cyan-400/10"
                            : "border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800"}`}
                      >
                        {t === "stargaze_auto" ? "stargaze (auto)" : t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={discover}
                  disabled={discovering}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-400 text-slate-950 font-semibold py-2 hover:opacity-95 disabled:opacity-60"
                >
                  {discovering ? "Finding stops…" : "Discover stops"}
                </button>
              </div>
            </div>

            {/* Scroll area for results */}
            <div className="flex-1 overflow-y-auto scroll-smooth px-4 py-3 scroll-area overscroll-contain scrollbar-gutter-stable">
              {base && (
                <div className="mb-3 text-xs text-slate-400">
                  Base route: {base.distanceText} • {base.durationText}
                </div>
              )}

              <div className="space-y-6">
                {Object.entries(candidates).map(([theme, items]) =>
                  !items?.length ? null : (
                    <div key={theme}>
                      <div className="text-[11px] uppercase tracking-[.14em] text-slate-400 mb-2">
                        {theme === "stargaze_auto" ? "stargaze (auto: clear-sky only)" : theme}
                      </div>
                      <div className="grid gap-3">
                        {items.map((p) => (
                          <div
                            key={p.place_id}
                            className="grid grid-cols-[96px_1fr] gap-3 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden hover:bg-slate-900 transition"
                          >
                            <img
                              src={p.photo_url || ""}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={(e) => (e.currentTarget.style.opacity = "0.3")}
                              className="h-24 w-24 object-cover bg-slate-800"
                            />
                            <div className="py-2 pr-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="font-semibold">{p.name}</div>
                                <label className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(p.place_id)}
                                    onChange={(e) => toggleStop(p.place_id, e.target.checked)}
                                    className="size-4 accent-violet-400"
                                  />
                                  <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-200 text-xs">
                                    Select
                                  </span>
                                </label>
                              </div>

                              <div className="text-xs text-slate-400 line-clamp-2">{p.address || ""}</div>

                              {/* meta row with rating/detour + stargaze badges */}
                              <div className="mt-1 flex items-center justify-between text-xs">
                                <div className="text-slate-400">
                                  ⭐ {p.rating ?? "—"} · {p.user_ratings_total ?? 0} reviews
                                </div>

                                <div className="flex items-center gap-2">
                                  {/* detour pill */}
                                  <span className="px-2 py-0.5 rounded-full border border-slate-700 text-slate-200">
                                    {p.detourMinutes != null ? `+${p.detourMinutes} min` : "detour n/a"}
                                  </span>

                                  {/* stargaze badges */}
                                  {p.theme === "stargaze_auto" && p?.stargaze && (
                                    <>
                                      <span className="opacity-60">·</span>
                                      <span className="px-1.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300">
                                        Clear sky ~ {new Date(p.stargaze.eta_iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                      <span className="opacity-60">·</span>
                                      <span className="text-slate-300">
                                        Clouds {Math.round(p.stargaze.cloud_cover_percent)}%
                                      </span>
                                      {!!p.stargaze.zodiac?.length && (
                                        <>
                                          <span className="opacity-60">·</span>
                                          <span className="text-slate-300">
                                            {p.stargaze.zodiac.join(" & ")}
                                          </span>
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Sticky footer actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/70 backdrop-blur sticky bottom-0 z-10">
              <div className="grid gap-2">
                <button
                  onClick={buildFinal}
                  disabled={building || selectedIds.size === 0}
                  className="w-full rounded-xl bg-blue-500 text-slate-950 font-semibold py-2 hover:bg-blue-400 disabled:opacity-60"
                >
                  {building ? "Building…" : `Build final route (${selectedIds.size})`}
                </button>
                <button
                  onClick={clearAll}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 hover:bg-slate-800"
                >
                  Clear selections
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Map */}
        <main className="relative min-h-0">
          <MapContainer
            center={[49.25, -123.1]}
            zoom={6}
            className="h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] w-full"
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {baseCoords && (
              <Polyline positions={baseCoords} pathOptions={{ color: "#94a3b8", weight: 5, opacity: 0.9 }} />
            )}
            {finalCoords && (
              <Polyline positions={finalCoords} pathOptions={{ color: "#60a5fa", weight: 6, opacity: 0.95 }} />
            )}
            {markerPts.map((m, i) => (
              <CircleMarker
                key={i}
                center={[m.lat, m.lng]}
                radius={6}
                pathOptions={{ color: "#22d3ee", weight: 1, fillOpacity: 0.9 }}
              />
            ))}
            <FitTo baseCoords={baseCoords} finalCoords={finalCoords} markers={markerPts} />
          </MapContainer>

          {/* Legend above Leaflet controls */}
          <div className="absolute right-3 top-3 z-[1001] rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur px-3 py-2 text-xs text-slate-200 space-y-1">
            <div className="flex items-center gap-2"><span className="inline-block h-0.5 w-4 bg-slate-400 rounded" /> Base</div>
            <div className="flex items-center gap-2"><span className="inline-block h-0.5 w-4 bg-blue-400 rounded" /> Final</div>
            <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-cyan-300" /> Stop</div>
          </div>

          {/* Trip summary panel */}
          {finalTotals && (
            <div className="absolute left-3 bottom-3 md:left-auto md:right-3 md:bottom-3 z-[1002] max-w-[420px] w-[calc(100%-24px)] md:w-[420px]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/85 backdrop-blur shadow-lg overflow-hidden">
                {/* header */}
                <div className="p-4 border-b border-slate-800">
                  <div className="text-sm uppercase tracking-[.12em] text-slate-400">Trip summary</div>
                  <div className="mt-1 text-lg font-semibold text-slate-100">
                    {formatKm(finalTotals.distance_meters)} • {formatDuration(finalTotals.duration_seconds)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {finalStopCards.length} stop{finalStopCards.length === 1 ? "" : "s"} selected
                  </div>
                </div>

                {/* stops list */}
                <div className="max-h-[32vh] overflow-y-auto scroll-area">
                  {finalStopCards.map((s, idx) => (
                    <div
                      key={s.place_id}
                      className="flex items-start gap-3 p-3 border-b border-slate-800 last:border-b-0 hover:bg-slate-900/70"
                    >
                      <div className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-blue-500 text-slate-950 text-xs font-bold grid place-items-center">
                        {idx + 1}
                      </div>
                      <img
                        src={s.photo_url || ""}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => (e.currentTarget.style.opacity = "0.3")}
                        className="w-16 h-16 rounded-md object-cover bg-slate-800 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{s.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {s.address || ""}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                          <span>⭐ {s.rating ?? "—"}</span>
                          <span className="opacity-60">·</span>
                          <span>{s.user_ratings_total ?? 0} reviews</span>
                          {typeof s.detourMinutes === "number" && (
                            <>
                              <span className="opacity-60">·</span>
                              <span className="px-1.5 py-0.5 rounded-full border border-slate-700">
                                +{s.detourMinutes} min detour
                              </span>
                            </>
                          )}
                          {s.theme === "stargaze_auto" && s.stargaze && (
                            <>
                              <span className="opacity-60">·</span>
                              <span className="px-1.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300">
                                Clear sky ~ {new Date(s.stargaze.eta_iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <span className="opacity-60">·</span>
                              <span>Clouds {Math.round(s.stargaze.cloud_cover_percent)}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* actions */}
                <div className="p-3 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={openInGoogleMaps}
                    disabled={!origin || !destination || finalStopCards.length === 0}
                    className="flex-1 rounded-xl bg-emerald-400 text-slate-950 font-semibold py-2 hover:bg-emerald-300 disabled:opacity-60"
                  >
                    Open in Google Maps
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
