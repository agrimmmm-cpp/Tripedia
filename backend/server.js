/**
 * Trip Planner Backend (Directions + Places)
 * ------------------------------------------
 * Endpoints:
 *  1) GET  /api/discover-stops
 *     Input: origin, destination, days, themes (comma list: hikes,waterfalls,lakes,cafes,...)
 *     Output: base route summary + candidate stops with photo + estimated detour minutes
 *
 *  2) POST /api/final-route
 *     Input: origin, destination, selectedPlaceIds[], mode
 *     Output: final optimized route (polyline, legs, totals) using Directions waypoints=optimize:true
 *
 * KEY IDEAS
 *  - Use Directions to get baseline A→B polyline.
 *  - Sample polyline every N km (N scales with trip length/days).
 *  - For each sample and chosen themes, call Places Nearby/Text to discover POIs near the route.
 *  - Rank by quality (rating/reviews) then compute detour minutes for top-N via small Directions calls:
 *      segmentStart → place → segmentEnd vs segmentStart → segmentEnd.
 *  - Return compact JSON with photo URLs via Place Photos.
 *
 * Where to put API key:
 *  - .env: GOOGLE_MAPS_API_KEY=YOUR_REAL_SERVER_KEY
 */

import express from "express";
import dotenv from "dotenv";
import compression from "compression";
import cors from "cors";

// If you're on Node < 18, uncomment:
// import fetch from "node-fetch";
// globalThis.fetch = fetch;

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY in .env");
  process.exit(1);
}

/* ----------------------- Helpers: geo + polyline ----------------------- */

function toRad(d) { return (d * Math.PI) / 180; }
function haversineMeters(a, b) {
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Decode Google Encoded Polyline
function decodePolyline(str) {
  let index = 0, lat = 0, lng = 0, coords = [];
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

// Sample points along polyline roughly every `everyMeters`
function samplePath(path, everyMeters) {
  const out = [];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += haversineMeters(path[i-1], path[i]);
    if (acc >= everyMeters) { out.push(path[i]); acc = 0; }
  }
  return out.length ? out : [path[Math.floor(path.length/2)]];
}

/* -------------------------- Themes → queries --------------------------- */
/**
 * Map user themes to Places "type" or "keyword".
 * You can expand/tune this list for your product.
 */
const THEME_MAP = {
  hikes:        { mode: "text", queries: ["trailhead", "hiking area", "scenic trail"] },
  waterfalls:   { mode: "text", queries: ["waterfall"] },
  lakes:        { mode: "text", queries: ["lake beach", "lakeside viewpoint"] },
  cafes:        { mode: "nearby", types: ["cafe", "bakery"] },
  viewpoints:   { mode: "text", queries: ["scenic viewpoint", "lookout"] },
  parks:        { mode: "nearby", types: ["park"] },
  food:         { mode: "nearby", types: ["restaurant"] },
  museums:      { mode: "nearby", types: ["museum"] },
};

/* -------------------------- Places API helpers ------------------------- */

function placePhotoUrl(photoRef, maxwidth = 600) {
  if (!photoRef) return null;
  const p = new URLSearchParams({ maxwidth: String(maxwidth), photoreference: photoRef, key: API_KEY });
  return `https://maps.googleapis.com/maps/api/place/photo?${p.toString()}`;
}

async function placesNearby({ lat, lng }, { type, radius = 2000 }) {
  const qs = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type,
    key: API_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${qs}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places Nearby error: ${data.status} ${data.error_message || ""}`);
  }
  return (data.results || []).map(p => ({
    place_id: p.place_id,
    name: p.name,
    rating: p.rating ?? null,
    user_ratings_total: p.user_ratings_total ?? 0,
    location: p.geometry?.location,
    address: p.vicinity || p.formatted_address || null,
    photo_url: placePhotoUrl(p.photos?.[0]?.photo_reference),
    types: p.types || [],
  }));
}

async function placesTextSearch({ lat, lng }, { query, radius = 4000 }) {
  const qs = new URLSearchParams({
    query: `${query}`,
    location: `${lat},${lng}`,
    radius: String(radius),
    key: API_KEY,
  });
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${qs}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Places Text error: ${data.status} ${data.error_message || ""}`);
  }
  return (data.results || []).map(p => ({
    place_id: p.place_id,
    name: p.name,
    rating: p.rating ?? null,
    user_ratings_total: p.user_ratings_total ?? 0,
    location: p.geometry?.location,
    address: p.formatted_address || null,
    photo_url: placePhotoUrl(p.photos?.[0]?.photo_reference),
    types: p.types || [],
  }));
}

/* ----------------------- Directions API helpers ------------------------ */

// Base A→B directions (overview polyline for corridor)
async function directionsAB({ origin, destination, mode = "driving", departure_time }) {
  const qs = new URLSearchParams({ origin, destination, mode, key: API_KEY });
  if (departure_time) qs.set("departure_time", String(departure_time)); // 'now' or unix
  const url = `https://maps.googleapis.com/maps/api/directions/json?${qs}`;
  const r = await fetch(url);
  const data = await r.json();
  if (data.status !== "OK") {
    throw new Error(`Directions error: ${data.status} ${data.error_message || ""}`);
  }
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  return {
    polyline: route?.overview_polyline?.points || null,
    distanceText: leg?.distance?.text || null,
    durationText: leg?.duration?.text || null,
    route,
  };
}

// Estimate detour: time(i→i+K via place) − time(i→i+K)
async function detourMinutes({ start, end, via, mode = "driving" }) {
  const baseQS = new URLSearchParams({ origin: `${start.lat},${start.lng}`, destination: `${end.lat},${end.lng}`, mode, key: API_KEY });
  const viaQS  = new URLSearchParams({ origin: `${start.lat},${start.lng}`, destination: `${end.lat},${end.lng}`, waypoints: `${via.lat},${via.lng}`, mode, key: API_KEY });

  const [baseResp, viaResp] = await Promise.all([
    fetch(`https://maps.googleapis.com/maps/api/directions/json?${baseQS}`),
    fetch(`https://maps.googleapis.com/maps/api/directions/json?${viaQS}`)
  ]);
  const [base, withVia] = await Promise.all([baseResp.json(), viaResp.json()]);
  if (base.status !== "OK" || withVia.status !== "OK") return null;

  const baseSec = base.routes?.[0]?.legs?.reduce((s, l) => s + (l.duration?.value || 0), 0) || 0;
  const viaSec  = withVia.routes?.[0]?.legs?.reduce((s, l) => s + (l.duration?.value || 0), 0) || 0;
  return Math.max(0, Math.round((viaSec - baseSec) / 60)); // minutes
}

/* --------------------------- /api/discover-stops ----------------------- */
/**
 * Workflow step 1–2:
 * - input: origin, destination, days, themes=comma list, mode, departure_time
 * - output: base route summary + list of candidates per theme with photo + detourMinutes
 *
 * Notes:
 * - We sample every ~ (routeLength / (days+1)*X) or a capped default (e.g., 20–40 km)
 * - We limit Places + detour calls for cost control
 */
app.get("/api/discover-stops", async (req, res) => {
  try {
    const {
      origin,
      destination,
      days = "2",
      themes = "hikes,waterfalls,lakes,cafes",
      mode = "driving",
      departure_time,               // optional ('now' or unix)
      perTheme = "12",              // max results per theme overall
      perSamplePerTheme = "2",      // how many per sampled point per theme
      searchRadiusMeters = "3000"   // route corridor search radius
    } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination are required" });
    }

    // 1) Baseline corridor
    const base = await directionsAB({ origin, destination, mode, departure_time });
    if (!base.polyline) return res.status(404).json({ error: "No route polyline" });

    const path = decodePolyline(base.polyline);

    // Compute total distance (approx from polyline) to choose sample spacing
    let totalM = 0;
    for (let i = 1; i < path.length; i++) totalM += haversineMeters(path[i-1], path[i]);

    const d = Math.max(1, Number(days));
    // Aim ~10–15 samples per travel day, clamp to reasonable 15–40 km
    const targetSamples = Math.min(15 * d, 50);
    const everyMeters = Math.min(40000, Math.max(15000, Math.round(totalM / targetSamples)));

    const samples = samplePath(path, everyMeters);

    // Precompute cumulative distances to pick segment windows
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum[i] = cum[i-1] + haversineMeters(path[i-1], path[i]);
    const totalDist = cum[cum.length - 1];

    function nearestIndex(pt) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = haversineMeters(pt, path[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    // 2) Discover candidates per theme around each sample
    const themeList = String(themes).split(",").map(s => s.trim()).filter(Boolean);
    const perThemeCap = Math.max(3, Math.min(40, Number(perTheme)));
    const perSampleCap = Math.max(1, Math.min(5, Number(perSamplePerTheme)));
    const radius = Math.max(500, Math.min(10000, Number(searchRadiusMeters)));

    // Dedup by place_id across the whole corridor
    const candidates = {}; // theme -> Map(place_id -> place)
    for (const theme of themeList) candidates[theme] = new Map();

    for (const pt of samples) {
      for (const theme of themeList) {
        const cfg = THEME_MAP[theme];
        if (!cfg) continue;

        let results = [];
        if (cfg.mode === "nearby" && cfg.types) {
          // Try first type, fallback to next
          for (const type of cfg.types) {
            const r = await placesNearby(pt, { type, radius });
            results = results.concat(r);
            if (results.length >= perSampleCap) break;
          }
        } else if (cfg.mode === "text" && cfg.queries) {
          for (const q of cfg.queries) {
            const r = await placesTextSearch(pt, { query: q, radius: Math.round(radius * 1.5) });
            results = results.concat(r);
            if (results.length >= perSampleCap) break;
          }
        }

        // Keep top N by rating/reviews
        results.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.user_ratings_total - a.user_ratings_total));
        for (const p of results.slice(0, perSampleCap)) {
          if (p.location && !candidates[theme].has(p.place_id)) {
            candidates[theme].set(p.place_id, { ...p, theme });
          }
        }
      }
    }

    // 3) Trim per-theme by quality before detour pricing (cost control)
    const shortlists = {};
    for (const theme of themeList) {
      shortlists[theme] = Array.from(candidates[theme].values())
        .sort((a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          (b.user_ratings_total - a.user_ratings_total)
        )
        .slice(0, perThemeCap);
    }

    // 4) Estimate detour minutes for each finalist (compare i→i+K via place vs direct)
    //    Choose a local window around nearest path point; K ~ 10–20 points ahead (~10–20 km).
    const K = 12;

    async function detourForPlace(p) {
      const idx = nearestIndex({ lat: p.location.lat, lng: p.location.lng });
      const startIdx = Math.max(0, idx - Math.floor(K/2));
      const endIdx = Math.min(path.length - 1, idx + Math.floor(K/2));
      if (endIdx <= startIdx) return null;
      const start = path[startIdx], end = path[endIdx];
      const minutes = await detourMinutes({ start, end, via: p.location, mode });
      return minutes;
    }

    for (const theme of themeList) {
      // Detour calls can be heavy; cap per theme
      const list = shortlists[theme];
      for (const p of list) {
        p.detourMinutes = await detourForPlace(p); // may be null if directions failed
      }
      // Re-rank by (quality minus detour penalty)
      list.sort((a, b) => {
        const qa = (a.rating || 3) * Math.log1p(a.user_ratings_total || 0);
        const qb = (b.rating || 3) * Math.log1p(b.user_ratings_total || 0);
        const pa = (a.detourMinutes ?? 0) * 0.5; // penalty weight λ=0.5 min^-1 (tune)
        const pb = (b.detourMinutes ?? 0) * 0.5;
        return (qb - pb) - (qa - pa); // higher (qa - pa) first
      }).reverse();
    }

    // 5) Response
    return res.json({
      base: {
        distanceText: base.distanceText,
        durationText: base.durationText,
        polyline: base.polyline,
      },
      parameters: {
        days: Number(days),
        themes: themeList,
        sampleEveryMeters: everyMeters,
        searchRadiusMeters: radius,
      },
      candidates: shortlists, // { theme: [ { place_id, name, photo_url, detourMinutes, ... } ] }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

/* --------------------------- /api/final-route -------------------------- */
/**
 * Workflow step 3:
 * - input (JSON body): { origin, destination, selectedPlaceIds: string[], mode, departure_time }
 * - output: final optimized Directions route incl. waypoints=optimize:true
 */
app.post("/api/final-route", async (req, res) => {
  try {
    const { origin, destination, selectedPlaceIds = [], mode = "driving", departure_time } = req.body || {};
    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination are required" });
    }

    const qs = new URLSearchParams({
      origin, destination, mode, key: API_KEY,
    });
    if (departure_time) qs.set("departure_time", String(departure_time));

    if (selectedPlaceIds.length) {
      // use place_id waypoints with optimize:true so Google orders stops for minimal time
      const waypointParam = "optimize:true|" + selectedPlaceIds.map(id => `place_id:${id}`).join("|");
      qs.set("waypoints", waypointParam);
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?${qs}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== "OK") {
      return res.status(400).json({ error: "Directions error", status: data.status, message: data.error_message });
    }

    const route = data.routes?.[0];
    const legs = route?.legs || [];
    const totalDistanceMeters = legs.reduce((s, l) => s + (l.distance?.value || 0), 0);
    const totalDurationSeconds = legs.reduce((s, l) => s + (l.duration?.value || 0), 0);

    // If waypoints were optimized, waypoint_order shows the new order (indexes into provided list)
    const order = route?.waypoint_order || [];

    return res.json({
      polyline: route?.overview_polyline?.points || null,
      legs: legs.map(l => ({
        start_address: l.start_address,
        end_address: l.end_address,
        distance_text: l.distance?.text,
        duration_text: l.duration?.text,
      })),
      totals: {
        distance_meters: totalDistanceMeters,
        duration_seconds: totalDurationSeconds,
      },
      waypoint_order: order, // lets the client reorder selectedPlaceIds if needed
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

/* -------------------------------- health -------------------------------- */

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Trip backend running at http://localhost:${PORT}`);
});


