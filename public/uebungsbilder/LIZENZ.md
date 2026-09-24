# Bildnachweis und Lizenz der Uebungsbilder

In diesem Ordner liegen Bilder aus zwei Quellen. Welche Uebung woher kommt,
steht im Manifest `src/data/uebungskatalog.json` (Feld `quelle`).

## KI-generierte Bilder (`quelle: "ki"`, Dateien `frame-<n>.webp`)

Die farbigen Bilder von 33 Uebungen (28 seit Version 2.1.0, die vier
Arm-Uebungen und Dips seit 2.2.0) wurden mit einem KI-Bildgenerator im
Auftrag des Projekts erstellt. Sie stammen nicht aus der Sammlung Workout
Guide; die CC-BY-SA-Lizenz unten gilt fuer sie nicht.

Zugeschnitten mit `scripts/uebungsbilder-schneiden.mjs` aus den Sammelbildern
in `scripts/uebungsbilder-quellen/`: Hintergrund-Karomuster entfernt,
Beschriftungen entfernt, je Uebung zwei Bewegungsphasen und ein Vorschaubild.

## Linienzeichnungen aus Workout Guide (`quelle: "workout-guide"`, Dateien `frame-<n>.svg`)

Betrifft die Ordner `lying-leg-curl` und `plank`. Die Arm-Uebungen
(`concentration-curl`, `cable-curl`, `rope-tricep-pushdown`,
`overhead-tricep-extension`) zeigten bis Version 2.1.0 ebenfalls Zeichnungen
aus dieser Sammlung.

Die Zeichnungen stammen aus der Sammlung **Workout Guide** von
[Bryl Lim](https://bryllim.com): https://github.com/bryllim/workout-guide
(Stand: Commit `aac5992`, 26.08.2026). Ein Teil der Startposen beruht auf den
Zeichnungen von [Everkinetic](https://github.com/everkinetic/data) (Greg Priday).

Lizenz: [Creative Commons Namensnennung - Weitergabe unter gleichen Bedingungen
4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/deed.de).

### Aenderungen gegenueber der Quelle

- Linienfarbe von Weiss auf Dunkelgrau (`#1e1f23`) geaendert, damit die
  Zeichnungen auf hellem Grund sichtbar sind.
- Je Uebung ein Vorschaubild (`vorschau.webp`) erzeugt: kraeftigere Linie,
  randlos zugeschnitten, 128 x 128 px.
- Pro Uebung nur ein Teil der Frames uebernommen; `frame-<n>.svg` entspricht
  Frame n der Quelle.

Die bearbeiteten Zeichnungen und ihre Vorschaubilder stehen ebenfalls unter
CC BY-SA 4.0. Diese Lizenz gilt nur fuer diese Zeichnungen, nicht fuer die
KI-generierten Bilder und nicht fuer den uebrigen Code der App.

Erzeugt mit `scripts/uebungsbilder-holen.mjs`.
