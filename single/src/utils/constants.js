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

// FitTrack Single has exactly ONE user. The id stays 'user1' so the shared
// stores/composables (which key set logs by userId) work without changes.
export const USERS = [
  { id: 'user1', name: 'Ich', color: 'var(--color-accent)', bgColor: 'var(--color-user1-bg)' }
]

export const PLAN_TYPES = [
  { id: 'weekly', label: 'Woechentlich', description: 'Jede Woche gleicher Plan' },
  { id: 'alternating', label: 'Alternierend', description: 'Woche A/B im Wechsel' }
]
