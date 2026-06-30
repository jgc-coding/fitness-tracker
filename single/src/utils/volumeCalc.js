export function calculateSetVolume(weight, reps) {
  return (weight || 0) * (reps || 0)
}

export function calculateExerciseVolume(sets) {
  return sets.reduce((total, set) => total + calculateSetVolume(set.weight, set.reps), 0)
}

export function calculateWorkoutVolume(allSets) {
  return allSets.reduce((total, set) => total + calculateSetVolume(set.weight, set.reps), 0)
}
