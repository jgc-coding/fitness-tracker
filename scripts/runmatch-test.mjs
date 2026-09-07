#!/usr/bin/env node
/*
 * Vertragstest fuer die Zuordnung "Aktivitaet von der Uhr" -> "geplanter Lauf".
 *
 * Laeuft in Node ohne Browser, Netz und IndexedDB, weil src/utils/runMatch.js
 * eine reine Funktion ist. Jede Regel aus docs/laufplaner-plan.md Abschnitt 6.3
 * hat mindestens einen Fall.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\runmatch-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { ordneZu, minutenFuer, zeitNotiz, beschreibe } from '../src/utils/runMatch.js'
import { normalisiere } from '../src/utils/intervalsApi.js'

const HEUTE = '2030-01-20'
const JETZT = '2030-01-20T09:00:00.000Z'
const ATHLET = 'i704265'

let passed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) passed++
  else failures.push(`${name}${detail ? ' -> ' + detail : ''}`)
}

function equal(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  check(name, a === e, `erwartet ${e}, bekommen ${a}`)
}

// --- Bausteine ---------------------------------------------------------------

let idZaehler = 0
const neueId = () => `neu-${++idZaehler}`

function lauf(overrides = {}) {
  return {
    externalId: `${ATHLET}:i1`,
    rohId: 'i1',
    date: HEUTE,
    typ: 'Run',
    istLauf: true,
    istGehen: false,
    name: 'Morning Run',
    km: 10,
    minutenBewegung: 60,
    minutenGesamt: 62,
    avgHr: 140,
    quelle: 'GARMIN',
    ...overrides
  }
}

function session(overrides = {}) {
  return {
    id: 's1',
    planId: 'plan-a',
    userId: 'user2',
    date: HEUTE,
    type: 'easy',
    title: 'Locker 10 km',
    planned: { km: 10, minutes: null, loops: null },
    status: 'planned',
    actual: null,
    source: 'plan',
    externalId: null,
    unplanned: false,
    ...overrides
  }
}

function abgleich(laeufe, sessions, optionen = {}) {
  idZaehler = 0
  return ordneZu(laeufe, sessions, { userId: 'user2', planId: 'plan-a', neueId, jetzt: JETZT, ...optionen })
}

// --- Regel 4: geplanter Lauf wird abgehakt -----------------------------------
{
  const r = abgleich([lauf()], [session()])
  equal('Regel 4: ein Treffer, kein neuer Lauf', [r.patches.length, r.neue.length], [1, 0])
  equal('Regel 4: Status und Quelle', [r.patches[0].updates.status, r.patches[0].updates.source], ['done', 'intervals'])
  equal('Regel 4: Ist-Werte uebernommen',
    r.patches[0].updates.actual, { km: 10, minutes: 60, avgHr: 140, note: '' })
  equal('Regel 4: Kennung gesetzt', r.patches[0].updates.externalId, `${ATHLET}:i1`)
}

// --- Regel 2: dieselbe Aktivitaet kommt nicht zweimal -------------------------
{
  const schonDrin = session({ status: 'done', source: 'intervals', externalId: `${ATHLET}:i1` })
  const r = abgleich([lauf()], [schonDrin])
  equal('Regel 2: zweiter Abgleich aendert nichts', [r.patches.length, r.neue.length, r.summary.schonDa], [0, 0, 1])
  equal('Regel 2: Text sagt es', r.text, 'Keine neuen Laeufe.')
}

// --- Regel 5: fertige Laeufe werden nie zurueckgesetzt ------------------------
{
  const fremd = session({ status: 'done', source: 'intervals', externalId: `${ATHLET}:i9` })
  const r = abgleich([lauf()], [fremd])
  equal('Regel 5: belegter Lauf ist kein Kandidat', [r.patches.length, r.neue.length], [0, 1])
  check('Regel 5: der belegte Lauf bleibt unangetastet', !r.patches.some(p => p.id === 's1'))
}

// --- Regel 3: Handhaken bekommt die Ist-Werte nachgetragen --------------------
{
  const handHaken = session({
    status: 'done',
    source: 'manual',
    actual: { km: null, minutes: null, avgHr: null, note: 'war zaeh' }
  })
  const r = abgleich([lauf()], [handHaken])
  equal('Regel 3: Handhaken wird ergaenzt', r.patches.length, 1)
  equal('Regel 3: eigene Notiz bleibt stehen', r.patches[0].updates.actual.note, 'war zaeh')
  equal('Regel 3: Werte kommen dazu', r.patches[0].updates.actual.km, 10)
}

// --- Ausgelassene Laeufe bleiben ausgelassen ---------------------------------
{
  const r = abgleich([lauf()], [session({ status: 'skipped', source: 'manual' })])
  equal('Ausgelassener Lauf ist kein Kandidat', [r.patches.length, r.neue.length], [0, 1])
}

// --- Regel 3: bester Kandidat gewinnt (km) -----------------------------------
{
  const kurz = session({ id: 'kurz', planned: { km: 5, minutes: null, loops: null } })
  const passend = session({ id: 'passend', planned: { km: 10, minutes: null, loops: null } })
  const weit = session({ id: 'weit', planned: { km: 30, minutes: null, loops: null } })
  const r = abgleich([lauf({ km: 11 })], [kurz, weit, passend])
  equal('Regel 3: kleinste Abweichung in km gewinnt', r.patches[0].id, 'passend')
}

// --- Regel 3: Auswahl ueber Minuten, wenn km fehlt ---------------------------
{
  const a = session({ id: 'a', planned: { km: null, minutes: 30, loops: null } })
  const b = session({ id: 'b', planned: { km: null, minutes: 65, loops: null } })
  const r = abgleich([lauf({ km: null, minutenBewegung: 60, minutenGesamt: 61 })], [a, b])
  equal('Regel 3: kleinste Abweichung in Minuten gewinnt', r.patches[0].id, 'b')
  equal('Regel 3: fehlende km bleiben null', r.patches[0].updates.actual.km, null)
}

// --- Regel 3: jede Aktivitaet nimmt genau einen Kandidaten --------------------
{
  const a = session({ id: 'a', planned: { km: 10, minutes: null, loops: null } })
  const b = session({ id: 'b', planned: { km: 20, minutes: null, loops: null } })
  const r = abgleich(
    [lauf({ externalId: `${ATHLET}:i1`, rohId: 'i1', km: 10 }), lauf({ externalId: `${ATHLET}:i2`, rohId: 'i2', km: 20 })],
    [a, b]
  )
  equal('Zwei Aktivitaeten, zwei verschiedene Laeufe', r.patches.map(p => p.id).sort(), ['a', 'b'])
  equal('Zwei Aktivitaeten, kein ungeplanter Lauf', r.neue.length, 0)
}

// --- Regel 1: Gehen zaehlt nur fuer ein geplantes Geh-Training ----------------
{
  const gehen = lauf({ typ: 'Walk', istLauf: false, istGehen: true })
  const laufTag = session({ id: 'lauf', type: 'easy' })
  const gehTag = session({ id: 'gehen', type: 'walk' })
  const r = abgleich([gehen], [laufTag, gehTag])
  equal('Regel 1: Walk trifft den Geh-Eintrag', r.patches[0].id, 'gehen')

  const r2 = abgleich([lauf()], [gehTag])
  equal('Regel 1: ein Lauf trifft KEINEN Geh-Eintrag', [r2.patches.length, r2.neue.length], [0, 1])
}

// --- Kraft-Eintraege sind nie Ziel einer Zuordnung ---------------------------
{
  const r = abgleich([lauf()], [session({ type: 'strength', planned: { km: null, minutes: 45, loops: null } })])
  equal('Kraft ist kein Ziel', [r.patches.length, r.neue.length], [0, 1])
}

// --- Fremder Nutzer und fremder Tag bleiben unberuehrt -----------------------
{
  const anderer = session({ id: 'lisa', userId: 'user1' })
  const gestern = session({ id: 'gestern', date: '2030-01-19' })
  const r = abgleich([lauf()], [anderer, gestern])
  equal('Fremder Nutzer und anderer Tag sind keine Kandidaten', [r.patches.length, r.neue.length], [0, 1])
}

// --- Regel 4: ungeplanter Lauf, Form des neuen Datensatzes -------------------
{
  const r = abgleich([lauf({ name: 'Feierabendrunde' })], [])
  const n = r.neue[0]
  equal('Ungeplant: als erledigt angelegt', [n.status, n.unplanned, n.source], ['done', true, 'intervals'])
  equal('Ungeplant: Name der Aktivitaet als Titel', n.title, 'Feierabendrunde')
  equal('Ungeplant: keine Planwerte', n.planned, { km: null, minutes: null, loops: null })
  equal('Ungeplant: haengt am aktiven Plan', n.planId, 'plan-a')
  equal('Ungeplant: Text nennt es', r.text, '1 ungeplanter Lauf ergaenzt.')
}

// --- Runden-Lauf: Gesamtzeit statt Bewegungszeit ------------------------------
{
  const backyard = lauf({ km: 80.98, minutenBewegung: 564, minutenGesamt: 719.6 })
  const runden = session({ type: 'loops', planned: { km: null, minutes: null, loops: 12 } })
  const r = abgleich([backyard], [runden])
  equal('Runden: Gesamtzeit zaehlt', r.patches[0].updates.actual.minutes, 719.6)
  equal('Runden: Bewegungszeit steht in der Notiz', r.patches[0].updates.actual.note, 'Bewegungszeit 9:24 h')

  const langer = session({ type: 'long', planned: { km: 80, minutes: null, loops: null } })
  const r2 = abgleich([backyard], [langer])
  equal('Langer Lauf: Bewegungszeit zaehlt', r2.patches[0].updates.actual.minutes, 564)
  equal('Langer Lauf: Gesamtzeit steht in der Notiz', r2.patches[0].updates.actual.note, 'Gesamtzeit 12:00 h')
}

// --- Kleiner Unterschied erzeugt keine Notiz ----------------------------------
{
  const r = abgleich([lauf({ minutenBewegung: 60, minutenGesamt: 62 })], [session()])
  equal('Kleiner Zeitunterschied: keine Notiz', r.patches[0].updates.actual.note, '')
}

// --- Hilfsfunktionen direkt ---------------------------------------------------
{
  equal('minutenFuer: Runden nimmt gesamt', minutenFuer(lauf({ minutenGesamt: 700, minutenBewegung: 500 }), 'loops'), 700)
  equal('minutenFuer: sonst Bewegung', minutenFuer(lauf({ minutenGesamt: 700, minutenBewegung: 500 }), 'easy'), 500)
  equal('minutenFuer: fehlende Bewegungszeit faellt auf gesamt zurueck',
    minutenFuer(lauf({ minutenBewegung: null, minutenGesamt: 61 }), 'easy'), 61)
  equal('zeitNotiz: ohne zweiten Wert leer', zeitNotiz(lauf({ minutenGesamt: null }), 'easy'), '')
  equal('beschreibe: beides', beschreibe({ zugeordnet: 2, ergaenzt: 1, schonDa: 0 }),
    '2 Laeufe abgeglichen, 1 ungeplanter Lauf ergaenzt.')
  equal('beschreibe: nichts', beschreibe({ zugeordnet: 0, ergaenzt: 0, schonDa: 3 }), 'Keine neuen Laeufe.')
}

// --- Zusammenspiel mit der echten Antwortform ---------------------------------
{
  // Ausschnitt einer echten intervals.icu-Antwort (Backyard 2026, geprueft 2026-09-07).
  const roh = {
    id: 'i184119164',
    start_date_local: '2026-06-20T06:00:12',
    type: 'Run',
    name: 'Backyard',
    distance: 80977.39,
    moving_time: 33841,
    elapsed_time: 43175,
    average_heartrate: 144,
    source: 'UPLOAD'
  }
  const n = normalisiere(roh, ATHLET)
  equal('Normalisierung: Tag aus start_date_local', n.date, '2026-06-20')
  equal('Normalisierung: Meter werden km', n.km, 80.98)
  equal('Normalisierung: Sekunden werden Minuten', [n.minutenBewegung, n.minutenGesamt], [564, 719.6])
  equal('Normalisierung: Kennung mit Athlet davor', n.externalId, `${ATHLET}:i184119164`)
  check('Normalisierung: ohne Datum kein Datensatz', normalisiere({ id: 'x' }, ATHLET) === null)
  check('Normalisierung: Unsinn ergibt null', normalisiere(null, ATHLET) === null)
}

// --- Ergebnis ----------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n[runmatch-test] ${failures.length} von ${failures.length + passed} Faellen rot:\n`)
  for (const f of failures) console.error('  FEHLER ' + f)
  console.error('')
  process.exit(1)
}

console.log(`[runmatch-test] OK - ${passed} Faelle gruen (Abgleich-Regeln 1-6 aus 6.3).`)
