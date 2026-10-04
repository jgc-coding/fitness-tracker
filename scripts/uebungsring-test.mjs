// Vertragstest fuer den Schnellwechsel-Ring (src/utils/uebungsRing.js). Der
// Test ist der Vertrag: wer Ring-, Standard- oder Start-Regeln aendert,
// erweitert ZUERST diesen Test.
//
// Seit v2.10.0 wechseln alle Nutzer einer Karte GEMEINSAM (Gabriel
// 04.10.2026): vorher wechselte ein Wisch nur einen Nutzer, der andere blieb
// unbemerkt auf der alten Uebung stehen.
//
// Aufruf:  node ./scripts/uebungsring-test.mjs

import {
  ringFuer,
  aktiveUebungId,
  ringPosition,
  naechsteImRing,
  gemeinsamWeiter,
  fuerAlle,
  kartenStandard,
  startMitStandard,
  toggleStandard,
  wechselAnzeige
} from '../src/utils/uebungsRing.js'

let fehler = 0

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

// Ein Plan-Eintrag mit Ring: Basis "latzug", Alternativen "klimmzug"/"chinup"
const eintrag = {
  exerciseId: 'latzug',
  basisExerciseId: 'latzug',
  alternativen: ['klimmzug', 'chinup'],
  userExerciseIds: { user2: 'klimmzug' }
}
// Alt-Eintrag ohne alle neuen Felder (Bestand vor v2 bzw. Quick-Add)
const altEintrag = { exerciseId: 'bench' }

console.log('[uebungsring-test] Ring und aktive Uebung je Nutzer:')
pruefe('Ring = Basis + Alternativen', ringFuer(eintrag).join(',') === 'latzug,klimmzug,chinup')
pruefe('Ring ohne Basisfeld faellt auf exerciseId zurueck', ringFuer(altEintrag).join(',') === 'bench')
pruefe('Ring von null ist leer', ringFuer(null).length === 0)
pruefe('user2 hat seine Abweichung (klimmzug)', aktiveUebungId(eintrag, 'user2') === 'klimmzug')
pruefe('user1 ohne Abweichung folgt der Karte (latzug)', aktiveUebungId(eintrag, 'user1') === 'latzug')
pruefe('Alt-Eintrag ohne userExerciseIds folgt der Karte', aktiveUebungId(altEintrag, 'user1') === 'bench')
pruefe('Position: user1 auf 0, user2 auf 1',
  ringPosition(eintrag, 'user1') === 0 && ringPosition(eintrag, 'user2') === 1)

console.log('[uebungsring-test] Wechsel im Ring:')
pruefe('user1 vorwaerts -> klimmzug', naechsteImRing(eintrag, 'user1', 1) === 'klimmzug')
pruefe('user1 rueckwaerts -> chinup (Ring schliesst sich)', naechsteImRing(eintrag, 'user1', -1) === 'chinup')
pruefe('user2 vorwaerts -> chinup', naechsteImRing(eintrag, 'user2', 1) === 'chinup')
pruefe('ohne Alternativen kein Wechsel (null)', naechsteImRing(altEintrag, 'user1', 1) === null)
const getauscht = { ...eintrag, exerciseId: 'rudern', userExerciseIds: {} }
pruefe('nach freiem Tausch ausserhalb: Position -1', ringPosition(getauscht, 'user1') === -1)
pruefe('nach freiem Tausch fuehrt der naechste Schritt zur Basis', naechsteImRing(getauscht, 'user1', 1) === 'latzug')

// Wisch und Wechsel-Knopf: ALLE Nutzer zusammen, Ziel gemessen an der Uebung
// im Kartentitel (Kopf-Nutzer). Danach gibt es keine Abweichung mehr.
const ALLE = ['user1', 'user2', 'user3']
const fuerJeden = (e) => ALLE.map(u => aktiveUebungId(e, u)).join(',')

console.log('[uebungsring-test] Gemeinsamer Wechsel (alle Nutzer zusammen):')
const zusammen = { exerciseId: 'latzug', basisExerciseId: 'latzug', alternativen: ['klimmzug', 'chinup'] }
const w1 = gemeinsamWeiter(zusammen, 'user1', 1)
pruefe('Wisch vorwaerts: alle drei auf klimmzug', fuerJeden(w1) === 'klimmzug,klimmzug,klimmzug')
pruefe('Wisch rueckwaerts: alle drei auf chinup (Ring schliesst sich)',
  fuerJeden(gemeinsamWeiter(zusammen, 'user1', -1)) === 'chinup,chinup,chinup')
const w3 = gemeinsamWeiter(gemeinsamWeiter(w1, 'user2', 1), 'user3', 1)
pruefe('dreimal vorwaerts: alle wieder auf der Basis', fuerJeden(w3) === 'latzug,latzug,latzug')
pruefe('der Ring bleibt beim Wechsel erhalten', ringFuer(w1).join(',') === 'latzug,klimmzug,chinup')
pruefe('Original bleibt unveraendert', zusammen.exerciseId === 'latzug' && !('userExerciseIds' in zusammen))
pruefe('ohne Alternativen kein Wechsel (null)', gemeinsamWeiter(altEintrag, 'user1', 1) === null)
pruefe('null-Eintrag: kein Wechsel', gemeinsamWeiter(null, 'user1', 1) === null)
// Altbestand (laufendes Training von vor v2.10): user2 steht abweichend auf
// klimmzug. Der naechste Wisch vereinheitlicht — Ziel kommt vom Kopf-Nutzer.
const w4 = gemeinsamWeiter(eintrag, 'user1', 1)
pruefe('Altbestand mit Abweichung: Wisch bringt alle auf das Ziel des Titels',
  fuerJeden(w4) === 'klimmzug,klimmzug,klimmzug' && Object.keys(w4.userExerciseIds).length === 0)
pruefe('Altbestand, Titel = abweichender Nutzer: alle auf dessen naechste Uebung',
  fuerJeden(gemeinsamWeiter(eintrag, 'user2', 1)) === 'chinup,chinup,chinup')
pruefe('nach freiem Tausch fuehrt der gemeinsame Wechsel alle zur Basis',
  fuerJeden(gemeinsamWeiter(getauscht, 'user1', 1)) === 'latzug,latzug,latzug')
const ff = fuerAlle(eintrag, 'chinup')
pruefe('fuerAlle setzt die Karte und leert die Abweichungen',
  ff.exerciseId === 'chinup' && Object.keys(ff.userExerciseIds).length === 0 && fuerJeden(ff) === 'chinup,chinup,chinup')
pruefe('fuerAlle laesst das Original unveraendert', eintrag.userExerciseIds.user2 === 'klimmzug')

// Standard der Karte: der Stern gilt fuer alle. Gespeichert bleibt das Format
// { userId: exerciseId } (aeltere App-Versionen lesen es je Nutzer), darum
// schreibt der Stern denselben Wert fuer jeden Nutzer. Altbestand mit
// unterschiedlichen Werten: zuerst der bevorzugte Nutzer, dann die Reihenfolge.
console.log('[uebungsring-test] Standard der Karte (Stern, fuer alle):')
const ring2 = { exerciseId: 'latzug', basisExerciseId: 'latzug', alternativen: ['klimmzug', 'chinup'] }
pruefe('Stern eines anderen Nutzers gilt fuer die ganze Karte',
  kartenStandard({ ...ring2, bevorzugt: { user3: 'klimmzug' } }, ALLE) === 'klimmzug')
pruefe('unterschiedliche Sterne: der erste in der Reihenfolge gewinnt',
  kartenStandard({ ...ring2, bevorzugt: { user1: 'chinup', user2: 'klimmzug' } }, ['user2', 'user1', 'user3']) === 'klimmzug')
pruefe('Stern ausserhalb des Rings wirkt nicht, der naechste gilt',
  kartenStandard({ ...ring2, bevorzugt: { user1: 'geloeschte-uebung', user3: 'chinup' } }, ALLE) === 'chinup')
pruefe('unbekannte Nutzer-Kennung zaehlt nicht',
  kartenStandard({ ...ring2, bevorzugt: { user9: 'klimmzug' } }, ALLE) === null)
pruefe('ohne Stern kein Standard', kartenStandard(ring2, ALLE) === null && kartenStandard(altEintrag, ALLE) === null)

console.log('[uebungsring-test] Start eines Workouts (Plan-Eintrag):')
const s1 = startMitStandard({ exerciseId: 'latzug', alternativen: ['klimmzug'], bevorzugt: { user2: 'klimmzug' } }, ALLE)
pruefe('Start mit Standard: alle beginnen auf klimmzug', fuerJeden(s1) === 'klimmzug,klimmzug,klimmzug')
pruefe('Start mit Standard: die Basis bleibt die geplante Uebung', s1.basisExerciseId === 'latzug')
const s2 = startMitStandard({ exerciseId: 'latzug', basisExerciseId: 'latzug', alternativen: ['klimmzug'] }, ALLE)
pruefe('Start ohne Standard: alle auf der Basis, keine Abweichung',
  fuerJeden(s2) === 'latzug,latzug,latzug' && Object.keys(s2.userExerciseIds).length === 0)
const s3 = startMitStandard({ exerciseId: 'latzug', alternativen: ['klimmzug'], bevorzugt: { user1: 'latzug', user2: 'klimmzug' } }, ALLE)
pruefe('Stern auf der Basis beim Ersten in der Reihenfolge: Basis gewinnt', fuerJeden(s3) === 'latzug,latzug,latzug')

console.log('[uebungsring-test] Stern setzen und entfernen:')
const t1 = toggleStandard(ring2, ALLE, 'klimmzug', ALLE)
pruefe('setzen schreibt denselben Wert fuer jeden Nutzer',
  t1.user1 === 'klimmzug' && t1.user2 === 'klimmzug' && t1.user3 === 'klimmzug')
pruefe('erneuter Tipp auf dieselbe Uebung entfernt den Standard fuer alle',
  Object.keys(toggleStandard({ ...ring2, bevorzugt: t1 }, ALLE, 'klimmzug', ALLE)).length === 0)
const t3 = toggleStandard({ ...ring2, bevorzugt: { user3: 'chinup' } }, ALLE, 'klimmzug', ALLE)
pruefe('andere Uebung ersetzt einen alten Einzel-Stern fuer alle', ALLE.every(u => t3[u] === 'klimmzug'))
const altStern = { ...ring2, bevorzugt: { user3: 'klimmzug' } }
pruefe('alter Einzel-Stern auf der aktuellen Uebung: Tipp entfernt ihn',
  Object.keys(toggleStandard(altStern, ALLE, 'klimmzug', ALLE)).length === 0)
pruefe('Original bleibt unveraendert (frische Kopie)', altStern.bevorzugt.user3 === 'klimmzug')

// Wechsel-Knopf (v2.4.0, Gabriel 26.09.2026): der Knopf nennt das ZIEL eines
// Tipps, nicht die aktuelle Uebung — die steht schon im Kartentitel. Seit
// v2.10.0 gibt es ihn einmal je Karte (Ziel des Kopf-Nutzers); die eigene
// Uebung eines Nutzers erscheint nur noch bei Altbestand, der vom Titel abweicht.
console.log('[uebungsring-test] Anzeige der Wechsel-Zeile:')
const a1 = wechselAnzeige(eintrag, 'user1', 'user1')
pruefe('Titel-Nutzer auf der Basis: Knopf nennt die naechste Uebung', a1.ziel === 'klimmzug')
pruefe('Titel-Nutzer: keine eigene Zeile (steht im Titel)', a1.eigene === null)
const a2 = wechselAnzeige(eintrag, 'user2', 'user1')
pruefe('abweichender Nutzer: Knopf nennt sein naechstes Ziel', a2.ziel === 'chinup')
pruefe('abweichender Nutzer: seine eigene Uebung wird genannt', a2.eigene === 'klimmzug')
const a3 = wechselAnzeige(eintrag, 'user2', 'user2')
pruefe('ist er selbst der Titel-Nutzer, entfaellt die eigene Zeile', a3.eigene === null && a3.ziel === 'chinup')
const zweier = { exerciseId: 'latzug', basisExerciseId: 'latzug', alternativen: ['klimmzug'], userExerciseIds: { user2: 'klimmzug' } }
const a4 = wechselAnzeige(zweier, 'user2', 'user1')
pruefe('Zweier-Ring: vom Wechsel zurueck zur Titel-Uebung', a4.ziel === 'latzug' && a4.eigene === 'klimmzug')
pruefe('Zweier-Ring: Titel-Nutzer sieht die Alternative', wechselAnzeige(zweier, 'user1', 'user1').ziel === 'klimmzug')
const a5 = wechselAnzeige(altEintrag, 'user1', 'user1')
pruefe('ohne Alternativen: kein Ziel, keine eigene Zeile', a5.ziel === null && a5.eigene === null)
pruefe('null-Eintrag bleibt leer', wechselAnzeige(null, 'user1', 'user1').ziel === null)

if (fehler > 0) {
  console.error(`[uebungsring-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[uebungsring-test] alles gruen')
}
