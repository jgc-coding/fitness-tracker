#!/usr/bin/env node
/*
 * Vertragstest fuer das Hantel-Bildchen (src/utils/hantelBild.js, v2.19.0).
 *
 * Laeuft in Node ohne Browser und IndexedDB.
 * Aufruf (Windows PowerShell):  node .\scripts\hantelbild-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import {
  hantelBildSchluessel,
  hantelBildAn,
  hantelBilderSichtbar,
  hantelTeile
} from '../src/utils/hantelBild.js'
import { USERS } from '../src/utils/constants.js'
import { STANDARD_UEBUNGEN } from '../src/data/standardUebungen.js'
import { toTitleCase } from '../src/utils/formatters.js'

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

const DB = { kuerzel: 'DB', art: 'kurz' }
const BB = { kuerzel: 'BB', art: 'lang' }

// --- H1 Namen zerlegen: Bild steht direkt vor dem Kuerzel ------------------
equal('H1 DB vorne', hantelTeile('DB Bench Press'), [DB, { text: ' Bench Press' }])
equal('H1 BB vorne', hantelTeile('BB Overhead Press'), [BB, { text: ' Overhead Press' }])
equal('H1 Kuerzel in der Mitte', hantelTeile('Incline DB Press'), [{ text: 'Incline ' }, DB, { text: ' Press' }])
equal('H1 Kuerzel am Ende', hantelTeile('Row DB'), [{ text: 'Row ' }, DB])
equal('H1 beide Kuerzel', hantelTeile('DB/BB Row'), [DB, { text: '/' }, BB, { text: ' Row' }])
equal('H1 mit Bindestrich', hantelTeile('DB-Curl'), [DB, { text: '-Curl' }])
equal('H1 ohne Kuerzel', hantelTeile('Leg Curl'), [{ text: 'Leg Curl' }])
// Nur ganze Woerter: kein Bild mitten in einem anderen Wort
equal('H1 DBX ist kein Kuerzel', hantelTeile('DBX Row'), [{ text: 'DBX Row' }])
equal('H1 ADB ist kein Kuerzel', hantelTeile('ADB Row'), [{ text: 'ADB Row' }])
equal('H1 Umlaut davor', hantelTeile('ÜDB Row'), [{ text: 'ÜDB Row' }])
// Klein geschrieben zaehlt nicht: angezeigt wird immer nach toTitleCase,
// das macht aus db/bb schon DB/BB
equal('H1 klein = kein Kuerzel', hantelTeile('db bench'), [{ text: 'db bench' }])
equal('H1 toTitleCase davor', hantelTeile(toTitleCase('db bench press')), [DB, { text: ' Bench Press' }])
// Fehlender Name: nichts anzeigen, nie werfen
equal('H1 leer', hantelTeile(''), [])
equal('H1 null', hantelTeile(null), [])
equal('H1 undefined', hantelTeile(undefined), [])
equal('H1 Zahl', hantelTeile(42), [])

// --- H2 Standardliste: Kuerzel und Geraet passen zusammen -------------------
// Jede Standard-Uebung mit DB ist eine Kurzhantel-, jede mit BB eine
// Langhantel-Uebung, und jede bekommt genau ein Bild.
{
  let mitKuerzel = 0
  for (const u of STANDARD_UEBUNGEN) {
    const kuerzel = hantelTeile(toTitleCase(u.name)).filter(t => t.kuerzel)
    if (!kuerzel.length) continue
    mitKuerzel++
    check(`H2 genau ein Bild: ${u.name}`, kuerzel.length === 1, `${kuerzel.length} Bilder`)
    const erwartet = kuerzel[0].kuerzel === 'DB' ? 'dumbbell' : 'barbell'
    check(`H2 Geraet passt: ${u.name}`, u.equipment === erwartet, `Geraet ${u.equipment}, Kuerzel ${kuerzel[0].kuerzel}`)
  }
  // Stand 27.11.2026: vier DB- und drei BB-Uebungen
  check('H2 Standardliste hat Kuerzel-Uebungen', mitKuerzel >= 7, `nur ${mitKuerzel}`)
}

// --- H3 Einstellung je Person ----------------------------------------------
equal('H3 Schluessel', hantelBildSchluessel('user1'), 'hantelBild_user1')
equal('H3 gespeichert an', hantelBildAn(true, false), true)
equal('H3 gespeichert aus', hantelBildAn(false, true), false)
equal('H3 ohne Eintrag: Standard an', hantelBildAn(undefined, true), true)
equal('H3 ohne Eintrag: Standard aus', hantelBildAn(undefined, false), false)
equal('H3 ohne Eintrag, ohne Standard', hantelBildAn(undefined, undefined), false)
// Kaputter Wert: Standard der Person, nie raten
equal('H3 kaputt, Standard an', hantelBildAn('ja', true), true)
equal('H3 kaputt, Standard aus', hantelBildAn(1, false), false)

// Gabriels Wunsch 27.11.2026: user1 und user3 an, user2 aus
{
  const standard = Object.fromEntries(USERS.map(u => [u.id, u.hantelBilder === true]))
  equal('H3 Standard je Person', standard, { user1: true, user2: false, user3: true })
}

// --- H4 Sichtbar, sobald eine ausgewaehlte Person es an hat ----------------
{
  const an = { user1: true, user2: false, user3: true }
  const istAn = (id) => an[id] === true
  equal('H4 nur user2', hantelBilderSichtbar(['user2'], istAn), false)
  equal('H4 nur user1', hantelBilderSichtbar(['user1'], istAn), true)
  equal('H4 nur user3', hantelBilderSichtbar(['user3'], istAn), true)
  equal('H4 user2 mit user1', hantelBilderSichtbar(['user2', 'user1'], istAn), true)
  equal('H4 niemand', hantelBilderSichtbar([], istAn), false)
  equal('H4 undefined', hantelBilderSichtbar(undefined, istAn), false)
  equal('H4 unbekannte Kennung', hantelBilderSichtbar(['user9'], istAn), false)
}

if (failures.length) {
  console.log(`hantelbild-test: ${failures.length} rot, ${passed} gruen`)
  for (const f of failures) console.log('  ROT: ' + f)
  process.exitCode = 1
} else {
  console.log(`hantelbild-test: alle ${passed} Faelle gruen`)
}
