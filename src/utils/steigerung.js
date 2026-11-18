/**
 * Steigern-Erinnerung (Plan v2.17.0, docs/plan-steigern-erinnerung.md).
 *
 * Die App erinnert je Person ans Steigern, wenn
 *  - die Person in einer Uebungsgruppe STILLSTAND_EINHEITEN Mal nacheinander
 *    nicht gesteigert hat ("stillstand"), oder
 *  - sie beim letzten Mal in der Uebung der Karte in ALLEN Saetzen am oberen
 *    Ende ihres Wdh-Bereichs war ("oben").
 *
 * Gruppe = Ring der Karte `[basisExerciseId, ...alternativen]`. Einheit =
 * Kalendertag mit mindestens einem gespeicherten Satz der Person in der
 * Gruppe — leere Trainings und Tage nur mit anderen Uebungen zaehlen darum
 * von selbst nie. Verglichen wird je Uebung, nie quer.
 *
 * Eingaben sind setLogs wie in useHistory:
 *   { exerciseId, userId, date: 'YYYY-MM-DD', setNumber, weight, reps,
 *     increaseNextTime? }
 * Gewichte bleiben Zahlen wie 61.25, es wird nie gerundet. Saetze ohne
 * gueltiges Gewicht (keine endliche Zahl) gehen nicht in die Rechnung ein.
 *
 * Reine Funktionen ohne Vue und Dexie, Vertrag: scripts/steigerung-test.mjs.
 */

/** Nach so vielen Einheiten ohne Steigerung erinnert die App. */
export const STILLSTAND_EINHEITEN = 3

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
 * Liefert { faellig, grund: 'oben' | 'stillstand' | null, zaehler }.
 * "oben" geht vor "stillstand". Heute zaehlt mit, sobald ein Satz da ist.
 */
export function erinnerung({ setLogs, gruppe, exerciseId, userId, bereich = null, aktiv = true, markiert } = {}) {
  const ring = gruppe && gruppe.length ? gruppe : [exerciseId]
  const einheiten = einheitenDerGruppe(setLogs, ring, userId)
  const zaehler = stillstandZaehler(einheiten)
  const nichts = { faellig: false, grund: null, zaehler }

  if (aktiv === false) return nichts

  let letzte = []
  for (let i = einheiten.length - 1; i >= 0; i--) {
    if (einheiten[i].saetze[exerciseId]) { letzte = einheiten[i].saetze[exerciseId]; break }
  }
  const istMarkiert = typeof markiert === 'boolean' ? markiert : letzte.some(s => s.increaseNextTime)
  if (istMarkiert) return nichts

  if (obenImBereich(letzte, bereich)) return { faellig: true, grund: 'oben', zaehler }
  if (zaehler >= STILLSTAND_EINHEITEN) return { faellig: true, grund: 'stillstand', zaehler }
  return nichts
}
