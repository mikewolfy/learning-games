#!/usr/bin/env python3
"""
Builds games/mapdash/mapdash-data.js for the Map Dash geography game.

Sources (downloaded on the fly, all public domain / permissive):
  * us-atlas (US Census cartographic boundaries, pre-projected, with Alaska/Hawaii insets)
  * Natural Earth 1:50m countries (public domain), which includes each country's continent

The shapes are simplified (Ramer-Douglas-Peucker) and rounded so the whole data file stays small.
Capitals, state regions and the quiz sets (which countries belong to which map) are written below.

Usage:  python3 tools/build_mapdash_data.py
"""
import json, math, os, urllib.request

US_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json"
WORLD_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"
OUT = os.path.join(os.path.dirname(__file__), "..", "games", "mapdash", "mapdash-data.js")

S = 20            # world map: x = (lon + 180) * S, y = (90 - lat) * S
US_TOL = 0.5     # simplification tolerance for the US (in map pixels)
WORLD_TOL = 1.1   # simplification tolerance for the world (in map units, 20 per degree)

# ---------------------------------------------------------------------------
# United States
# ---------------------------------------------------------------------------
STATES = {  # name: (postal, capital, region)
    "Alabama": ("AL", "Montgomery", "South"), "Alaska": ("AK", "Juneau", "West"), "Arizona": ("AZ", "Phoenix", "West"),
    "Arkansas": ("AR", "Little Rock", "South"), "California": ("CA", "Sacramento", "West"), "Colorado": ("CO", "Denver", "West"),
    "Connecticut": ("CT", "Hartford", "Northeast"), "Delaware": ("DE", "Dover", "South"), "Florida": ("FL", "Tallahassee", "South"),
    "Georgia": ("GA", "Atlanta", "South"), "Hawaii": ("HI", "Honolulu", "West"), "Idaho": ("ID", "Boise", "West"),
    "Illinois": ("IL", "Springfield", "Midwest"), "Indiana": ("IN", "Indianapolis", "Midwest"), "Iowa": ("IA", "Des Moines", "Midwest"),
    "Kansas": ("KS", "Topeka", "Midwest"), "Kentucky": ("KY", "Frankfort", "South"), "Louisiana": ("LA", "Baton Rouge", "South"),
    "Maine": ("ME", "Augusta", "Northeast"), "Maryland": ("MD", "Annapolis", "South"), "Massachusetts": ("MA", "Boston", "Northeast"),
    "Michigan": ("MI", "Lansing", "Midwest"), "Minnesota": ("MN", "Saint Paul", "Midwest"), "Mississippi": ("MS", "Jackson", "South"),
    "Missouri": ("MO", "Jefferson City", "Midwest"), "Montana": ("MT", "Helena", "West"), "Nebraska": ("NE", "Lincoln", "Midwest"),
    "Nevada": ("NV", "Carson City", "West"), "New Hampshire": ("NH", "Concord", "Northeast"), "New Jersey": ("NJ", "Trenton", "Northeast"),
    "New Mexico": ("NM", "Santa Fe", "West"), "New York": ("NY", "Albany", "Northeast"), "North Carolina": ("NC", "Raleigh", "South"),
    "North Dakota": ("ND", "Bismarck", "Midwest"), "Ohio": ("OH", "Columbus", "Midwest"), "Oklahoma": ("OK", "Oklahoma City", "South"),
    "Oregon": ("OR", "Salem", "West"), "Pennsylvania": ("PA", "Harrisburg", "Northeast"), "Rhode Island": ("RI", "Providence", "Northeast"),
    "South Carolina": ("SC", "Columbia", "South"), "South Dakota": ("SD", "Pierre", "Midwest"), "Tennessee": ("TN", "Nashville", "South"),
    "Texas": ("TX", "Austin", "South"), "Utah": ("UT", "Salt Lake City", "West"), "Vermont": ("VT", "Montpelier", "Northeast"),
    "Virginia": ("VA", "Richmond", "South"), "Washington": ("WA", "Olympia", "West"), "West Virginia": ("WV", "Charleston", "South"),
    "Wisconsin": ("WI", "Madison", "Midwest"), "Wyoming": ("WY", "Cheyenne", "West"),
}

# ---------------------------------------------------------------------------
# World: friendly names, capitals and quiz sets
# ---------------------------------------------------------------------------
FRIENDLY = {  # Natural Earth name -> name shown in the game
    "United States of America": "United States", "Dem. Rep. Congo": "Democratic Republic of the Congo", "Congo": "Republic of the Congo",
    "Central African Rep.": "Central African Republic", "Bosnia and Herz.": "Bosnia and Herzegovina", "Dominican Rep.": "Dominican Republic",
    "Côte d'Ivoire": "Ivory Coast", "S. Sudan": "South Sudan", "Solomon Is.": "Solomon Islands", "Macedonia": "North Macedonia",
    "N. Macedonia": "North Macedonia", "eSwatini": "Eswatini", "Eq. Guinea": "Equatorial Guinea", "Czech Rep.": "Czechia",
}
CAPITALS = {
    # Europe
    "Iceland": "Reykjavik", "Ireland": "Dublin", "United Kingdom": "London", "Portugal": "Lisbon", "Spain": "Madrid", "France": "Paris",
    "Belgium": "Brussels", "Netherlands": "Amsterdam", "Germany": "Berlin", "Switzerland": "Bern", "Austria": "Vienna", "Italy": "Rome",
    "Denmark": "Copenhagen", "Norway": "Oslo", "Sweden": "Stockholm", "Finland": "Helsinki", "Poland": "Warsaw", "Czechia": "Prague",
    "Slovakia": "Bratislava", "Hungary": "Budapest", "Slovenia": "Ljubljana", "Croatia": "Zagreb", "Bosnia and Herzegovina": "Sarajevo",
    "Serbia": "Belgrade", "Montenegro": "Podgorica", "Albania": "Tirana", "North Macedonia": "Skopje", "Greece": "Athens",
    "Bulgaria": "Sofia", "Romania": "Bucharest", "Moldova": "Chisinau", "Ukraine": "Kyiv", "Belarus": "Minsk", "Lithuania": "Vilnius",
    "Latvia": "Riga", "Estonia": "Tallinn", "Russia": "Moscow",
    # Asia
    "Turkey": "Ankara", "Syria": "Damascus", "Jordan": "Amman", "Iraq": "Baghdad", "Iran": "Tehran", "Saudi Arabia": "Riyadh",
    "Yemen": "Sanaa", "Oman": "Muscat", "United Arab Emirates": "Abu Dhabi", "Georgia": "Tbilisi", "Armenia": "Yerevan", "Azerbaijan": "Baku",
    "Kazakhstan": "Astana", "Uzbekistan": "Tashkent", "Turkmenistan": "Ashgabat", "Kyrgyzstan": "Bishkek", "Tajikistan": "Dushanbe",
    "Afghanistan": "Kabul", "Pakistan": "Islamabad", "India": "New Delhi", "Nepal": "Kathmandu", "Bhutan": "Thimphu", "Bangladesh": "Dhaka",
    "Myanmar": "Naypyidaw", "Thailand": "Bangkok", "Laos": "Vientiane", "Vietnam": "Hanoi", "Cambodia": "Phnom Penh",
    "Malaysia": "Kuala Lumpur", "Indonesia": "Jakarta", "Philippines": "Manila", "China": "Beijing", "Mongolia": "Ulaanbaatar",
    "North Korea": "Pyongyang", "South Korea": "Seoul", "Japan": "Tokyo", "Taiwan": "Taipei",
    # Africa
    "Morocco": "Rabat", "Algeria": "Algiers", "Tunisia": "Tunis", "Libya": "Tripoli", "Egypt": "Cairo", "Mauritania": "Nouakchott",
    "Mali": "Bamako", "Niger": "Niamey", "Chad": "N'Djamena", "Sudan": "Khartoum", "South Sudan": "Juba", "Ethiopia": "Addis Ababa",
    "Eritrea": "Asmara", "Somalia": "Mogadishu", "Kenya": "Nairobi", "Uganda": "Kampala", "Tanzania": "Dodoma",
    "Democratic Republic of the Congo": "Kinshasa", "Republic of the Congo": "Brazzaville", "Gabon": "Libreville", "Cameroon": "Yaoundé",
    "Nigeria": "Abuja", "Togo": "Lomé", "Ghana": "Accra", "Liberia": "Monrovia", "Ivory Coast": "Yamoussoukro", "Benin": "Porto-Novo", "Sierra Leone": "Freetown", "Guinea": "Conakry",
    "Guinea-Bissau": "Bissau", "Senegal": "Dakar", "Burkina Faso": "Ouagadougou", "Central African Republic": "Bangui",
    "Angola": "Luanda", "Zambia": "Lusaka", "Zimbabwe": "Harare", "Mozambique": "Maputo", "Malawi": "Lilongwe", "Namibia": "Windhoek",
    "Botswana": "Gaborone", "Madagascar": "Antananarivo",
    # Americas
    "Colombia": "Bogotá", "Venezuela": "Caracas", "Guyana": "Georgetown", "Suriname": "Paramaribo", "Ecuador": "Quito", "Peru": "Lima",
    "Brazil": "Brasília", "Paraguay": "Asunción", "Chile": "Santiago", "Argentina": "Buenos Aires", "Uruguay": "Montevideo",
    "Canada": "Ottawa", "United States": "Washington, D.C.", "Mexico": "Mexico City", "Guatemala": "Guatemala City", "Belize": "Belmopan",
    "Honduras": "Tegucigalpa", "El Salvador": "San Salvador", "Nicaragua": "Managua", "Costa Rica": "San José", "Panama": "Panama City",
    "Cuba": "Havana", "Jamaica": "Kingston", "Haiti": "Port-au-Prince", "Dominican Republic": "Santo Domingo", "Bahamas": "Nassau",
    "Greenland": "Nuuk",
    # Oceania
    "Australia": "Canberra", "New Zealand": "Wellington", "Papua New Guinea": "Port Moresby", "Fiji": "Suva", "Solomon Islands": "Honiara",
}
# Countries that are shown on the map but left out of the capital quiz because the capital is debated or has several answers
NO_CAPITAL_QUIZ = set()

SETS = {
    "europe": "Iceland,Ireland,United Kingdom,Portugal,Spain,France,Belgium,Netherlands,Germany,Switzerland,Austria,Italy,Denmark,Norway,Sweden,Finland,Poland,Czechia,Slovakia,Hungary,Slovenia,Croatia,Bosnia and Herzegovina,Serbia,Montenegro,Albania,North Macedonia,Greece,Bulgaria,Romania,Moldova,Ukraine,Belarus,Lithuania,Latvia,Estonia,Russia",
    "asia": "Turkey,Syria,Jordan,Iraq,Iran,Saudi Arabia,Yemen,Oman,United Arab Emirates,Georgia,Armenia,Azerbaijan,Kazakhstan,Uzbekistan,Turkmenistan,Kyrgyzstan,Tajikistan,Afghanistan,Pakistan,India,Nepal,Bhutan,Bangladesh,Myanmar,Thailand,Laos,Vietnam,Cambodia,Malaysia,Indonesia,Philippines,China,Mongolia,North Korea,South Korea,Japan,Taiwan,Russia",
    "africa": "Morocco,Algeria,Tunisia,Libya,Egypt,Mauritania,Mali,Niger,Chad,Sudan,South Sudan,Ethiopia,Eritrea,Somalia,Kenya,Uganda,Tanzania,Democratic Republic of the Congo,Republic of the Congo,Gabon,Cameroon,Nigeria,Benin,Togo,Ghana,Ivory Coast,Liberia,Sierra Leone,Guinea,Guinea-Bissau,Senegal,Burkina Faso,Central African Republic,Angola,Zambia,Zimbabwe,Mozambique,Malawi,Namibia,Botswana,South Africa,Madagascar",
    "samerica": "Colombia,Venezuela,Guyana,Suriname,Ecuador,Peru,Brazil,Bolivia,Paraguay,Chile,Argentina,Uruguay",
    "namerica": "Canada,United States,Mexico,Guatemala,Belize,Honduras,El Salvador,Nicaragua,Costa Rica,Panama,Cuba,Jamaica,Haiti,Dominican Republic,Bahamas,Greenland",
    "oceania": "Australia,New Zealand,Papua New Guinea,Fiji,Solomon Islands",
    "world": "United States,Canada,Mexico,Cuba,Greenland,Brazil,Argentina,Peru,Colombia,Chile,Venezuela,United Kingdom,France,Spain,Germany,Italy,Poland,Ukraine,Sweden,Norway,Russia,Turkey,Egypt,Nigeria,Ethiopia,Kenya,South Africa,Morocco,Algeria,Libya,Democratic Republic of the Congo,Tanzania,Madagascar,Saudi Arabia,Iran,Iraq,Afghanistan,Pakistan,India,Kazakhstan,Mongolia,China,Japan,South Korea,North Korea,Thailand,Vietnam,Indonesia,Philippines,Australia,New Zealand",
}
# The view (lon/lat window) for each map. sx squeezes the map horizontally (cos of the middle latitude) so shapes look right.
VIEWS = {
    "world": (-180, 180, -60, 84), "europe": (-25, 45, 34, 72), "asia": (25, 146, -11, 78), "africa": (-20, 53, -36, 38),
    "samerica": (-83, -33, -57, 14), "namerica": (-170, -20, 5, 84), "oceania": (110, 180, -48, 2),
}
CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America", "Antarctica"]

def fetch(url):
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read()

def rdp(points, tol):
    """Ramer-Douglas-Peucker line simplification (iterative)."""
    n = len(points)
    if n < 4: return points
    keep = [False] * n; keep[0] = keep[-1] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, idx = 0.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            d = math.hypot(px - ax, py - ay) if L == 0 else abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > best: best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True; stack.append((a, idx)); stack.append((idx, b))
    return [p for p, k in zip(points, keep) if k]

def ring_path(ring, tol, dec):
    pts = rdp(ring, tol)
    if len(pts) < 4: return ""
    fmt = (lambda v: f"{v:.1f}".rstrip("0").rstrip(".")) if dec else (lambda v: str(int(round(v))))
    return "M" + "L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts[:-1]) + "Z"

def ring_area(ring):
    return abs(sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1))) / 2

# ---------------------------------------------------------------------------
def build_us():
    topo = json.loads(fetch(US_URL))
    sx, sy = topo["transform"]["scale"]; tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0; pts = []
        for dx, dy in arc:
            x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    def get_arc(i):
        return arcs[i] if i >= 0 else list(reversed(arcs[~i]))
    def ring_from(arc_ids):
        pts = []
        for i in arc_ids:
            a = get_arc(i); pts.extend(a if not pts else a[1:])
        return pts
    out = []
    minx = miny = 1e9; maxx = maxy = -1e9
    for g in topo["objects"]["states"]["geometries"]:
        name = g["properties"]["name"]
        if name not in STATES: continue          # skip DC (too small to click) and anything else
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        d = ""
        for poly in polys:
            for ring_ids in poly:
                ring = ring_from(ring_ids)
                if ring_area(ring) < 1.2: continue    # drop specks
                d += ring_path(ring, US_TOL, True)
                for x, y in ring: minx, maxx, miny, maxy = min(minx, x), max(maxx, x), min(miny, y), max(maxy, y)
        post, cap, reg = STATES[name]
        out.append({"i": post, "n": name, "c": cap, "r": reg, "d": d})
    out.sort(key=lambda s: s["n"])
    pad = 4
    return {"vb": [round(minx - pad), round(miny - pad), round(maxx - minx + 2 * pad), round(maxy - miny + 2 * pad)], "states": out}

def build_world():
    fc = json.loads(fetch(WORLD_URL))
    by_name = {}
    shapes = []   # {i, n, k, d}
    need = {n for v in SETS.values() for n in v.split(",")}
    for f in fc["features"]:
        p = f["properties"]
        raw = p["NAME"]; name = FRIENDLY.get(raw, raw)
        cont = p["CONTINENT"]
        if cont.startswith("Seven seas"): continue
        g = f["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        target = name in need
        parts = {}   # continent -> path
        for poly in polys:
            outer = poly[0]
            area = ring_area(outer)
            if area < (0.02 if target else 0.15) and not (target and area > 0.003): continue     # drop specks (in square degrees)
            lon = sum(x for x, _ in outer) / len(outer); lat = sum(y for _, y in outer) / len(outer)
            pc = cont
            if p["ADM0_A3"] == "FRA" and lon < -30: pc = "South America"        # French Guiana
            if p["ADM0_A3"] in ("NLD", "GBR", "ESP", "PRT", "NOR", "DNK") and lon < -30 and lat < 20: pc = "North America"
            d = ""
            for ring in poly:
                pts = [((x + 180) * S, (90 - y) * S) for x, y in ring]
                d += ring_path(pts, WORLD_TOL, False)
            if d: parts[pc] = parts.get(pc, "") + d
        for pc, d in parts.items():
            nm = name if pc == cont else ("French Guiana" if p["ADM0_A3"] == "FRA" else name + " (overseas)")
            shapes.append({"i": p["ADM0_A3"] + ("" if pc == cont else "_" + pc[:2]), "n": nm, "k": pc, "d": d})
            by_name.setdefault(nm, shapes[-1]["i"])
    sets = {}
    for key, lst in SETS.items():
        ids = []
        for nm in lst.split(","):
            if nm not in by_name: raise SystemExit(f"country not found in the map data: {nm}")
            if nm not in CAPITALS and nm not in ("Bolivia", "South Africa"): raise SystemExit(f"no capital for {nm}")
            ids.append(by_name[nm])
        sets[key] = ids
    caps = {by_name[n]: c for n, c in CAPITALS.items() if n in by_name}
    targets = {i for ids in sets.values() for i in ids}
    # Only keep names for the countries that are quiz targets (the rest are just background land)
    for s in shapes:
        if s["i"] not in targets: s["n"] = ""
    views = {}
    for key, (lo0, lo1, la0, la1) in VIEWS.items():
        sx = round(math.cos(math.radians((la0 + la1) / 2)), 3) if key != "world" else 1
        views[key] = [lo0, lo1, la0, la1, sx]
    return {"S": S, "shapes": shapes, "sets": sets, "caps": caps, "views": views, "continents": CONTINENTS}

def main():
    us = build_us(); world = build_world()
    data = {"us": us, "world": world}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        f.write("// Map Dash — map shapes, capitals and quiz sets. Generated by tools/build_mapdash_data.py. Do not edit by hand.\n")
        f.write("window.MD = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";\n")
    size = os.path.getsize(OUT)
    print(f"wrote {OUT}: {size // 1024} KB | US states {len(us['states'])} | world shapes {len(world['shapes'])}")
    print({k: len(v) for k, v in world["sets"].items()})

main()
