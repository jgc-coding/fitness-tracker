/**
 * Zugriff auf intervals.icu — die Bruecke zu Garmin.
 *
 * Reines JavaScript ohne Vue und ohne Dexie: dieselbe Datei bedient die App
 * und das PC-Skript (scripts/intervals-abruf.mjs).
 *
 * Die Feldnamen sind an einer echten Antwort geprueft (2026-09-07):
 *   id                "i184119164"   Text mit i-Praefix, KEINE Zahl
 *   start_date_local  "2026-06-20T06:00:12"   ohne Zeitzone -> Tag = erste 10 Zeichen
 *   type              "Run"
 *   distance          80977.39       Meter
 *   moving_time       33841          Sekunden in Bewegung
 *   elapsed_time      43175          Sekunden gesamt (bei Runden-Laeufen weit mehr)
 *   average_heartrate 144
 *   source            "UPLOAD" | "GARMIN" | ...
 */

const BASIS = 'https://intervals.icu/api/v1'

/** Aktivitaeten, die als Lauf zaehlen. */
export const LAUF_TYPEN = ['Run', 'TrailRun', 'VirtualRun']
/** Aktivitaeten, die nur zu einem geplanten Geh-Training passen. */
export const GEH_TYPEN = ['Walk', 'Hike']

/**
 * Fehler mit zwei Ebenen: `satz` ist fuer den Menschen, `technisch` fuer die
 * Diagnose-Zeile darunter. `id` steht in beiden und im Log, damit ein
 * Nutzer-Screenshot zur Ferndiagnose reicht.
 */
export class IntervalsFehler extends Error {
  constructor(satz, technisch) {
    super(satz)
    this.name = 'IntervalsFehler'
    this.satz = satz
    this.technisch = technisch
    this.id = Math.random().toString(36).slice(2, 8)
  }
  /** Eine Zeile fuer die Oberflaeche, Muster wie im Rest der App. */
  get zeile() {
    return `Technische Ursache: ${this.technisch} - ID ${this.id}`
  }
}

function basicAuth(apiKey) {
  const roh = `API_KEY:${apiKey}`
  // btoa gibt es im Browser, Buffer in Node - beide Wege abdecken.
  if (typeof btoa === 'function') return btoa(roh)
  return Buffer.from(roh, 'utf8').toString('base64')
}

/**
 * Rohe Aktivitaeten eines Zeitraums holen.
 * @param {{athleteId: string, apiKey: string}} zugang
 * @param {string} von  Tag YYYY-MM-DD (einschliesslich)
 * @param {string} bis  Tag YYYY-MM-DD (einschliesslich)
 * @returns {Promise<object[]>}
 * @throws {IntervalsFehler}
 */
export async function holeAktivitaeten(zugang, von, bis) {
  const athleteId = String(zugang?.athleteId || '').trim()
  const apiKey = String(zugang?.apiKey || '').trim()
  if (!athleteId || !apiKey) {
    throw new IntervalsFehler(
      'Es ist keine Verbindung eingerichtet.',
      'athleteId oder apiKey fehlt'
    )
  }

  const url = `${BASIS}/athlete/${encodeURIComponent(athleteId)}/activities`
    + `?oldest=${von}&newest=${bis}`

  let antwort
  try {
    antwort = await fetch(url, { headers: { authorization: `Basic ${basicAuth(apiKey)}` } })
  } catch (e) {
    throw new IntervalsFehler(
      'Offline oder Dienst nicht erreichbar. Der naechste Abgleich holt alles nach.',
      `Netzwerkfehler: ${e?.message || 'unbekannt'}`
    )
  }

  if (antwort.status === 401 || antwort.status === 403) {
    throw new IntervalsFehler(
      'Schluessel oder Athleten-Id stimmen nicht.',
      `HTTP ${antwort.status}`
    )
  }
  if (!antwort.ok) {
    throw new IntervalsFehler(
      'intervals.icu antwortet gerade nicht richtig. Bitte spaeter erneut versuchen.',
      `HTTP ${antwort.status}`
    )
  }

  let daten
  try {
    daten = await antwort.json()
  } catch (e) {
    throw new IntervalsFehler(
      'Die Antwort von intervals.icu war unlesbar.',
      `Kein gueltiges JSON: ${e?.message || 'unbekannt'}`
    )
  }
  if (!Array.isArray(daten)) {
    throw new IntervalsFehler(
      'Die Antwort von intervals.icu hatte eine unerwartete Form.',
      `Erwartet wurde eine Liste, gekommen ist ${typeof daten}`
    )
  }
  return daten
}

function zahlOderNull(wert) {
  const n = Number(wert)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function runde(wert, stellen) {
  if (wert === null) return null
  const f = 10 ** stellen
  return Math.round(wert * f) / f
}

/**
 * Eine rohe Aktivitaet in die Form bringen, mit der die App rechnet.
 * Fehlt das Datum, gibt es null statt eines geratenen Wertes — ohne Tag
 * laesst sich kein Lauf zuordnen.
 * @returns {null|{externalId,rohId,date,typ,istLauf,istGehen,name,km,minutenBewegung,minutenGesamt,avgHr,quelle}}
 */
export function normalisiere(aktivitaet, athleteId) {
  if (!aktivitaet || typeof aktivitaet !== 'object') return null
  const rohId = aktivitaet.id
  const start = aktivitaet.start_date_local
  if (!rohId || typeof start !== 'string' || start.length < 10) return null

  const meter = zahlOderNull(aktivitaet.distance)
  const bewegung = zahlOderNull(aktivitaet.moving_time)
  const gesamt = zahlOderNull(aktivitaet.elapsed_time)
  const typ = typeof aktivitaet.type === 'string' ? aktivitaet.type : ''

  return {
    externalId: `${athleteId}:${rohId}`,
    rohId: String(rohId),
    date: start.slice(0, 10),
    typ,
    istLauf: LAUF_TYPEN.includes(typ),
    istGehen: GEH_TYPEN.includes(typ),
    name: typeof aktivitaet.name === 'string' ? aktivitaet.name : '',
    km: meter === null ? null : runde(meter / 1000, 2),
    minutenBewegung: bewegung === null ? null : runde(bewegung / 60, 1),
    minutenGesamt: gesamt === null ? null : runde(gesamt / 60, 1),
    avgHr: aktivitaet.average_heartrate === null || aktivitaet.average_heartrate === undefined
      ? null
      : Math.round(Number(aktivitaet.average_heartrate)) || null,
    quelle: typeof aktivitaet.source === 'string' ? aktivitaet.source : ''
  }
}

/**
 * Holen und normalisieren in einem Schritt. Aktivitaeten ohne Datum oder ohne
 * Kennung werden gezaehlt und gemeldet, nicht stillschweigend verschluckt.
 * @returns {Promise<{laeufe: object[], uebersprungen: number}>}
 */
export async function holeLaeufe(zugang, von, bis) {
  const roh = await holeAktivitaeten(zugang, von, bis)
  const laeufe = []
  let uebersprungen = 0
  for (const a of roh) {
    const n = normalisiere(a, zugang.athleteId)
    if (!n) { uebersprungen += 1; continue }
    if (!n.istLauf && !n.istGehen) continue
    laeufe.push(n)
  }
  // Chronologisch: der frueheste Lauf sucht sich zuerst seinen Plan-Eintrag.
  laeufe.sort((a, b) => (a.date === b.date ? a.rohId.localeCompare(b.rohId) : a.date.localeCompare(b.date)))
  if (uebersprungen > 0) {
    console.warn(`[FitTrack] [WARN] intervals: ${uebersprungen} Aktivitaet(en) ohne Datum oder Kennung uebersprungen`)
  }
  return { laeufe, uebersprungen }
}

/**
 * Verbindungstest: kleiner Abruf ueber die letzten sieben Tage. Wirft bei
 * falschem Schluessel, liefert sonst die Anzahl gefundener Laeufe.
 */
export async function testeVerbindung(zugang, heute) {
  const bis = heute
  const von = new Date(`${heute}T12:00:00`)
  von.setDate(von.getDate() - 7)
  const vonTag = `${von.getFullYear()}-${String(von.getMonth() + 1).padStart(2, '0')}-${String(von.getDate()).padStart(2, '0')}`
  const { laeufe } = await holeLaeufe(zugang, vonTag, bis)
  return { ok: true, anzahl: laeufe.length }
}
