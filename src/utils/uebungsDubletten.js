// Doppelte Uebungen zusammenfuehren (reine Funktionen, Browser + Node).
// Vertrag: scripts/uebungsdubletten-test.mjs — zuerst Test, dann Regeln.
//
// Anlass (27.09.2026): "Standard-Uebungen laden" auf einem Handy, das die
// Cloud-Daten noch nicht hatte, legte alle 36 Standard-Uebungen ein zweites
// Mal an (neue Ids, gleiche Namen). Plaene zeigten danach teils auf das
// Original, teils auf die Kopie.
//
// Regeln:
// - Dublette = gleicher Name (ohne Gross-/Kleinschreibung und Leerzeichen),
//   gleiche Muskelgruppe, gleiches Geraet. Anderes Geraet = bewusst zwei Uebungen.
// - Original = das aelteste (createdAt), bei Gleichstand die kleinste Id. Die
//   Regel ist deterministisch, jedes Geraet kaeme zum selben Ergebnis.
// - Jede Stelle, die auf eine Kopie zeigt, wird auf das Original umgebogen
//   (exakte String-Treffer, egal in welchem Feld). Danach ist die Kopie
//   unbenutzt und darf mit Merker geloescht werden.
// - Nichts wird geraten: Wuerde das Umbiegen zwei Eintraege zusammenlegen oder
//   zwei verschiedene Notizen kollidieren, meldet die Funktion einen Konflikt,
//   und das aufrufende Skript schreibt gar nichts.

// Felder, die das Original immer selbst behaelt
const EIGENE_FELDER = new Set(['id', 'name', 'muscleGroup', 'equipment', 'createdAt', 'updatedAt', 'lastUsedAt'])

function normName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function leer(wert) {
  return wert === undefined || wert === null || wert === ''
}

export function dublettenSchluessel(uebung) {
  return `${normName(uebung?.name)}|${uebung?.muscleGroup || ''}|${uebung?.equipment || ''}`
}

// Aelteste zuerst; ohne createdAt ganz hinten; Gleichstand -> kleinste Id
function aelterZuerst(a, b) {
  const ca = a.createdAt || '￿'
  const cb = b.createdAt || '￿'
  if (ca !== cb) return ca < cb ? -1 : 1
  return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0
}

// -> { gruppen: [{ schluessel, original, kopien }], ersetzt: Map(kopieId -> originalId) }
export function findeDubletten(uebungen) {
  const nachSchluessel = new Map()
  for (const u of uebungen || []) {
    if (!u?.id || leer(u.name)) continue
    const k = dublettenSchluessel(u)
    if (!nachSchluessel.has(k)) nachSchluessel.set(k, [])
    nachSchluessel.get(k).push(u)
  }
  const gruppen = []
  const ersetzt = new Map()
  for (const [schluessel, liste] of nachSchluessel) {
    if (liste.length < 2) continue
    const [original, ...kopien] = [...liste].sort(aelterZuerst)
    gruppen.push({ schluessel, original, kopien })
    for (const k of kopien) ersetzt.set(k.id, original.id)
  }
  return { gruppen, ersetzt }
}

// Tiefe Kopie, in der jeder String, der exakt eine Kopie-Id ist, durch die
// Original-Id ersetzt wird. Schluessel bleiben (Ids stehen nur in Werten —
// geprueft am Cloud-Bestand vom 27.09.2026).
export function ersetzeIds(wert, ersetzt) {
  if (typeof wert === 'string') return ersetzt.has(wert) ? ersetzt.get(wert) : wert
  if (Array.isArray(wert)) return wert.map(x => ersetzeIds(x, ersetzt))
  if (wert && typeof wert === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(wert)) out[k] = ersetzeIds(v, ersetzt)
    return out
  }
  return wert
}

// Pfade aller Stellen, deren Wert exakt eine der Ids ist
export function findeIds(wert, ids, pfad = '') {
  if (typeof wert === 'string') return ids.has(wert) ? [pfad] : []
  if (Array.isArray(wert)) return wert.flatMap((x, i) => findeIds(x, ids, `${pfad}[${i}]`))
  if (wert && typeof wert === 'object') {
    return Object.entries(wert).flatMap(([k, v]) => findeIds(v, ids, `${pfad}.${k}`))
  }
  return []
}

const anzahlVerschiedene = (liste) => new Set(liste).size

// Legt das Umbiegen zwei Eintraege derselben Liste zusammen? (Tag im Plan
// oder Uebungsliste eines Trainings)
function pruefeEintraege(vorher, nachher, wo, nameVon, konflikte) {
  const v = vorher || []
  const n = nachher || []
  if (anzahlVerschiedene(n.map(e => e?.exerciseId)) < anzahlVerschiedene(v.map(e => e?.exerciseId))) {
    konflikte.push(`${wo}: zwei Eintraege wuerden zu derselben Uebung — bitte in der App einen davon entfernen`)
  }
  n.forEach((eintrag, i) => {
    const ring = (e) => [e?.basisExerciseId ?? e?.exerciseId, ...((e?.alternativen) || [])]
    if (anzahlVerschiedene(ring(eintrag)) < anzahlVerschiedene(ring(v[i]))) {
      konflikte.push(`${wo}: bei "${nameVon(eintrag.basisExerciseId ?? eintrag.exerciseId)}" waere eine Alternative doppelt oder gleich der 1. Wahl`)
    }
  })
}

// daten = { exercises, trainingDays, workoutLogs, setLogs, exerciseNotes }
// (ohne Datensaetze, die schon einen Loesch-Merker haben). Aendert nichts an
// der Eingabe, gibt nur zurueck, was zu schreiben waere.
export function planeZusammenfuehrung(daten, jetzt) {
  const exercises = daten.exercises || []
  const { gruppen, ersetzt } = findeDubletten(exercises)
  const nameVon = (id) => exercises.find(u => u.id === id)?.name || id
  const konflikte = []
  const hinweise = []
  const ergebnis = {
    gruppen, ersetzt, konflikte, hinweise,
    uebungenPut: [], uebungenLoeschen: [...ersetzt.keys()],
    tagePut: [], workoutsPut: [], saetzePut: [], notizenPut: [], notizenLoeschen: []
  }
  if (ersetzt.size === 0) return ergebnis

  // 1. Original ergaenzen: was es nicht hat, die Kopie aber schon, geht mit
  for (const { original, kopien } of gruppen) {
    const neu = { ...original }
    let geaendert = false
    for (const kopie of kopien) {
      for (const [feld, wert] of Object.entries(kopie)) {
        if (EIGENE_FELDER.has(feld) || leer(wert)) continue
        if (leer(neu[feld])) {
          neu[feld] = wert
          geaendert = true
        } else if (JSON.stringify(neu[feld]) !== JSON.stringify(wert)) {
          if (feld === 'notes') {
            konflikte.push(`Uebung "${original.name}": zwei verschiedene Notizen ("${neu.notes}" / "${wert}")`)
          } else {
            hinweise.push(`Uebung "${original.name}": ${feld} bleibt "${neu[feld]}" (Kopie hatte "${wert}")`)
          }
        }
      }
      if (kopie.lastUsedAt && kopie.lastUsedAt > (neu.lastUsedAt || '')) {
        neu.lastUsedAt = kopie.lastUsedAt
        geaendert = true
      }
    }
    if (geaendert) ergebnis.uebungenPut.push({ ...neu, updatedAt: jetzt })
  }

  // 2. Trainingstage und Trainings: jede Fundstelle umbiegen
  for (const tag of daten.trainingDays || []) {
    const neu = ersetzeIds(tag, ersetzt)
    if (JSON.stringify(neu) === JSON.stringify(tag)) continue
    pruefeEintraege(tag.exercises, neu.exercises, `Trainingstag "${tag.title || tag.id}"`, nameVon, konflikte)
    ergebnis.tagePut.push({ ...neu, updatedAt: jetzt })
  }
  for (const log of daten.workoutLogs || []) {
    const neu = ersetzeIds(log, ersetzt)
    if (JSON.stringify(neu) === JSON.stringify(log)) continue
    pruefeEintraege(log.exercises, neu.exercises, `Training vom ${log.date || log.id}`, nameVon, konflikte)
    ergebnis.workoutsPut.push({ ...neu, updatedAt: jetzt })
  }

  // 3. Saetze: umbiegen, nie loeschen; zwei Saetze duerfen nicht zu
  //    "Satz n derselben Uebung im selben Training" werden
  const satzSchluessel = (s) => `${s.workoutLogId}|${s.exerciseId}|${s.userId}|${s.setNumber}`
  const saetzeVorher = daten.setLogs || []
  const saetzeNachher = saetzeVorher.map(s => ersetzeIds(s, ersetzt))
  if (anzahlVerschiedene(saetzeNachher.map(satzSchluessel)) < anzahlVerschiedene(saetzeVorher.map(satzSchluessel))) {
    const gesehen = new Map()
    for (const s of saetzeNachher) {
      const k = satzSchluessel(s)
      if (gesehen.has(k)) konflikte.push(`Satz ${s.setNumber} von "${nameVon(s.exerciseId)}" (${s.userId}) gaebe es im selben Training doppelt`)
      gesehen.set(k, true)
    }
  }
  saetzeNachher.forEach((neu, i) => {
    if (JSON.stringify(neu) !== JSON.stringify(saetzeVorher[i])) ergebnis.saetzePut.push({ ...neu, updatedAt: jetzt })
  })

  // 4. Notizen je Nutzer: Id ist `${exerciseId}_${userId}` — die Notiz der
  //    Kopie wandert unter die Id des Originals
  const notizen = new Map((daten.exerciseNotes || []).map(n => [n.id, n]))
  const zuVerschieben = (daten.exerciseNotes || [])
    .filter(n => ersetzt.has(n.exerciseId))
    .sort((a, b) => String(a.updatedAt || '').localeCompare(String(b.updatedAt || '')))
  for (const notiz of zuVerschieben) {
    const originalId = ersetzt.get(notiz.exerciseId)
    const zielId = `${originalId}_${notiz.userId}`
    const ziel = notizen.get(zielId)
    if (!leer(notiz.text) && ziel && !leer(ziel.text) && ziel.text !== notiz.text) {
      konflikte.push(`Notiz von ${notiz.userId} zu "${nameVon(originalId)}": zwei verschiedene Texte ("${ziel.text}" / "${notiz.text}")`)
      continue
    }
    if (!leer(notiz.text) && (!ziel || leer(ziel.text))) {
      const neu = {
        ...(ziel || {}),
        id: zielId,
        exerciseId: originalId,
        userId: notiz.userId,
        text: notiz.text,
        createdAt: ziel?.createdAt || notiz.createdAt || jetzt,
        updatedAt: jetzt
      }
      notizen.set(zielId, neu)
      ergebnis.notizenPut = ergebnis.notizenPut.filter(n => n.id !== zielId).concat(neu)
    }
    ergebnis.notizenLoeschen.push(notiz.id)
  }

  return ergebnis
}

// Vergleichsbild eines Datensatzes: jede Uebungs-Id wird durch ihren
// Dubletten-Schluessel ersetzt (Original und Kopie sehen also gleich aus),
// Felder sortiert, updatedAt der obersten Ebene weggelassen. Zwei Bilder sind
// genau dann gleich, wenn sich fuer den Menschen nichts geaendert hat.
export function namensbild(wert, schluesselVon, oberste = true) {
  if (typeof wert === 'string') return schluesselVon.has(wert) ? `Uebung:${schluesselVon.get(wert)}` : wert
  if (Array.isArray(wert)) return wert.map(x => namensbild(x, schluesselVon, false))
  if (wert && typeof wert === 'object') {
    const out = {}
    for (const k of Object.keys(wert).sort()) {
      if (oberste && k === 'updatedAt') continue
      out[k] = namensbild(wert[k], schluesselVon, false)
    }
    return out
  }
  return wert
}

// Sicherheitsbremse: jeder geaenderte Datensatz muss nach Namen genau so
// aussehen wie vorher. Gibt die Abweichungen als Saetze zurueck (leer = gut).
export function vergleicheNamensbilder(vorherListe, nachherListe, schluesselVon) {
  const vorher = new Map((vorherListe || []).map(x => [x.id, x]))
  const abweichungen = []
  for (const neu of nachherListe || []) {
    const alt = vorher.get(neu.id)
    const titel = neu.title || neu.date || neu.id
    if (!alt) {
      abweichungen.push(`${titel}: Datensatz gab es vorher nicht`)
      continue
    }
    if (JSON.stringify(namensbild(alt, schluesselVon)) !== JSON.stringify(namensbild(neu, schluesselVon))) {
      abweichungen.push(`${titel}: sieht nach dem Umbiegen anders aus als vorher`)
    }
  }
  return abweichungen
}
