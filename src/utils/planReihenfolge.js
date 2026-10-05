// Umsortieren der Uebungen eines Trainingstags und der Trainingstage eines
// Plans (reine Funktionen).
// Vertrag: scripts/planreihenfolge-test.mjs — zuerst Test, dann Regeln.
// Die Gesten (Uebungen: lange druecken und ziehen; Tage: im Fenster
// "Reihenfolge" ziehen) stecken in PlanningView.vue.

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

// --- Trainingstage -----------------------------------------------------------
// Der Platz steht als `dayOrder` am Tag. Dieselbe Reihenfolge zeigen die
// Planung und der Startbildschirm (getDaysForPlan im plans store).

function platz(tag) {
  return Number.isFinite(tag.dayOrder) ? tag.dayOrder : Infinity
}

// Tage nach Platz. Teilen sich zwei Tage einen Platz (alter Bestand: Tag
// geloescht, neuer angelegt), steht der aeltere vorn, danach entscheidet die
// Kennung — so bleibt die Reihenfolge nach jedem Neustart gleich.
export function sortiereTage(tage) {
  return [...tage].sort((a, b) =>
    (platz(a) - platz(b)) ||
    String(a.createdAt || '').localeCompare(String(b.createdAt || '')) ||
    String(a.id).localeCompare(String(b.id))
  )
}

// Neue Plaetze, nachdem der Tag von Platz `von` an Platz `nach` gezogen wurde
// (`tage` in der angezeigten Reihenfolge). Alle Tage bekommen 0..n-1;
// zurueck kommen nur die, deren Platz sich aendert, als { id, dayOrder }.
export function neueTagesPlaetze(tage, von, nach) {
  if (von === nach) return []
  return verschiebe(tage, von, nach)
    .map((tag, i) => ({ id: tag.id, dayOrder: i, alt: tag.dayOrder }))
    .filter(p => p.dayOrder !== p.alt)
    .map(({ id, dayOrder }) => ({ id, dayOrder }))
}

// Platz fuer einen neuen Tag: hinter dem hoechsten belegten. Die Anzahl der
// Tage taugt nicht — nach dem Loeschen ist dieser Platz oft noch belegt.
export function naechsterTagesPlatz(tage) {
  const belegt = tage.map(platz).filter(Number.isFinite)
  return belegt.length ? Math.max(...belegt) + 1 : 0
}
