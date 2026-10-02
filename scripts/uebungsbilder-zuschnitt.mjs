// Schnitt-Tabelle fuer scripts/uebungsbilder-schneiden.mjs: wo in den
// KI-Bildern (scripts/uebungsbilder-quellen/) welche Phase einer Uebung
// liegt. Welche Phasen die App ZEIGT, steht nicht hier, sondern im Manifest
// (src/data/uebungskatalog.json, frame-<n>.webp = Phase n).
//
// Seit v2.6.0 (28.09.2026) stammen alle Uebungen aus ChatGPT-Reihenbildern
// (neu-01 bis neu-12, Nachbesserungen ab neu-13): je Bild drei Uebungen untereinander, durch hellgraue
// Linien getrennt, START links (Phase 1), ENDE rechts (Phase 3), weisser
// Grund, keine Schrift; die Plank ist eine Halteuebung mit nur Phase 1.
// Jeder Auftrag bekam dasselbe Stil-Vorbild (gute Figuren der alten Bilder).
// Die Rahmen hat ein Hilfsskript aus Trennlinien und Inhalt gemessen
// (Reihe finden, Luecke zwischen START und ENDE, Inhalt + 10 px Rand).
// Die alten Sammelbilder 1-7 (bis v2.5.0) stehen nur noch in der
// Git-Historie.
//
// Rahmen = [links, oben, rechts, unten] in Pixeln des Quellbilds (rechts und
// unten exklusiv): grosszuegig um Figur und Geraet, aber ohne Nachbar-Phasen
// und ohne die Trennlinien. Vermessen: das Skript mit --vermessen <ordner>
// aufrufen, es zeichnet ein Koordinatengitter ein.
//
// Je Uebung: `quelle` (Datei), `phasen` (Rahmen je Phase 1 START, 2 MITTE,
// 3 ENDE), optional `masken` (zusaetzlich weiss zu malende Rechtecke in
// Quellkoordinaten, z.B. wenn ein Nachbar in den Rahmen ragt) und `vorschau`
// (Phase fuers Vorschaubild; Standard: die erste Phase aus dem Manifest)
// und `ausrichtung` (Standard: automatisch an den dunklen Flaechen, also am
// stillstehenden Geraet; "mitte" = mittig und unten buendig; [dx, dy] =
// von Hand gegen "mitte" verschoben).
// Vertrag: scripts/uebungsbilder-matching-test.mjs.

// breite/hoehe: das Skript bricht ab, wenn ein getauschtes Bild andere Masse
// hat (dann stimmen die Rahmen nicht mehr). hintergrund: "weiss" (ChatGPTs
// fast weisser Grund wird reinweiss), "transparent" (echte Transparenz) oder
// "karo" (eingemaltes Schachbrett). schilder: erwartete Anzahl Schilder
// (Titel + START/MITTE/ENDE) — Kontrolle der Schilder-Suche; 0 = keine Suche.
// Optional fuer "karo": hellMin (ab welcher Helligkeit ein Pixel Hintergrund
// sein kann, Standard 172), saum (Standard 12) und kruemel (groesste helle
// Insel in Pixeln, die entfernt wird, Standard 40).
export const QUELLEN = {
  'neu-01.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-02.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-03.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-04.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-05.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-06.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-07.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-08.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-09.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-10.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-11.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-12.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 },
  'neu-13.webp': { breite: 1024, hoehe: 1536, hintergrund: 'weiss', schilder: 0 }
}

export const UEBUNGEN = {
  // neu-01.webp: lying-leg-curl, reverse-pec-deck, plank
  'lying-leg-curl': { quelle: 'neu-01.webp', phasen: { 1: [18, 26, 546, 482], 3: [560, 26, 1011, 489] } },
  'reverse-pec-deck': { quelle: 'neu-01.webp', phasen: { 1: [41, 518, 469, 1035], 3: [541, 517, 987, 1040] }, ausrichtung: 'mitte' },
  'plank': { quelle: 'neu-01.webp', phasen: { 1: [78, 1109, 971, 1423] } },
  // neu-02.webp: weighted-pull-up, lat-pulldown, seated-cable-row
  'weighted-pull-up': { quelle: 'neu-02.webp', phasen: { 1: [118, 23, 461, 499], 3: [615, 10, 959, 501] } },
  'lat-pulldown': { quelle: 'neu-02.webp', phasen: { 1: [84, 517, 440, 1022], 3: [579, 517, 929, 1020] } },
  'seated-cable-row': { quelle: 'neu-02.webp', phasen: { 1: [35, 1037, 511, 1493], 3: [513, 1036, 1003, 1497] } },
  // neu-03.webp: chin-up, low-row-machine, dumbbell-shrug
  'chin-up': { quelle: 'neu-03.webp', phasen: { 1: [122, 23, 463, 533], 3: [594, 4, 947, 524] } },
  'low-row-machine': { quelle: 'neu-03.webp', phasen: { 1: [55, 554, 502, 1006], 3: [556, 551, 981, 1005] } },
  'dumbbell-shrug': { quelle: 'neu-03.webp', phasen: { 1: [175, 1024, 400, 1506], 3: [631, 1024, 858, 1505] }, vorschau: 3 },
  // neu-04.webp: bench-press, incline-bench-press, dumbbell-bench-press
  'bench-press': { quelle: 'neu-04.webp', phasen: { 1: [31, 13, 528, 494], 3: [559, 13, 1024, 493] } },
  'incline-bench-press': { quelle: 'neu-04.webp', phasen: { 1: [49, 516, 528, 1023], 3: [555, 536, 1024, 1023] } },
  'dumbbell-bench-press': { quelle: 'neu-04.webp', phasen: { 1: [78, 1040, 530, 1484], 3: [581, 1157, 1024, 1486] } },
  // neu-05.webp: incline-dumbbell-press, (chest-press-machine, seit 02.10. aus
  // neu-13), incline-chest-press-machine
  'incline-dumbbell-press': { quelle: 'neu-05.webp', phasen: { 1: [69, 5, 532, 498], 3: [579, 129, 1024, 498] } },
  'incline-chest-press-machine': { quelle: 'neu-05.webp', phasen: { 1: [17, 986, 526, 1481], 3: [545, 980, 1015, 1481] } },
  // neu-06.webp: cable-fly, butterfly-machine, dips
  // Die Tuerme stehen im ENDE-Bild enger: an der Figur ausrichten, nicht am Geraet
  'cable-fly': { quelle: 'neu-06.webp', phasen: { 1: [25, 6, 559, 490], 3: [569, 7, 1017, 490] }, ausrichtung: 'mitte' },
  'butterfly-machine': { quelle: 'neu-06.webp', phasen: { 1: [73, 509, 505, 961], 3: [651, 509, 915, 961] } },
  'dips': { quelle: 'neu-06.webp', phasen: { 1: [65, 971, 470, 1529], 3: [564, 1027, 959, 1523] }, ausrichtung: 'mitte' },
  // neu-07.webp: machine-shoulder-press, overhead-press, lateral-raise
  'machine-shoulder-press': { quelle: 'neu-07.webp', phasen: { 1: [72, 19, 480, 497], 3: [584, 4, 960, 497] } },
  // Vorschau in der Endhaltung, wo sie die Uebung klein eindeutiger zeigt
  'overhead-press': { quelle: 'neu-07.webp', phasen: { 1: [40, 593, 508, 1020], 3: [568, 517, 981, 1020] }, vorschau: 3 },
  'lateral-raise': { quelle: 'neu-07.webp', phasen: { 1: [148, 1034, 394, 1507], 3: [540, 1034, 998, 1507] }, vorschau: 3 },
  // neu-08.webp: concentration-curl, cable-curl, rope-tricep-pushdown
  'concentration-curl': { quelle: 'neu-08.webp', phasen: { 1: [90, 9, 468, 452], 3: [601, 9, 979, 452] }, vorschau: 3 },
  'cable-curl': { quelle: 'neu-08.webp', phasen: { 1: [73, 464, 420, 955], 3: [588, 464, 939, 955] }, vorschau: 3 },
  'rope-tricep-pushdown': { quelle: 'neu-08.webp', phasen: { 1: [104, 967, 422, 1493], 3: [614, 967, 933, 1493] } },
  // neu-09.webp: overhead-tricep-extension, hack-squat, leg-press
  'overhead-tricep-extension': { quelle: 'neu-09.webp', phasen: { 1: [44, 8, 438, 501], 3: [591, 8, 1017, 501] } },
  'hack-squat': { quelle: 'neu-09.webp', phasen: { 1: [34, 513, 476, 1014], 3: [547, 560, 991, 1014] } },
  'leg-press': { quelle: 'neu-09.webp', phasen: { 1: [8, 1031, 513, 1475], 3: [530, 1041, 1017, 1476] } },
  // neu-10.webp: (seated-leg-curl, seit 02.10. aus neu-13), leg-extension,
  // standing-calf-raise
  'leg-extension': { quelle: 'neu-10.webp', phasen: { 1: [103, 482, 470, 929], 3: [594, 482, 1012, 929] } },
  'standing-calf-raise': { quelle: 'neu-10.webp', phasen: { 1: [58, 945, 431, 1509], 3: [587, 945, 949, 1509] } },
  // neu-11.webp: hip-abduction-machine, hip-adduction-machine, (reverse-lunge,
  // seit 02.10. aus neu-13)
  'hip-abduction-machine': { quelle: 'neu-11.webp', phasen: { 1: [63, 10, 429, 484], 3: [571, 9, 974, 474] }, vorschau: 3 },
  'hip-adduction-machine': { quelle: 'neu-11.webp', phasen: { 1: [55, 509, 483, 979], 3: [568, 509, 935, 985] } },
  // neu-12.webp: hip-thrust, chest-supported-row, back-extension (Geraet nach
  // Gabriels Foto aus dem Studio, 28.09.2026)
  'hip-thrust': { quelle: 'neu-12.webp', phasen: { 1: [22, 73, 482, 451], 3: [525, 37, 1000, 452] } },
  'chest-supported-row': { quelle: 'neu-12.webp', phasen: { 1: [59, 475, 482, 959], 3: [579, 475, 988, 959] } },
  'back-extension': { quelle: 'neu-12.webp', phasen: { 1: [46, 1078, 506, 1485], 3: [562, 970, 999, 1486] } },
  // neu-13.webp (02.10.2026, Nachbesserung auf Gabriels Wunsch): In den alten
  // Bildern war die Brustpresse im ENDE eine andere Maschine, der
  // Ausfallschritt im ENDE gedreht und beim Leg Curl lag das Polster im ENDE
  // vor dem Schienbein. ChatGPT malte das Polster zweimal wieder vorn; erst
  // mit Richtungen im Bild ("RIGHT side of his lower legs, towards the seat")
  // stimmte es.
  'chest-press-machine': { quelle: 'neu-13.webp', phasen: { 1: [50, 7, 500, 490], 3: [564, 7, 1009, 490] } },
  // Kein festes Geraet: mittig und unten buendig (die Fuesse bleiben am Boden)
  'reverse-lunge': { quelle: 'neu-13.webp', phasen: { 1: [167, 503, 339, 958], 3: [593, 578, 954, 958] }, ausrichtung: 'mitte' },
  'seated-leg-curl': { quelle: 'neu-13.webp', phasen: { 1: [44, 971, 491, 1447], 3: [587, 971, 1005, 1447] } }
}
