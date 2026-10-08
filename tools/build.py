#!/usr/bin/env python3
"""Valide data/raw/*.json et génère data/questions.js (chargé par index.html).

Usage : python3 tools/build.py
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "questions.js"
PHOTO_DIR = ROOT / "img" / "photos"
CREDITS_FILE = ROOT / "data" / "photo_credits.json"
CREDITS = json.loads(CREDITS_FILE.read_text(encoding="utf-8")) if CREDITS_FILE.exists() else {}

THEMES = [
    {"key": "priorite", "label": "Priorités", "desc": "Priorité de droite, panneaux B, carrefours"},
    {"key": "signalisation", "label": "Signalisation", "desc": "Panneaux, feux, marquages, agents"},
    {"key": "vitesse", "label": "Vitesse & distances", "desc": "Limitations, vitesse adaptée, distance de sécurité"},
    {"key": "depassement", "label": "Position, croisement & dépassement", "desc": "Place sur la chaussée, dépasser, tourner"},
    {"key": "usagers", "label": "Piétons, cyclistes & zones", "desc": "Usagers vulnérables, zones 30/résidentielles"},
    {"key": "stationnement", "label": "Arrêt & stationnement", "desc": "Interdictions, distances, zone bleue"},
    {"key": "autoroute", "label": "Autoroute", "desc": "Accès, bandes, panne, couloir de secours"},
    {"key": "securite", "label": "Sécurité, alcool & permis", "desc": "Éclairage, ceinture, alcool, documents"},
]

# Codes de panneaux reconnus par js/signs.js
signs_js = (ROOT / "js" / "signs.js").read_text(encoding="utf-8")
SIGNS = set(re.findall(r"^\s+'?([A-Z][\w-]*)'?: \[", signs_js, re.M))
SIGNS |= {f"C43-{n}" for n in (30, 50, 70, 90, 120)} | {f"C45-{n}" for n in (50, 70)}

errors, out, seen = [], [], set()
keys = {t["key"] for t in THEMES}
for f in sorted(RAW.glob("*.json")):
    for q in json.loads(f.read_text(encoding="utf-8")):
        where = f"{f.name}:{q.get('id')}"
        for k in ("id", "theme", "q", "choices", "answer", "explain"):
            if k not in q:
                errors.append(f"{where}: champ manquant {k}")
        if q["id"] in seen:
            errors.append(f"{where}: id en double")
        seen.add(q["id"])
        if q["theme"] not in keys:
            errors.append(f"{where}: thème inconnu {q['theme']}")
        if not (2 <= len(q["choices"]) <= 3) or not (0 <= q["answer"] < len(q["choices"])):
            errors.append(f"{where}: choix/réponse invalides")
        if q.get("sign") and q["sign"] not in SIGNS:
            errors.append(f"{where}: panneau inconnu {q['sign']}")
        if q.get("photo"):
            if not (PHOTO_DIR / f"{q['photo']}.jpg").exists():
                errors.append(f"{where}: photo absente img/photos/{q['photo']}.jpg")
            if q["photo"] not in CREDITS:
                errors.append(f"{where}: crédit manquant pour la photo {q['photo']}")
        item = {k: q[k] for k in ("id", "theme", "q", "choices", "answer", "explain")}
        if q.get("grave"):
            item["grave"] = True
        for k in ("sign", "photo", "focus", "ref"):
            if q.get(k):
                item[k] = q[k]
        out.append(item)

if errors:
    print("\n".join(errors))
    sys.exit(1)

used_photos = {q["photo"] for q in out if q.get("photo")}
credits = {k: v for k, v in CREDITS.items() if k in used_photos}
present = [t for t in THEMES if any(q["theme"] == t["key"] for q in out)]
OUT.write_text(
    "/* Fichier généré par tools/build.py à partir de data/raw/*.json — ne pas modifier à la main. */\n"
    f"window.THEMES = {json.dumps(present, ensure_ascii=False, indent=1)};\n"
    f"window.QUESTIONS = {json.dumps(out, ensure_ascii=False, separators=(',', ':'))};\n"
    f"window.PHOTO_CREDITS = {json.dumps(credits, ensure_ascii=False, separators=(',', ':'))};\n",
    encoding="utf-8",
)
by = {t["key"]: sum(q["theme"] == t["key"] for q in out) for t in present}
print(f"{len(out)} questions -> {OUT.relative_to(ROOT)}  {by}  graves={sum(1 for q in out if q.get('grave'))}  photos={len(used_photos)}")
