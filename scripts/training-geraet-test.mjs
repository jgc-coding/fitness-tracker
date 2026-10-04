// Vertragstest: ein Training gehoert dem Handy, auf dem es gestartet wurde
// (src/utils/trainingGeraet.js, genutzt von stores/workout.js und App.vue).
//
// Der Test ist der Vertrag: Am 01.10.2026 sprang das Handy von user2 bei jedem
// Start in das laufende Training von user1 auf DEREN Handy (per Cloud-Sync in
// der gemeinsamen Datenbank) und schrieb dessen Besetzung um. Fortgesetzt
// und wiederverwendet wird darum nur ein Training mit der Kennung DIESES
// Geraets; fremde und alte Trainings ohne Kennung bleiben unangetastet.
//
// Aufruf:  node ./scripts/training-geraet-test.mjs

import { offenesTrainingDiesesGeraets, logFuerTagDiesesGeraets } from '../src/utils/trainingGeraet.js'

let fehler = 0
function pruefe(beschreibung, bedingung, ist) {
  if (bedingung) {
    console.log(`  ok   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}${ist !== undefined ? '  (ist: ' + JSON.stringify(ist) + ')' : ''}`)
  }
}

const HEUTE = '2026-10-01'
const MEIN = 'g-mein'
const ANDERES = 'g-anderes'
const log = (id, extra = {}) => ({
  id, date: HEUTE, trainingDayId: 'legs', completedAt: null, startedAt: '2026-10-01T08:45:00.000Z', ...extra
})

console.log('[training-geraet-test] Fortsetzen beim App-Start:')
pruefe('offenes Training vom anderen Handy wird NICHT fortgesetzt (Fall 01.10.2026)',
  offenesTrainingDiesesGeraets([log('fremd', { deviceId: ANDERES, userIds: ['user1'] })], HEUTE, MEIN) === null)
pruefe('altes Training ohne Kennung wird nicht fortgesetzt (Herkunft unbekannt)',
  offenesTrainingDiesesGeraets([log('alt')], HEUTE, MEIN) === null)
pruefe('eigenes offenes Training wird fortgesetzt',
  offenesTrainingDiesesGeraets([log('fremd', { deviceId: ANDERES }), log('mein', { deviceId: MEIN })], HEUTE, MEIN)?.id === 'mein')
pruefe('eigenes, aber beendetes Training -> nichts fortzusetzen',
  offenesTrainingDiesesGeraets([log('mein', { deviceId: MEIN, completedAt: '2026-10-01T10:00:00.000Z' })], HEUTE, MEIN) === null)
pruefe('eigenes offenes Training von gestern -> nichts fortzusetzen',
  offenesTrainingDiesesGeraets([log('gestern', { deviceId: MEIN, date: '2026-09-30' })], HEUTE, MEIN) === null)
const zwei = offenesTrainingDiesesGeraets([
  log('frueh', { deviceId: MEIN, startedAt: '2026-10-01T07:00:00.000Z' }),
  log('spaet', { deviceId: MEIN, startedAt: '2026-10-01T09:00:00.000Z' })
], HEUTE, MEIN)
pruefe('zwei eigene offene -> das zuletzt gestartete', zwei?.id === 'spaet', zwei?.id)
pruefe('ohne Geraete-Kennung (Speicher gesperrt) -> nichts, nie ein fremdes',
  offenesTrainingDiesesGeraets([log('fremd', { deviceId: ANDERES })], HEUTE, null) === null)
pruefe('leere oder fehlende Liste -> null', offenesTrainingDiesesGeraets([], HEUTE, MEIN) === null && offenesTrainingDiesesGeraets(null, HEUTE, MEIN) === null)

console.log('[training-geraet-test] Trainingstag erneut starten:')
pruefe('heutiges Legs-Training vom anderen Handy wird nicht wiederverwendet -> neues Training',
  logFuerTagDiesesGeraets([log('fremd', { deviceId: ANDERES })], HEUTE, 'legs', MEIN) === null)
pruefe('altes Legs-Training ohne Kennung wird nicht wiederverwendet',
  logFuerTagDiesesGeraets([log('alt')], HEUTE, 'legs', MEIN) === null)
pruefe('eigenes heutiges Legs-Training wird wiederverwendet (auch beendet)',
  logFuerTagDiesesGeraets([log('mein', { deviceId: MEIN, completedAt: '2026-10-01T10:00:00.000Z' })], HEUTE, 'legs', MEIN)?.id === 'mein')
pruefe('eigenes Training eines ANDEREN Tags zaehlt nicht',
  logFuerTagDiesesGeraets([log('push', { deviceId: MEIN, trainingDayId: 'push' })], HEUTE, 'legs', MEIN) === null)
pruefe('eigenes Legs-Training von gestern zaehlt nicht',
  logFuerTagDiesesGeraets([log('gestern', { deviceId: MEIN, date: '2026-09-30' })], HEUTE, 'legs', MEIN) === null)

console.log(fehler ? `\n[training-geraet-test] ${fehler} FEHLER` : '\n[training-geraet-test] alles gruen')
process.exitCode = fehler ? 1 : 0
