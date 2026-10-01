// Regeln fuer den Uebungs-Verlauf in der Detailansicht (UebungsVerlauf.vue).
// Reine Funktionen ohne Vue und Dexie — Vertrag: scripts/verlauf-test.mjs
// (zuerst Test, dann Regeln).
//
// Ein Punkt je Trainingstag: der schwerste Satz (bei Gleichstand der mit mehr
// Wdh) — so wie die History-Tabelle den Tag zeigt. Aufwaermsaetze zaehlen
// nicht. Datumswerte sind Kalendertage 'YYYY-MM-DD' (lokal, wie getToday).

// Zeitraum-Knoepfe ueber dem Diagramm; der erste ist der Standard
export const ZEITRAEUME = [
  { key: '3m', label: '3 Mon.', monate: 3 },
  { key: '6m', label: '6 Mon.', monate: 6 },
  { key: '12m', label: '1 Jahr', monate: 12 },
  { key: 'alle', label: 'Alle', monate: null }
]

const MONATE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function teile(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return { y, m, d }
}

const zweistellig = (n) => String(n).padStart(2, '0')
const datum = (y, m, d) => `${y}-${zweistellig(m)}-${zweistellig(d)}`

// Erster Tag des Zeitraums: `monate` Kalendermonate vor `heute`. Gibt es den
// Tag im Zielmonat nicht (31.05. -> Februar), gilt dessen letzter Tag.
// `monate` null = alles, kein Start.
export function zeitraumStart(heute, monate) {
  if (monate === null || monate === undefined) return null
  const { y, m, d } = teile(heute)
  const index = y * 12 + (m - 1) - monate
  const zy = Math.floor(index / 12)
  const zm = index - zy * 12 + 1
  const letzter = new Date(Date.UTC(zy, zm, 0)).getUTCDate()
  return datum(zy, zm, Math.min(d, letzter))
}

function alsZahl(wert) {
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null
  if (typeof wert === 'string' && wert.trim() !== '') {
    const n = Number(wert.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

// Saetze (setLogs eines Nutzers fuer eine Uebung) -> Punkte je Tag, aelteste
// zuerst: { date, weight, reps, saetze: [{ setNumber, weight, reps }] }.
// `von`/`bis` schliessen den Tag selbst ein; null = offen.
export function verlaufPunkte(saetze, von = null, bis = null) {
  const jeTag = new Map()
  for (const satz of Array.isArray(saetze) ? saetze : []) {
    if (!satz || satz.isWarmup || typeof satz.date !== 'string') continue
    if ((von && satz.date < von) || (bis && satz.date > bis)) continue
    const weight = alsZahl(satz.weight)
    if (weight === null) continue
    const eintrag = { setNumber: Number(satz.setNumber) || 1, weight, reps: alsZahl(satz.reps) }
    if (!jeTag.has(satz.date)) jeTag.set(satz.date, [])
    jeTag.get(satz.date).push(eintrag)
  }
  return [...jeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, liste]) => {
      liste.sort((a, b) => a.setNumber - b.setNumber)
      const top = liste.reduce((best, x) =>
        x.weight > best.weight || (x.weight === best.weight && (x.reps ?? -1) > (best.reps ?? -1)) ? x : best)
      return { date, weight: top.weight, reps: top.reps, saetze: liste }
    })
}

// Was das Diagramm zeigt: Gewicht — ausser bei reinen Koerpergewicht-Uebungen
// (ueberall 0 kg), dort die Wdh, sonst waere die Linie platt auf null.
export function messgroesse(punkte) {
  if (punkte.some(p => p.weight > 0)) return 'weight'
  if (punkte.some(p => p.reps !== null && p.reps > 0)) return 'reps'
  return 'weight'
}

// Y-Achse mit runden Teilstrichen (1, 2, 2,5, 5 x Zehnerpotenz), hoechstens
// sechs, nie unter 0. Ein einzelner Wert bekommt Spielraum darum.
export function achse(werte) {
  const w = (werte || []).filter(Number.isFinite)
  if (w.length === 0) return { min: 0, max: 10, schritt: 5, ticks: [0, 5, 10] }
  let lo = Math.min(...w)
  let hi = Math.max(...w)
  if (lo === hi) {
    const rand = hi === 0 ? 5 : Math.max(Math.abs(hi) * 0.1, 1)
    lo -= rand
    hi += rand
  }
  lo = Math.max(0, lo)
  const roh = (hi - lo) / 4
  let zehner = 10 ** Math.floor(Math.log10(roh))
  let schritt = null
  while (schritt === null) {
    for (const f of [1, 2, 2.5, 5]) {
      const s = f * zehner
      if (s >= roh && Math.ceil(hi / s - 1e-9) - Math.floor(lo / s + 1e-9) <= 5) {
        schritt = s
        break
      }
    }
    zehner *= 10
  }
  const min = Math.floor(lo / schritt + 1e-9) * schritt
  const max = Math.ceil(hi / schritt - 1e-9) * schritt
  const ticks = []
  for (let t = min; t <= max + 1e-9; t += schritt) ticks.push(Math.round(t * 1000) / 1000)
  return { min, max, schritt, ticks }
}

// 97.5 -> "97,5"; ohne Tausenderpunkt (so steht es auch im Gewichts-Rad)
export function formatZahl(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',')
}

// Index des Punkts, dessen x-Position dem Fingerdruck am naechsten liegt
export function naechsterIndex(xs, x) {
  let best = -1
  let abstand = Infinity
  xs.forEach((px, i) => {
    const a = Math.abs(px - x)
    if (a < abstand) {
      abstand = a
      best = i
    }
  })
  return best
}

// Marken der Zeitachse: jeder Monatserste im Zeitraum, ausgeduennt auf
// hoechstens sechs. Ueber mehr als zwoelf Monate mit Jahreszahl ("Mär 26").
export function monatsMarken(von, bis) {
  const start = teile(von)
  let y = start.y
  let m = start.d === 1 ? start.m : start.m + 1
  if (m > 12) { m = 1; y++ }
  const alle = []
  while (datum(y, m, 1) <= bis) {
    alle.push({ y, m })
    m++
    if (m > 12) { m = 1; y++ }
  }
  const mitJahr = alle.length > 12
  const schritt = Math.max(1, Math.ceil(alle.length / 6))
  return alle
    .filter((_, i) => i % schritt === 0)
    .map(({ y: jahr, m: monat }) => ({
      date: datum(jahr, monat, 1),
      label: MONATE[monat - 1] + (mitJahr ? ' ' + String(jahr).slice(2) : '')
    }))
}
