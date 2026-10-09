# Bildnachweis und Lizenz der Uebungsbilder

Seit Version 2.6.0 stammen alle Bilder in diesem Ordner und die Muskelgrafik
aus einer einzigen Quelle: KI-generiert im Auftrag des Projekts. Das Feld
`quelle` im Manifest `src/data/uebungskatalog.json` steht bei allen Uebungen
auf `"ki"`.

## KI-generierte Bilder (`quelle: "ki"`, Dateien `frame-<n>.webp`)

Alle 36 Uebungen: am 28.09.2026 mit ChatGPT neu erstellt, je Auftrag drei
Uebungen mit Start- und Endhaltung, alle nach demselben Stil-Vorbild (gute
Figuren der frueheren KI-Bilder aus Version 2.1.0 bis 2.2.0). Am 02.10.2026
im selben Verfahren nachgebessert: Brustpresse an der Maschine,
Ausfallschritt und sitzender Beinbeuger. Am 09.10.2026 im selben Verfahren
neu dazu: die Bizeps-Maschine (Version 2.13.0, gezeichnet nach Fotos des
Geraets).

Zugeschnitten mit `scripts/uebungsbilder-schneiden.mjs` aus den Reihenbildern
`neu-01.webp` bis `neu-16.webp` in `scripts/uebungsbilder-quellen/`: je
Uebung zwei Bewegungsphasen (die Plank eine) und ein Vorschaubild. Ablauf und
Prompt-Vorlage: `docs/uebungsbilder-chatgpt.md`.

Die Muskelgrafik (`public/muskelgrafik/`) ist ebenfalls KI-generiert: eine
farbig markierte Figur von ChatGPT (`muskelfigur-farbig.webp`), daraus baut
`scripts/muskelgrafik-bauen.mjs` die graue Figur und eine Maske je Muskel.

## Fruehere Quelle: Workout Guide (bis Version 2.5.0)

Bis Version 2.5.0 zeigten einzelne Uebungen Linienzeichnungen aus der
Sammlung **Workout Guide** von [Bryl Lim](https://bryllim.com)
(https://github.com/bryllim/workout-guide, teils nach
[Everkinetic](https://github.com/everkinetic/data), Greg Priday), Lizenz
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.de), fuer
die App eingefaerbt: `lying-leg-curl`, `plank` und `reverse-pec-deck` (2.3.0
bis 2.5.0), die vier Arm-Uebungen bis 2.1.0. Seit 2.6.0 liefert die App keine
dieser Zeichnungen mehr aus; die bearbeiteten Dateien stehen nur noch in der
Git-Historie und dort weiter unter CC BY-SA 4.0.

Kommt je wieder eine Zeichnung aus dieser Sammlung ins Manifest
(`scripts/uebungsbilder-holen.mjs`), gehoert der vollstaendige Nachweis
zurueck: hier und in der App unter Einstellungen -> Info.
