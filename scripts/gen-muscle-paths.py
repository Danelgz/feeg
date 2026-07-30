import re, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC = r"C:\Users\danel\Desktop\FEEG\mi-web\public\frontrear.html"
OUT = r"C:\Users\danel\Desktop\FEEG\mi-web\data\muscleMapPaths.ts"

src = open(SRC, encoding="utf-8").read()

# Grupos del SVG -> grupo muscular de FEEG (data/muscleMapRegions.ts).
# Los que no aparecen aquí (body, hands) son silueta, no región clicable.
GROUP_MAP = {
    "front-shoulders": "Hombros",
    "rear-shoulders": "Hombros",
    "chest": "Pecho",
    "abdominals": "Abdomen",
    "obliques": "Abdomen",
    "lats": "Espalda",
    "lowerback": "Espalda",
    "traps": "Espalda",
    "traps-middle": "Espalda",
    "triceps": "Tríceps",
    "forearms": "Antebrazo",
    "quads": "Cuádriceps",
    "hamstrings": "Femoral",
    "glutes": "Glúteos",
    "calves": "Gemelos",
}

PATH_RE = re.compile(r"<path\b([^>]*)>")
ATTR_RE = re.compile(r'([a-zA-Z-]+)="([^"]*)"')


def paths_in(block):
    out = []
    for m in PATH_RE.finditer(block):
        attrs = dict(ATTR_RE.findall(m.group(1)))
        d = attrs.get("d")
        if not d:
            continue
        out.append({
            "d": d,
            "fill": attrs.get("fill", "currentColor"),
            "stroke": attrs.get("stroke"),
            "strokeWidth": attrs.get("stroke-width"),
        })
    return out


svg_starts = [m.start() for m in re.finditer(r"<svg\b", src)]
svg_starts.append(len(src))
views = ["front", "back"]

result = {}
viewbox = None

for idx, view in enumerate(views):
    chunk = src[svg_starts[idx]:svg_starts[idx + 1]]
    if viewbox is None:
        viewbox = re.search(r'viewBox="([^"]+)"', chunk).group(1)

    gs = [(m.start(), m.group(1)) for m in re.finditer(r'<g\s+id="([^"]+)"[^>]*>', chunk)]
    gs.append((len(chunk), None))

    silhouette = []
    muscles = {}
    for i in range(len(gs) - 1):
        start, gid = gs[i]
        body = chunk[start:gs[i + 1][0]]
        ps = paths_in(body)
        if not ps:
            continue
        if gid in ("body", "hands"):
            silhouette.extend(ps)
        elif gid in GROUP_MAP:
            muscles.setdefault(GROUP_MAP[gid], []).extend(ps)
        else:
            print(f"  ! grupo sin mapear en {view}: {gid} ({len(ps)} paths)")

    result[view] = {"silhouette": silhouette, "muscles": muscles}
    print(f"{view}: silueta={len(silhouette)} paths, grupos={ {k: len(v) for k, v in muscles.items()} }")


def emit_path(p, indent):
    pad = " " * indent
    bits = [f'{pad}  d: {json.dumps(p["d"], ensure_ascii=False)},']
    if p["fill"] and p["fill"] != "currentColor":
        bits.append(f'{pad}  fill: {json.dumps(p["fill"])},')
    if p["stroke"]:
        bits.append(f'{pad}  stroke: {json.dumps(p["stroke"])},')
    if p["strokeWidth"]:
        bits.append(f'{pad}  strokeWidth: {json.dumps(p["strokeWidth"])},')
    return pad + "{\n" + "\n".join(bits) + "\n" + pad + "}"


lines = []
lines.append("// GENERADO — no editar a mano.")
lines.append("// Extraído de public/frontrear.html con scripts/gen-muscle-paths.py.")
lines.append("//")
lines.append("// Geometría anatómica del mapa muscular: silueta + regiones por grupo, en vista frontal y")
lines.append("// posterior. Sustituye a los rectángulos y elipses del mapa esquemático anterior, que vivían")
lines.append("// en muscleMapRegions.ts.")
lines.append("//")
lines.append("// Dos grupos de MUSCLE_GROUPS no tienen región dibujable en este asset y por eso no aparecen:")
lines.append("// 'Cuello' (el SVG no trae cuello) y 'Bíceps' (la vista frontal no incluye grupo de bíceps).")
lines.append("// MuscleMap los omite del cuerpo; siguen contando en 'Series por grupo'.")
lines.append("")
lines.append("export interface MusclePath {")
lines.append("  d: string;")
lines.append("  fill?: string;")
lines.append("  stroke?: string;")
lines.append("  strokeWidth?: string;")
lines.append("}")
lines.append("")
lines.append(f'export const ANATOMY_VIEW_BOX = "{viewbox}";')
lines.append("")

for view in views:
    data = result[view]
    lines.append(f"/** Contorno y detalle no muscular de la vista {'frontal' if view == 'front' else 'posterior'}. */")
    lines.append(f"export const {view.upper()}_SILHOUETTE: MusclePath[] = [")
    for p in data["silhouette"]:
        lines.append(emit_path(p, 2) + ",")
    lines.append("];")
    lines.append("")
    lines.append(f"export const {view.upper()}_MUSCLES: Record<string, MusclePath[]> = {{")
    for group, ps in sorted(data["muscles"].items()):
        lines.append(f'  {json.dumps(group, ensure_ascii=False)}: [')
        for p in ps:
            lines.append(emit_path(p, 4) + ",")
        lines.append("  ],")
    lines.append("};")
    lines.append("")

open(OUT, "w", encoding="utf-8").write("\n".join(lines))
print(f"\nEscrito {OUT} ({len('\n'.join(lines))/1024:.1f} KB)")
