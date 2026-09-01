#!/usr/bin/env python3
"""
generate_palette.py — one brand seed -> the whole token system, contrast-corrected.

Governed by website_workflow/color_system.md. Emits CSS custom properties
(any web stack) plus a PASS/FAIL contrast report that is the Gate 5 artifact.

Why a script and not a checklist: deriving ~28 semantic tokens per theme and
measuring ~30 contrast pairs by hand is exactly the rule that gets skipped.
The framework's own precedent is that an unsatisfiable rule is worse than none.

Usage:
  python generate_palette.py --seed "#4C1D95" --mode DUAL
  python generate_palette.py --seed "#4C1D95" --mode SINGLE-DARK --out tokens.css
  python generate_palette.py --seed "#4C1D95" --mode DUAL --format ts

Colour space is OKLCH: perceptually uniform lightness, so stepping L gives
predictable contrast steps and holding H keeps every shade on-brand.
"""
import argparse, json, math, sys

# ---------------------------------------------------------------- colour math
def _s2l(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def _l2s(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055

def hex2rgb(h):
    h = h.strip().lstrip("#")
    if len(h) == 3: h = "".join(ch * 2 for ch in h)
    if len(h) != 6: raise ValueError(f"bad hex: {h}")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def rgb2hex(r, g, b):
    return "#%02X%02X%02X" % tuple(round(max(0, min(1, x)) * 255) for x in (r, g, b))

def rgb2oklch(r, g, b):
    r, g, b = _s2l(r), _s2l(g), _s2l(b)
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b
    m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b
    s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l_, m_, s_ = [x ** (1/3) if x >= 0 else -((-x) ** (1/3)) for x in (l, m, s)]
    L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_
    A = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_
    B = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360

def oklch2hex(L, C, H):
    A = C * math.cos(math.radians(H)); B = C * math.sin(math.radians(H))
    l_ = L + 0.3963377774*A + 0.2158037573*B
    m_ = L - 0.1055613458*A - 0.0638541728*B
    s_ = L - 0.0894841775*A - 1.2914855480*B
    l, m, s = l_**3, m_**3, s_**3
    r = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
    g = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
    b = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s
    return rgb2hex(_l2s(r), _l2s(g), _l2s(b))

def luminance(hx):
    r, g, b = (_s2l(c) for c in hex2rgb(hx))
    return 0.2126*r + 0.7152*g + 0.0722*b

def ratio(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

# ---------------------------------------------------------------- ramps
STEPS = {50:0.972, 100:0.936, 200:0.870, 300:0.788, 400:0.700,
         500:0.620, 600:0.535, 700:0.452, 800:0.372, 900:0.288, 950:0.205}

def ramp(hue, chroma, taper=0.55):
    """L-stepped ramp at fixed hue; chroma tapers toward both ends so the
    lightest/darkest steps don't turn neon or muddy."""
    out = {}
    for k, L in STEPS.items():
        t = 1 - abs(L - 0.62) / 0.62 * taper
        out[k] = oklch2hex(L, max(0.012, chroma * t), hue)
    return out

_ORDER = list(STEPS.keys())

def pick(rmp, surface, target, prefer):
    """Nearest ramp step to `prefer` that clears `target` against `surface`.
    Returns (key, hex, ratio, drift) where drift = how many ramp STEPS the
    correction moved. Drift is the real risk, not failure: correction almost
    always finds SOME passing step, but a token dragged several steps from its
    intended shade stops reading as the brand. Surfacing drift is what keeps
    the auto-correction honest."""
    ok = [(k, v, ratio(v, surface)) for k, v in rmp.items() if ratio(v, surface) >= target]
    if ok:
        k, v, r = min(ok, key=lambda x: abs(_ORDER.index(x[0]) - _ORDER.index(prefer)))
        return k, v, r, abs(_ORDER.index(k) - _ORDER.index(prefer))
    for fb in ("#FFFFFF", "#000000"):
        if ratio(fb, surface) >= target:
            return None, fb, ratio(fb, surface), 99
    worst = max(rmp.items(), key=lambda kv: ratio(kv[1], surface))
    return worst[0], worst[1], ratio(worst[1], surface), 99

def label_on(fill):
    """Text colour to sit ON a filled surface — measured, never assumed.
    This is {ACCENT_1_ON}: the most important text on the page."""
    w, b = ratio(fill, "#FFFFFF"), ratio(fill, "#111111")
    return ("#FFFFFF", w) if w >= b else ("#111111", b)

SEMANTIC_HUES = {"success": 148.0, "warning": 75.0, "error": 27.0, "info": 248.0}

# ---------------------------------------------------------------- build
def build(seed, mode):
    L, C, H = rgb2oklch(*hex2rgb(seed))
    brand = ramp(H, max(C, 0.09))
    neutral = ramp(H, 0.016)                       # brand-tinted neutrals, not flat grey
    sem = {n: ramp(h, 0.115) for n, h in SEMANTIC_HUES.items()}

    themes = {"SINGLE-DARK": ["dark"], "SINGLE-LIGHT": ["light"], "DUAL": ["light", "dark"]}[mode]
    out, checks = {}, []

    DRIFT_LIMIT = 2   # steps; beyond this the shade stops reading as intended

    def chk(name, fg, bg, target, theme, drift=0):
        r = ratio(fg, bg)
        checks.append({"theme": theme, "pair": name, "fg": fg, "bg": bg,
                       "target": target, "ratio": round(r, 2),
                       "pass": r >= target, "drift": drift,
                       "drifted": drift > DRIFT_LIMIT})

    for th in themes:
        dark = th == "dark"
        t = {}
        t["bg-0"] = neutral[950] if dark else "#FFFFFF"
        t["bg-1"] = neutral[900] if dark else neutral[50]
        t["bg-2"] = neutral[800] if dark else neutral[100]

        k, v, r, cor = pick(neutral, t["bg-0"], 4.5, 50 if dark else 950)
        t["fg-0"] = v; chk("fg-0 on bg-0", v, t["bg-0"], 4.5, th, cor)
        chk("fg-0 on bg-1", v, t["bg-1"], 4.5, th)

        f1 = pick(neutral, t["bg-0"], 4.5, 300 if dark else 700)
        t["fg-1"] = f1[1]; chk("fg-1 on bg-0", f1[1], t["bg-0"], 4.5, th, f1[3])

        bd = pick(neutral, t["bg-0"], 3.0, 700 if dark else 300)
        t["border"] = bd[1]; chk("border on bg-0", bd[1], t["bg-0"], 3.0, th, bd[3])
        t["divider"] = neutral[800] if dark else neutral[200]

        # accent fill: mid ramp, then the label ON it is measured
        t["accent-1"] = brand[400] if dark else brand[600]
        t["accent-1-hover"] = brand[300] if dark else brand[700]
        t["accent-1-active"] = brand[200] if dark else brand[800]
        t["accent-1-disabled"] = neutral[700] if dark else neutral[300]
        on, onr = label_on(t["accent-1"])
        t["accent-1-on"] = on; chk("accent-1-on on accent-1", on, t["accent-1"], 4.5, th)

        at = pick(brand, t["bg-0"], 4.5, 300 if dark else 700)
        t["accent-1-text"] = at[1]; chk("accent-1-text on bg-0", at[1], t["bg-0"], 4.5, th, at[3])

        t["accent-2"] = brand[600] if dark else brand[400]
        a2 = pick(brand, t["bg-1"], 4.5, 200 if dark else 800)
        t["accent-2-text"] = a2[1]; chk("accent-2-text on bg-1", a2[1], t["bg-1"], 4.5, th, a2[3])

        fr = pick(brand, t["bg-0"], 3.0, 300 if dark else 600)
        t["focus-ring"] = fr[1]; chk("focus-ring on bg-0", fr[1], t["bg-0"], 3.0, th, fr[3])

        t["shadow"] = "0 1px 3px rgb(0 0 0 / 0.45)" if dark else "0 1px 3px rgb(0 0 0 / 0.12)"

        for n in SEMANTIC_HUES:
            r_ = sem[n]
            t[n] = r_[400] if dark else r_[600]
            t[f"{n}-bg"] = r_[950] if dark else r_[50]
            lbl = pick(r_, t[f"{n}-bg"], 4.5, 200 if dark else 800)
            t[f"{n}-on"] = lbl[1]
            chk(f"{n}-on on {n}-bg", lbl[1], t[f"{n}-bg"], 4.5, th, lbl[3])
            chk(f"{n} on bg-0", t[n], t["bg-0"], 3.0, th)
        out[th] = t
    return {"seed": seed, "mode": mode, "oklch": {"L": round(L,4), "C": round(C,4), "H": round(H,1)},
            "primitives": {"brand": brand, "neutral": neutral,
                           **{f"sem-{k}": v for k, v in sem.items()}},
            "semantic": out, "checks": checks}

# ---------------------------------------------------------------- emit
def css(p):
    def blk(t, ind="  "):
        return "\n".join(f"{ind}--{k}: {v};" for k, v in t.items())
    L = ["/* GENERATED by website_workflow/tools/generate_palette.py — do not hand-edit.",
         f"   seed {p['seed']} | mode {p['mode']} | regenerate to change anything.",
         "   Components consume L2 SEMANTIC tokens ONLY — never a primitive, never raw hex. */",
         ":root {"]
    for name, r in p["primitives"].items():
        L += [f"  /* {name} ramp */"] + [f"  --{name}-{k}: {v};" for k, v in r.items()]
    base = "light" if "light" in p["semantic"] else "dark"
    L += ["", f"  /* semantic — {base} */", blk(p["semantic"][base]), "}"]
    if p["mode"] == "DUAL":
        L += ["", '@media (prefers-color-scheme: dark) {', '  :root:not([data-theme="light"]) {',
              blk(p["semantic"]["dark"], "    "), "  }", "}", "",
              '[data-theme="dark"] {', blk(p["semantic"]["dark"]), "}", "",
              '[data-theme="light"] {', blk(p["semantic"]["light"]), "}"]
    return "\n".join(L) + "\n"

def ts(p):
    return ("// GENERATED by generate_palette.py — do not hand-edit.\n"
            f"// seed {p['seed']} | mode {p['mode']}\n"
            "export const colors = " + json.dumps(p["semantic"], indent=2) + " as const;\n")

def report(p):
    fails = [c for c in p["checks"] if not c["pass"]]
    cors = [c for c in p["checks"] if c["drift"] > 0]
    L = [f"CONTRAST REPORT — seed {p['seed']} | mode {p['mode']}",
         f"OKLCH L={p['oklch']['L']} C={p['oklch']['C']} H={p['oklch']['H']}deg", ""]
    L.append(f"{'theme':6} {'pair':28} {'fg':9} {'bg':9} {'req':>4} {'got':>7}  result")
    for c in p["checks"]:
        L.append(f"{c['theme']:6} {c['pair']:28} {c['fg']:9} {c['bg']:9} "
                 f"{c['target']:>4} {c['ratio']:>7}  {'PASS' if c['pass'] else 'FAIL'}"
                 f"{('  corrected %d step(s)' % c['drift']) if c['drift'] else ''}"
                 f"{'  <-- DRIFT' if c.get('drifted') else ''}")
    drifted = [c for c in p["checks"] if c.get("drifted")]
    L += ["", f"{len(p['checks'])} pairs | {len(fails)} FAIL | {len(cors)} corrected"
              f" | {len(drifted)} DRIFTED"]
    if fails:
        L.append("GATE: FAIL — a failing pair blocks Gate 5. Choose a different seed or")
        L.append("      surface; never round a ratio up to make it pass.")
    elif drifted:
        L.append("GATE: PASS WITH DRIFT — every pair is legible, but these were dragged")
        L.append("      more than 2 ramp steps and no longer read as the seed shade:")
        for c in drifted:
            L.append(f"        {c['theme']:6} {c['pair']:28} moved {c['drift']} -> {c['fg']}")
        L.append("      Owner decision: accept the shifted shade, or choose a seed whose")
        L.append("      lightness suits this surface. Never ship the drift silently.")
    else:
        L.append("GATE: PASS — every pair clears its threshold in every active theme.")
    return "\n".join(L)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", required=True, help='brand seed, e.g. "#4C1D95"')
    ap.add_argument("--mode", default="SINGLE-DARK",
                    choices=["SINGLE-DARK", "SINGLE-LIGHT", "DUAL"])
    ap.add_argument("--format", default="css", choices=["css", "ts", "json"])
    ap.add_argument("--out"); ap.add_argument("--report", action="store_true")
    a = ap.parse_args()
    p = build(a.seed, a.mode)
    if a.report:
        print(report(p))
        return 1 if any(not c["pass"] for c in p["checks"]) else 0
    text = {"css": css, "ts": ts, "json": lambda x: json.dumps(x, indent=2)}[a.format](p)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(text); print(f"wrote {a.out}")
    else:
        print(text)
    return 0

if __name__ == "__main__":
    sys.exit(main())
