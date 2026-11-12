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
  quickLogFolge,
  rueckgaengigSchritt,
  ausgelasseneAusLog,
  mitAusgelassenen,
  wirksamAusgelassen,
  auslassenAb,
  ohneSatz,
  satzStand,
  satzKurz,
  satzListeText,
  ausgelasseneEintraege
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
pruefe('user1 speichert Satz 1, user2 offen -> user2',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: 2, user2: 1 }))) ===
  JSON.stringify({ userId: 'user2', satz: 1 }))
pruefe('user2 fertig, user1 offen -> user1, naechster Satz',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: 3, user2: null }))) ===
  JSON.stringify({ userId: 'user1', satz: 3 }))
pruefe('user2 speichert, user1 hat Satz 2 offen -> user1',
  JSON.stringify(naechsterSchritt(['user1', 'user2'], 'user2', mit({ user1: 2, user2: null }))) ===
  JSON.stringify({ userId: 'user1', satz: 2 }))
pruefe('alle fertig -> null (Rad schliesst)',
  naechsterSchritt(['user1', 'user2'], 'user1', mit({ user1: null, user2: null })) === null)
pruefe('allein mit einem Satz je Uebung -> null wie bisher',
  naechsterSchritt(['user2'], 'user2', mit({ user2: null })) === null)
pruefe('drei Nutzer reihum ab dem aktuellen (user2 -> user3 vor user1)',
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

console.log('[saetze-test] Rueckgaengig nach dem Speichern:')
pruefe('Satz war neu: er verschwindet wieder', rueckgaengigSchritt(null).art === 'loeschen')
const zurueck = rueckgaengigSchritt({ weight: 57.5, reps: 10 })
pruefe('Satz war ueberschrieben: alter Wert kommt zurueck',
  zurueck.art === 'zuruecksetzen' && zurueck.weight === 57.5 && zurueck.reps === 10)
const nullKilo = rueckgaengigSchritt({ weight: 0, reps: 12 })
pruefe('0 kg (Koerpergewicht) ist ein echter Vorwert', nullKilo.art === 'zuruecksetzen' && nullKilo.weight === 0)

// --- Ausgelassene Saetze (v2.15.0) -------------------------------------------
console.log('[saetze-test] Ausgelassene Saetze am Trainings-Eintrag lesen:')
const logMit = (eintraege) => ({ id: 'log1', date: '2026-11-12', ausgelasseneSaetze: eintraege })
const log1 = logMit([{ exerciseId: 'ex1', userId: 'user1', saetze: [3] }])
pruefe('Satz 3 von user1 bei ex1', ausgelasseneAusLog(log1, 'ex1', 'user1').join(',') === '3')
pruefe('andere Person: nichts', ausgelasseneAusLog(log1, 'ex1', 'user2').length === 0)
pruefe('andere Uebung: nichts', ausgelasseneAusLog(log1, 'ex2', 'user1').length === 0)
pruefe('alter Eintrag ohne das Feld: nichts', ausgelasseneAusLog({ id: 'alt' }, 'ex1', 'user1').length === 0)
pruefe('kein Log: nichts', ausgelasseneAusLog(null, 'ex1', 'user1').length === 0)
pruefe('kaputtes Feld (kein Array): nichts, kein Absturz',
  ausgelasseneAusLog({ ausgelasseneSaetze: 'drei' }, 'ex1', 'user1').length === 0)
pruefe('ungueltige Nummern fliegen raus, Rest sortiert und einmalig',
  ausgelasseneAusLog(logMit([{ exerciseId: 'ex1', userId: 'user1', saetze: [3, 'x', 0, 2, 3, 2.5, -1] }]), 'ex1', 'user1').join(',') === '2,3')
pruefe('zwei Eintraege derselben Uebung werden zusammengelegt',
  ausgelasseneAusLog(logMit([
    { exerciseId: 'ex1', userId: 'user1', saetze: [3] },
    { exerciseId: 'ex1', userId: 'user1', saetze: [2] }
  ]), 'ex1', 'user1').join(',') === '2,3')

console.log('[saetze-test] Ausgelassene Saetze schreiben (frische Kopien):')
const alt = [{ exerciseId: 'ex1', userId: 'user1', saetze: [3] }, { exerciseId: 'ex2', userId: 'user1', saetze: [2, 3] }]
const neu1 = mitAusgelassenen(alt, 'ex1', 'user1', [2, 3])
pruefe('Eintrag wird ersetzt, der andere bleibt',
  neu1.length === 2 && ausgelasseneAusLog({ ausgelasseneSaetze: neu1 }, 'ex1', 'user1').join(',') === '2,3' &&
  ausgelasseneAusLog({ ausgelasseneSaetze: neu1 }, 'ex2', 'user1').join(',') === '2,3')
pruefe('Original bleibt unveraendert', alt[0].saetze.join(',') === '3')
pruefe('frische Arrays (nie dieselben Objekte wie vorher)', neu1.every(e => !alt.includes(e) && !alt.some(a => a.saetze === e.saetze)))
const neu2 = mitAusgelassenen(alt, 'ex1', 'user1', [])
pruefe('leere Liste entfernt den Eintrag ganz', neu2.length === 1 && neu2[0].exerciseId === 'ex2')
const neu3 = mitAusgelassenen(undefined, 'ex1', 'user2', [3])
pruefe('erster Eintrag an einem alten Log ohne Feld', neu3.length === 1 && neu3[0].userId === 'user2')
pruefe('Nummern werden auch beim Schreiben bereinigt',
  mitAusgelassenen([], 'ex1', 'user1', [3, 3, 2, 'x'])[0].saetze.join(',') === '2,3')

console.log('[saetze-test] Wirksam ausgelassen: ein gespeicherter Satz gewinnt immer:')
pruefe('Satz 3 ausgelassen, nicht gespeichert: bleibt ausgelassen',
  wirksamAusgelassen([3], [satz(1, 40, 10), satz(2, 40, 9)]).join(',') === '3')
pruefe('Satz 3 ausgelassen, dann doch gespeichert: gilt als gemacht',
  wirksamAusgelassen([3], [satz(1, 40, 10), satz(3, 40, 8)]).length === 0)
pruefe('Rueckgaengig nimmt den Satz wieder weg: wieder ausgelassen (Liste blieb stehen)',
  wirksamAusgelassen([3], [satz(1, 40, 10)]).join(',') === '3')

console.log('[saetze-test] Offener Satz mit ausgelassenen Saetzen:')
pruefe('Saetze 1-2 da, Satz 3 ausgelassen: nichts mehr offen',
  offenerSatz(3, [satz(1, 40, 10), satz(2, 40, 9)], [3]) === null)
pruefe('Satz 1 da, Satz 2 ausgelassen: Satz 3 ist offen',
  offenerSatz(3, [satz(1, 40, 10)], [2]) === 3)
pruefe('ohne Liste wie bisher', offenerSatz(3, [satz(1, 40, 10)]) === 2)

console.log('[saetze-test] "Auslassen" auf Satz n:')
pruefe('auf Satz 3 (1-2 gespeichert): nur Satz 3',
  auslassenAb(3, 3, [satz(1, 40, 10), satz(2, 40, 9)], []).join(',') === '3')
pruefe('auf Satz 2 (nur 1 gespeichert): Satz 2 UND 3 — wer auslaesst, hoert auf',
  auslassenAb(2, 3, [satz(1, 40, 10)], []).join(',') === '2,3')
pruefe('auf Satz 1 ohne Saetze: die ganze Uebung (1-3)', auslassenAb(1, 3, [], []).join(',') === '1,2,3')
pruefe('ein spaeterer, schon gespeicherter Satz bleibt unangetastet',
  auslassenAb(2, 3, [satz(1, 40, 10), satz(3, 40, 8)], []).join(',') === '2')
pruefe('schon ausgelassene Saetze kommen nicht doppelt',
  auslassenAb(2, 3, [satz(1, 40, 10)], [3]).join(',') === '2')
pruefe('gespeicherter Satz selbst: nichts zu tun', auslassenAb(2, 3, [satz(2, 40, 9)], []).length === 0)
pruefe('Satz ausserhalb der Saetze: nichts', auslassenAb(4, 3, [], []).length === 0)

console.log('[saetze-test] Wieder oeffnen:')
pruefe('Satz 3 aus [2,3] wieder oeffnen: [2]', ohneSatz([2, 3], 3).join(',') === '2')
pruefe('nicht enthalten: Liste bleibt', ohneSatz([2], 3).join(',') === '2')

console.log('[saetze-test] Stand fuer Karte und Sperrbildschirm:')
const st1 = satzStand(3, [satz(1, 40, 10), satz(2, 40, 9)], [3])
pruefe('2 gespeichert, 1 ausgelassen', st1.fertig === 2 && st1.ausgelassen === 1 && st1.slots === 3)
pruefe('Punkte je Position', st1.zustaende.join(',') === 'gespeichert,gespeichert,ausgelassen')
pruefe('erledigt = gespeichert + ausgelassen', st1.erledigt === 3)
const st2 = satzStand(3, [satz(1, 40, 10), satz(3, 40, 8)], [])
pruefe('Luecke steht an ihrer Stelle (nicht nach vorn gerueckt)',
  st2.zustaende.join(',') === 'gespeichert,offen,gespeichert')
const st3 = satzStand(3, [satz(1, 40, 10), satz(3, 40, 8)], [3])
pruefe('ausgelassen, aber doch gespeichert: zaehlt als gespeichert',
  st3.ausgelassen === 0 && st3.zustaende[2] === 'gespeichert')
pruefe('ausgelassene Nummer jenseits der Saetze zaehlt nicht', satzStand(2, [], [3]).ausgelassen === 0)
pruefe('ein Satz je Uebung: kein Stand (null)', satzStand(1, [], []) === null)

console.log('[saetze-test] Texte fuer Knopf und Meldung:')
pruefe('Knopf: ein Satz', satzKurz([3]) === 'Satz 3')
pruefe('Knopf: zwei aufeinander', satzKurz([2, 3]) === 'Satz 2–3')
pruefe('Knopf: drei aufeinander', satzKurz([1, 2, 3]) === 'Satz 1–3')
pruefe('Knopf: mit Luecke', satzKurz([2, 4]) === 'Satz 2+4')
pruefe('Meldung: ein Satz', satzListeText([3]) === 'Satz 3')
pruefe('Meldung: zwei', satzListeText([2, 3]) === 'Satz 2 und 3')
pruefe('Meldung: drei', satzListeText([1, 2, 3]) === 'Satz 1, 2 und 3')
pruefe('leer: leerer Text', satzKurz([]) === '' && satzListeText([]) === '')

console.log('[saetze-test] Ausgelassene Saetze fuer die History:')
const logsHist = [
  { id: 'a', date: '2026-11-10', ausgelasseneSaetze: [{ exerciseId: 'ex1', userId: 'user1', saetze: [3] }, { exerciseId: 'ex2', userId: 'user1', saetze: [2, 3] }] },
  { id: 'b', date: '2026-11-12', ausgelasseneSaetze: [{ exerciseId: 'ex1', userId: 'user1', saetze: [3] }] },
  { id: 'c', date: '2026-11-12' }
]
const setsHist = [
  { workoutLogId: 'a', exerciseId: 'ex1', userId: 'user1', setNumber: 1 },
  { workoutLogId: 'a', exerciseId: 'ex1', userId: 'user1', setNumber: 2 },
  { workoutLogId: 'b', exerciseId: 'ex1', userId: 'user1', setNumber: 1 },
  { workoutLogId: 'b', exerciseId: 'ex1', userId: 'user1', setNumber: 3 }
]
const hist = ausgelasseneEintraege(logsHist, setsHist)
pruefe('je Log, Uebung und Person ein Eintrag mit Datum', hist.length === 2 &&
  hist.some(e => e.logId === 'a' && e.exerciseId === 'ex1' && e.date === '2026-11-10' && e.saetze.join(',') === '3'))
pruefe('Uebung ganz ausgelassen (keine Saetze) bleibt sichtbar',
  hist.some(e => e.exerciseId === 'ex2' && e.saetze.join(',') === '2,3'))
pruefe('am 12.11. doch gespeichert: kein Eintrag', !hist.some(e => e.logId === 'b'))
pruefe('ohne Logs: leer', ausgelasseneEintraege(undefined, undefined).length === 0)

console.log('[saetze-test] Quick-Log ueberspringt ausgelassene Saetze:')
const f6 = quickLogFolge(3, [satz(1, 42, 10)], vorschlagJeSatz, [3])
pruefe('Satz 3 ausgelassen: nur noch Satz 2', f6.map(e => e.setNumber).join(',') === '2')
pruefe('alles gespeichert oder ausgelassen: leere Folge',
  quickLogFolge(3, [satz(1, 42, 10), satz(2, 42, 9)], vorschlagJeSatz, [3]).length === 0)

if (fehler > 0) {
  console.error(`[saetze-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[saetze-test] alles gruen')
}
