// Regeln fuer die Auswertung mehrerer Uebungen (History -> Auswertung,
// v2.15.0, Wunsch Gabriel 12.11.2026): Verlauf von Gewicht und geschaetztem
// 1RM fuer viele Uebungen in einem frei waehlbaren Zeitraum — alle trainierten,
// je Workout (Push/Pull/Legs aus dem aktiven Plan) oder eine eigene Auswahl.
// Reine Funktionen ohne Vue und Dexie — Vertrag: scripts/auswertung-test.mjs
// (zuerst Test, dann Regeln). Ein Punkt je Trainingstag wie im
// Einzelverlauf (utils/verlauf.js).

import { ZEITRAEUME, zeitraumStart, verlaufPunkte, messgroesse, formatZahl } from './verlauf.js'
import { ringFuer } from './uebungsRing.js'

export const AUSWERTUNG_ZEITRAEUME = [
  ...ZEITRAEUME,
  { key: 'frei', label: 'Frei', monate: null, frei: true }
]

const MODI = ['weight', 'e1rm']

// Gueltiger Kalendertag 'YYYY-MM-DD' (30.02. faellt durch)
function istDatum(text) {
  if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return false
  const [y, m, d] = text.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

// { von, bis, fehler }: von null = offen. Bei "Frei" wird nie still
// getauscht oder ergaenzt — ein falscher Zeitraum zeigt einen Hinweis.
export function zeitraumGrenzen(key, heute, freiVon = '', freiBis = '') {
  const z = AUSWERTUNG_ZEITRAEUME.find(x => x.key === key)
  if (z?.frei) {
    if (!istDatum(freiVon) || !istDatum(freiBis)) {
      return { von: null, bis: null, fehler: 'Bitte Von und Bis wählen.' }
    }
    if (freiVon > freiBis) return { von: null, bis: null, fehler: 'Von liegt nach Bis.' }
    return { von: freiVon, bis: freiBis, fehler: null }
  }
  return { von: zeitraumStart(heute, z ? z.monate : ZEITRAEUME[0].monate), bis: heute, fehler: null }
}

// "Push (WE)" -> "Push": die Klammer nennt den Wochentag, das Workout ist
// dasselbe (und Woche A/B sollen zusammen in eine Gruppe)
export function kurzTitel(title) {
  const ganz = String(title ?? '').trim()
  const kurz = ganz.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return kurz || ganz || 'Workout'
}

// Trainingstage des aktiven Plans (schon sortiert) -> Gruppen je Kurztitel:
// { key, label, dayIds, planUebungen } — planUebungen in Plan-Reihenfolge,
// je Platz die Basis-Uebung und ihre Alternativen, jede Uebung einmal.
export function workoutGruppen(tage) {
  const gruppen = []
  const nachKey = new Map()
  for (const tag of Array.isArray(tage) ? tage : []) {
    const label = kurzTitel(tag.title)
    const key = 'w:' + label.toLowerCase()
    if (!nachKey.has(key)) {
      const g = { key, label, dayIds: [], planUebungen: [] }
      nachKey.set(key, g)
      gruppen.push(g)
    }
    const g = nachKey.get(key)
    g.dayIds.push(tag.id)
    for (const eintrag of Array.isArray(tag.exercises) ? tag.exercises : []) {
      for (const id of ringFuer(eintrag)) {
        if (id && !g.planUebungen.includes(id)) g.planUebungen.push(id)
      }
    }
  }
  return gruppen
}

// Uebungen einer Gruppe fuer eine Person: erst die Plan-Uebungen, dann was
// sie in Trainings dieser Tage zusaetzlich gemacht hat (Tausch, Quick-Add),
// in der Reihenfolge des ersten Mals.
export function gruppenUebungen(gruppe, logs, saetze, userId) {
  const ids = [...gruppe.planUebungen]
  const tagIds = new Set(gruppe.dayIds)
  const logDatum = new Map()
  for (const log of Array.isArray(logs) ? logs : []) {
    if (tagIds.has(log.trainingDayId)) logDatum.set(log.id, log.date || '')
  }
  const extra = (Array.isArray(saetze) ? saetze : [])
    .filter(s => s.userId === userId && logDatum.has(s.workoutLogId) && !ids.includes(s.exerciseId))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
  for (const s of extra) {
    if (!ids.includes(s.exerciseId)) ids.push(s.exerciseId)
  }
  return ids
}

// Map exerciseId -> Punkte (verlaufPunkte) einer Person im Zeitraum
export function punkteJeUebung(saetze, userId, von = null, bis = null) {
  const jeUebung = new Map()
  for (const s of Array.isArray(saetze) ? saetze : []) {
    if (s.userId !== userId) continue
    if (!jeUebung.has(s.exerciseId)) jeUebung.set(s.exerciseId, [])
    jeUebung.get(s.exerciseId).push(s)
  }
  const ergebnis = new Map()
  for (const [id, liste] of jeUebung) {
    const punkte = verlaufPunkte(liste, von, bis)
    if (punkte.length > 0) ergebnis.set(id, punkte)
  }
  return ergebnis
}

// Reihenfolge fuer "Alle" und die eigene Auswahl: nach Muskelgruppe (wie
// die Liste `gruppenReihenfolge`), darin nach Name; Unbekanntes zuletzt
export function sortiereUebungen(uebungen, gruppenReihenfolge) {
  const rang = (g) => {
    const i = gruppenReihenfolge.indexOf(g)
    return i < 0 ? gruppenReihenfolge.length : i
  }
  return [...(Array.isArray(uebungen) ? uebungen : [])]
    .sort((a, b) => rang(a.muscleGroup) - rang(b.muscleGroup) ||
      String(a.name || '').localeCompare(String(b.name || ''), 'de', { sensitivity: 'base' }))
    .map(u => u.id)
}

// Welche Uebungen die Auswertung zeigt:
//  'alle'    — alle (Reihenfolge `alle`) mit mindestens zwei Eintraegen im Zeitraum
//  'w:<..>'  — die Uebungen der Workout-Gruppe mit mindestens zwei Eintraegen
//  'eigene'  — genau die gewaehlten, auch mit weniger Eintraegen
// Eine unbekannte Gruppe (Plan geaendert) liefert nichts — die Ansicht sagt es.
export function auswahlIds(modus, { alle = [], punkte = new Map(), gruppenIds = {}, eigene = [] } = {}) {
  const genug = (id) => (punkte.get(id)?.length || 0) >= 2
  if (modus === 'eigene') return [...new Set(eigene)]
  if (modus === 'alle') return alle.filter(genug)
  return (gruppenIds[modus] || []).filter(genug)
}

// Messwert eines Tages: Gewicht oder 1RM; reine Koerpergewicht-Uebungen
// (ueberall 0 kg) messen in Wdh, auch im 1RM-Modus
function messwert(punkt, groesse, modus) {
  if (groesse === 'reps') return punkt.reps ?? null
  return modus === 'e1rm' ? (punkt.e1rm ?? null) : punkt.weight
}

// Veraenderung im Zeitraum: erster gegen letzten Tag mit Wert.
// { groesse, einheit, start, ende, diff, prozent, tage } — null unter zwei Tagen.
// Prozent null, wenn der Start 0 ist (keine Teilung durch 0).
export function veraenderung(punkte, modus = 'weight') {
  const liste = Array.isArray(punkte) ? punkte : []
  const groesse = messgroesse(liste)
  const werte = liste
    .map(p => messwert(p, groesse, modus))
    .filter(w => typeof w === 'number' && Number.isFinite(w))
  if (werte.length < 2) return null
  const start = werte[0]
  const ende = werte[werte.length - 1]
  const diff = Math.round((ende - start) * 1000) / 1000
  return {
    groesse,
    einheit: groesse === 'reps' ? 'Wdh' : 'kg',
    start,
    ende,
    diff,
    prozent: start > 0 ? (diff / start) * 100 : null,
    tage: werte.length
  }
}

// Rangliste: groesste Steigerung in Prozent zuerst; ohne Prozent (Start 0)
// nach der Differenz dahinter; ohne Veraenderung (zu wenige Tage) zuletzt.
// Zeilen { v } mit v aus `veraenderung`. Gibt eine neue Liste zurueck.
export function rangliste(zeilen) {
  const stufe = (z) => (!z.v ? 2 : z.v.prozent === null ? 1 : 0)
  return [...(Array.isArray(zeilen) ? zeilen : [])]
    .map((z, i) => ({ z, i }))
    .sort((a, b) => {
      const sa = stufe(a.z)
      const sb = stufe(b.z)
      if (sa !== sb) return sa - sb
      if (sa === 0) return b.z.v.prozent - a.z.v.prozent || a.i - b.i
      if (sa === 1) return b.z.v.diff - a.z.v.diff || a.i - b.i
      return a.i - b.i
    })
    .map(x => x.z)
}

// Skala der Balken: schliesst immer 0 ein
export function balkenSkala(prozente) {
  const w = (Array.isArray(prozente) ? prozente : []).filter(x => typeof x === 'number' && Number.isFinite(x))
  return { min: Math.min(0, ...w), max: Math.max(0, ...w) }
}

// Lage eines Balkens in Prozent der Spurbreite: { links, breite, nullLinie }.
// Steigerungen wachsen von der Null-Linie nach rechts, Rueckgaenge nach links.
export function balken(prozent, skala) {
  const spanne = skala.max - skala.min
  const nullLinie = spanne > 0 ? (-skala.min / spanne) * 100 : 0
  if (typeof prozent !== 'number' || !Number.isFinite(prozent) || spanne <= 0) {
    return { links: nullLinie, breite: 0, nullLinie }
  }
  const pos = ((prozent - skala.min) / spanne) * 100
  return { links: Math.min(nullLinie, pos), breite: Math.abs(pos - nullLinie), nullLinie }
}

// "+13 %", "−10 %" (echtes Minuszeichen), "±0 %", ohne Wert "–"
export function prozentText(prozent) {
  if (typeof prozent !== 'number' || !Number.isFinite(prozent)) return '–'
  const r = Math.round(prozent)
  if (r === 0) return '±0 %'
  return `${r > 0 ? '+' : '−'}${Math.abs(r)} %`
}

// "+2,5 kg", "−5 kg", "+3 Wdh"
export function diffText(diff, einheit) {
  if (typeof diff !== 'number' || !Number.isFinite(diff)) return '–'
  if (Math.abs(diff) < 1e-9) return `±0 ${einheit}`
  return `${diff > 0 ? '+' : '−'}${formatZahl(Math.abs(diff))} ${einheit}`
}

// Gemerkte Einstellungen (localStorage, pro Geraet) pruefen: jedes Feld
// einzeln, Ungueltiges auf den Standard. Es sind Ansichts-Vorlieben, keine
// Daten — ein kaputter Wert darf die Ansicht nie blockieren.
export function einstellungenAus(text) {
  const standard = { zeitraum: ZEITRAEUME[0].key, freiVon: '', freiBis: '', auswahl: 'alle', eigene: [], modus: 'weight' }
  let roh = null
  try {
    roh = text ? JSON.parse(text) : null
  } catch {
    roh = null
  }
  if (!roh || typeof roh !== 'object') return standard
  return {
    zeitraum: AUSWERTUNG_ZEITRAEUME.some(z => z.key === roh.zeitraum) ? roh.zeitraum : standard.zeitraum,
    freiVon: istDatum(roh.freiVon) ? roh.freiVon : '',
    freiBis: istDatum(roh.freiBis) ? roh.freiBis : '',
    auswahl: typeof roh.auswahl === 'string' && roh.auswahl ? roh.auswahl : standard.auswahl,
    eigene: Array.isArray(roh.eigene) ? roh.eigene.filter(id => typeof id === 'string' && id) : [],
    modus: MODI.includes(roh.modus) ? roh.modus : standard.modus
  }
}
