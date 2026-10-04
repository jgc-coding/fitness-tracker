export const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Brust' },
  { id: 'back', label: 'Ruecken' },
  { id: 'shoulders', label: 'Schultern' },
  { id: 'legs', label: 'Beine' },
  { id: 'arms', label: 'Arme' },
  { id: 'core', label: 'Core' },
  { id: 'full_body', label: 'Ganzkoerper' }
]

export const EQUIPMENT_TYPES = [
  { id: 'barbell', label: 'Langhantel' },
  { id: 'dumbbell', label: 'Kurzhantel' },
  { id: 'cable', label: 'Kabelzug' },
  { id: 'machine_weight', label: 'Maschine (Gewichte)' },
  { id: 'machine_cable', label: 'Maschine (Kabel)' },
  { id: 'bodyweight', label: 'Koerpergewicht' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'band', label: 'Widerstandsband' },
  { id: 'other', label: 'Sonstiges' }
]

// Die echten Namen stehen NICHT im Code — das Repo ist oeffentlich. Sie liegen
// in db.meta als `userName_<id>` (gesynct, Einstellungen -> Benutzer) und
// ersetzen beim Laden den Platzhalter hier (stores/auth.js). Namen nur ueber
// den auth store lesen, nie aus dieser Liste.
// zyklus: true blendet fuer diese Kennung die Zyklustag-Erfassung ein.
export const USERS = [
  { id: 'user1', name: 'Person 1', color: 'var(--color-user1)', bgColor: 'var(--color-user1-bg)', zyklus: true },
  { id: 'user2', name: 'Person 2', color: 'var(--color-user2)', bgColor: 'var(--color-user2-bg)' },
  { id: 'user3', name: 'Person 3', color: 'var(--color-user3)', bgColor: 'var(--color-user3-bg)' }
]

export const PLAN_TYPES = [
  { id: 'weekly', label: 'Woechentlich', description: 'Jede Woche gleicher Plan' },
  { id: 'alternating', label: 'Alternierend', description: 'Woche A/B im Wechsel' }
]
