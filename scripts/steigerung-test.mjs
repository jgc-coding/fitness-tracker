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
  STILLSTAND_WOCHEN,
  STANDARD_BEREICH,
  einheitenDerGruppe,
  istSteigerung,
  stillstandZaehler,
  stillstandWochen,
  obenImBereich,
  erinnerung,
  WDH_GRENZEN,
  erinnerungSchluessel,
  wdhBereichSchluessel,
  erinnerungAn,
  wdhBereichGueltig,
  istMarkiert,
  knopfZustand,
  knopfText
} from '../src/utils/steigerung.js'
import { addDaysToDate } from '../src/utils/dateHelpers.js'

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

// Tag in Woche n (0 = Woche ab Montag 2030-01-07), t = Tage ab Montag
// (0 Mo ... 6 So). Woche -1 ist die Woche davor.
const W = (n, t = 0) => addDaysToDate('2030-01-07', 7 * n + t)
// Ohne Angabe liegt "heute" weit hinter allen Testdaten: jede Woche mit
// Einheit ist dann eine volle Woche.
const SPAETER = W(20)

const erinnere = (setLogs, rest = {}) =>
  erinnerung({ setLogs, gruppe: RING, exerciseId: KH, userId: U, heute: SPAETER, ...rest })
const zaehlerVon = (setLogs, userId = U) => stillstandZaehler(einheitenDerGruppe(setLogs, RING, userId))

// S0: Konstanten wie im Plan.
equal('S0 drei Wochen', STILLSTAND_WOCHEN, 3)
equal('S0 Standardbereich 8-12', STANDARD_BEREICH, { min: 8, max: 12 })

// S1: istSteigerung — mehr Gewicht ODER gleiches Gewicht mit mehr Wdh.
equal('S1 mehr Gewicht', istSteigerung({ weight: 62.5, reps: 8 }, { weight: 60, reps: 10 }), true)
equal('S1 gleiches Gewicht, mehr Wdh', istSteigerung({ weight: 60, reps: 11 }, { weight: 60, reps: 10 }), true)
equal('S1 gleich', istSteigerung({ weight: 60, reps: 10 }, { weight: 60, reps: 10 }), false)
equal('S1 weniger Wdh', istSteigerung({ weight: 60, reps: 9 }, { weight: 60, reps: 10 }), false)
equal('S1 weniger Gewicht', istSteigerung({ weight: 57.5, reps: 15 }, { weight: 60, reps: 10 }), false)
equal('S1 kein Bestwert', istSteigerung({ weight: 60, reps: 10 }, null), false)

// S2: Gabriels Beispiel (22.11.2026) — Steigerung in Woche 0, danach drei
// volle Trainingswochen Ruhe, erst ab Woche 4 die Erinnerung. Bis v2.17.0
// kam sie schon beim dritten Training (der Steigerungstag zaehlte mit).
{
  const logs = [
    satz(W(-1, 2), KH, 57.5, 10),
    satz(W(0, 2), KH, 60, 10), // Mittwoch Woche 0: Steigerung
    satz(W(1, 2), KH, 60, 10),
    satz(W(2, 2), KH, 60, 10),
    satz(W(3, 2), KH, 60, 10)
  ]
  equal('S2 vier Einheiten seit der Steigerung', zaehlerVon(logs), 4)
  equal('S2 Fall vom 22.11.: zwei Trainings ohne Steigerung, drittes Training -> keine Erinnerung',
    erinnere(logs.slice(0, 4), { heute: W(3, 2) }), { faellig: false, grund: null, wochen: 2 })
  equal('S2 Woche 3 trainiert, aber noch nicht vorbei -> keine Erinnerung',
    erinnere(logs, { heute: W(3, 6) }), { faellig: false, grund: null, wochen: 2 })
  equal('S2 Montag Woche 4 -> Erinnerung', erinnere(logs, { heute: W(4, 0) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  equal('S2 Mittwoch Woche 4 vor dem ersten Satz -> Erinnerung', erinnere(logs, { heute: W(4, 2) }).faellig, true)
  equal('S2 Woche der Steigerung selbst zaehlt nie', erinnere(logs.slice(0, 2), { heute: W(0, 6) }).wochen, 0)
}

// S3: Wechsel zwischen den Uebungen einer Gruppe — Vergleich je Uebung,
// gezaehlt fuer die Gruppe. Erstes Mal je Uebung ist ein Neuanfang.
{
  const logs = [
    satz(W(0), KH, 20, 10),
    satz(W(1), LH, 60, 10), // erstes Mal LH = Neuanfang, Woche 1 ist die Startwoche
    satz(W(2), KH, 20, 10),
    satz(W(3), LH, 60, 10),
    satz(W(4), KH, 20, 10)
  ]
  equal('S3 KH, LH, KH, LH, KH -> Zaehler 4', zaehlerVon(logs), 4)
  equal('S3 Wochen 2, 3, 4 voll -> faellig', erinnere(logs, { heute: W(5) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  equal('S3 Karte LH erinnert auch', erinnere(logs, { exerciseId: LH, heute: W(5) }).faellig, true)
  // Kurzhantel 22 ist Steigerung gegen KH 20, nie gegen LH 60 (nie quer).
  const weiter = [...logs, satz(W(5), KH, 22, 10)]
  equal('S3 KH 22 nach LH 60 ist Steigerung', zaehlerVon(weiter), 1)
  equal('S3 nach KH 22 keine Erinnerung mehr', erinnere(weiter, { heute: W(5) }), { faellig: false, grund: null, wochen: 0 })
}

// S4: 60x10, 60x9, 60x10 sind Wochen ohne Steigerung.
{
  const logs = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 9),
    satz(W(2), KH, 60, 10),
    satz(W(3), KH, 60, 10)
  ]
  equal('S4 Zaehler 4', zaehlerVon(logs), 4)
  equal('S4 drei volle Wochen', erinnere(logs, { heute: W(4) }).wochen, 3)
  equal('S4 faellig', erinnere(logs, { heute: W(4) }).faellig, true)
}

// S5: Steigerung setzt zurueck; ohne Training danach waechst nichts.
{
  const logs = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 10),
    satz(W(2), KH, 60, 11)
  ]
  equal('S5 mehr Wdh -> Zaehler 1', zaehlerVon(logs), 1)
  equal('S5 Wochen ohne Training zaehlen nicht', erinnere(logs, { heute: W(9) }), { faellig: false, grund: null, wochen: 0 })
}

// S6: Neuanfang mit weniger Gewicht — Zaehler neu, neuer Bestwert.
{
  const logs = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 10),
    satz(W(2), KH, 50, 10),
    satz(W(3), KH, 50, 10)
  ]
  equal('S6 Neuanfang -> Zaehler 2', zaehlerVon(logs), 2)
  equal('S6 Neuanfang -> Wochen ab dort', erinnere(logs).wochen, 1)
  // 55 ist gegen den neuen Bestwert 50 eine Steigerung (nicht gegen die alte 60).
  equal('S6 55 nach Neuanfang ist Steigerung', zaehlerVon([...logs, satz(W(4), KH, 55, 10)]), 1)
}

// S7: Erstes Mal in der Uebung = Neuanfang, 0 Wochen; ohne Saetze 0.
equal('S7 erstes Mal', erinnere([satz(W(0), KH, 60, 10)]), { faellig: false, grund: null, wochen: 0 })
equal('S7 erstes Mal Zaehler 1', zaehlerVon([satz(W(0), KH, 60, 10)]), 1)
equal('S7 gar nichts', erinnere([]), { faellig: false, grund: null, wochen: 0 })

// S8: Wdh null — der Satz zaehlt nur mit dem Gewicht.
{
  equal('S8 null vs 10 bei gleichem Gewicht', istSteigerung({ weight: 60, reps: null }, { weight: 60, reps: 10 }), false)
  equal('S8 10 vs null bei gleichem Gewicht', istSteigerung({ weight: 60, reps: 10 }, { weight: 60, reps: null }), false)
  equal('S8 mehr Gewicht ohne Wdh', istSteigerung({ weight: 62.5, reps: null }, { weight: 60, reps: 10 }), true)
  const logs = [
    satz(W(0), KH, 60, null),
    satz(W(1), KH, 60, null),
    satz(W(2), KH, 60, null),
    satz(W(3), KH, 60, null)
  ]
  equal('S8 drei Wochen ohne Wdh -> Stillstand', erinnere(logs, { heute: W(4) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  equal('S8 null ist nie oben', obenImBereich([satz('2030-01-01', KH, 60, null)], { min: 8, max: 12 }), false)
}

// S9: 0 kg (Koerpergewicht) — Steigerung nur ueber Wdh.
{
  equal('S9 0 kg mehr Wdh', istSteigerung({ weight: 0, reps: 9 }, { weight: 0, reps: 8 }), true)
  const logs = [
    satz(W(0), KH, 0, 8),
    satz(W(1), KH, 0, 8),
    satz(W(2), KH, 0, 8),
    satz(W(3), KH, 0, 8)
  ]
  equal('S9 0 kg drei Wochen gleich', erinnere(logs, { heute: W(4) }), { faellig: true, grund: 'stillstand', wochen: 3 })
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
  equal('S11 Erinnerung alle oben', erinnere(alle, { bereich }), { faellig: true, grund: 'oben', wochen: 0 })
  equal('S11 keine Erinnerung nur Satz 1', erinnere(nurErster, { bereich }).faellig, false)
  // Nur die LETZTE Einheit der Uebung auf der Karte zaehlt.
  const frueher = [...alle, satz('2030-01-05', KH, 22, 10, 1), satz('2030-01-05', KH, 22, 9, 2)]
  equal('S11 frueher oben, zuletzt nicht', erinnere(frueher, { bereich }).faellig, false)
  // Andere Uebung der Gruppe oben -> nicht fuer die Karte KH.
  const lhOben = [satz('2030-01-01', LH, 60, 12), satz('2030-01-02', KH, 20, 10)]
  equal('S11 LH oben, Karte KH nicht', erinnere(lhOben, { bereich }).faellig, false)
  // Oben UND Stillstand -> Grund "oben".
  const beides = [satz(W(0), KH, 20, 12), satz(W(1), KH, 20, 12), satz(W(2), KH, 20, 12), satz(W(3), KH, 20, 12)]
  equal('S11 beides -> oben', erinnere(beides, { bereich, heute: W(4) }), { faellig: true, grund: 'oben', wochen: 3 })
}

// S12: Heute mit und ohne Satz — heute zaehlt, sobald ein Satz da ist.
{
  const vorher = [satz(W(0), KH, 60, 10), satz(W(1), KH, 60, 10), satz(W(2), KH, 60, 10), satz(W(3), KH, 60, 10)]
  equal('S12 Woche 4 vor dem ersten Satz: faellig', erinnere(vorher, { heute: W(4, 1) }).faellig, true)
  equal('S12 heute gleich gespeichert: bleibt faellig',
    erinnere([...vorher, satz(W(4, 1), KH, 60, 10)], { heute: W(4, 1) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  equal('S12 heute gesteigert: weg',
    erinnere([...vorher, satz(W(4, 1), KH, 61.25, 10)], { heute: W(4, 1) }), { faellig: false, grund: null, wochen: 0 })
  equal('S12 heute 12 geschafft: direkt faellig',
    erinnere([satz(W(0), KH, 20, 10), satz(W(1), KH, 20, 12)], { heute: W(1) }).grund, 'oben')
}

// S13: Schon markiert -> keine Erinnerung (Merker increaseNextTime an den
// Saetzen der letzten Einheit; ausdruecklich uebergeben gewinnt).
{
  const logs = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 10),
    satz(W(2), KH, 60, 10),
    satz(W(3), KH, 60, 10, 1, U, { increaseNextTime: true })
  ]
  equal('S13 Merker in den Daten', erinnere(logs), { faellig: false, grund: null, wochen: 3 })
  const ohne = logs.map(s => ({ ...s, increaseNextTime: false }))
  equal('S13 markiert uebergeben', erinnere(ohne, { markiert: true }).faellig, false)
  equal('S13 nicht markiert', erinnere(ohne, { markiert: false }).faellig, true)
  // Ein Merker auf einer aelteren Einheit gilt nicht mehr.
  const alt = [satz(W(0), KH, 60, 10, 1, U, { increaseNextTime: true }), ...ohne.slice(1), satz(W(4), KH, 60, 10)]
  equal('S13 alter Merker zaehlt nicht', erinnere(alt).faellig, true)
}

// S14: Einstellung aus -> keine Erinnerung; fehlt = an.
{
  const logs = [satz(W(0), KH, 60, 10), satz(W(1), KH, 60, 10), satz(W(2), KH, 60, 10), satz(W(3), KH, 60, 10)]
  equal('S14 aus', erinnere(logs, { aktiv: false }), { faellig: false, grund: null, wochen: 3 })
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
  // Browser-Test v2.17 (P4): Bereich in der Detailansicht von 8-12 auf 8-13
  // geaendert -> dieselben drei Saetze mit 12 sind nicht mehr oben; die Karte
  // rechnet beim Schliessen der Detailansicht neu (TrackingView)
  const dreiMalZwoelf = [1, 2, 3].map(n => satz('2030-01-01', KH, 12, 12, n))
  equal('S15 vorher 8-12, alle Saetze 12', erinnere(dreiMalZwoelf, { bereich: { min: 8, max: 12 } }).grund, 'oben')
  equal('S15 nach Aenderung auf 8-13 nicht mehr oben', erinnere(dreiMalZwoelf, { bereich: { min: 8, max: 13 } }).faellig, false)
}

// S16: Kommawerte ohne Rundung.
{
  equal('S16 61.25 > 60', istSteigerung({ weight: 61.25, reps: 10 }, { weight: 60, reps: 10 }), true)
  equal('S16 61.25 = 61.25', istSteigerung({ weight: 61.25, reps: 10 }, { weight: 61.25, reps: 10 }), false)
  equal('S16 61.25 < 62.5', istSteigerung({ weight: 61.25, reps: 12 }, { weight: 62.5, reps: 10 }), false)
  const logs = [satz(W(0), KH, 61.25, 10), satz(W(1), KH, 61.25, 10), satz(W(2), KH, 61.25, 10), satz(W(3), KH, 61.25, 10)]
  equal('S16 viermal 61.25', zaehlerVon(logs), 4)
  equal('S16 viermal 61.25 -> drei Wochen', erinnere(logs).wochen, 3)
  equal('S16 Wert bleibt 61.25', einheitenDerGruppe(logs, RING, U)[0].werte[KH].weight, 61.25)
}

// S17: Uebung ohne Alternativen — die Gruppe ist die Uebung allein.
{
  const logs = [satz(W(0), 'curl', 15, 10), satz(W(1), 'curl', 15, 10), satz(W(2), 'curl', 15, 10), satz(W(3), 'curl', 15, 10)]
  equal('S17 Gruppe allein', erinnerung({ setLogs: logs, gruppe: ['curl'], exerciseId: 'curl', userId: U, heute: W(4) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  equal('S17 Gruppe leer -> Uebung allein', erinnerung({ setLogs: logs, gruppe: [], exerciseId: 'curl', userId: U, heute: W(4) }).wochen, 3)
}

// S18: Entscheidung 7 — ein Tag mit Saetzen nur AUSSERHALB der Gruppe
// aendert deren Zaehler nicht (auch keine Steigerung dort). Eine Woche nur
// mit anderen Uebungen ist fuer die Gruppe keine Trainingswoche.
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
  equal('S18 Zaehler bleibt 3', zaehlerVon(logs), 3)
  equal('S18 Zaehler vor dem 3. Mal bleibt 2', zaehlerVon(logs.slice(0, 4)), 2)
  const wochen = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 10),
    satz(W(2), 'kniebeuge', 100, 5), // Woche 2: Gruppe nicht trainiert
    satz(W(3), KH, 60, 10)
  ]
  equal('S18 Woche nur mit fremder Uebung zaehlt nicht', erinnere(wochen, { heute: W(4) }), { faellig: false, grund: null, wochen: 2 })
}

// S19: Nur die eigene Person zaehlt.
{
  const logs = [
    satz(W(0), KH, 60, 10),
    satz(W(1), KH, 60, 10),
    satz(W(2), KH, 60, 10, 1, 'user2'),
    satz(W(3), KH, 60, 10, 1, 'user2')
  ]
  equal('S19 fremde Person zaehlt nicht', zaehlerVon(logs), 2)
  equal('S19 fremde Person zaehlt nicht (Wochen)', erinnere(logs).wochen, 1)
  equal('S19 user2 eigene Wochen', erinnere(logs, { userId: 'user2' }).wochen, 1)
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
  equal('S20 Neuanfang in einer Uebung setzt zurueck', zaehlerVon(logs), 1)
  equal('S20 Neuanfang -> 0 Wochen', erinnere(logs).wochen, 0)
}

// S21: Reihenfolge der Eingabe egal, Tagesfolge nach Datum.
{
  const logs = [
    satz('2030-01-08', KH, 60, 10),
    satz('2030-01-01', KH, 60, 10),
    satz('2030-01-04', KH, 62.5, 10)
  ]
  // 60 -> 62.5 (Steigerung) -> 60 (Neuanfang) = Zaehler 1.
  equal('S21 unsortiert', zaehlerVon(logs), 1)
}

// S22: Speicherorte und Einstellung (P2). Schluessel wie scripts/wdh-bereiche.mjs.
{
  equal('S22 Schluessel Einstellung', erinnerungSchluessel('user2'), 'steigernErinnerung_user2')
  equal('S22 Schluessel Bereich', wdhBereichSchluessel('user1', 'ex-7'), 'wdhBereich_user1_ex-7')
  equal('S22 Einstellung fehlt = an', erinnerungAn(undefined), true)
  equal('S22 Einstellung null = an', erinnerungAn(null), true)
  equal('S22 Einstellung true = an', erinnerungAn(true), true)
  equal('S22 nur false = aus', erinnerungAn(false), false)
  equal('S22 Grenzen wie Skript', WDH_GRENZEN, { min: 1, max: 50 })
}

// S23: Bereich pruefen. Gueltig = ganze Zahlen, 1 <= min < max <= 50.
{
  equal('S23 8-12 gueltig', wdhBereichGueltig({ min: 8, max: 12 }), { min: 8, max: 12 })
  equal('S23 Grenzen 1-50 gueltig', wdhBereichGueltig({ min: 1, max: 50 }), { min: 1, max: 50 })
  equal('S23 Zusatzfelder fallen weg', wdhBereichGueltig({ min: 5, max: 6, x: 1 }), { min: 5, max: 6 })
  equal('S23 fehlt', wdhBereichGueltig(undefined), null)
  equal('S23 Zahl statt Objekt', wdhBereichGueltig(12), null)
  equal('S23 min = max', wdhBereichGueltig({ min: 10, max: 10 }), null)
  equal('S23 min > max', wdhBereichGueltig({ min: 12, max: 8 }), null)
  equal('S23 Kommazahl', wdhBereichGueltig({ min: 8.5, max: 12 }), null)
  equal('S23 Text', wdhBereichGueltig({ min: '8', max: '12' }), null)
  equal('S23 unter 1', wdhBereichGueltig({ min: 0, max: 12 }), null)
  equal('S23 ueber 50', wdhBereichGueltig({ min: 8, max: 51 }), null)
  equal('S23 max fehlt', wdhBereichGueltig({ min: 8 }), null)
  const roh = { min: 6, max: 10 }
  check('S23 frische Kopie', wdhBereichGueltig(roh) !== roh)
}

// S24: "markiert" kommt aus den gespeicherten Saetzen (Ort wie
// toggleIncreaseNextTime): heute vorhanden -> Merker von heute, sonst Merker
// der letzten Einheit. Darum ueberlebt er einen Neustart.
{
  const alt = [{ setNumber: 1, increaseNextTime: true }, { setNumber: 2, increaseNextTime: true }]
  const altOhne = [{ setNumber: 1, increaseNextTime: false }]
  equal('S24 vor dem ersten Satz: Merker der letzten Einheit', istMarkiert([], alt), true)
  equal('S24 vor dem ersten Satz, nicht markiert', istMarkiert([], altOhne), false)
  equal('S24 heute gespeichert: alter Merker zaehlt nicht mehr', istMarkiert([{ setNumber: 1, increaseNextTime: false }], alt), false)
  equal('S24 heute markiert', istMarkiert([{ setNumber: 1, increaseNextTime: true }, { setNumber: 2, increaseNextTime: false }], altOhne), true)
  equal('S24 nichts da', istMarkiert(undefined, undefined), false)
  equal('S24 Merker fehlt (Altbestand)', istMarkiert([], [{ setNumber: 1 }]), false)
}

// S25: Zustand des Knopfs. Ring nur bei faellig UND Einstellung an, nie bei
// markiert.
{
  equal('S25 markiert geht vor', knopfZustand({ markiert: true, faellig: true, aktiv: true }), 'markiert')
  equal('S25 markiert auch bei Einstellung aus', knopfZustand({ markiert: true, aktiv: false }), 'markiert')
  equal('S25 faellig und an', knopfZustand({ faellig: true, aktiv: true }), 'erinnern')
  equal('S25 faellig, Einstellung fehlt = an', knopfZustand({ faellig: true, aktiv: undefined }), 'erinnern')
  equal('S25 faellig, Einstellung aus', knopfZustand({ faellig: true, aktiv: false }), 'aus')
  equal('S25 nicht faellig', knopfZustand({ faellig: false }), 'aus')
  equal('S25 ohne Angaben', knopfZustand(), 'aus')

  // Zusammenspiel mit erinnerung(): schon markierte Uebung ist nie faellig
  const logs = [0, 1, 2, 3].map(n => ({ exerciseId: 'a', userId: 'u', date: W(n), setNumber: 1, weight: 60, reps: 10 }))
  const r = erinnerung({ setLogs: logs, gruppe: ['a'], exerciseId: 'a', userId: 'u', markiert: istMarkiert([], logs.slice(-1)), heute: W(4) })
  equal('S25 drei Wochen 60x10 ohne Merker -> Ring', knopfZustand({ markiert: false, faellig: r.faellig, aktiv: true }), 'erinnern')
  const markiertLogs = logs.map((s, i) => i === 3 ? { ...s, increaseNextTime: true } : s)
  const m = istMarkiert([], markiertLogs.slice(-1))
  const r2 = erinnerung({ setLogs: markiertLogs, gruppe: ['a'], exerciseId: 'a', userId: 'u', markiert: m, heute: W(4) })
  equal('S25 drei Wochen 60x10 markiert -> kein Ring', knopfZustand({ markiert: m, faellig: r2.faellig, aktiv: true }), 'markiert')
}

// S26: Text fuer Vorleseprogramme nennt den Grund
{
  equal('S26 oben', knopfText({ zustand: 'erinnern', grund: 'oben', max: 12, name: 'Eins' }), 'Eins: Steigern, 12 Wdh erreicht')
  equal('S26 oben ohne Bereich = 12', knopfText({ zustand: 'erinnern', grund: 'oben' }), 'Steigern, 12 Wdh erreicht')
  equal('S26 stillstand', knopfText({ zustand: 'erinnern', grund: 'stillstand', wochen: 3, name: 'Eins' }), 'Eins: Steigern, 3 Wochen ohne Steigerung')
  equal('S26 stillstand 5 Wochen', knopfText({ zustand: 'erinnern', grund: 'stillstand', wochen: 5 }), 'Steigern, 5 Wochen ohne Steigerung')
  equal('S26 stillstand ohne Zahl = 3', knopfText({ zustand: 'erinnern', grund: 'stillstand' }), 'Steigern, 3 Wochen ohne Steigerung')
  check('S26 markiert', knopfText({ zustand: 'markiert', name: 'Eins' }).startsWith('Eins: Steigern markiert'))
  check('S26 aus', knopfText({ zustand: 'aus', name: 'Eins' }).startsWith('Eins: Gewicht beim'))
}

// S27: Volle Trainingswochen im Detail (Gabriel 22.11.2026).
{
  const e = (logs) => einheitenDerGruppe(logs, RING, U)
  // Zweimal pro Woche: Steigerung Montag Woche 0, Donnerstag gleich.
  const zweimal = [satz(W(0, 0), KH, 60, 10), satz(W(0, 3), KH, 60, 10)]
  for (const n of [1, 2, 3]) zweimal.push(satz(W(n, 0), KH, 60, 10), satz(W(n, 3), KH, 60, 10))
  equal('S27 zweimal pro Woche: Do Woche 3 -> 2', stillstandWochen(e(zweimal), W(3, 3)), 2)
  equal('S27 zweimal pro Woche: Mo Woche 4 -> 3', stillstandWochen(e(zweimal), W(4, 0)), 3)
  // Urlaub in Woche 2: die Woche ohne Training zaehlt nicht.
  const urlaub = [satz(W(0), KH, 60, 10), satz(W(1), KH, 60, 10), satz(W(3), KH, 60, 10), satz(W(4), KH, 60, 10)]
  equal('S27 Urlaubswoche zaehlt nicht (Woche 4 laeuft)', stillstandWochen(e(urlaub), W(4, 3)), 2)
  equal('S27 nach Urlaub erst in Woche 5', erinnere(urlaub, { heute: W(5) }), { faellig: true, grund: 'stillstand', wochen: 3 })
  // Sonntag/Montag: Woche endet am Sonntag.
  const sonntag = [satz(W(0, 6), KH, 60, 10), satz(W(1, 0), KH, 60, 10)]
  equal('S27 Steigerung Sonntag, Training Montag: Woche 1 laeuft noch', stillstandWochen(e(sonntag), W(1, 6)), 0)
  equal('S27 Montag danach ist Woche 1 voll', stillstandWochen(e(sonntag), W(2, 0)), 1)
  // Jahreswechsel: Steigerung Mi 25.12.2030, Wochen 30.12., 06.01., 13.01.
  const jahr = ['2030-12-25', '2031-01-01', '2031-01-08', '2031-01-15'].map(d => satz(d, KH, 60, 10))
  equal('S27 ueber den Jahreswechsel', stillstandWochen(e(jahr), '2031-01-20'), 3)
  equal('S27 Sonntag davor noch 2', stillstandWochen(e(jahr), '2031-01-19'), 2)
  // Randfaelle: nichts, heute vor den Daten (Geraeteuhr falsch)
  equal('S27 keine Einheiten', stillstandWochen([], W(4)), 0)
  equal('S27 ohne Liste', stillstandWochen(undefined, W(4)), 0)
  equal('S27 heute vor den Daten', stillstandWochen(e(urlaub), W(-3)), 0)
}

if (failures.length) {
  console.log(`steigerung-test: ${failures.length} rot, ${passed} gruen`)
  for (const f of failures) console.log('  ROT: ' + f)
  process.exitCode = 1
} else {
  console.log(`steigerung-test: alle ${passed} Faelle gruen`)
}
