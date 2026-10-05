// Vertragstest fuer das Umsortieren der Uebungen und der Trainingstage in der
// Planung (src/utils/planReihenfolge.js). Der Test ist der Vertrag: wer Regeln fuer
// Zielplatz, Verschieben oder Platzmachen aendert, erweitert ZUERST diesen Test.
//
// Bedienung (Gabriel 27.09.2026): lange auf eine Uebung druecken, mit dem
// Finger nach oben oder unten ziehen, loslassen. Die Alternativen haengen am
// Eintrag und wandern mit.
//
// Aufruf:  node ./scripts/planreihenfolge-test.mjs

import {
  verschiebe, zielIndex, versatz, sortiereTage, neueTagesPlaetze, naechsterTagesPlatz
} from '../src/utils/planReihenfolge.js'

let fehler = 0

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

const liste = [
  { exerciseId: 'a', sets: 2 },
  { exerciseId: 'b', sets: 3, alternativen: ['x', 'y'], bevorzugt: { user3: 'x' } },
  { exerciseId: 'c', sets: 2 },
  { exerciseId: 'd', sets: 4, notes: 'neu' }
]
const ids = (l) => l.map(e => e.exerciseId).join('')

console.log('[planreihenfolge-test] Verschieben:')
pruefe('letzte nach oben an Platz 1', ids(verschiebe(liste, 3, 0)) === 'dabc')
pruefe('erste nach unten ans Ende', ids(verschiebe(liste, 0, 3)) === 'bcda')
pruefe('eins nach oben', ids(verschiebe(liste, 2, 1)) === 'acbd')
pruefe('eins nach unten', ids(verschiebe(liste, 1, 2)) === 'acbd')
pruefe('gleicher Platz: Reihenfolge bleibt', ids(verschiebe(liste, 2, 2)) === 'abcd')
pruefe('Eingabe bleibt unveraendert', ids(liste) === 'abcd')
const mitAlt = verschiebe(liste, 1, 3)
pruefe('Alternativen, Standard, Saetze und Notiz wandern mit',
  mitAlt[3].exerciseId === 'b' && mitAlt[3].alternativen.join(',') === 'x,y' &&
  mitAlt[3].bevorzugt.user3 === 'x' && mitAlt[3].sets === 3 && mitAlt[0].exerciseId === 'a' &&
  verschiebe(liste, 3, 0)[0].notes === 'neu')
pruefe('kein Eintrag geht verloren oder kommt doppelt', verschiebe(liste, 0, 2).length === 4 &&
  new Set(verschiebe(liste, 0, 2).map(e => e.exerciseId)).size === 4)
pruefe('Zielplatz ausserhalb wird an den Rand geklemmt', ids(verschiebe(liste, 1, 99)) === 'acdb' &&
  ids(verschiebe(liste, 2, -5)) === 'cabd')
pruefe('unbekannter Startplatz: Liste unveraendert', ids(verschiebe(liste, 7, 0)) === 'abcd')

// Vier Gruppen, 50 px hoch, Mitten bei 25/75/125/175 (Gruppe 2 mit
// Alternativen waere hoeher — zielIndex arbeitet mit den gemessenen Mitten)
const mitten = [25, 75, 125, 175]

console.log('[planreihenfolge-test] Zielplatz beim Ziehen:')
pruefe('ohne Bewegung bleibt der Platz', zielIndex(mitten, 125, 2) === 2)
pruefe('ueber die Mitte des Nachbarn oben -> ein Platz hoeher', zielIndex(mitten, 70, 2) === 1)
pruefe('knapp vor der Mitte des Nachbarn -> noch kein Wechsel', zielIndex(mitten, 80, 2) === 2)
pruefe('ganz nach oben gezogen -> Platz 0', zielIndex(mitten, -300, 2) === 0)
pruefe('ueber die Mitte des Nachbarn unten -> ein Platz tiefer', zielIndex(mitten, 180, 2) === 3)
pruefe('ganz nach unten gezogen -> letzter Platz', zielIndex(mitten, 900, 0) === 3)
pruefe('erste Gruppe ueber die zweite -> Platz 1', zielIndex(mitten, 80, 0) === 1)

console.log('[planreihenfolge-test] Platz machen (Versatz der anderen Gruppen):')
pruefe('nach oben ziehen: die uebersprungenen ruecken nach unten',
  versatz(1, 3, 1, 50) === 50 && versatz(2, 3, 1, 50) === 50 && versatz(0, 3, 1, 50) === 0)
pruefe('nach unten ziehen: die uebersprungenen ruecken nach oben',
  versatz(1, 0, 2, 50) === -50 && versatz(2, 0, 2, 50) === -50 && versatz(3, 0, 2, 50) === 0)
pruefe('ohne Platzwechsel ruckt niemand', [0, 1, 3].every(i => versatz(i, 2, 2, 50) === 0))
pruefe('die gezogene Gruppe selbst bekommt keinen Versatz (sie folgt dem Finger)', versatz(2, 2, 0, 50) === 0)

// --- Trainingstage (Gabriel 05.10.2026) --------------------------------------
// Reihenfolge der Tage eines Plans (bzw. einer Woche A/B): `dayOrder` am Tag.
// Sie gilt in der Planung UND auf dem Startbildschirm (getDaysForPlan).
// Umsortiert wird in einem eigenen Fenster; nach jedem Verschieben bekommen
// die Tage die Plaetze 0..n-1, geschrieben werden nur die geaenderten.
const tag = (id, dayOrder, createdAt = '2026-09-01T10:00:00.000Z') => ({ id, dayOrder, createdAt })
const tagIds = (l) => l.map(d => d.id).join('')

console.log('[planreihenfolge-test] Trainingstage ordnen:')
pruefe('nach Platz sortiert', tagIds(sortiereTage([tag('c', 2), tag('a', 0), tag('b', 1)])) === 'abc')
pruefe('Luecken nach dem Loeschen stoeren nicht', tagIds(sortiereTage([tag('c', 5), tag('a', 1), tag('b', 3)])) === 'abc')
// V16: Tag geloescht, neuer angelegt -> zwei Tage mit demselben Platz. Ohne
// feste Regel hing ihre Reihenfolge davon ab, wie die Datenbank sie liefert,
// und konnte nach einem Neustart springen.
pruefe('gleicher Platz: der aeltere Tag zuerst, egal in welcher Reihenfolge geliefert',
  tagIds(sortiereTage([tag('n', 2, '2026-10-01T00:00:00.000Z'), tag('a', 1), tag('b', 2)])) === 'abn' &&
  tagIds(sortiereTage([tag('b', 2), tag('a', 1), tag('n', 2, '2026-10-01T00:00:00.000Z')])) === 'abn')
pruefe('gleicher Platz und gleiche Zeit: nach Kennung, also immer gleich',
  tagIds(sortiereTage([tag('y', 0), tag('x', 0)])) === 'xy' && tagIds(sortiereTage([tag('x', 0), tag('y', 0)])) === 'xy')
pruefe('Tag ohne Platz steht am Ende statt die Sortierung zu zerreissen',
  tagIds(sortiereTage([tag('z', undefined), tag('b', 1), tag('a', 0)])) === 'abz')
const ungeordnet = [tag('c', 2), tag('a', 0), tag('b', 1)]
sortiereTage(ungeordnet)
pruefe('Eingabe bleibt unveraendert', tagIds(ungeordnet) === 'cab')

const plaetze = (l) => l.map(p => `${p.id}${p.dayOrder}`).join(' ')
const vier = [tag('a', 0), tag('b', 1), tag('c', 2), tag('d', 3)]

console.log('[planreihenfolge-test] Trainingstage verschieben:')
pruefe('letzter nach oben: alle bekommen neue Plaetze', plaetze(neueTagesPlaetze(vier, 3, 0)) === 'd0 a1 b2 c3')
pruefe('zwei Nachbarn tauschen: nur diese beiden werden geschrieben', plaetze(neueTagesPlaetze(vier, 1, 2)) === 'c1 b2')
pruefe('gleicher Platz: nichts zu schreiben', neueTagesPlaetze(vier, 2, 2).length === 0)
pruefe('Zielplatz ausserhalb wird an den Rand geklemmt', plaetze(neueTagesPlaetze(vier, 0, 99)) === 'b0 c1 d2 a3')
pruefe('Luecken werden beim Verschieben zu 0..n-1',
  plaetze(neueTagesPlaetze([tag('a', 1), tag('b', 4), tag('c', 7)], 2, 1)) === 'a0 c1 b2')
pruefe('V16: neuer Tag mit doppeltem Platz nach oben -> eindeutige Plaetze, Unveraenderte bleiben ungeschrieben',
  plaetze(neueTagesPlaetze(sortiereTage([tag('a', 1), tag('b', 2), tag('n', 2, '2026-10-01T00:00:00.000Z')]), 2, 0)) === 'n0')
pruefe('nur Kennung und Platz, keine Uebungslisten (kein Vue-Proxy nach Dexie)',
  neueTagesPlaetze([{ ...tag('a', 0), exercises: [{ exerciseId: 'x' }] }, tag('b', 1)], 0, 1)
    .every(p => Object.keys(p).join(',') === 'id,dayOrder'))

console.log('[planreihenfolge-test] Platz fuer einen neuen Tag:')
pruefe('erster Tag eines Plans -> Platz 0', naechsterTagesPlatz([]) === 0)
pruefe('hinter dem letzten Tag', naechsterTagesPlatz(vier) === 4)
pruefe('V16: nach dem Loeschen nicht auf einen belegten Platz',
  naechsterTagesPlatz([tag('b', 1), tag('c', 2)]) === 3)
pruefe('Tage ohne Platz zaehlen nicht', naechsterTagesPlatz([tag('a', 0), tag('z', undefined)]) === 1)

if (fehler > 0) {
  console.error(`\n[planreihenfolge-test] ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('\n[planreihenfolge-test] alle Pruefungen bestanden')
}
