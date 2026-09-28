# Bildnachweis und Lizenz der Uebungsbilder

In diesem Ordner liegen Bilder aus zwei Quellen. Welche Uebung woher kommt,
steht im Manifest `src/data/uebungskatalog.json` (Feld `quelle`).

## KI-generierte Bilder (`quelle: "ki"`, Dateien `frame-<n>.webp`)

Seit Version 2.6.0 zeigen alle 36 Uebungen KI-Bilder: am 28.09.2026 mit
ChatGPT im Auftrag des Projekts neu erstellt, je Auftrag drei Uebungen mit
Start- und Endhaltung, alle nach demselben Stil-Vorbild (gute Figuren der
frueheren KI-Bilder aus Version 2.1.0 bis 2.2.0). Sie stammen nicht aus der
Sammlung Workout Guide; die CC-BY-SA-Lizenz unten gilt fuer sie nicht.

Zugeschnitten mit `scripts/uebungsbilder-schneiden.mjs` aus den Reihenbildern
`neu-01.webp` bis `neu-12.webp` in `scripts/uebungsbilder-quellen/`: je
Uebung zwei Bewegungsphasen (die Plank eine) und ein Vorschaubild.

Die Muskelgrafik (`public/muskelgrafik/`) ist ebenfalls KI-generiert: eine
farbig markierte Figur von ChatGPT (`muskelfigur-farbig.webp`), daraus baut
`scripts/muskelgrafik-bauen.mjs` die graue Figur und eine Maske je Muskel.

## Linienzeichnungen aus Workout Guide (`quelle: "workout-guide"`, Dateien `frame-<n>.svg`)

Betraf die Ordner `lying-leg-curl`, `plank` und `reverse-pec-deck` (Version
2.3.0 bis 2.5.0, fuer "Butterfly reverse" ab 2.3.0). Seit Version 2.6.0
nutzt das Manifest keine dieser Zeichnungen mehr; die SVG-Dateien liegen noch
in den Ordnern, bis sie geloescht werden — so lange bleibt dieser Nachweis.
Die Arm-Uebungen (`concentration-curl`, `cable-curl`, `rope-tricep-pushdown`,
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
