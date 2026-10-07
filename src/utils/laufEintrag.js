/**
 * Selbst eingetragene Laeufe und die Rueckmeldung des Laeufers (seit v2.12.0).
 *
 * "Anders gelaufen": Statt des geplanten Laufs ist man etwas ganz anderes
 * gelaufen. Daraus wird ein EIGENER Lauf (`unplanned: true`), der geplante
 * bleibt als ausgelassen oder offen stehen — so sieht Claude beim naechsten
 * Export beides: was geplant war und was wirklich passiert ist.
 * "+ Lauf eintragen" legt denselben Lauf ohne geplanten Bezug an.
 *
 * Reine Funktionen ohne Vue und Dexie, Vertrag: scripts/laufeintrag-test.mjs.
 */
import { getRunType, RUN_SESSION_TYPES, isValidDateString } from './runPlanSchema.js'
import { istZyklustag } from './zyklusTag.js'

/** Arten, die man frei eintragen kann. Kraft ist kein Lauf. */
export const SPONTAN_ARTEN = RUN_SESSION_TYPES.filter(t => t.id !== 'strength')

/** Was mit dem geplanten Lauf passiert, wenn man anders gelaufen ist. */
export const BEHANDLUNG_AUSGELASSEN = 'ausgelassen'
export const BEHANDLUNG_OFFEN = 'offen'

const TITEL_MAX = 60

/**
 * Rueckmeldung in die Form bringen, die auch das Dateiformat kennt
 * (docs/laufplan-format.md): Anstrengung 1-5 oder null, Notiz als Text,
 * Zyklustag 1-45. Ist alles leer, gibt es keine Rueckmeldung — ein leeres
 * Objekt waere beim naechsten Import eine Scheinaenderung. Aus demselben Grund
 * steht `cycleDay` nur drin, wenn er gesetzt ist: aeltere Rueckmeldungen
 * bleiben Byte fuer Byte gleich. Der Zeitstempel bleibt stehen, solange sich
 * inhaltlich nichts aendert.
 */
export function normalizeFeedback(input, previous = null) {
  if (!input) return null
  const zahl = Number(input.rpe)
  const rpe = Number.isInteger(zahl) && zahl >= 1 && zahl <= 5 ? zahl : null
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  const cycleDay = istZyklustag(input.cycleDay) ? input.cycleDay : null
  if (rpe === null && note === '' && cycleDay === null) return null
  const unveraendert = previous && gleicheRueckmeldung(previous, { rpe, note, cycleDay })
  const at = unveraendert && previous.at ? previous.at : new Date().toISOString()
  return cycleDay === null ? { rpe, note, at } : { rpe, note, cycleDay, at }
}

/** Inhaltlich gleich (ohne Zeitstempel)? `null` und fehlend zaehlen gleich. */
export function gleicheRueckmeldung(a, b) {
  return (a?.rpe ?? null) === (b?.rpe ?? null) &&
    (a?.note || '') === (b?.note || '') &&
    (a?.cycleDay ?? null) === (b?.cycleDay ?? null)
}

/** Hat die Rueckmeldung irgendeinen Inhalt? */
export function hatRueckmeldung(feedback) {
  return Boolean(feedback && (feedback.rpe || feedback.note || feedback.cycleDay))
}

function zahlOderNull(wert) {
  if (wert === null || wert === undefined || wert === '') return null
  const zahl = Number(String(wert).replace(',', '.'))
  return Number.isFinite(zahl) && zahl >= 0 ? zahl : undefined
}

/**
 * Formular-Eingabe pruefen und in Lauf-Felder uebersetzen. Ungueltiges wird
 * gemeldet, nie still verworfen.
 *
 * @param {{date, type, title, km, minutes, avgHr, rpe, note, cycleDay}} eingabe
 * @param {string} maschinenNotiz  `actual.note`, die erhalten bleiben soll
 * @returns {{ ok: boolean, fehler: string[], felder: object|null }}
 */
export function pruefeEingabe(eingabe, maschinenNotiz = '') {
  const fehler = []
  const e = eingabe || {}

  if (!isValidDateString(e.date)) fehler.push('Bitte ein Datum waehlen.')
  if (!SPONTAN_ARTEN.some(t => t.id === e.type)) fehler.push('Bitte waehlen, was fuer ein Lauf es war.')

  const km = zahlOderNull(e.km)
  const minutes = zahlOderNull(e.minutes)
  const avgHr = zahlOderNull(e.avgHr)
  if (km === undefined) fehler.push('Kilometer: bitte eine Zahl eintragen.')
  if (minutes === undefined) fehler.push('Minuten: bitte eine Zahl eintragen.')
  if (avgHr === undefined) fehler.push('Puls: bitte eine Zahl eintragen.')

  if (e.cycleDay !== null && e.cycleDay !== undefined && !istZyklustag(e.cycleDay)) {
    fehler.push('Zyklustag: bitte eine Zahl von 1 bis 45 oder leer lassen.')
  }

  if (fehler.length > 0) return { ok: false, fehler, felder: null }

  const titel = typeof e.title === 'string' ? e.title.trim().slice(0, TITEL_MAX) : ''
  const notiz = typeof maschinenNotiz === 'string' ? maschinenNotiz.trim() : ''
  const hatWerte = km !== null || minutes !== null || avgHr !== null || notiz !== ''

  return {
    ok: true,
    fehler: [],
    felder: {
      date: e.date,
      type: e.type,
      title: titel || getRunType(e.type).label,
      actual: hatWerte ? { km, minutes, avgHr, note: notiz } : null,
      feedbackEingabe: { rpe: e.rpe ?? null, note: e.note ?? '', cycleDay: e.cycleDay ?? null }
    }
  }
}

/**
 * Neuen, selbst eingetragenen Lauf bauen.
 * @param {object} eingabe  siehe pruefeEingabe
 * @param {{ id: string, userId: string, planId: string|null, jetzt: string,
 *           maschinenNotiz?: string, externalId?: string|null, source?: string }} optionen
 * @returns {{ ok: boolean, fehler: string[], lauf: object|null }}
 */
export function baueSpontanLauf(eingabe, optionen) {
  const { id, userId, planId = null, jetzt } = optionen || {}
  const geprueft = pruefeEingabe(eingabe, optionen?.maschinenNotiz || '')
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler, lauf: null }
  const f = geprueft.felder

  return {
    ok: true,
    fehler: [],
    lauf: {
      id,
      planId,
      userId,
      date: f.date,
      type: f.type,
      title: f.title,
      description: '',
      planned: { km: null, minutes: null, loops: null },
      targets: null,
      status: 'done',
      actual: f.actual,
      feedback: normalizeFeedback(f.feedbackEingabe),
      source: optionen?.source || 'manual',
      externalId: optionen?.externalId || null,
      originalDate: null,
      unplanned: true,
      createdAt: jetzt,
      updatedAt: jetzt
    }
  }
}

/**
 * "Anders gelaufen": aus einem geplanten Lauf wird ein eigener Lauf, der
 * geplante wird ausgelassen oder bleibt offen.
 *
 * War der geplante Lauf schon erledigt (meist hat die Uhr den spontanen Lauf
 * ihm zugeordnet), WANDERN Ist-Werte, Uhr-Kennung und Rueckmeldung auf den
 * neuen Lauf — sonst zaehlte derselbe Lauf doppelt, und die Uhr braechte ihn
 * nach einem Zuruecksetzen ein zweites Mal. Das Formular ist mit diesen
 * Werten vorbelegt; was dort steht, gilt.
 *
 * @returns {{ ok: boolean, fehler: string[], neu: object|null, geplantUpdates: object|null }}
 */
export function ersetzeGeplantenLauf(geplant, eingabe, behandlung, optionen) {
  if (!geplant || geplant.unplanned === true) {
    return { ok: false, fehler: ['Nur ein geplanter Lauf laesst sich ersetzen.'], neu: null, geplantUpdates: null }
  }
  if (behandlung !== BEHANDLUNG_AUSGELASSEN && behandlung !== BEHANDLUNG_OFFEN) {
    return { ok: false, fehler: ['Bitte waehlen, was mit dem geplanten Lauf passiert.'], neu: null, geplantUpdates: null }
  }

  const warErledigt = geplant.status === 'done'
  const gebaut = baueSpontanLauf(eingabe, {
    ...optionen,
    userId: geplant.userId,
    planId: geplant.planId ?? null,
    // Technische Notiz der Uhr ("Gesamtzeit 12:00 h") gehoert zum Lauf, der
    // wirklich stattfand.
    maschinenNotiz: warErledigt ? (geplant.actual?.note || '') : '',
    externalId: warErledigt ? (geplant.externalId || null) : null,
    source: warErledigt && geplant.externalId ? (geplant.source || 'intervals') : 'manual'
  })
  if (!gebaut.ok) return { ok: false, fehler: gebaut.fehler, neu: null, geplantUpdates: null }

  const geplantUpdates = { externalId: null }
  // Die Rueckmeldung eines erledigten Laufs gehoerte zum gelaufenen Lauf; sie
  // steht jetzt (ueber die Vorbelegung) am neuen. Beim noch geplanten Lauf
  // bleibt eine vorhandene Rueckmeldung unangetastet.
  if (warErledigt) geplantUpdates.feedback = null

  if (behandlung === BEHANDLUNG_AUSGELASSEN) {
    const hinweis = `Stattdessen: ${gebaut.lauf.title}`
    // Ein schon genannter Grund fuers Auslassen ("krank") bleibt stehen.
    const alterGrund = geplant.status === 'skipped' ? String(geplant.actual?.note || '').trim() : ''
    const note = alterGrund && !alterGrund.includes(hinweis) ? `${alterGrund} - ${hinweis}` : (alterGrund || hinweis)
    geplantUpdates.status = 'skipped'
    geplantUpdates.actual = { km: null, minutes: null, avgHr: null, note }
    geplantUpdates.source = 'manual'
  } else {
    geplantUpdates.status = 'planned'
    geplantUpdates.actual = null
    geplantUpdates.source = 'plan'
  }

  return { ok: true, fehler: [], neu: gebaut.lauf, geplantUpdates }
}

/**
 * Selbst eingetragenen (oder von der Uhr gekommenen) ungeplanten Lauf
 * aendern. Uhr-Kennung, Quelle und die technische Notiz bleiben.
 * @returns {{ ok: boolean, fehler: string[], updates: object|null }}
 */
export function bearbeiteSpontanLauf(lauf, eingabe) {
  if (!lauf || lauf.unplanned !== true) {
    return { ok: false, fehler: ['Nur ein ungeplanter Lauf laesst sich so bearbeiten.'], updates: null }
  }
  const geprueft = pruefeEingabe(eingabe, lauf.actual?.note || '')
  if (!geprueft.ok) return { ok: false, fehler: geprueft.fehler, updates: null }
  const f = geprueft.felder
  return {
    ok: true,
    fehler: [],
    updates: {
      date: f.date,
      type: f.type,
      title: f.title,
      actual: f.actual,
      feedback: normalizeFeedback(f.feedbackEingabe, lauf.feedback || null)
    }
  }
}

/**
 * Loeschen nur fuer selbst eingetragene Laeufe. Einen Lauf von der Uhr holte
 * der naechste Abgleich sofort zurueck; ein geplanter gehoert dem Plan.
 */
export function darfLoeschen(lauf) {
  return Boolean(lauf && lauf.unplanned === true && (lauf.source || 'manual') === 'manual' && !lauf.externalId)
}

/**
 * Vorbelegung des Formulars aus einem vorhandenen Lauf: beim Bearbeiten seine
 * eigenen Werte, bei "Anders gelaufen" die Ist-Werte und die Rueckmeldung
 * eines schon erledigten Laufs. Tag und Art sind nur beim Bearbeiten
 * vorbelegt — beim Ersetzen waehlt man die Art bewusst neu.
 */
export function vorbelegung(lauf, { heute, modus }) {
  const leer = { date: heute, type: '', title: '', km: '', minutes: '', avgHr: '', rpe: null, note: '', cycleDay: null }
  if (!lauf) return leer
  const mitIst = modus === 'bearbeiten' || lauf.status === 'done'
  const datum = modus === 'bearbeiten' || lauf.date <= heute ? lauf.date : heute
  return {
    date: datum,
    type: modus === 'bearbeiten' ? lauf.type : '',
    title: modus === 'bearbeiten' ? lauf.title : '',
    km: mitIst ? (lauf.actual?.km ?? '') : '',
    minutes: mitIst ? (lauf.actual?.minutes ?? '') : '',
    avgHr: mitIst ? (lauf.actual?.avgHr ?? '') : '',
    rpe: mitIst ? (lauf.feedback?.rpe ?? null) : null,
    note: mitIst ? (lauf.feedback?.note ?? '') : '',
    cycleDay: mitIst ? (lauf.feedback?.cycleDay ?? null) : null
  }
}
