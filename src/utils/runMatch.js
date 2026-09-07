/**
 * Zuordnung: welche Aktivitaet von der Uhr gehoert zu welchem geplanten Lauf?
 *
 * Reine Funktion ohne Vue, Dexie und Netz — damit sie in Node geprueft werden
 * kann (scripts/runmatch-test.mjs). Sie entscheidet nur, sie schreibt nichts.
 *
 * Grundsaetze (docs/laufplaner-plan.md 6.3):
 *   - Nie etwas loeschen, nie einen Haken entfernen.
 *   - Ein Lauf, der schon einmal hereinkam, kommt nicht doppelt (externalId).
 *   - Ein von Hand gesetzter Haken bekommt die Ist-Werte nur nachgetragen.
 *   - Was zu keinem Plan-Eintrag passt, geht nicht verloren, sondern erscheint
 *     als ungeplanter Lauf.
 */

/** Lauf-Arten, die als Ziel einer Zuordnung nicht in Frage kommen. */
const KEIN_LAUF = ['strength']

/** Bei Runden-Laeufen zaehlt die Gesamtzeit, sonst die Zeit in Bewegung. */
export function minutenFuer(lauf, sessionTyp) {
  const gesamt = lauf.minutenGesamt
  const bewegung = lauf.minutenBewegung
  if (sessionTyp === 'loops') return gesamt ?? bewegung ?? null
  return bewegung ?? gesamt ?? null
}

function alsStunden(minuten) {
  if (minuten === null || minuten === undefined) return ''
  const ganz = Math.round(minuten)
  const h = Math.floor(ganz / 60)
  const m = String(ganz % 60).padStart(2, '0')
  return h > 0 ? `${h}:${m} h` : `${ganz} min`
}

/**
 * Notiz, die den nicht verwendeten Zeitwert festhaelt. Bei einem Backyard
 * klaffen Gesamt- und Bewegungszeit weit auseinander (12:00 h gegen 9:24 h);
 * beide Zahlen sind interessant, im Dateiformat gibt es aber nur ein Feld.
 */
export function zeitNotiz(lauf, sessionTyp) {
  const gesamt = lauf.minutenGesamt
  const bewegung = lauf.minutenBewegung
  if (gesamt === null || bewegung === null) return ''
  const unterschied = Math.abs(gesamt - bewegung)
  if (unterschied < 5 || unterschied / Math.max(gesamt, 1) < 0.1) return ''
  return sessionTyp === 'loops'
    ? `Bewegungszeit ${alsStunden(bewegung)}`
    : `Gesamtzeit ${alsStunden(gesamt)}`
}

/** Wie weit liegt der Lauf vom Planwert weg? Kleiner ist besser. */
function abweichung(lauf, session) {
  const planKm = session.planned?.km
  if (typeof planKm === 'number' && planKm > 0 && typeof lauf.km === 'number') {
    return Math.abs(lauf.km - planKm) / planKm
  }
  const planMin = session.planned?.minutes
  const minuten = minutenFuer(lauf, session.type)
  if (typeof planMin === 'number' && planMin > 0 && typeof minuten === 'number') {
    return Math.abs(minuten - planMin) / planMin
  }
  // Kein vergleichbarer Planwert (z.B. reiner Runden-Lauf): kein Kriterium.
  return 0
}

function passtZurArt(lauf, session) {
  if (KEIN_LAUF.includes(session.type)) return false
  // Gehen/Wandern zaehlt nur fuer ein geplantes Geh-Training, und umgekehrt.
  if (lauf.istGehen) return session.type === 'walk'
  return session.type !== 'walk'
}

/** Kandidat: gleicher Tag, noch keiner Aktivitaet zugeordnet, offen oder von Hand abgehakt. */
function istKandidat(session, lauf, userId) {
  if (session.userId !== userId) return false
  if (session.date !== lauf.date) return false
  if (session.externalId) return false
  if (session.status === 'planned') return passtZurArt(lauf, session)
  if (session.status === 'done' && (session.source || 'plan') === 'manual') {
    return passtZurArt(lauf, session)
  }
  return false
}

function standardId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

/**
 * @param {object[]} laeufe    normalisierte Aktivitaeten (intervalsApi.holeLaeufe)
 * @param {object[]} sessions  alle bekannten Laeufe (auch anderer Nutzer)
 * @param {{userId: string, planId: string|null, neueId?: function, jetzt?: string}} optionen
 * @returns {{patches: object[], neue: object[], summary: object, text: string}}
 */
export function ordneZu(laeufe, sessions, optionen) {
  const { userId, planId = null } = optionen || {}
  const neueId = optionen?.neueId || standardId
  const jetzt = optionen?.jetzt || new Date().toISOString()

  const bekannt = new Set(sessions.filter(s => s.externalId).map(s => s.externalId))
  const verbraucht = new Set()
  const patches = []
  const neue = []
  let schonDa = 0

  for (const lauf of laeufe) {
    if (bekannt.has(lauf.externalId)) { schonDa += 1; continue }

    const kandidaten = sessions
      .filter(s => !verbraucht.has(s.id) && istKandidat(s, lauf, userId))
      .sort((a, b) => abweichung(lauf, a) - abweichung(lauf, b))

    const treffer = kandidaten[0] || null
    const minuten = minutenFuer(lauf, treffer?.type)
    const notiz = zeitNotiz(lauf, treffer?.type)

    if (treffer) {
      verbraucht.add(treffer.id)
      // Eine von Hand eingetragene Notiz bleibt stehen und wird ergaenzt.
      const alteNotiz = treffer.actual?.note ? String(treffer.actual.note).trim() : ''
      const note = [alteNotiz, notiz].filter(Boolean).join(' - ')
      patches.push({
        id: treffer.id,
        updates: {
          status: 'done',
          actual: { km: lauf.km, minutes: minuten, avgHr: lauf.avgHr, note },
          source: 'intervals',
          externalId: lauf.externalId
        }
      })
    } else {
      neue.push({
        id: neueId(),
        planId,
        userId,
        date: lauf.date,
        type: lauf.istGehen ? 'walk' : 'easy',
        title: lauf.name || 'Lauf von der Uhr',
        description: '',
        planned: { km: null, minutes: null, loops: null },
        status: 'done',
        actual: { km: lauf.km, minutes: minuten, avgHr: lauf.avgHr, note: notiz },
        source: 'intervals',
        externalId: lauf.externalId,
        originalDate: null,
        unplanned: true,
        createdAt: jetzt,
        updatedAt: jetzt
      })
    }
  }

  const summary = { zugeordnet: patches.length, ergaenzt: neue.length, schonDa }
  return { patches, neue, summary, text: beschreibe(summary) }
}

/** Ergebnis als ein Satz fuer die Oberflaeche. */
export function beschreibe(summary) {
  const teile = []
  if (summary.zugeordnet > 0) {
    teile.push(summary.zugeordnet === 1 ? '1 Lauf abgeglichen' : `${summary.zugeordnet} Laeufe abgeglichen`)
  }
  if (summary.ergaenzt > 0) {
    teile.push(summary.ergaenzt === 1 ? '1 ungeplanter Lauf ergaenzt' : `${summary.ergaenzt} ungeplante Laeufe ergaenzt`)
  }
  if (teile.length === 0) return 'Keine neuen Laeufe.'
  return `${teile.join(', ')}.`
}
