#!/usr/bin/env node
/*
 * Vertragstest fuer die Deload-Wochen (src/utils/deload.js, v2.18.0).
 *
 * Laeuft in Node ohne Browser und IndexedDB.
 * Aufruf (Windows PowerShell):  node .\scripts\deload-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import {
  DELOAD_ABSTAND,
  deloadSchluessel,
  leseDeloadSchluessel,
  istMontag,
  deloadWochenAusMeta,
  wochenAbstand,
  istDeloadTag,
  deloadStatus,
  istErinnerung,
  deloadZeile,
  wochenFenster,
  wochenSpanne,
  zielWert,
  letzteEinheit
} from '../src/utils/deload.js'
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

// Gabriels Beispiel: heute Sonntag 22.11.2026 = KW 47. KW 40 beginnt am
// 28.09.2026, KW 49 am 30.11.2026.
const KW = (n) => addDaysToDate('2025-12-29', 7 * (n - 1)) // Montag der KW n 2026
const HEUTE = '2026-11-22'

// D0: Konstanten und Kalender
equal('D0 acht normale Wochen', DELOAD_ABSTAND, 8)
equal('D0 KW 40 = 28.09.', KW(40), '2026-09-28')
equal('D0 KW 49 = 30.11.', KW(49), '2026-11-30')

// D1: Schluessel
equal('D1 Schluessel', deloadSchluessel('user2', '2026-11-30'), 'deload_user2_2026-11-30')
equal('D1 lesen', leseDeloadSchluessel('deload_user2_2026-11-30'), { userId: 'user2', montag: '2026-11-30' })
equal('D1 kein Montag', leseDeloadSchluessel('deload_user2_2026-12-01'), null)
equal('D1 fremder Schluessel', leseDeloadSchluessel('saetze_user1'), null)
equal('D1 kaputtes Datum', leseDeloadSchluessel('deload_user1_2026-02-30'), null)
equal('D1 istMontag', [istMontag('2026-11-30'), istMontag('2026-11-29'), istMontag('30.11.2026'), istMontag(null)], [true, false, false, false])

// D2: Aus db.meta lesen — nur true zaehlt, false heisst entfernt
{
  const { wochen, ungueltig } = deloadWochenAusMeta([
    { key: 'deload_user2_2026-11-30', value: true },
    { key: 'deload_user2_2026-09-28', value: true },
    { key: 'deload_user2_2026-10-05', value: false },
    { key: 'deload_user1_2026-10-12', value: true },
    { key: 'deload_user1_2026-10-13', value: true }, // kein Montag
    { key: 'deload_user3_2026-10-12', value: 'ja' }, // kein boolean
    { key: 'userName_user1', value: 'Eins' },
    null
  ])
  equal('D2 je Person sortiert', wochen, { user2: ['2026-09-28', '2026-11-30'], user1: ['2026-10-12'] })
  equal('D2 kaputte Eintraege gemeldet', ungueltig, ['deload_user1_2026-10-13', 'deload_user3_2026-10-12'])
  equal('D2 leer', deloadWochenAusMeta(undefined), { wochen: {}, ungueltig: [] })
}

// D3: Gabriels Beispiel — letzte KW 40, heute KW 47 -> naechste KW 49 in 2 Wochen
{
  const s = deloadStatus([KW(40)], HEUTE)
  equal('D3 normal', s.art, 'normal')
  equal('D3 naechste KW 49', s.naechste, KW(49))
  equal('D3 in 2 Wochen', s.wochenBis, 2)
  equal('D3 letzte vor 7 Wochen', s.wochenSeit, 7)
  equal('D3 acht normale Wochen dazwischen (KW 41-48)', wochenAbstand(KW(40), s.vorschlag) - 1, 8)
  equal('D3 Zeile', deloadZeile(s), { titel: 'Deload in 2 Wochen', info: 'KW 49 · letzte vor 7 Wochen (KW 40)' })
  equal('D3 keine Erinnerung', istErinnerung(s), false)
}

// D4: In KW 49 faellig (jeder Tag der Woche), danach ueberfaellig
{
  for (const tag of [0, 3, 6]) {
    equal(`D4 KW 49 Tag ${tag} faellig`, deloadStatus([KW(40)], addDaysToDate(KW(49), tag)).art, 'faellig')
  }
  const f = deloadStatus([KW(40)], KW(49))
  equal('D4 Zeile faellig', deloadZeile(f), { titel: 'Deload-Woche fällig', info: 'diese Woche (KW 49) · antippen zum Eintragen' })
  equal('D4 faerbt', istErinnerung(f), true)
  equal('D4 Sonntag davor noch normal', deloadStatus([KW(40)], addDaysToDate(KW(49), -1)).art, 'normal')
  const u = deloadStatus([KW(40)], addDaysToDate(KW(51), 2))
  equal('D4 KW 51 ueberfaellig seit 2 Wochen', [u.art, u.ueberfaellig], ['ueberfaellig', 2])
  equal('D4 Zeile ueberfaellig', deloadZeile(u), { titel: 'Deload seit 2 Wochen fällig', info: 'war für KW 49 vorgesehen' })
  equal('D4 eine Woche: Einzahl', deloadZeile(deloadStatus([KW(40)], KW(50))).titel, 'Deload seit 1 Woche fällig')
  equal('D4 ueberfaellig faerbt', istErinnerung(u), true)
}

// D5: Eingetragen -> laeuft; naechste 9 Wochen spaeter (ueber den Jahreswechsel)
{
  const s = deloadStatus([KW(40), KW(49)], addDaysToDate(KW(49), 2))
  equal('D5 laeuft', s.art, 'laeuft')
  equal('D5 naechste 01.02.2027 (KW 5)', s.naechste, '2027-02-01')
  equal('D5 Zeile', deloadZeile(s), { titel: 'Deload-Woche läuft', info: 'KW 49 · nächste KW 5 (ab 01.02.)' })
  equal('D5 laeuft faerbt nicht', istErinnerung(s), false)
  // Nach der Woche zaehlt der Rhythmus von KW 49 aus
  const danach = deloadStatus([KW(40), KW(49)], KW(50))
  equal('D5 danach normal, in 8 Wochen', [danach.art, danach.wochenBis, danach.letzte], ['normal', 8, KW(49)])
}

// D6: Manuell frueher eingetragen -> Rhythmus zaehlt neu
{
  const s = deloadStatus([KW(40), KW(46)], HEUTE)
  equal('D6 frueher gemacht: naechste = KW 46 + 9', s.naechste, addDaysToDate(KW(46), 63))
  equal('D6 normal', s.art, 'normal')
}

// D7: Im Voraus geplant -> ersetzt den Vorschlag, nie faellig
{
  const s = deloadStatus([KW(40), KW(52)], KW(49))
  equal('D7 geplant statt faellig', s.art, 'geplant')
  equal('D7 naechste KW 52 in 3 Wochen', [s.naechste, s.wochenBis], [KW(52), 3])
  equal('D7 Zeile', deloadZeile(s), { titel: 'Deload in 3 Wochen', info: 'KW 52 geplant · letzte vor 9 Wochen (KW 40)' })
  equal('D7 nicht faerben', istErinnerung(s), false)
  const nurGeplant = deloadStatus([KW(50)], HEUTE)
  equal('D7 ohne Vergangenheit, nur geplant', [nurGeplant.art, nurGeplant.letzte], ['geplant', null])
  equal('D7 Zeile ohne letzte', deloadZeile(nurGeplant).info, 'KW 50 geplant')
  // Laeuft und weitere schon geplant -> naechste = die geplante
  const beides = deloadStatus([KW(47), KW(52)], HEUTE)
  equal('D7 laeuft, naechste geplant', [beides.art, beides.naechste], ['laeuft', KW(52)])
}

// D8: Noch nichts eingetragen
{
  const s = deloadStatus([], HEUTE)
  equal('D8 leer', [s.art, s.naechste, s.letzte], ['leer', null, null])
  equal('D8 Zeile', deloadZeile(s), { titel: 'Noch keine Deload-Woche eingetragen', info: 'antippen und die erste Woche wählen' })
  equal('D8 undefined', deloadStatus(undefined, HEUTE).art, 'leer')
  equal('D8 kaputte Eintraege fallen weg', deloadStatus(['2026-11-24', 'x'], HEUTE).art, 'leer')
}

// D9: istDeloadTag fuer jeden Tag der Woche, Liste oder Set
{
  const w = [KW(49)]
  equal('D9 Montag', istDeloadTag(w, KW(49)), true)
  equal('D9 Sonntag', istDeloadTag(w, addDaysToDate(KW(49), 6)), true)
  equal('D9 Sonntag davor', istDeloadTag(w, addDaysToDate(KW(49), -1)), false)
  equal('D9 Montag danach', istDeloadTag(new Set(w), KW(50)), false)
  equal('D9 Set', istDeloadTag(new Set(w), addDaysToDate(KW(49), 3)), true)
  equal('D9 ohne Datum', istDeloadTag(w, null), false)
}

// D10: Wochen im Fenster und Spanne
{
  const f = wochenFenster(HEUTE, [KW(40), KW(49)], 4, 10)
  equal('D10 erste = KW 40 (extra), dann KW 43', f.slice(0, 2), [KW(40), KW(43)])
  equal('D10 letzte = KW 57 -> 2027 KW 4', f[f.length - 1], addDaysToDate(KW(47), 70))
  equal('D10 Anzahl 15 + 1 extra', f.length, 16)
  equal('D10 keine Doppelten', new Set(f).size, f.length)
  equal('D10 Spanne', wochenSpanne(KW(49)), '30.11.–06.12.')
}

// D11: Ein Tipp gilt fuer alle Ausgewaehlten gemeinsam
{
  equal('D11 keiner hat sie -> setzen', zielWert(['u1', 'u2'], () => false), true)
  equal('D11 einer hat sie -> fuer alle setzen', zielWert(['u1', 'u2'], id => id === 'u1'), true)
  equal('D11 alle haben sie -> entfernen', zielWert(['u1', 'u2'], () => true), false)
  equal('D11 niemand ausgewaehlt -> setzen', zielWert([], () => true), true)
}

// D12: Letzte Einheit — nach dem Deload zaehlt die Woche davor
{
  const s = (date, weight, setNumber = 1, workoutLogId = 'w' + date) => ({ date, weight, reps: 10, setNumber, workoutLogId })
  const vorher = [s(addDaysToDate(KW(48), 2), 60, 1), s(addDaysToDate(KW(48), 2), 60, 2)]
  const deload = [s(addDaysToDate(KW(49), 1), 40, 2), s(addDaysToDate(KW(49), 1), 40, 1)]
  const alle = [...deload, ...vorher]
  const nachher = { deloadWochen: [KW(49)], heute: addDaysToDate(KW(50), 1) }
  equal('D12 nach dem Deload: Werte von davor', letzteEinheit(alle, nachher).map(x => x.weight), [60, 60])
  equal('D12 Satznummern sortiert', letzteEinheit(alle, { deloadWochen: [KW(49)], heute: KW(50) }).map(x => x.setNumber), [1, 2])
  equal('D12 ohne Deload-Wissen: die leichten', letzteEinheit(alle, { heute: KW(50) }).map(x => x.weight), [40, 40])
  // In der Deload-Woche selbst zaehlt alles (zweites Training sieht das erste)
  equal('D12 in der Deload-Woche: letzte Einheit', letzteEinheit(alle, { deloadWochen: [KW(49)], heute: addDaysToDate(KW(49), 4) })[0].weight, 40)
  // Nur Deload-Saetze vorhanden -> die gelten doch (nie leer)
  equal('D12 nur Deload-Saetze', letzteEinheit(deload, nachher).length, 2)
  // Laufendes Training ausnehmen
  const heuteSatz = s(addDaysToDate(KW(50), 1), 61.25, 1, 'laufend')
  equal('D12 laufendes Training zaehlt nicht', letzteEinheit([...alle, heuteSatz], { ...nachher, ohneWorkoutLogId: 'laufend' })[0].weight, 60)
  equal('D12 nichts', letzteEinheit([], nachher), [])
  equal('D12 undefined', letzteEinheit(undefined), [])
  // Neuer Satz nach dem Deload ist wieder die letzte Einheit
  const neu = s(addDaysToDate(KW(50), 3), 61.25)
  equal('D12 nach neuem Training: das neue', letzteEinheit([...alle, neu], { deloadWochen: [KW(49)], heute: addDaysToDate(KW(50), 5) })[0].weight, 61.25)
}

if (failures.length) {
  console.log(`deload-test: ${failures.length} rot, ${passed} gruen`)
  for (const f of failures) console.log('  ROT: ' + f)
  process.exitCode = 1
} else {
  console.log(`deload-test: alle ${passed} Faelle gruen`)
}
