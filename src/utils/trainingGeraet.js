// Ein Training gehoert dem Handy, auf dem es gestartet wurde (v2.8.1).
// Reine Funktionen — Vertrag: scripts/training-geraet-test.mjs.
//
// Warum: Beide Handys teilen dieselbe Datenbank (Cloud-Sync). Am 01.10.2026
// fand das Handy von user2 beim Start das laufende Training von user1 auf
// DEREN Handy, setzte es fort und schrieb dessen Besetzung um.
// Darum stempelt jeder Start die Geraete-Kennung (`deviceId`) an den
// workoutLog, und fortgesetzt oder wiederverwendet wird nur ein Training
// mit der Kennung DIESES Geraets. Trainings ohne Kennung (vor v2.8.1) haben
// eine unbekannte Herkunft und bleiben unangetastet.

const vonDiesemGeraet = (log, geraeteId) => Boolean(geraeteId) && log?.deviceId === geraeteId

// Das offene (nicht beendete) Training von heute, das auf diesem Geraet
// gestartet wurde — bei mehreren das zuletzt gestartete; sonst null.
export function offenesTrainingDiesesGeraets(logs, heute, geraeteId) {
  const offene = (Array.isArray(logs) ? logs : [])
    .filter(l => l && l.date === heute && !l.completedAt && vonDiesemGeraet(l, geraeteId))
    .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))
  return offene[0] || null
}

// Das heutige Training dieses Geraets fuer einen Trainingstag (auch ein
// beendetes — erneut gestartet geht es dort weiter); sonst null.
export function logFuerTagDiesesGeraets(logs, heute, trainingDayId, geraeteId) {
  return (Array.isArray(logs) ? logs : [])
    .find(l => l && l.date === heute && l.trainingDayId === trainingDayId && vonDiesemGeraet(l, geraeteId)) || null
}
