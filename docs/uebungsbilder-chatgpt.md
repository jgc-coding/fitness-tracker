# Uebungsbilder mit ChatGPT erzeugen

So sind am 28.09.2026 alle 36 Uebungsbilder (v2.6.0) entstanden. Gleicher Weg
fuer neue Uebungen oder einzelne Nachbesserungen, damit der Stil gleich bleibt.

## Grundregeln

- **Drei Uebungen je Auftrag.** Mehr macht jede Figur kleiner (ab fuenf
  sichtbar schlechter), eine einzelne kostet dreimal so viele Auftraege.
- **Immer dasselbe Stil-Vorbild anhaengen:**
  `scripts/uebungsbilder-quellen/stil-vorbild.png` (vier neue Figuren). Fuer
  Spezialgeraete zusaetzlich ein Foto des echten Geraets (vorher verkleinern,
  Metadaten entfernen — Fotos tragen oft den Aufnahmeort).
- **Weisser Grund, keine Schrift, Reihen durch hellgraue Linien.** Das
  Schneide-Skript rechnet damit (`hintergrund: 'weiss'`, `schilder: 0`).
- **"seen from exactly the same camera angle"** gehoert in jeden Auftrag —
  ohne den Satz zeichnet ChatGPT das ENDE-Bild gern aus anderem Winkel, und
  die Ueberblendung in der Detailansicht springt. Noch sicherer (02.10.2026,
  neu-13): "START and END must look like two frames of the same video; the
  machine or barbell is IDENTICAL in both halves, and the man does not turn".
- **Wo etwas am Koerper anliegt, in Bildrichtungen beschreiben:** "behind
  the lower legs" ignorierte ChatGPT beim Leg Curl zweimal und malte das
  Polster vor das Schienbein; "the pad is on the RIGHT side of his lower
  legs, towards the seat; on the LEFT side there is only empty space" traf
  es beim ersten Versuch.
- **Nur den Hauptmuskel rot** (primaer im Manifest). Welche Muskeln arbeiten,
  zeigt ohnehin die Muskelgrafik unter dem Bild.
- Laeuft im selben Chat weiter, solange die Bilder passen; ChatGPT sieht dann
  die frueheren Bilder und bleibt naeher am Stil.

## Prompt-Vorlage (englisch, ein Absatz)

```text
Create ONE new image in exactly the same style, with the same man, the same equipment style and the same layout rules as your previous images; the attached image is ONLY the style reference (same man: short dark hair, athletic build, black shorts, barefoot; same grayscale anatomical illustration style with fine line work and soft shading; same black/dark-grey gym equipment; target muscles in the same red-orange). Do not copy the poses or machines of the reference. FORMAT: portrait 2:3 (1024x1536), pure white background (no checkerboard, no transparency, no floor, only a very soft contact shadow), absolutely NO text, labels, numbers or arrows. LAYOUT: three rows of equal height, separated by thin light-grey horizontal lines. Each row shows one exercise: START position on the left half, END position on the right half, both figures the same size and seen from exactly the same camera angle, each figure with its equipment completely inside its own half with a clear margin. ROW 1, <Geraet und Blickwinkel>: <Haltung>. START: <...>. END: <...>. Highlight only the <Muskel> in red-orange. ROW 2, ... ROW 3, ...
```

Halteuebungen (Plank): "ONE single figure centered across the whole row
(static hold, no second figure)".

## Einbau

1. Bild herunterladen, als `scripts/uebungsbilder-quellen/neu-<nn>.webp`
   ablegen (WebP, Qualitaet 95).
2. Rahmen messen: `node ./scripts/uebungsbilder-reihen-messen.mjs
   scripts/uebungsbilder-quellen/neu-<nn>.webp <key> <key> <key>` — die
   Ausgabe kommt in `scripts/uebungsbilder-zuschnitt.mjs`.
3. Neue Uebung: Manifest-Eintrag (`src/data/uebungskatalog.json`) mit
   `quelle: "ki"`, `frame-1.webp` + `frame-3.webp`, Muskeln, Aliasse — ZUERST
   den Vertrag `scripts/uebungsbilder-matching-test.mjs` erweitern.
4. `node ./scripts/uebungsbilder-schneiden.mjs <key> --bogen <datei.png>` und
   den Bogen ansehen: springt die Figur in der Ueberblendung (dritte Spalte),
   `ausrichtung: 'mitte'` setzen; Vorschau in der Endhaltung mit `vorschau: 3`.

## Technik: Claude bedient ChatGPT in Gabriels Chrome

So lief es am 28.09.2026 ueber die Chrome-Erweiterung (Gabriel unterwegs):
- **Herunterladen braucht Gabriels ausdrueckliches Ja** — vorher Anzahl,
  Quelle und Groesse nennen (je Bild ca. 1,5 MB PNG von chatgpt.com, landet als
  "ChatGPT-Bild <Datum>.png" in `C:\Users\chime\Downloads`, danach verschieben).
  Soweit bekannt verbieten OpenAIs Nutzungsbedingungen automatisches Abgreifen;
  Gabriel kennt das Risiko und hat zugestimmt.
- **Gesperrter Bildschirm:** der Tab ist dann "hidden" — Screenshots laufen in
  den Timeout, Tippen und Klicks per CDP gehen trotzdem. Eingabefeld per JS
  fokussieren (`#prompt-textarea`), Text tippen, Laenge per JS pruefen, mit
  Enter senden, Erfolg am Seitentext pruefen ("Bild wird erstellt").
- **Bild holen:** letztes `img[alt^="Generiertes Bild"]` per JS anklicken
  (oeffnet die Grossansicht), Mitte des Knopfs mit `aria-label`
  "Herunterladen" per `getBoundingClientRect` messen, auf das Screenshot-Raster
  umrechnen (x 1568 / innerWidth) und per Koordinate klicken.
- Nur EIN Tab zur Zeit: Hintergrund-Tabs rendern nicht; zwischen Chats per
  `navigate` wechseln. Die Anhaenge hochladen per `file_upload` auf das
  versteckte `input[type=file]` "Fotos anhaengen" (Ref vorher frisch suchen).

## Muskelgrafik

Eine einzige farbige Figur (`muskelfigur-farbig.webp`, vorn links, hinten
rechts, jede Muskelgruppe eigene Farbe, Nachbarn verschieden). Daraus baut
`node ./scripts/muskelgrafik-bauen.mjs --bogen <datei.png>` die graue Figur und
18 Masken unter `public/muskelgrafik/`; der Bogen zeigt jeden Muskel einzeln.
Die Zuordnung Farbe -> Muskel steht als Regel im Skript (`MUSKEL_REGELN`) und
passt nur zu diesem Bild — bei einer neuen Figur Regeln und Bogen pruefen.
