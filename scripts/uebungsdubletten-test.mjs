// Vertragstest fuer das Zusammenfuehren doppelter Uebungen
// (src/utils/uebungsDubletten.js). Der Test ist der Vertrag: wer Regeln fuer
// Dubletten, Umbiegen oder Konflikte aendert, erweitert ZUERST diesen Test.
//
// Anlass (27.09.2026): "Standard-Uebungen laden" auf einem Handy, das die
// Cloud-Daten noch nicht hatte, legte alle 36 Standard-Uebungen ein zweites
// Mal an. Plaene zeigten danach teils auf das Original, teils auf die Kopie.
//
// Aufruf:  node ./scripts/uebungsdubletten-test.mjs

import {
  dublettenSchluessel,
  findeDubletten,
  ersetzeIds,
  findeIds,
  planeZusammenfuehrung,
  namensbild,
  vergleicheNamensbilder
} from '../src/utils/uebungsDubletten.js'

let fehler = 0

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

const JETZT = '2026-09-27T20:00:00.000Z'
const ALT = '2026-04-11T15:02:46.123Z'
const NEU = '2026-09-27T13:39:09.823Z'

// Bestand wie in der Cloud: Original (alt, mit Verlauf) und Kopie (neu)
function uebung(id, name, createdAt, extra = {}) {
  return { id, name, muscleGroup: 'chest', equipment: 'barbell', notes: '', imageKey: null, createdAt, updatedAt: createdAt, ...extra }
}
const bench = uebung('bench', 'BB Bench press', ALT, { imageKey: 'bench-press', lastUsedAt: '2026-09-05T12:00:00.000Z', notes: 'Bank 3' })
const benchKopie = uebung('benchK', 'BB Bench press', NEU, { imageKey: 'bench-press' })
const fly = uebung('fly', 'Butterfly reverse', '2026-09-05T12:27:37.289Z', { muscleGroup: 'shoulders', equipment: 'machine_cable' })
const flyKopie = uebung('flyK', 'Butterfly reverse', NEU, { muscleGroup: 'shoulders', equipment: 'machine_cable', imageKey: 'reverse-pec-deck' })
const trizeps = uebung('tri', 'Cable Overhead Triceps Extension', ALT, { muscleGroup: 'arms', equipment: 'machine_cable' })
const trizepsKopie = uebung('triK', 'Cable Overhead Triceps Extension', NEU, { muscleGroup: 'arms', equipment: 'machine_cable' })
const rope = uebung('rope', 'Cable Rope Triceps Pushdown', ALT, { muscleGroup: 'arms', equipment: 'machine_cable' })
const einzeln = uebung('dips', 'Dips', ALT, { equipment: 'bodyweight' })

console.log('[uebungsdubletten-test] Wer ist eine Dublette?')
pruefe('Schluessel ignoriert Gross-/Kleinschreibung und Leerzeichen',
  dublettenSchluessel({ name: '  BB  bench Press ', muscleGroup: 'chest', equipment: 'barbell' }) ===
  dublettenSchluessel(bench))
pruefe('anderes Geraet = keine Dublette (bewusst zwei Uebungen)',
  dublettenSchluessel({ ...bench, equipment: 'dumbbell' }) !== dublettenSchluessel(bench))
pruefe('andere Muskelgruppe = keine Dublette',
  dublettenSchluessel({ ...bench, muscleGroup: 'shoulders' }) !== dublettenSchluessel(bench))

const gefunden = findeDubletten([benchKopie, einzeln, bench, fly, flyKopie])
pruefe('zwei Gruppen gefunden (Einzelstuecke zaehlen nicht)', gefunden.gruppen.length === 2)
pruefe('Original = das aeltere (createdAt), egal in welcher Reihenfolge',
  gefunden.ersetzt.get('benchK') === 'bench' && gefunden.ersetzt.get('flyK') === 'fly')
pruefe('Originale werden nie ersetzt', !gefunden.ersetzt.has('bench') && !gefunden.ersetzt.has('fly'))
const gleichAlt = findeDubletten([uebung('b', 'X', ALT), uebung('a', 'X', ALT)])
pruefe('gleiches createdAt: kleinste Id gewinnt (auf jedem Geraet gleich)', gleichAlt.ersetzt.get('b') === 'a')
const ohneDatum = findeDubletten([uebung('a', 'X', undefined), uebung('b', 'X', ALT)])
pruefe('ohne createdAt verliert gegen ein Datum', ohneDatum.ersetzt.get('a') === 'b')
pruefe('ohne Dubletten: leere Zuordnung', findeDubletten([bench, einzeln]).ersetzt.size === 0)

console.log('[uebungsdubletten-test] Ids ersetzen:')
const ersetzt = new Map([['benchK', 'bench'], ['triK', 'tri']])
const vorher = { a: ['benchK', 'x'], b: { user3: 'triK' }, c: 'benchKx', d: 5, e: null, benchK: 'bleibt' }
const nachher = ersetzeIds(vorher, ersetzt)
pruefe('Werte in Arrays und Objekten werden ersetzt', nachher.a[0] === 'bench' && nachher.b.user3 === 'tri')
pruefe('nur exakte Treffer, keine Teilstrings', nachher.c === 'benchKx')
pruefe('Zahlen und null bleiben', nachher.d === 5 && nachher.e === null)
pruefe('Schluessel werden nicht umbenannt', nachher.benchK === 'bleibt')
pruefe('Eingabe bleibt unveraendert (frische Kopie)', vorher.a[0] === 'benchK' && vorher.b.user3 === 'triK')
pruefe('findeIds nennt jede Fundstelle',
  findeIds(vorher, new Set(['benchK', 'triK'])).sort().join(',') === '.a[0],.b.user3')

// Plan wie am 27.09.: Push-Tag mit Kopie als Alternative, Standard auf Original
const push = {
  id: 'tagPush', planId: 'p1', title: 'Push', updatedAt: '2026-09-27T13:49:12.725Z',
  exercises: [
    { exerciseId: 'dips', sets: 2, notes: '', alternativen: ['bench'], bevorzugt: { user3: 'bench' } },
    { exerciseId: 'rope', sets: 3, notes: 'eng', alternativen: ['triK'], bevorzugt: {} }
  ]
}
const pull = {
  id: 'tagPull', planId: 'p1', title: 'Pull', updatedAt: '2026-09-27T13:47:30.658Z',
  exercises: [{ exerciseId: 'fly', sets: 2, notes: '', alternativen: [], bevorzugt: {} }]
}
const offenesTraining = {
  id: 'w1', date: '2026-09-27', completedAt: null, updatedAt: '2026-09-27T13:49:12.742Z',
  exercises: [
    { exerciseId: 'rope', basisExerciseId: 'rope', alternativen: ['triK'], userExerciseIds: { user3: 'triK' }, bevorzugt: {}, sets: 2, notes: '' }
  ]
}
const altesTraining = { id: 'w0', date: '2026-09-05', completedAt: '2026-09-05T13:00:00.000Z', updatedAt: ALT, exercises: [{ exerciseId: 'bench', sets: 2 }] }
const saetze = [
  { id: 's1', workoutLogId: 'w0', exerciseId: 'bench', userId: 'user2', setNumber: 1, weight: 60, reps: 8, updatedAt: ALT },
  { id: 's2', workoutLogId: 'w1', exerciseId: 'triK', userId: 'user3', setNumber: 1, weight: 20, reps: 12, updatedAt: NEU }
]
const notizen = [
  { id: 'bench_user2', exerciseId: 'bench', userId: 'user2', text: 'Griff eng', updatedAt: ALT },
  { id: 'triK_user3', exerciseId: 'triK', userId: 'user3', text: 'Seil kurz', updatedAt: NEU }
]
const daten = {
  exercises: [bench, benchKopie, fly, flyKopie, trizeps, trizepsKopie, rope, einzeln],
  trainingDays: [push, pull],
  workoutLogs: [offenesTraining, altesTraining],
  setLogs: saetze,
  exerciseNotes: notizen
}
const eingabeText = JSON.stringify(daten)
const plan = planeZusammenfuehrung(daten, JETZT)

console.log('[uebungsdubletten-test] Plan umbiegen:')
pruefe('keine Konflikte im Normalfall', plan.konflikte.length === 0)
pruefe('Eingabe wird nicht veraendert', JSON.stringify(daten) === eingabeText)
pruefe('drei Kopien werden entfernt', plan.uebungenLoeschen.slice().sort().join(',') === 'benchK,flyK,triK')
const pushNeu = plan.tagePut.find(t => t.id === 'tagPush')
pruefe('Push-Tag: Kopie als Alternative zeigt jetzt aufs Original', pushNeu?.exercises[1].alternativen[0] === 'tri')
pruefe('Push-Tag: Reihenfolge, Saetze, Notiz und Standard bleiben',
  pushNeu.exercises.map(e => e.exerciseId).join(',') === 'dips,rope' &&
  pushNeu.exercises[1].sets === 3 && pushNeu.exercises[1].notes === 'eng' &&
  pushNeu.exercises[0].bevorzugt.user3 === 'bench')
pruefe('Push-Tag bekommt ein neues updatedAt (die Handys uebernehmen ihn)', pushNeu.updatedAt === JETZT)
pruefe('unveraenderter Tag (Pull) wird nicht geschrieben', !plan.tagePut.some(t => t.id === 'tagPull'))
const wNeu = plan.workoutsPut.find(w => w.id === 'w1')
pruefe('offenes Training: Alternative und Nutzer-Uebung zeigen aufs Original',
  wNeu?.exercises[0].alternativen[0] === 'tri' && wNeu.exercises[0].userExerciseIds.user3 === 'tri')
pruefe('offenes Training bleibt offen (completedAt unberuehrt)', wNeu.completedAt === null)
pruefe('altes Training ohne Kopie wird nicht geschrieben', !plan.workoutsPut.some(w => w.id === 'w0'))
pruefe('Satz auf der Kopie wandert zum Original, Werte bleiben',
  plan.saetzePut.length === 1 && plan.saetzePut[0].id === 's2' && plan.saetzePut[0].exerciseId === 'tri' &&
  plan.saetzePut[0].weight === 20 && plan.saetzePut[0].reps === 12)
pruefe('kein Satz wird geloescht', !('saetzeLoeschen' in plan) || plan.saetzeLoeschen.length === 0)

console.log('[uebungsdubletten-test] Felder der Kopie gehen nicht verloren:')
const flyNeu = plan.uebungenPut.find(u => u.id === 'fly')
pruefe('Original ohne Bild uebernimmt das Bild der Kopie', flyNeu?.imageKey === 'reverse-pec-deck')
pruefe('Original mit eigener Notiz behaelt sie', !plan.uebungenPut.some(u => u.id === 'bench') ||
  plan.uebungenPut.find(u => u.id === 'bench').notes === 'Bank 3')
pruefe('Original ohne fehlende Felder wird nicht geschrieben', !plan.uebungenPut.some(u => u.id === 'bench'))
pruefe('Name, Gruppe, Geraet und createdAt des Originals bleiben',
  flyNeu.name === 'Butterfly reverse' && flyNeu.muscleGroup === 'shoulders' && flyNeu.createdAt === fly.createdAt)
const mitNutzung = planeZusammenfuehrung({
  ...daten,
  exercises: [{ ...bench, lastUsedAt: '2026-09-01T00:00:00.000Z' }, { ...benchKopie, lastUsedAt: '2026-09-27T14:00:00.000Z' }]
}, JETZT)
pruefe('lastUsedAt: das spaetere gewinnt (Sortierung "zuletzt benutzt")',
  mitNutzung.uebungenPut.find(u => u.id === 'bench')?.lastUsedAt === '2026-09-27T14:00:00.000Z')

console.log('[uebungsdubletten-test] Notizen je Nutzer:')
const notizNeu = plan.notizenPut.find(n => n.id === 'tri_user3')
pruefe('Notiz der Kopie wandert zum Original (deterministische Id)',
  notizNeu?.exerciseId === 'tri' && notizNeu.userId === 'user3' && notizNeu.text === 'Seil kurz')
pruefe('Notiz der Kopie wird danach entfernt', plan.notizenLoeschen.join(',') === 'triK_user3')
pruefe('fremde Notiz bleibt unberuehrt', !plan.notizenPut.some(n => n.id === 'bench_user2'))
const zweiNotizen = planeZusammenfuehrung({
  ...daten,
  exerciseNotes: [...notizen, { id: 'tri_user3', exerciseId: 'tri', userId: 'user3', text: 'Seil lang', updatedAt: ALT }]
}, JETZT)
pruefe('zwei verschiedene Notizen fuer denselben Nutzer = Konflikt (nichts raten)',
  zweiNotizen.konflikte.some(k => k.includes('Notiz')))
const gleicheNotiz = planeZusammenfuehrung({
  ...daten,
  exerciseNotes: [...notizen, { id: 'tri_user3', exerciseId: 'tri', userId: 'user3', text: 'Seil kurz', updatedAt: ALT }]
}, JETZT)
pruefe('gleiche Notiz: kein Konflikt, Kopie entfaellt',
  gleicheNotiz.konflikte.length === 0 && gleicheNotiz.notizenLoeschen.includes('triK_user3'))
const zweiUebungsNotizen = planeZusammenfuehrung({
  ...daten,
  exercises: [{ ...bench, notes: 'Bank 3' }, { ...benchKopie, notes: 'Bank 5' }]
}, JETZT)
pruefe('zwei verschiedene Geraete-Notizen an der Uebung = Konflikt',
  zweiUebungsNotizen.konflikte.some(k => k.includes('Notiz')))

console.log('[uebungsdubletten-test] Konflikte statt stiller Verluste:')
const beideImTag = planeZusammenfuehrung({
  ...daten,
  trainingDays: [{ ...push, exercises: [{ exerciseId: 'bench', sets: 2 }, { exerciseId: 'benchK', sets: 3 }] }]
}, JETZT)
pruefe('Original und Kopie als zwei Eintraege im selben Tag = Konflikt', beideImTag.konflikte.length > 0)
const altGleichBasis = planeZusammenfuehrung({
  ...daten,
  trainingDays: [{ ...push, exercises: [{ exerciseId: 'bench', sets: 2, alternativen: ['benchK'] }] }]
}, JETZT)
pruefe('Kopie als Alternative zu ihrem eigenen Original = Konflikt', altGleichBasis.konflikte.length > 0)
const doppelteAlt = planeZusammenfuehrung({
  ...daten,
  trainingDays: [{ ...push, exercises: [{ exerciseId: 'dips', sets: 2, alternativen: ['bench', 'benchK'] }] }]
}, JETZT)
pruefe('Original und Kopie als zwei Alternativen = Konflikt', doppelteAlt.konflikte.length > 0)
const doppelterSatz = planeZusammenfuehrung({
  ...daten,
  setLogs: [...saetze, { id: 's3', workoutLogId: 'w1', exerciseId: 'tri', userId: 'user3', setNumber: 1, weight: 22, reps: 10 }]
}, JETZT)
pruefe('zwei Saetze wuerden zu Satz 1 derselben Uebung = Konflikt', doppelterSatz.konflikte.length > 0)
pruefe('Konflikt nennt den Trainingstag beim Namen', beideImTag.konflikte.some(k => k.includes('Push')))

console.log('[uebungsdubletten-test] Sicherheitsbremse Namensbild:')
const schluesselVon = new Map(daten.exercises.map(u => [u.id, dublettenSchluessel(u)]))
pruefe('Namensbild: Original und Kopie sehen gleich aus',
  JSON.stringify(namensbild({ a: 'bench' }, schluesselVon)) === JSON.stringify(namensbild({ a: 'benchK' }, schluesselVon)))
pruefe('Namensbild ignoriert updatedAt', JSON.stringify(namensbild({ a: 1, updatedAt: 'x' }, schluesselVon)) ===
  JSON.stringify(namensbild({ a: 1, updatedAt: 'y' }, schluesselVon)))
pruefe('Namensbild ist unabhaengig von der Feld-Reihenfolge',
  JSON.stringify(namensbild({ a: 1, b: 2 }, schluesselVon)) === JSON.stringify(namensbild({ b: 2, a: 1 }, schluesselVon)))
pruefe('Plan besteht die eigene Bremse (Tage, Trainings, Saetze gleich nach Namen)',
  vergleicheNamensbilder(daten.trainingDays, plan.tagePut, schluesselVon).length === 0 &&
  vergleicheNamensbilder(daten.workoutLogs, plan.workoutsPut, schluesselVon).length === 0 &&
  vergleicheNamensbilder(daten.setLogs, plan.saetzePut, schluesselVon).length === 0)
const verfaelscht = [{ ...pushNeu, exercises: [pushNeu.exercises[1], pushNeu.exercises[0]] }]
pruefe('Bremse greift bei vertauschter Reihenfolge', vergleicheNamensbilder(daten.trainingDays, verfaelscht, schluesselVon).length === 1)
const falscheUebung = [{ ...pushNeu, exercises: [{ ...pushNeu.exercises[0], exerciseId: 'rope' }, pushNeu.exercises[1]] }]
pruefe('Bremse greift bei anderer Uebung', vergleicheNamensbilder(daten.trainingDays, falscheUebung, schluesselVon).length === 1)
const weniger = [{ ...pushNeu, exercises: [pushNeu.exercises[0]] }]
pruefe('Bremse greift bei fehlendem Eintrag', vergleicheNamensbilder(daten.trainingDays, weniger, schluesselVon).length === 1)
pruefe('Bremse greift bei unbekannter Id', vergleicheNamensbilder(daten.trainingDays, [{ id: 'gibtsNicht' }], schluesselVon).length === 1)

console.log('[uebungsdubletten-test] Nach dem Zusammenfuehren:')
const danach = {
  exercises: daten.exercises.filter(u => !plan.uebungenLoeschen.includes(u.id))
    .map(u => plan.uebungenPut.find(p => p.id === u.id) || u),
  trainingDays: daten.trainingDays.map(t => plan.tagePut.find(p => p.id === t.id) || t),
  workoutLogs: daten.workoutLogs.map(w => plan.workoutsPut.find(p => p.id === w.id) || w),
  setLogs: daten.setLogs.map(s => plan.saetzePut.find(p => p.id === s.id) || s),
  exerciseNotes: [...daten.exerciseNotes.filter(n => !plan.notizenLoeschen.includes(n.id)), ...plan.notizenPut]
}
pruefe('keine Dubletten mehr', findeDubletten(danach.exercises).gruppen.length === 0)
pruefe('keine Verweise mehr auf entfernte Kopien',
  findeIds(danach, new Set(plan.uebungenLoeschen)).length === 0)
pruefe('zweiter Lauf aendert nichts (idempotent)', (() => {
  const zweiter = planeZusammenfuehrung(danach, JETZT)
  return zweiter.uebungenLoeschen.length === 0 && zweiter.tagePut.length === 0 && zweiter.workoutsPut.length === 0 &&
    zweiter.saetzePut.length === 0 && zweiter.notizenPut.length === 0 && zweiter.uebungenPut.length === 0
})())
pruefe('Satzzahl bleibt gleich', danach.setLogs.length === daten.setLogs.length)

if (fehler > 0) {
  console.error(`\n[uebungsdubletten-test] ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('\n[uebungsdubletten-test] alle Pruefungen bestanden')
}
