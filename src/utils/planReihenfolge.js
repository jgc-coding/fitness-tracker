// Umsortieren der Uebungen eines Trainingstags (reine Funktionen).
// Vertrag: scripts/planreihenfolge-test.mjs — zuerst Test, dann Regeln.
// Die Geste (lange druecken, ziehen, loslassen) steckt in PlanningView.vue.

// Neue Liste, in der der Eintrag von Platz `von` an Platz `nach` steht.
// Eintraege wandern als Ganzes (Alternativen, Standards, Saetze, Notiz).
export function verschiebe(liste, von, nach) {
  const neu = [...liste]
  if (von < 0 || von >= neu.length) return neu
  const ziel = Math.max(0, Math.min(neu.length - 1, nach))
  const [eintrag] = neu.splice(von, 1)
  neu.splice(ziel, 0, eintrag)
  return neu
}

// Zielplatz der gezogenen Gruppe: so viele andere Gruppen, wie ihre Mitte
// oberhalb der Mitte der gezogenen Gruppe liegt. `mitten` sind die beim
// Anheben gemessenen Mitten aller Gruppen (gleiches Koordinatensystem wie
// `zentrum`).
export function zielIndex(mitten, zentrum, von) {
  let platz = 0
  mitten.forEach((mitte, i) => {
    if (i !== von && mitte < zentrum) platz++
  })
  return platz
}

// Wie weit eine NICHT gezogene Gruppe ausweicht, damit am Zielplatz eine
// Luecke entsteht (hoehe = Hoehe der gezogenen Gruppe)
export function versatz(i, von, nach, hoehe) {
  if (i === von) return 0
  if (von < nach && i > von && i <= nach) return -hoehe
  if (nach < von && i >= nach && i < von) return hoehe
  return 0
}
