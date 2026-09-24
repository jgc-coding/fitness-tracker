// Schnitt-Tabelle fuer scripts/uebungsbilder-schneiden.mjs: wo in den
// KI-Sammelbildern (scripts/uebungsbilder-quellen/) welche Phase einer Uebung
// liegt. Welche Phasen die App ZEIGT, steht nicht hier, sondern im Manifest
// (src/data/uebungskatalog.json, frame-<n>.webp = Phase n).
//
// Rahmen = [links, oben, rechts, unten] in Pixeln des Quellbilds (rechts und
// unten exklusiv): grosszuegig um Figur und Geraet, aber ohne Nachbar-Phasen.
// Schilder (START/MITTE/ENDE, Titel) muessen nicht ausgespart werden — das
// Skript findet und uebermalt sie selbst. Vermessen: das Skript mit
// --vermessen <ordner> aufrufen, es zeichnet ein Koordinatengitter ein.
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
// hat (dann stimmen die Rahmen nicht mehr). hintergrund: "transparent" (echte
// Transparenz) oder "karo" (eingemaltes Schachbrett). schilder: erwartete
// Anzahl Schilder (Titel + START/MITTE/ENDE) — Kontrolle der Schilder-Suche.
// Optional fuer "karo": hellMin (ab welcher Helligkeit ein Pixel Hintergrund
// sein kann, Standard 172), saum (Standard 12) und kruemel (groesste helle
// Insel in Pixeln, die entfernt wird, Standard 40).
export const QUELLEN = {
  '1-brust.webp': { breite: 1536, hoehe: 1024, hintergrund: 'transparent', schilder: 32 },
  // Unscharf mit verschmiertem Karo um die Figuren: kraeftiger saeubern,
  // sonst bleiben graue Kruemel an den Stangen (die Arme werden dabei etwas duenner)
  '2-ruecken.webp': { breite: 1374, hoehe: 1145, hintergrund: 'karo', schilder: 32, hellMin: 150, kruemel: 150 },
  '3-schultern.webp': { breite: 1536, hoehe: 1024, hintergrund: 'karo', schilder: 12 },
  '4-beine.webp': { breite: 1536, hoehe: 1024, hintergrund: 'karo', schilder: 36 },
  // Ersatz fuer die falsch gezeichneten "Bad Girl"/"Good Girl" aus Bild 4
  '5-abduktion-adduktion.webp': { breite: 1536, hoehe: 1024, hintergrund: 'karo', schilder: 8 },
  // Nachgeliefert 24.09.2026 (verlustfrei aus Gabriels PNG): Arme und Dips
  '6-arme.webp': { breite: 1536, hoehe: 1024, hintergrund: 'karo', schilder: 16 },
  // Kam 1983x793 an, Karofelder und Schilder rund 1,3-mal so gross wie in den
  // anderen Bildern — beides erkennt das Skript nur in deren Massstab. Darum
  // einmalig auf 1536 px Breite verkleinert (lanczos3) abgelegt. Der Titel ist
  // auch dann noch zu hoch fuer die Schilder-Suche (nur 3 von 4 gefunden); er
  // liegt ueber der Rueckenansicht, kein Rahmen reicht an ihn heran.
  '7-dips.webp': { breite: 1536, hoehe: 614, hintergrund: 'karo', schilder: 3 }
}

export const UEBUNGEN = {
  // Bild 1: Brust (echte Transparenz)
  'dumbbell-bench-press': { quelle: '1-brust.webp', phasen: { 1: [43, 85, 245, 232], 2: [308, 59, 496, 232], 3: [561, 16, 738, 232] } },
  'incline-dumbbell-press': { quelle: '1-brust.webp', phasen: { 1: [812, 57, 1009, 245], 2: [1062, 55, 1252, 246], 3: [1303, 15, 1488, 250] } },
  'chest-press-machine': { quelle: '1-brust.webp', phasen: { 1: [42, 294, 226, 484], 2: [292, 285, 481, 486], 3: [540, 274, 732, 486] } },
  'incline-chest-press-machine': { quelle: '1-brust.webp', phasen: { 1: [803, 296, 985, 485], 2: [1047, 288, 1239, 498], 3: [1314, 281, 1501, 495] } },
  // Die KI hat die Kabeltuerme je Phase anders weit gestellt — Figur mittig halten
  'cable-fly': { quelle: '1-brust.webp', phasen: { 1: [14, 559, 266, 738], 2: [287, 535, 512, 738], 3: [540, 535, 742, 740] }, ausrichtung: 'mitte' },
  'bench-press': { quelle: '1-brust.webp', phasen: { 1: [804, 569, 1030, 742], 2: [1039, 566, 1275, 749], 3: [1294, 548, 1524, 752] } },
  'incline-bench-press': { quelle: '1-brust.webp', phasen: { 1: [41, 833, 253, 992], 2: [291, 815, 504, 997], 3: [537, 791, 751, 1002] } },
  'butterfly-machine': { quelle: '1-brust.webp', phasen: { 1: [821, 816, 1016, 997], 2: [1107, 789, 1242, 997], 3: [1337, 789, 1464, 998] } },
  // Bild 2: Ruecken (Karomuster, im Original unscharf)
  'weighted-pull-up': { quelle: '2-ruecken.webp', phasen: { 1: [153, 43, 309, 259], 2: [319, 43, 484, 262], 3: [489, 30, 660, 261] } },
  'chin-up': { quelle: '2-ruecken.webp', phasen: { 1: [836, 58, 995, 264], 2: [1007, 57, 1176, 264], 3: [1189, 31, 1365, 263] } },
  'lat-pulldown': { quelle: '2-ruecken.webp', phasen: { 1: [176, 333, 300, 529], 2: [348, 333, 469, 529], 3: [524, 331, 643, 533] } },
  'chest-supported-row': { quelle: '2-ruecken.webp', phasen: { 1: [835, 339, 999, 568], 2: [1009, 346, 1185, 528], 3: [1193, 346, 1370, 568] } },
  'low-row-machine': { quelle: '2-ruecken.webp', phasen: { 1: [150, 576, 314, 828], 2: [342, 614, 486, 831], 3: [512, 604, 661, 830] } },
  'seated-cable-row': { quelle: '2-ruecken.webp', phasen: { 1: [824, 576, 1026, 828], 2: [1026, 576, 1205, 856], 3: [1205, 576, 1370, 823] } },
  'back-extension': { quelle: '2-ruecken.webp', phasen: { 1: [136, 940, 314, 1109], 2: [318, 863, 488, 1102], 3: [491, 883, 666, 1105] } },
  'dumbbell-shrug': { quelle: '2-ruecken.webp', phasen: { 1: [869, 863, 973, 1096], 2: [1030, 912, 1136, 1093], 3: [1209, 913, 1313, 1094] }, vorschau: 3 },
  // Bild 3: Schultern
  'machine-shoulder-press': { quelle: '3-schultern.webp', phasen: { 1: [291, 0, 599, 313], 2: [748, 22, 1013, 314], 3: [1166, 0, 1430, 312] } },
  'overhead-press': { quelle: '3-schultern.webp', phasen: { 1: [334, 416, 641, 650], 2: [731, 347, 1070, 650], 3: [1129, 345, 1469, 650] }, vorschau: 3 },
  'lateral-raise': { quelle: '3-schultern.webp', phasen: { 1: [444, 708, 582, 979], 2: [755, 708, 1040, 979], 3: [1141, 711, 1453, 979] }, vorschau: 3 },
  // Bild 4: Beine ("Bad Girl"/"Good Girl" dort falsch gezeichnet -> Bild 5)
  'hack-squat': { quelle: '4-beine.webp', phasen: { 1: [150, 68, 359, 252], 2: [359, 63, 560, 252], 3: [560, 12, 728, 252] } },
  'leg-press': { quelle: '4-beine.webp', phasen: { 1: [907, 57, 1104, 228], 2: [1107, 63, 1341, 252], 3: [1341, 59, 1535, 219] } },
  'hip-thrust': { quelle: '4-beine.webp', phasen: { 1: [146, 298, 361, 505], 2: [361, 299, 576, 505], 3: [576, 298, 765, 505] } },
  // Graue Karo-Reste ueber Geraet und Kopf der MITTE-Phase
  'seated-leg-curl': { quelle: '4-beine.webp', phasen: { 1: [924, 552, 1101, 752], 2: [1132, 559, 1305, 752], 3: [1342, 553, 1515, 739] }, masken: [[1243, 552, 1268, 565]] },
  // Verschmierter Karo-Rest rechts neben der START-Figur
  'leg-extension': { quelle: '4-beine.webp', phasen: { 1: [118, 811, 244, 1014], 2: [244, 799, 374, 976], 3: [378, 799, 524, 976] }, masken: [[228, 815, 244, 930]] },
  'standing-calf-raise': { quelle: '4-beine.webp', phasen: { 1: [673, 760, 757, 981], 2: [776, 760, 890, 981], 3: [904, 760, 990, 981] } },
  // Fuesse bleiben am Boden, der Koerper geht nach unten (nicht an den Hantelscheiben ausrichten)
  'reverse-lunge': { quelle: '4-beine.webp', phasen: { 1: [1130, 760, 1258, 980], 2: [1261, 760, 1385, 1013], 3: [1385, 779, 1533, 976] }, ausrichtung: 'mitte' },
  // Bild 5: die richtigen "Bad Girl" (Abduktion) und "Good Girl" (Adduktion)
  'hip-abduction-machine': { quelle: '5-abduktion-adduktion.webp', phasen: { 1: [336, 91, 636, 442], 2: [704, 83, 1036, 443], 3: [1128, 65, 1497, 440] }, vorschau: 3 },
  'hip-adduction-machine': { quelle: '5-abduktion-adduktion.webp', phasen: { 1: [299, 513, 693, 931], 2: [712, 513, 1026, 943], 3: [1141, 584, 1450, 945] } },
  // Bild 6: Arme, vier Felder mit schwarzen Trennlinien (x 766-768, y 402-404)
  // — kein Rahmen darf sie beruehren; die Rueckenansicht steht knapp links.
  // Curls: Vorschau in der Endhaltung, der gebeugte Arm ist klein eindeutiger
  'concentration-curl': { quelle: '6-arme.webp', phasen: { 1: [250, 62, 416, 350], 2: [420, 62, 592, 350], 3: [598, 62, 760, 350] }, vorschau: 3 },
  'cable-curl': { quelle: '6-arme.webp', phasen: { 1: [976, 62, 1152, 350], 2: [1150, 62, 1332, 350], 3: [1332, 62, 1520, 350] }, vorschau: 3 },
  'rope-tricep-pushdown': { quelle: '6-arme.webp', phasen: { 1: [223, 466, 397, 792], 2: [396, 466, 566, 792], 3: [566, 466, 752, 792] } },
  // In ENDE steht die Person ein Stueck weiter vom Turm weg: an der Person
  // ausrichten (Hose und Beine gemessen), der Turm springt dafuer um 6 px
  'overhead-tricep-extension': { quelle: '6-arme.webp', phasen: { 1: [978, 462, 1153, 792], 2: [1152, 462, 1332, 792], 3: [1332, 462, 1522, 792] }, ausrichtung: [-3, 0] },
  // Bild 7: Dips — START und ENDE zeigen dieselbe Haltung, die Bewegung
  // steckt in MITTE. Das Manifest nimmt ENDE + MITTE (frame-3, frame-2): die
  // KI hat das Gestell in MITTE breiter gezeichnet, ENDE kommt ihm naeher
  'dips': { quelle: '7-dips.webp', phasen: { 1: [390, 80, 720, 545], 2: [740, 128, 1150, 545], 3: [1170, 36, 1525, 545] } }
}
