// Vertragstest fuer den Schnellwechsel-Ring mit Standard-Uebung je Nutzer
// (src/utils/uebungsRing.js). Der Test ist der Vertrag: wer Ring-, Standard-
// oder Vorbelegungs-Regeln aendert, erweitert ZUERST diesen Test.
//
// Aufruf:  node ./scripts/uebungsring-test.mjs

import {
  ringFuer,
  aktiveUebungId,
  ringPosition,
  naechsteImRing,
  mitNutzerUebung,
  vorbelegungAusBevorzugt,
  toggleBevorzugt
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

console.log('[uebungsring-test] Nutzer-Uebung setzen (frische Kopien):')
const gesetzt = mitNutzerUebung(eintrag, 'user1', 'chinup')
pruefe('setzen legt die Abweichung an', aktiveUebungId(gesetzt, 'user1') === 'chinup')
pruefe('andere Nutzer bleiben unberuehrt', aktiveUebungId(gesetzt, 'user2') === 'klimmzug')
pruefe('Original bleibt unveraendert', aktiveUebungId(eintrag, 'user1') === 'latzug')
pruefe('userExerciseIds ist eine frische Kopie', gesetzt.userExerciseIds !== eintrag.userExerciseIds)
const zurueck = mitNutzerUebung(gesetzt, 'user1', 'latzug')
pruefe('zurueck zur Karten-Uebung entfernt die Abweichung',
  !('user1' in zurueck.userExerciseIds) && aktiveUebungId(zurueck, 'user1') === 'latzug')

console.log('[uebungsring-test] Vorbelegung aus dem Plan (bevorzugt):')
const planEintrag = {
  exerciseId: 'latzug',
  basisExerciseId: 'latzug',
  alternativen: ['klimmzug'],
  bevorzugt: { user1: 'latzug', user2: 'klimmzug', user3: 'geloeschte-uebung' }
}
const vorbelegt = vorbelegungAusBevorzugt(planEintrag)
pruefe('Standard = Basis erzeugt keine Abweichung', !('user1' in vorbelegt))
pruefe('Standard = Alternative wird vorbelegt', vorbelegt.user2 === 'klimmzug')
pruefe('verwaister Standard (nicht im Ring) wirkt nicht', !('user3' in vorbelegt))
pruefe('Eintrag ohne bevorzugt ergibt leeres Objekt',
  Object.keys(vorbelegungAusBevorzugt(altEintrag)).length === 0)

console.log('[uebungsring-test] Standard merken (Toggle):')
const b1 = toggleBevorzugt({}, 'user1', 'klimmzug')
pruefe('setzen', b1.user1 === 'klimmzug')
const b2 = toggleBevorzugt(b1, 'user1', 'klimmzug')
pruefe('dieselbe Uebung erneut entfernt den Standard', !('user1' in b2))
const b3 = toggleBevorzugt(b1, 'user1', 'latzug')
pruefe('andere Uebung ersetzt den Standard', b3.user1 === 'latzug')
const original = { user2: 'x' }
toggleBevorzugt(original, 'user2', 'y')
pruefe('Original bleibt unveraendert (frische Kopie)', original.user2 === 'x')

if (fehler > 0) {
  console.error(`[uebungsring-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[uebungsring-test] alles gruen')
}
