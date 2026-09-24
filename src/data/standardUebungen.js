// Standardliste der Uebungen: was "Standard-Uebungen laden" (Einstellungen)
// anlegt, sofern eine Uebung gleichen Namens noch fehlt (Vergleich ohne
// Gross-/Kleinschreibung). Namen stehen EXAKT wie in der App, inklusive
// Anfuehrungszeichen und Doppelpunkten — der Bild-Vertrag in
// scripts/uebungsbilder-matching-test.mjs prueft, dass jede hier genannte
// Uebung ein Bild findet.
//
// Reines JS ohne Vite-Eigenheiten: die App (SettingsView), der Vertragstest
// und scripts/uebungen-cloud.mjs (Abgleich mit dem echten Bestand in der
// Cloud) lesen dieselbe Liste.
export const STANDARD_UEBUNGEN = [
  // Legs
  { name: 'Hack Squat', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'Leg curl', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'hip thrusts', muscleGroup: 'legs', equipment: 'barbell' },
  { name: '"bad girl"', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: '"good girl"', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'seated leg curl', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'seated leg extension', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'calve raises', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'lunges', muscleGroup: 'legs', equipment: 'dumbbell' },

  // Chest
  { name: 'DB Bench press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'DB incline Bench press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'machine: chest press', muscleGroup: 'chest', equipment: 'machine_weight' },
  { name: 'machine: incline chest press', muscleGroup: 'chest', equipment: 'machine_weight' },
  { name: 'Cable Crossover', muscleGroup: 'chest', equipment: 'machine_cable' },
  { name: 'BB Bench press', muscleGroup: 'chest', equipment: 'barbell' },
  { name: 'BB incline Bench press', muscleGroup: 'chest', equipment: 'barbell' },
  // In der App nachgetragen, seit 24.09.2026 Standard (Namen, Gruppe und
  // Geraet exakt wie in der Cloud, gelesen mit scripts/uebungen-cloud.mjs)
  { name: 'Butterfly', muscleGroup: 'chest', equipment: 'machine_cable' },
  { name: 'Dips', muscleGroup: 'chest', equipment: 'bodyweight' },

  // Back
  { name: 'weighted pull up', muscleGroup: 'back', equipment: 'bodyweight' },
  { name: 'Chin Up', muscleGroup: 'back', equipment: 'bodyweight' },
  { name: 'Latzug', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'chest supported row', muscleGroup: 'back', equipment: 'dumbbell' },
  { name: 'low row', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'cable row (without chest support)', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'lower back', muscleGroup: 'back', equipment: 'machine_weight' },
  { name: 'DB Shrugs', muscleGroup: 'back', equipment: 'dumbbell' },

  // Shoulders
  { name: 'shoulder press', muscleGroup: 'shoulders', equipment: 'machine_weight' },
  { name: 'BB overhead press', muscleGroup: 'shoulders', equipment: 'barbell' },
  { name: 'DB Side lateral', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { name: 'Butterfly reverse', muscleGroup: 'shoulders', equipment: 'machine_cable' },

  // Arms
  { name: 'Standing Concentration Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
  { name: 'Cable Bicep Curl', muscleGroup: 'arms', equipment: 'machine_cable' },
  { name: 'Cable Rope Triceps Pushdown', muscleGroup: 'arms', equipment: 'machine_cable' },
  { name: 'Cable Overhead Triceps Extension', muscleGroup: 'arms', equipment: 'machine_cable' },

  // Core
  { name: 'core', muscleGroup: 'core', equipment: 'bodyweight' }
]
