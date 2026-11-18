#!/usr/bin/env node
/*
 * Vertragstest fuer die Steigern-Erinnerung (src/utils/steigerung.js).
 *
 * Laeuft in Node ohne Browser und IndexedDB. Regeln: docs/plan-steigern-
 * erinnerung.md, "Regeln im Detail". Eingaben sind setLogs in der Form, die
 * useHistory liest: { exerciseId, userId, date, setNumber, weight, reps }.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\steigerung-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import {
  STILLSTAND_EINHEITEN,
  STANDARD_BEREICH,
  einheitenDerGruppe,
  istSteigerung,
  stillstandZaehler,
  obenImBereich,
  erinnerung
} from '../src/utils/steigerung.js'

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

const U = 'user1'
const KH = 'schraeg-kh'
const LH = 'schraeg-lh'
const MA = 'schraeg-maschine'
const RING = [KH, LH, MA]

let zaehlerId = 0
// Ein Satz in der Form der setLogs-Tabelle.
const satz = (date, exerciseId, weight, reps, setNumber = 1, userId = U, extra = {}) => ({
  id: `s${++zaehlerId}`, workoutLogId: `w-${date}`, exerciseId, userId, date, setNumber, weight, reps, ...extra
})

const erinnere = (setLogs, rest = {}) =>
  erinnerung({ setLogs, gruppe: RING, exerciseId: KH, userId: U, ...rest })

// S0: Konstanten wie im Plan.
equal('S0 drei Einheiten', STILLSTAND_EINHEITEN, 3)
equal('S0 Standardbereich 8-12', STANDARD_BEREICH, { min: 8, max: 12 })

// S1: istSteigerung — mehr Gewicht ODER gleiches Gewicht mit mehr Wdh.
equal('S1 mehr Gewicht', istSteigerung({ weight: 62.5, reps: 8 }, { weight: 60, reps: 10 }), true)
equal('S1 gleiches Gewicht, mehr Wdh', istSteigerung({ weight: 60, reps: 11 }, { weight: 60, reps: 10 }), true)
equal('S1 gleich', istSteigerung({ weight: 60, reps: 10 }, { weight: 60, reps: 10 }), false)
equal('S1 weniger Wdh', istSteigerung({ weight: 60, reps: 9 }, { weight: 60, reps: 10 }), false)
equal('S1 weniger Gewicht', istSteigerung({ weight: 57.5, reps: 15 }, { weight: 60, reps: 10 }), false)
equal('S1 kein Bestwert', istSteigerung({ weight: 60, reps: 10 }, null), false)

// S2: Gabriels Beispiel — 3x 60x10, beim 4. Mal die Erinnerung.
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-08', KH, 60, 10)
  ]
  equal('S2 Zaehler 3', stillstandZaehler(einheitenDerGruppe(logs, RING, U)), 3)
  equal('S2 faellig wegen Stillstand', erinnere(logs), { faellig: true, grund: 'stillstand', zaehler: 3 })
  equal('S2 nach zwei Mal noch nicht', erinnere(logs.slice(0, 2)), { faellig: false, grund: null, zaehler: 2 })
}

// S3: Wechsel zwischen den Uebungen einer Gruppe — Vergleich je Uebung,
// gezaehlt fuer die Gruppe. Erstes Mal je Uebung ist ein Neuanfang.
{
  const logs = [
    satz('2030-01-01', KH, 20, 10),
    satz('2030-01-03', LH, 60, 10),
    satz('2030-01-05', KH, 20, 10),
    satz('2030-01-07', LH, 60, 10)
  ]
  equal('S3 KH, LH, KH, LH -> Zaehler 3', stillstandZaehler(einheitenDerGruppe(logs, RING, U)), 3)
  equal('S3 Karte LH erinnert auch', erinnere(logs, { exerciseId: LH }).faellig, true)
  // Kurzhantel 22 ist Steigerung gegen KH 20, nie gegen LH 60 (nie quer).
  const weiter = [...logs, satz('2030-01-09', KH, 22, 10)]
  equal('S3 KH 22 nach LH 60 ist Steigerung', stillstandZaehler(einheitenDerGruppe(weiter, RING, U)), 1)
}

// S4: 60x10, 60x9, 60x10 sind drei Einheiten ohne Steigerung.
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 9),
    satz('2030-01-08', KH, 60, 10)
  ]
  equal('S4 Zaehler 3', erinnere(logs).zaehler, 3)
  equal('S4 faellig', erinnere(logs).faellig, true)
}

// S5: Steigerung setzt den Zaehler zurueck.
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-08', KH, 60, 11)
  ]
  equal('S5 mehr Wdh -> Zaehler 1', erinnere(logs).zaehler, 1)
  equal('S5 nicht faellig', erinnere(logs).faellig, false)
}

// S6: Neuanfang mit weniger Gewicht — Zaehler neu, neuer Bestwert.
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-08', KH, 50, 10),
    satz('2030-01-11', KH, 50, 10)
  ]
  equal('S6 Neuanfang -> Zaehler 2', erinnere(logs).zaehler, 2)
  // 55 ist gegen den neuen Bestwert 50 eine Steigerung (nicht gegen die alte 60).
  equal('S6 55 nach Neuanfang ist Steigerung', erinnere([...logs, satz('2030-01-14', KH, 55, 10)]).zaehler, 1)
}

// S7: Erstes Mal in der Uebung = Neuanfang, Zaehler 1; ohne Saetze 0.
equal('S7 erstes Mal', erinnere([satz('2030-01-01', KH, 60, 10)]), { faellig: false, grund: null, zaehler: 1 })
equal('S7 gar nichts', erinnere([]), { faellig: false, grund: null, zaehler: 0 })

// S8: Wdh null — der Satz zaehlt nur mit dem Gewicht.
{
  equal('S8 null vs 10 bei gleichem Gewicht', istSteigerung({ weight: 60, reps: null }, { weight: 60, reps: 10 }), false)
  equal('S8 10 vs null bei gleichem Gewicht', istSteigerung({ weight: 60, reps: 10 }, { weight: 60, reps: null }), false)
  equal('S8 mehr Gewicht ohne Wdh', istSteigerung({ weight: 62.5, reps: null }, { weight: 60, reps: 10 }), true)
  const logs = [
    satz('2030-01-01', KH, 60, null),
    satz('2030-01-04', KH, 60, null),
    satz('2030-01-08', KH, 60, null)
  ]
  equal('S8 dreimal ohne Wdh -> Stillstand', erinnere(logs), { faellig: true, grund: 'stillstand', zaehler: 3 })
  equal('S8 null ist nie oben', obenImBereich([satz('2030-01-01', KH, 60, null)], { min: 8, max: 12 }), false)
}

// S9: 0 kg (Koerpergewicht) — Steigerung nur ueber Wdh.
{
  equal('S9 0 kg mehr Wdh', istSteigerung({ weight: 0, reps: 9 }, { weight: 0, reps: 8 }), true)
  const logs = [
    satz('2030-01-01', KH, 0, 8),
    satz('2030-01-04', KH, 0, 8),
    satz('2030-01-08', KH, 0, 8)
  ]
  equal('S9 0 kg dreimal gleich', erinnere(logs), { faellig: true, grund: 'stillstand', zaehler: 3 })
}

// S10: Mehrere Saetze am selben Tag sind EINE Einheit; Wert = bester Satz
// (schwerstes Gewicht, bei Gleichstand meiste Wdh).
{
  const logs = [
    satz('2030-01-01', KH, 60, 10, 1), satz('2030-01-01', KH, 60, 8, 2), satz('2030-01-01', KH, 55, 12, 3),
    satz('2030-01-04', KH, 60, 9, 1), satz('2030-01-04', KH, 60, 10, 2), satz('2030-01-04', KH, 57.5, 12, 3)
  ]
  const einheiten = einheitenDerGruppe(logs, RING, U)
  equal('S10 zwei Einheiten', einheiten.length, 2)
  equal('S10 bester Satz Tag 1', einheiten[0].werte[KH], { weight: 60, reps: 10 })
  equal('S10 Zaehler 2 (60x10 bleibt)', stillstandZaehler(einheiten), 2)
}

// S11: "oben" erst, wenn ALLE Saetze der letzten Einheit oben sind.
{
  const bereich = { min: 8, max: 12 }
  const alle = [satz('2030-01-01', KH, 20, 12, 1), satz('2030-01-01', KH, 20, 12, 2), satz('2030-01-01', KH, 20, 13, 3)]
  const nurErster = [satz('2030-01-01', KH, 20, 12, 1), satz('2030-01-01', KH, 20, 10, 2), satz('2030-01-01', KH, 20, 9, 3)]
  equal('S11 alle Saetze oben', obenImBereich(alle, bereich), true)
  equal('S11 nur Satz 1 oben', obenImBereich(nurErster, bereich), false)
  equal('S11 leer ist nicht oben', obenImBereich([], bereich), false)
  equal('S11 Erinnerung alle oben', erinnere(alle, { bereich }), { faellig: true, grund: 'oben', zaehler: 1 })
  equal('S11 keine Erinnerung nur Satz 1', erinnere(nurErster, { bereich }).faellig, false)
  // Nur die LETZTE Einheit der Uebung auf der Karte zaehlt.
  const frueher = [...alle, satz('2030-01-05', KH, 22, 10, 1), satz('2030-01-05', KH, 22, 9, 2)]
  equal('S11 frueher oben, zuletzt nicht', erinnere(frueher, { bereich }).faellig, false)
  // Andere Uebung der Gruppe oben -> nicht fuer die Karte KH.
  const lhOben = [satz('2030-01-01', LH, 60, 12), satz('2030-01-02', KH, 20, 10)]
  equal('S11 LH oben, Karte KH nicht', erinnere(lhOben, { bereich }).faellig, false)
  // Oben UND Stillstand -> Grund "oben".
  const beides = [satz('2030-01-01', KH, 20, 12), satz('2030-01-04', KH, 20, 12), satz('2030-01-08', KH, 20, 12)]
  equal('S11 beides -> oben', erinnere(beides, { bereich }), { faellig: true, grund: 'oben', zaehler: 3 })
}

// S12: Heute mit und ohne Satz — heute zaehlt, sobald ein Satz da ist.
{
  const vorher = [satz('2030-01-01', KH, 60, 10), satz('2030-01-04', KH, 60, 10)]
  equal('S12 heute ohne Satz: noch nicht', erinnere(vorher).faellig, false)
  const heute = [...vorher, satz('2030-01-08', KH, 60, 10)]
  equal('S12 heute 3. Mal gleich: direkt faellig', erinnere(heute), { faellig: true, grund: 'stillstand', zaehler: 3 })
  const dreiVorher = [...heute]
  equal('S12 vor dem ersten Satz von heute gilt die Erinnerung', erinnere(dreiVorher).faellig, true)
  equal('S12 heute gesteigert: weg', erinnere([...dreiVorher, satz('2030-01-11', KH, 61.25, 10)]).faellig, false)
  equal('S12 heute 12 geschafft: direkt faellig',
    erinnere([satz('2030-01-01', KH, 20, 10), satz('2030-01-08', KH, 20, 12)]).grund, 'oben')
}

// S13: Schon markiert -> keine Erinnerung (Merker increaseNextTime an den
// Saetzen der letzten Einheit; ausdruecklich uebergeben gewinnt).
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-08', KH, 60, 10, 1, U, { increaseNextTime: true })
  ]
  equal('S13 Merker in den Daten', erinnere(logs), { faellig: false, grund: null, zaehler: 3 })
  const ohne = logs.map(s => ({ ...s, increaseNextTime: false }))
  equal('S13 markiert uebergeben', erinnere(ohne, { markiert: true }).faellig, false)
  equal('S13 nicht markiert', erinnere(ohne, { markiert: false }).faellig, true)
  // Ein Merker auf einer aelteren Einheit gilt nicht mehr.
  const alt = [satz('2030-01-01', KH, 60, 10, 1, U, { increaseNextTime: true }), ...ohne.slice(1), satz('2030-01-11', KH, 60, 10)]
  equal('S13 alter Merker zaehlt nicht', erinnere(alt).faellig, true)
}

// S14: Einstellung aus -> keine Erinnerung; fehlt = an.
{
  const logs = [satz('2030-01-01', KH, 60, 10), satz('2030-01-04', KH, 60, 10), satz('2030-01-08', KH, 60, 10)]
  equal('S14 aus', erinnere(logs, { aktiv: false }), { faellig: false, grund: null, zaehler: 3 })
  equal('S14 an', erinnere(logs, { aktiv: true }).faellig, true)
  equal('S14 fehlt = an', erinnere(logs, { aktiv: undefined }).faellig, true)
}

// S15: Ohne gespeicherten Bereich gilt 8-12.
{
  const zwoelf = [satz('2030-01-01', KH, 20, 12)]
  const elf = [satz('2030-01-01', KH, 20, 11)]
  equal('S15 kein Bereich, 12 Wdh', erinnere(zwoelf, { bereich: null }).grund, 'oben')
  equal('S15 kein Bereich, 11 Wdh', erinnere(elf, { bereich: undefined }).faellig, false)
  equal('S15 kaputter Bereich = 8-12', erinnere(zwoelf, { bereich: { min: 8 } }).grund, 'oben')
  equal('S15 eigener Bereich 10-15', erinnere(zwoelf, { bereich: { min: 10, max: 15 } }).faellig, false)
  equal('S15 eigener Bereich 6-10', erinnere(elf, { bereich: { min: 6, max: 10 } }).grund, 'oben')
}

// S16: Kommawerte ohne Rundung.
{
  equal('S16 61.25 > 60', istSteigerung({ weight: 61.25, reps: 10 }, { weight: 60, reps: 10 }), true)
  equal('S16 61.25 = 61.25', istSteigerung({ weight: 61.25, reps: 10 }, { weight: 61.25, reps: 10 }), false)
  equal('S16 61.25 < 62.5', istSteigerung({ weight: 61.25, reps: 12 }, { weight: 62.5, reps: 10 }), false)
  const logs = [satz('2030-01-01', KH, 61.25, 10), satz('2030-01-04', KH, 61.25, 10), satz('2030-01-08', KH, 61.25, 10)]
  equal('S16 dreimal 61.25', erinnere(logs).zaehler, 3)
  equal('S16 Wert bleibt 61.25', einheitenDerGruppe(logs, RING, U)[0].werte[KH].weight, 61.25)
}

// S17: Uebung ohne Alternativen — die Gruppe ist die Uebung allein.
{
  const logs = [satz('2030-01-01', 'curl', 15, 10), satz('2030-01-04', 'curl', 15, 10), satz('2030-01-08', 'curl', 15, 10)]
  equal('S17 Gruppe allein', erinnerung({ setLogs: logs, gruppe: ['curl'], exerciseId: 'curl', userId: U }).zaehler, 3)
  equal('S17 Gruppe leer -> Uebung allein', erinnerung({ setLogs: logs, gruppe: [], exerciseId: 'curl', userId: U }).zaehler, 3)
}

// S18: Entscheidung 7 — ein Tag mit Saetzen nur AUSSERHALB der Gruppe
// aendert deren Zaehler nicht (auch keine Steigerung dort).
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-06', 'kniebeuge', 100, 5),
    satz('2030-01-06', 'kniebeuge', 110, 5, 2),
    satz('2030-01-08', KH, 60, 10)
  ]
  equal('S18 fremder Tag ist keine Einheit', einheitenDerGruppe(logs, RING, U).map(e => e.date),
    ['2030-01-01', '2030-01-04', '2030-01-08'])
  equal('S18 Zaehler bleibt 3', erinnere(logs).zaehler, 3)
  equal('S18 Zaehler vor dem 3. Mal bleibt 2', erinnere(logs.slice(0, 4)).zaehler, 2)
}

// S19: Nur die eigene Person zaehlt.
{
  const logs = [
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 60, 10),
    satz('2030-01-08', KH, 60, 10, 1, 'user2')
  ]
  equal('S19 fremde Person zaehlt nicht', erinnere(logs).zaehler, 2)
  equal('S19 user2 hat eine Einheit', erinnere(logs, { userId: 'user2' }).zaehler, 1)
}

// S20: Zwei Uebungen der Gruppe am selben Tag sind eine Einheit; eine
// Steigerung in einer davon setzt zurueck.
{
  const logs = [
    satz('2030-01-01', KH, 20, 10),
    satz('2030-01-04', KH, 20, 10),
    satz('2030-01-08', KH, 20, 10), satz('2030-01-08', LH, 60, 10)
  ]
  equal('S20 gleicher Tag eine Einheit', einheitenDerGruppe(logs, RING, U).length, 3)
  // LH zum ersten Mal = Neuanfang an diesem Tag -> Zaehler 1.
  equal('S20 Neuanfang in einer Uebung setzt zurueck', erinnere(logs).zaehler, 1)
}

// S21: Reihenfolge der Eingabe egal, Tagesfolge nach Datum.
{
  const logs = [
    satz('2030-01-08', KH, 60, 10),
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 62.5, 10)
  ]
  // 60 -> 62.5 (Steigerung) -> 60 (Neuanfang) = Zaehler 1.
  equal('S21 unsortiert', erinnere(logs).zaehler, 1)
}

if (failures.length) {
  console.log(`steigerung-test: ${failures.length} rot, ${passed} gruen`)
  for (const f of failures) console.log('  ROT: ' + f)
  process.exitCode = 1
} else {
  console.log(`steigerung-test: alle ${passed} Faelle gruen`)
}
