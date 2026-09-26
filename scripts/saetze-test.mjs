// Vertragstest fuer die Saetze je Uebung und Nutzer (src/utils/saetze.js).
// Der Test ist der Vertrag: wer Regeln fuer Satzzahl, offene Saetze,
// Vorbelegung, Rad-Reihenfolge oder Quick-Log aendert, erweitert ZUERST
// diesen Test.
//
// Aufruf:  node ./scripts/saetze-test.mjs

import {
  SATZZAHL_MAX,
  satzZahlGueltig,
  satzSlots,
  offenerSatz,
  gespeicherteSaetze,
  letzterSatz,
  satzAusEinheit,
  vorschlagsSatz,
  vorbelegung,
  naechsterSchritt,
  quickLogFolge
} from '../src/utils/saetze.js'

let fehler = 0

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

// Kurzform fuer einen gespeicherten Satz (setLog)
const satz = (setNumber, weight, reps, createdAt = '2026-09-26T10:00:00.000Z') =>
  ({ setNumber, weight, reps, createdAt })

console.log('[saetze-test] Einstellung "Saetze je Uebung":')
pruefe('Obergrenze ist 5', SATZZAHL_MAX === 5)
pruefe('3 ist gueltig', satzZahlGueltig(3) === 3)
pruefe('1 ist gueltig (Referenzwert wie bis v2.3)', satzZahlGueltig(1) === 1)
pruefe('Text "3" wird als Zahl gelesen', satzZahlGueltig('3') === 3)
pruefe('0 ist ungueltig', satzZahlGueltig(0) === null)
pruefe('6 ist ungueltig', satzZahlGueltig(6) === null)
pruefe('2.5 ist ungueltig', satzZahlGueltig(2.5) === null)
pruefe('fehlender Wert ist ungueltig (Aufrufer nimmt 1)', satzZahlGueltig(undefined) === null)
pruefe('null ist ungueltig', satzZahlGueltig(null) === null)
pruefe('Text ist ungueltig', satzZahlGueltig('drei') === null)

console.log('[saetze-test] Anzahl Saetze und offener Satz:')
pruefe('ohne Saetze heute: eingestellte Zahl', satzSlots(3, []) === 3)
pruefe('Referenzwert-Nutzer: 1', satzSlots(1, [satz(1, 50, 8)]) === 1)
pruefe('gespeicherter Satz 3 bei Einstellung 1 wird nie versteckt', satzSlots(1, [satz(3, 50, 8)]) === 3)
pruefe('Saetze 1-2 bei Einstellung 3: 3', satzSlots(3, [satz(1, 40, 10), satz(2, 40, 9)]) === 3)
pruefe('erster offener Satz ohne Saetze: 1', offenerSatz(3, []) === 1)
pruefe('nach Satz 1 und 2: Satz 3', offenerSatz(3, [satz(1, 40, 10), satz(2, 40, 9)]) === 3)
pruefe('Luecke wird zuerst gefuellt (1 und 3 da -> 2)', offenerSatz(3, [satz(1, 40, 10), satz(3, 40, 8)]) === 2)
pruefe('alles gespeichert: null', offenerSatz(1, [satz(1, 50, 8)]) === null)
pruefe('Punkte: zwei von drei gespeichert', gespeicherteSaetze(3, [satz(1, 40, 10), satz(2, 40, 9)]) === 2)
pruefe('Punkte: doppelter Satz zaehlt einmal',
  gespeicherteSaetze(3, [satz(1, 40, 10), satz(1, 41, 10, '2026-09-26T11:00:00.000Z')]) === 1)

console.log('[saetze-test] Saetze der letzten Einheit:')
const letzte = [satz(1, 40, 10), satz(2, 40, 10), satz(3, 37.5, 12)]
pruefe('letzter Satz = hoechste Satznummer', letzterSatz(letzte).setNumber === 3)
pruefe('letzter Satz ohne Daten: null', letzterSatz([]) === null)
const doppelt = [satz(1, 50, 8, '2026-09-20T10:00:00.000Z'), satz(1, 52.5, 6, '2026-09-20T18:00:00.000Z')]
pruefe('gleiche Satznummer: der spaeter eingetragene gewinnt', letzterSatz(doppelt).weight === 52.5)
pruefe('Satz 2 der letzten Einheit', satzAusEinheit(letzte, 2).weight === 40 && satzAusEinheit(letzte, 2).reps === 10)
pruefe('Satz 4 fehlt letztes Mal -> hoechster Satz davor (3)', satzAusEinheit(letzte, 4).setNumber === 3)
pruefe('nur Satz 2 da, Satz 1 gesucht -> der niedrigste danach',
  satzAusEinheit([satz(2, 45, 9)], 1).setNumber === 2)
pruefe('gleiche Satznummer doppelt: der neueste', satzAusEinheit(doppelt, 1).weight === 52.5)
pruefe('ohne Daten: null', satzAusEinheit([], 1) === null)

console.log('[saetze-test] Vorschlag fuer die Karte (Satz 1 bzw. Referenzwert):')
pruefe('ein Satz je Uebung: der zuletzt eingetragene (Verhalten bis v2.3)',
  vorschlagsSatz(letzte, 1).setNumber === 3)
pruefe('mehrere Saetze: Satz 1 der letzten Einheit', vorschlagsSatz(letzte, 3).setNumber === 1)
pruefe('ohne Daten: null', vorschlagsSatz([], 3) === null)

console.log('[saetze-test] Vorbelegung des Rads (Gewicht UND Wdh aus einem Satz):')
const heute = [satz(1, 42, 10), satz(2, 42, 9)]
const vorschlag3 = { weight: 40, reps: 12 }
const v1 = vorbelegung(heute, 2, vorschlag3)
pruefe('schon gespeicherter Satz: seine Werte (Korrektur)', v1.quelle === 'heute' && v1.weight === 42 && v1.reps === 9)
const v2 = vorbelegung(heute, 3, vorschlag3)
pruefe('offener Satz nach Satz 2: Werte von Satz 2', v2.quelle === 'davor' && v2.weight === 42 && v2.reps === 9)
const v3 = vorbelegung([], 1, vorschlag3)
pruefe('erster Satz ohne heutige Saetze: Vorschlag', v3.quelle === 'vorschlag' && v3.weight === 40 && v3.reps === 12)
pruefe('ohne Vorschlag und ohne Saetze: null (Aufrufer nimmt 20 x 10)', vorbelegung([], 1, null) === null)
const v4 = vorbelegung([satz(2, 45, 8)], 1, vorschlag3)
pruefe('Satz 2 gespeichert, Satz 1 offen: Vorschlag, nicht Satz 2', v4.quelle === 'vorschlag' && v4.weight === 40)
const gemischt = [satz(1, 50, 10), satz(2, 52.5, 8)]
const v5 = vorbelegung(gemischt, 3, null)
pruefe('Paar bleibt zusammen: 52.5 mit 8 Wdh, nie gemischt', v5.weight === 52.5 && v5.reps === 8)

console.log('[saetze-test] Wohin das Rad nach dem Speichern springt:')
// offen: Nutzer -> naechster offener Satz (null = fertig)
const mit = (offen) => (id) => (id in offen ? offen[id] : null)
pruefe('Lisa speichert Satz 1, Gab offen -> Gab',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: 2, user2: 1 }))) ===
  JSON.stringify({ userId: 'user2', satz: 1 }))
pruefe('Gab fertig, Lisa offen -> Lisa, naechster Satz',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: 3, user2: null }))) ===
  JSON.stringify({ userId: 'user1', satz: 3 }))
pruefe('Gab speichert, Lisa hat Satz 2 offen -> Lisa',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user2', mit({ user1: 2, user2: null }))) ===
  JSON.stringify({ userId: 'user1', satz: 2 }))
pruefe('alle fertig -> null (Rad schliesst)',
  naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: null, user2: null })) === null)
pruefe('allein mit einem Satz je Uebung -> null wie bisher',
  naechsterSchritt(['user2'], 'user2', mit({ user2: null })) === null)
pruefe('drei Nutzer reihum ab dem aktuellen (Gab -> Ben vor Lisa)',
  naechsterSchritt(['user1', 'user2', 'user3'], 'user2', mit({ user1: 1, user2: null, user3: 1 })).userId === 'user3')
pruefe('aktueller Nutzer nicht (mehr) aktiv: erster offener',
  naechsterSchritt(['user1', 'user2'], 'user3', mit({ user1: null, user2: 1 })).userId === 'user2')

console.log('[saetze-test] Quick-Log-Folge fuer den Sperrbildschirm:')
const vorschlagJeSatz = (n) => ({ weight: 40 + n, reps: 10 })
const f1 = quickLogFolge(3, [satz(1, 42, 10)], vorschlagJeSatz)
pruefe('Satz 1 gespeichert: Folge ist Satz 2 und 3', f1.map(e => e.setNumber).join(',') === '2,3')
pruefe('Satz 2 startet mit den Werten von Satz 1', f1[0].weight === 42 && f1[0].reps === 10)
pruefe('Satz 3 startet mit Satz 2 (als waere er eingetragen)', f1[1].weight === 42)
const f2 = quickLogFolge(3, [], vorschlagJeSatz)
pruefe('nichts gespeichert: Satz 1 aus dem Vorschlag', f2[0].setNumber === 1 && f2[0].weight === 41)
pruefe('... Satz 2 folgt Satz 1', f2[1].weight === 41)
const f3 = quickLogFolge(1, [], () => ({ weight: 55, reps: 8 }))
pruefe('ein Satz je Uebung: genau ein Eintrag mit Satznummer 1',
  f3.length === 1 && f3[0].setNumber === 1 && f3[0].weight === 55 && f3[0].reps === 8)
pruefe('ein Satz je Uebung, schon gespeichert: leere Folge', quickLogFolge(1, [satz(1, 55, 8)], () => null).length === 0)
const f4 = quickLogFolge(2, [], () => null)
pruefe('ohne jeden Vorschlag: Standard 20 kg x 10 wie bisher', f4[0].weight === 20 && f4[0].reps === 10)
const f5 = quickLogFolge(3, [satz(2, 45, 8)], vorschlagJeSatz)
pruefe('Luecke: Satz 1 aus dem Vorschlag, dann Satz 3 nach Satz 2',
  f5.map(e => e.setNumber).join(',') === '1,3' && f5[0].weight === 41 && f5[1].weight === 45)

if (fehler > 0) {
  console.error(`[saetze-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[saetze-test] alles gruen')
}
