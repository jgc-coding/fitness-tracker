/**
 * Steigern-Erinnerung (Plan v2.17.0, docs/plan-steigern-erinnerung.md;
 * Wochen-Regel seit v2.17.1).
 *
 * Die App erinnert je Person ans Steigern, wenn
 *  - die Person in einer Uebungsgruppe seit ihrer letzten Steigerung
 *    STILLSTAND_WOCHEN volle Trainingswochen ohne Steigerung hatte
 *    ("stillstand"), oder
 *  - sie beim letzten Mal in der Uebung der Karte in ALLEN Saetzen am oberen
 *    Ende ihres Wdh-Bereichs war ("oben").
 *
 * Gruppe = Ring der Karte `[basisExerciseId, ...alternativen]`. Einheit =
 * Kalendertag mit mindestens einem gespeicherten Satz der Person in der
 * Gruppe — leere Trainings und Tage nur mit anderen Uebungen zaehlen darum
 * von selbst nie. Verglichen wird je Uebung, nie quer.
 *
 * Trainingswoche = Kalenderwoche (Mo-So) mit mindestens einer Einheit der
 * Gruppe. Gezaehlt werden nur Wochen NACH der Woche der letzten Steigerung
 * und VOR der laufenden Woche (Gabriel 22.11.2026: "nach einer Steigerung
 * drei volle Wochen Ruhe, danach erst erinnern"). Bis v2.17.0 zaehlten drei
 * Einheiten inklusive des Steigerungstags — die Erinnerung kam so schon nach
 * zwei Trainings.
 *
 * Eingaben sind setLogs wie in useHistory:
 *   { exerciseId, userId, date: 'YYYY-MM-DD', setNumber, weight, reps,
 *     increaseNextTime? }
 * Gewichte bleiben Zahlen wie 61.25, es wird nie gerundet. Saetze ohne
 * gueltiges Gewicht (keine endliche Zahl) gehen nicht in die Rechnung ein.
 *
 * Reine Funktionen ohne Vue und Dexie, Vertrag: scripts/steigerung-test.mjs.
 */

import { getToday, mondayOf } from './dateHelpers.js'

/** Nach so vielen vollen Trainingswochen ohne Steigerung erinnert die App. */
export const STILLSTAND_WOCHEN = 3

/** Wdh-Bereich, wenn fuer Person und Uebung keiner gespeichert ist. */
export const STANDARD_BEREICH = Object.freeze({ min: 8, max: 12 })

/**
 * Speicherorte (gesynct ueber db.meta, keine eigene Tabelle):
 *   steigernErinnerung_<userId>          value true/false, fehlt = an
 *   wdhBereich_<userId>_<exerciseId>     value { min, max }, fehlt = 8-12
 * Ein Eintrag je Paar, damit zwei Handys sich nicht gegenseitig
 * ueberschreiben. Grenzen wie scripts/wdh-bereiche.mjs (das die Startwerte
 * schreibt): ganze Zahlen, WDH_GRENZEN.min <= min < max <= WDH_GRENZEN.max.
 */
export const WDH_GRENZEN = Object.freeze({ min: 1, max: 50 })

export const erinnerungSchluessel = (userId) => `steigernErinnerung_${userId}`
export const wdhBereichSchluessel = (userId, exerciseId) => `wdhBereich_${userId}_${exerciseId}`

/** Einstellung lesen: nur ein gespeichertes `false` schaltet aus. */
export function erinnerungAn(wert) {
  return wert !== false
}

/** Gueltiger Bereich als frische Kopie { min, max }, sonst null. */
export function wdhBereichGueltig(wert) {
  if (!wert || typeof wert !== 'object') return null
  const { min, max } = wert
  if (!Number.isInteger(min) || !Number.isInteger(max)) return null
  if (min < WDH_GRENZEN.min || max > WDH_GRENZEN.max || min >= max) return null
  return { min, max }
}

const hatWdh = (reps) => typeof reps === 'number' && Number.isFinite(reps)
const hatGewicht = (weight) => typeof weight === 'number' && Number.isFinite(weight)

/** Gespeicherter Bereich, sonst 8-12 (auch bei unvollstaendigem Eintrag). */
function wirksamerBereich(bereich) {
  if (bereich && Number.isFinite(bereich.min) && Number.isFinite(bereich.max) && bereich.min <= bereich.max) {
    return { min: bereich.min, max: bereich.max }
  }
  return { ...STANDARD_BEREICH }
}

/** Bester Satz: schwerstes Gewicht, bei Gleichstand die meisten Wdh. */
function besterSatz(saetze) {
  let bester = null
  for (const s of saetze) {
    if (!bester ||
        s.weight > bester.weight ||
        (s.weight === bester.weight && hatWdh(s.reps) && (!hatWdh(bester.reps) || s.reps > bester.reps))) {
      bester = s
    }
  }
  return bester ? { weight: bester.weight, reps: hatWdh(bester.reps) ? bester.reps : null } : null
}

/**
 * Einheiten der Gruppe fuer eine Person, aelteste zuerst:
 *   [{ date, werte: { [exerciseId]: { weight, reps } }, saetze: { [exerciseId]: [setLog] } }]
 * `werte` ist je Uebung der beste Satz dieses Tages. Ist die Gruppe leer,
 * gibt es keine Einheiten.
 */
export function einheitenDerGruppe(setLogs, gruppe, userId) {
  const ids = new Set(gruppe || [])
  const jeTag = new Map()
  for (const s of setLogs || []) {
    if (!s || s.userId !== userId || !ids.has(s.exerciseId) || !hatGewicht(s.weight)) continue
    if (!jeTag.has(s.date)) jeTag.set(s.date, {})
    const tag = jeTag.get(s.date)
    if (!tag[s.exerciseId]) tag[s.exerciseId] = []
    tag[s.exerciseId].push(s)
  }
  return [...jeTag.keys()].sort().map(date => {
    const saetze = jeTag.get(date)
    const werte = {}
    for (const id of Object.keys(saetze).sort()) {
      saetze[id].sort((a, b) => (a.setNumber || 0) - (b.setNumber || 0))
      werte[id] = besterSatz(saetze[id])
    }
    return { date, werte, saetze }
  })
}

/**
 * Ist `neu` besser als der Bestwert `bisher`? Mehr Gewicht, oder gleiches
 * Gewicht mit mehr Wdh. Fehlen auf einer Seite die Wdh, zaehlt nur das
 * Gewicht. Ohne Bestwert ist nichts eine Steigerung (das ist ein Neuanfang).
 */
export function istSteigerung(neu, bisher) {
  if (!neu || !bisher) return false
  if (neu.weight > bisher.weight) return true
  if (neu.weight < bisher.weight) return false
  return hatWdh(neu.reps) && hatWdh(bisher.reps) && neu.reps > bisher.reps
}

/**
 * Anzahl der juengsten Einheiten seit (und einschliesslich) der letzten
 * Steigerung bzw. dem letzten Neuanfang. Neuanfang = erstes Mal in der Uebung
 * oder weniger Gewicht als ihr Bestwert; der neue Wert wird Bestwert.
 * Mehrere Uebungen der Gruppe am selben Tag: eine Steigerung oder ein
 * Neuanfang in einer davon setzt zurueck.
 */
export function stillstandZaehler(einheiten) {
  const bestwert = {}
  let zaehler = 0
  for (const einheit of einheiten || []) {
    let neu = false
    for (const [id, wert] of Object.entries(einheit.werte)) {
      const bisher = bestwert[id]
      if (!bisher || wert.weight < bisher.weight || istSteigerung(wert, bisher)) {
        bestwert[id] = wert
        neu = true
      }
    }
    zaehler = neu ? 1 : zaehler + 1
  }
  return zaehler
}

/**
 * Volle Trainingswochen ohne Steigerung: Kalenderwochen mit mindestens einer
 * Einheit, die NACH der Woche der letzten Steigerung (bzw. des letzten
 * Neuanfangs) und VOR der Woche von `heute` liegen. Die laufende Woche ist nie
 * voll; eine Steigerung heute setzt auf 0. Ohne Einheiten 0.
 */
export function stillstandWochen(einheiten, heute) {
  const liste = einheiten || []
  const zaehler = stillstandZaehler(liste)
  if (zaehler === 0) return 0
  const seit = liste.slice(liste.length - zaehler)
  const steigerungsWoche = mondayOf(seit[0].date)
  const laufendeWoche = mondayOf(heute)
  const wochen = new Set()
  for (const einheit of seit.slice(1)) {
    const woche = mondayOf(einheit.date)
    if (woche > steigerungsWoche && woche < laufendeWoche) wochen.add(woche)
  }
  return wochen.size
}

/**
 * Alle uebergebenen Saetze (die letzte Einheit einer Uebung) haben Wdh >= der
 * Obergrenze. Leer oder ein Satz ohne Wdh = nicht oben. Ohne Bereich 8-12.
 */
export function obenImBereich(saetze, bereich) {
  if (!saetze || saetze.length === 0) return false
  const { max } = wirksamerBereich(bereich)
  return saetze.every(s => hatWdh(s.reps) && s.reps >= max)
}

/**
 * Erinnerung fuer eine Person auf einer Karte.
 *   setLogs    alle Saetze (fremde Personen/Uebungen werden ausgefiltert)
 *   gruppe     Ring der Karte; leer = die Uebung allein
 *   exerciseId Uebung, die die Karte gerade zeigt
 *   bereich    { min, max } der Person fuer diese Uebung, sonst 8-12
 *   aktiv      Einstellung der Person; nur `false` schaltet aus (fehlt = an)
 *   markiert   schon zum Steigern markiert; fehlt der Wert, entscheidet der
 *              Merker `increaseNextTime` an der letzten Einheit der Uebung
 *   heute      'YYYY-MM-DD' (lokal); fehlt = heute laut Geraeteuhr
 * Liefert { faellig, grund: 'oben' | 'stillstand' | null, wochen }.
 * "oben" geht vor "stillstand". Heute zaehlt mit, sobald ein Satz da ist
 * (eine Steigerung heute nimmt die Erinnerung weg, 12 Wdh heute loesen sie aus).
 */
export function erinnerung({ setLogs, gruppe, exerciseId, userId, bereich = null, aktiv = true, markiert, heute = getToday() } = {}) {
  const ring = gruppe && gruppe.length ? gruppe : [exerciseId]
  const einheiten = einheitenDerGruppe(setLogs, ring, userId)
  const wochen = stillstandWochen(einheiten, heute)
  const nichts = { faellig: false, grund: null, wochen }

  if (aktiv === false) return nichts

  let letzte = []
  for (let i = einheiten.length - 1; i >= 0; i--) {
    if (einheiten[i].saetze[exerciseId]) { letzte = einheiten[i].saetze[exerciseId]; break }
  }
  const istMarkiert = typeof markiert === 'boolean' ? markiert : letzte.some(s => s.increaseNextTime)
  if (istMarkiert) return nichts

  if (obenImBereich(letzte, bereich)) return { faellig: true, grund: 'oben', wochen }
  if (wochen >= STILLSTAND_WOCHEN) return { faellig: true, grund: 'stillstand', wochen }
  return nichts
}

/**
 * Ist die Uebung fuer die Person markiert? Liest denselben Ort, den
 * `toggleIncreaseNextTime` (stores/workout.js) beschreibt: Gibt es heute im
 * laufenden Training schon Saetze, der Merker an diesen (gilt fuers naechste
 * Mal), sonst der Merker an der letzten Einheit (gilt fuer heute). So kommt
 * "markiert" aus den gespeicherten Daten und ueberlebt einen Neustart.
 */
export function istMarkiert(saetzeHeute, letzteEinheit) {
  const quelle = saetzeHeute && saetzeHeute.length ? saetzeHeute : (letzteEinheit || [])
  return quelle.some(s => s && s.increaseNextTime === true)
}

/**
 * Zustand des Steigern-Knopfs: 'markiert' | 'erinnern' | 'aus'.
 * Markiert geht immer vor; die Erinnerung nur bei faellig UND Einstellung an
 * (nur ein `false` schaltet aus, wie `erinnerungAn`).
 */
export function knopfZustand({ markiert = false, faellig = false, aktiv = true } = {}) {
  if (markiert) return 'markiert'
  if (faellig && erinnerungAn(aktiv)) return 'erinnern'
  return 'aus'
}

/**
 * Text fuer Vorleseprogramme und den Tooltip; nennt bei der Erinnerung den
 * Grund ("12 Wdh erreicht" bzw. "3 Wochen ohne Steigerung").
 */
export function knopfText({ zustand, grund, wochen, max, name = '' } = {}) {
  const wer = name ? `${name}: ` : ''
  if (zustand === 'markiert') return `${wer}Steigern markiert, Tipp hebt die Markierung auf`
  if (zustand === 'erinnern') {
    if (grund === 'oben') return `${wer}Steigern, ${max ?? STANDARD_BEREICH.max} Wdh erreicht`
    return `${wer}Steigern, ${wochen ?? STILLSTAND_WOCHEN} Wochen ohne Steigerung`
  }
  return `${wer}Gewicht beim nächsten Mal steigern`
}
