#!/usr/bin/env node
/*
 * Vertragstest fuer das Puls-zu-Tempo-Modell (scripts/lib/pace-modell-kern.mjs).
 *
 * Gerechnet wird gegen ERFUNDENE Laeufe mit bekanntem Zusammenhang: wenn das
 * Modell die eingebauten Zahlen wiederfindet, rechnet es richtig. Echte
 * Garmin-Daten liegen in privat\ und stehen hier bewusst nicht zur Verfuegung —
 * ein Test, der ohne sie nicht laeuft, taugt nicht fuers Done-Gate.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\pace-modell-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { schaetzeModell, mmss, rundeAuf, DAEMPFUNG_AUSSERHALB } from './lib/pace-modell-kern.mjs'

let passed = 0
const failures = []

function check(name, bedingung, detail = '') {
  if (bedingung) passed++
  else failures.push(`${name}${detail ? ' -> ' + detail : ''}`)
}

function nahe(name, ist, soll, toleranz) {
  check(name, Math.abs(ist - soll) <= toleranz, `erwartet ${soll} +/- ${toleranz}, bekommen ${ist.toFixed(2)}`)
}

// --- Erfundene Laufhistorie ---------------------------------------------------
// Wahrer Zusammenhang:  Tempo = 800 - 2.50 * Puls + 3.00 * Hm/km + 12 * Stunden

const A0 = 800
const B_HF = -2.5
const B_HM = 3
const B_STD = 12

function tag(nummer) {
  const d = new Date(Date.UTC(2026, 0, 1) + nummer * 86400000)
  return d.toISOString().slice(0, 10)
}

/** Fester Zufall, damit ein roter Test immer derselbe rote Test ist. */
let saat = 42
function zufall() {
  saat = (saat * 1103515245 + 12345) % 2147483648
  return saat / 2147483648
}

/**
 * @param {number} streubreite  Spannweite des Rauschens in Sekunden je km.
 *   10 = fast rauschfreies Laborbeispiel (dort sind die Koeffizienten pruefbar),
 *   50 = so unruhig wie echte Laufdaten (dort ist die Formkorrektur pruefbar).
 */
function baueLaeufe(streubreite) {
  saat = 42
  const out = []
  for (let i = 0; i < 120; i++) {
    const hf = 120 + Math.round(zufall() * 30) // 120 bis 150 — das ist die belegte Spanne
    const hmProKm = Math.round(zufall() * 12)
    const stunden = 0.5 + zufall() * 2
    const rauschen = (zufall() - 0.5) * streubreite
    const pace = A0 + B_HF * hf + B_HM * hmProKm + B_STD * stunden + rauschen
    out.push({ datum: tag(i * 4), hf, hmProKm, stunden, pace, sek: pace * 10, km: 10, maxHf: hf + 25 })
  }
  return out
}

const laeufe = baueLaeufe(10)

// --- Findet das Modell die eingebauten Zahlen wieder? ------------------------
{
  const m = schaetzeModell(laeufe, { monate: 24, halbwertszeitTage: 3650 })
  nahe('Steigung je Pulsschlag wird gefunden', m.koeffizienten.bHf, B_HF, 0.15)
  nahe('Gelaende-Anteil wird gefunden', m.koeffizienten.bHm, B_HM, 0.3)
  nahe('Dauer-Anteil wird gefunden', m.koeffizienten.bStd, B_STD, 3)
  check('Guete ist hoch', m.kennzahlen.r2 > 0.95, `r2 = ${m.kennzahlen.r2.toFixed(3)}`)
  check('Streuung liegt im Rauschen', m.kennzahlen.streuung < 6, `${m.kennzahlen.streuung.toFixed(1)} s`)

  const soll = A0 + B_HF * 135 + B_HM * 5 + B_STD * 1
  nahe('Vorhersage im belegten Bereich stimmt', m.vorhersage(135, 5, 1), soll, 8)
}

// --- Ausreisser: ein falsch gemessener Lauf darf die Gerade nicht verziehen ---
{
  const mitMuell = [
    ...laeufe,
    { datum: tag(500), hf: 135, hmProKm: 3, stunden: 0.3, pace: 250, sek: 750, km: 3, maxHf: 160 },
    { datum: tag(504), hf: 130, hmProKm: 3, stunden: 0.5, pace: 700, sek: 3500, km: 5, maxHf: 150 }
  ]
  const m = schaetzeModell(mitMuell, { monate: 24, halbwertszeitTage: 3650 })
  check('beide Ausreisser werden erkannt', m.ausreisser.length === 2, `gefunden: ${m.ausreisser.length}`)
  check('Ausreisser sind nicht im Modell', !m.behalten.some(l => l.pace === 250 || l.pace === 700))
  nahe('Steigung bleibt trotz Muell stabil', m.koeffizienten.bHf, B_HF, 0.2)
}

// --- Daempfung ausserhalb der belegten Pulsspanne ----------------------------
{
  const m = schaetzeModell(laeufe, { monate: 24, halbwertszeitTage: 3650 })
  const oben = m.kennzahlen.hfBelegtBis
  const amRand = m.vorhersage(oben, 5, 1)
  const zehnDarueber = m.vorhersage(oben + 10, 5, 1)
  const rohZehnDarueber = m.vorhersageRoh(oben + 10, 5, 1)

  check('gedaempfte Vorhersage ist langsamer als die ungedaempfte', zehnDarueber > rohZehnDarueber,
    `${mmss(zehnDarueber)} gegen ${mmss(rohZehnDarueber)}`)
  nahe('Daempfung wirkt genau mit dem festgelegten Anteil',
    (amRand - zehnDarueber) / (amRand - rohZehnDarueber), DAEMPFUNG_AUSSERHALB, 0.02)
  nahe('innerhalb der Spanne wird nicht gedaempft', m.vorhersage(135, 5, 1) - m.vorhersageRoh(135, 5, 1), 0, 0.001)

  const unten = m.kennzahlen.hfBelegtVon
  check('auch nach unten wird gedaempft', m.vorhersage(unten - 10, 5, 1) < m.vorhersageRoh(unten - 10, 5, 1))
}

// --- Formkorrektur: ein schwaecheres Ende faellt auf --------------------------
// Hier braucht es die unruhigen Daten: bei fast rauschfreien Laeufen waere ein
// Formeinbruch von 30 s je km rechnerisch ein Ausreisser und wuerde aussortiert.
{
  const unruhig = baueLaeufe(50)
  const schwaecher = unruhig.map((l, i) => (i >= unruhig.length - 10 ? { ...l, pace: l.pace + 30 } : l))
  const m = schaetzeModell(schwaecher, { monate: 24, halbwertszeitTage: 3650 })
  check('Formkorrektur meldet den Einbruch', m.kennzahlen.formOffset > 15,
    `${m.kennzahlen.formOffset.toFixed(1)} s/km`)
  const gleich = schaetzeModell(unruhig, { monate: 24, halbwertszeitTage: 3650 })
  nahe('ohne Einbruch liegt die Formkorrektur bei null', gleich.kennzahlen.formOffset, 0, 10)
}

// --- Zu wenig Material ist ein Fehler, keine stille Schaetzung ---------------
{
  let geworfen = false
  try {
    schaetzeModell(laeufe.slice(0, 5), { monate: 24 })
  } catch {
    geworfen = true
  }
  check('zu wenige Laeufe werden abgelehnt', geworfen)
}

// --- Hilfsfunktionen ---------------------------------------------------------
{
  check('mmss rundet auf ganze Sekunden', mmss(425.4) === '7:05', mmss(425.4))
  check('mmss fuellt die Sekunden auf', mmss(365) === '6:05', mmss(365))
  check('rundeAuf rundet auf Fuenfersschritte', rundeAuf(427, 5) === 425, String(rundeAuf(427, 5)))
}

// --- Ergebnis ----------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n[pace-modell-test] ${failures.length} von ${failures.length + passed} Faellen rot:\n`)
  for (const f of failures) console.error('  FEHLER ' + f)
  console.error('')
  process.exit(1)
}

console.log(`[pace-modell-test] OK — ${passed} Faelle gruen (Schaetzung, Ausreisser, Daempfung, Formkorrektur).`)
