/*
 * Kern des Puls-zu-Tempo-Modells: laden, schaetzen, vorhersagen.
 *
 * Liegt bewusst unter scripts/lib und NICHT unter src/: Es liest Garmin-CSV und
 * laeuft nur in Node. In src/ muesste es nach single/src/ gespiegelt werden und
 * wuerde ungenutzt in beide App-Bundles wandern.
 *
 * Genutzt von scripts/pace-modell.mjs (Bericht) und
 * scripts/laufplan-vorgaben.mjs (traegt die Vorgaben in einen Plan ein).
 * Eine Quelle fuer die Zahlen — sonst weichen Bericht und Plan voneinander ab.
 */
import fs from 'node:fs'

// Plausibilitaetsgrenzen. Was hier herausfaellt, ist ein Messfehler der Uhr
// (Pulsgurt verrutscht, GPS-Sprung) und wuerde das Modell verziehen.
export const PACE_MIN = 150 // 2:30 /km
export const PACE_MAX = 900 // 15:00 /km
export const HF_MIN = 90
export const HF_MAX = 210
export const KM_MIN = 2
export const AUSREISSER_SIGMA = 2.5
export const FORM_LAEUFE = 10

/**
 * Daempfung ausserhalb des gemessenen Pulsbereichs.
 *
 * Die geschaetzte Gerade sagt: jeder Pulsschlag mehr bringt gleich viel Tempo.
 * Innerhalb der Werte, die wirklich gelaufen wurden, stimmt das gut. Darueber
 * nicht mehr — nahe am Maximalpuls kostet jeder weitere Schlag mehr und bringt
 * weniger. Wer die Gerade einfach verlaengert, bekommt ein Schwellentempo, das
 * niemand laufen kann. Jenseits der belegten Spanne zaehlt ein Pulsschlag daher
 * nur noch zu diesem Anteil.
 */
export const DAEMPFUNG_AUSSERHALB = 0.6

export function mmss(sek) {
  const total = Math.max(0, Math.round(sek))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Rundet Sekunden auf ein glattes Vielfaches — Plaene mit 7:13 taeuschen Genauigkeit vor. */
export function rundeAuf(sek, schritt = 5) {
  return Math.round(sek / schritt) * schritt
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

/**
 * Zahl aus einer Garmin-Zelle. Das Komma ist in Distanz und Hoehe ein
 * DEZIMALtrenner ("4,79" sind 4,79 km) — wer es entfernt, macht daraus 479.
 */
function zahl(s) {
  if (s === undefined || s === null) return null
  const t = String(s).trim()
  if (t === '' || t === '--') return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function sekunden(s) {
  if (!s || s === '--') return null
  const teile = String(s).split(':').map(Number)
  if (teile.some(t => !Number.isFinite(t))) return null
  if (teile.length === 3) return teile[0] * 3600 + teile[1] * 60 + teile[2]
  if (teile.length === 2) return teile[0] * 60 + teile[1]
  return null
}

export function tagAbstand(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
}

/** @returns {{ laeufe: object[], verworfen: number }} */
export function ladeLaeufe(pfad) {
  const rows = parseCsv(fs.readFileSync(pfad, 'utf8'))
  if (rows.length < 2) throw new Error('Die CSV hat keine Datenzeilen.')
  const kopf = rows[0].map(h => h.trim())
  const idx = (name) => kopf.indexOf(name)
  const iTyp = idx('Aktivitätstyp')
  const iDatum = idx('Datum')
  const iKm = idx('Distanz')
  const iHf = idx('Ø Herzfrequenz')
  const iMaxHf = idx('Maximale Herzfrequenz')
  const iBewegung = idx('Zeit in Bewegung')
  const iZeit = idx('Zeit')
  const iAnstieg = idx('Anstieg gesamt')
  if (iTyp < 0 || iDatum < 0 || iKm < 0 || iHf < 0) {
    throw new Error('Unbekannter CSV-Aufbau: Spalten Aktivitaetstyp, Datum, Distanz oder Puls fehlen.')
  }

  const laeufe = []
  let verworfen = 0
  for (const r of rows.slice(1)) {
    if (!/Laufen|Laufband/i.test(r[iTyp] || '')) continue
    const km = zahl(r[iKm])
    const hf = zahl(r[iHf])
    const sek = sekunden(r[iBewegung]) ?? sekunden(r[iZeit])
    if (km === null || hf === null || sek === null) { verworfen++; continue }
    if (km < KM_MIN || sek <= 0) { verworfen++; continue }
    const pace = sek / km
    if (pace < PACE_MIN || pace > PACE_MAX || hf < HF_MIN || hf > HF_MAX) { verworfen++; continue }
    const anstieg = iAnstieg >= 0 ? zahl(r[iAnstieg]) : null
    laeufe.push({
      datum: String(r[iDatum]).slice(0, 10),
      km,
      sek,
      pace,
      hf,
      maxHf: iMaxHf >= 0 ? zahl(r[iMaxHf]) : null,
      hmProKm: anstieg === null ? null : anstieg / km,
      stunden: sek / 3600
    })
  }
  laeufe.sort((a, b) => a.datum.localeCompare(b.datum))
  return { laeufe, verworfen }
}

/**
 * Loest (X' W X) beta = X' W y ueber Gauss-Elimination mit Spaltenpivotsuche.
 * Vier Unbekannte, ein paar Dutzend Zeilen — dafuer braucht es keine Bibliothek.
 */
function gewichteteRegression(zeilen, ziel, gewichte) {
  const p = zeilen[0].length
  const A = Array.from({ length: p }, () => new Array(p + 1).fill(0))
  for (let n = 0; n < zeilen.length; n++) {
    const w = gewichte[n]
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) A[i][j] += w * zeilen[n][i] * zeilen[n][j]
      A[i][p] += w * zeilen[n][i] * ziel[n]
    }
  }
  for (let col = 0; col < p; col++) {
    let pivot = col
    for (let r = col + 1; r < p; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r
    if (Math.abs(A[pivot][col]) < 1e-10) return null
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    for (let r = 0; r < p; r++) {
      if (r === col) continue
      const f = A[r][col] / A[col][col]
      for (let c = col; c <= p; c++) A[r][c] -= f * A[col][c]
    }
  }
  return A.map((row, i) => row[p] / A[i][i])
}

/**
 * Schaetzt  Tempo = a + b*Puls + c*Hoehenmeter_je_km + d*Dauer_in_Stunden
 * mit kleinsten Quadraten, juengere Laeufe staerker gewichtet, plus einer
 * Runde gegen Ausreisser.
 *
 * @param {object[]} alle      Ergebnis von ladeLaeufe().laeufe
 * @param {object}   optionen  { monate = 18, halbwertszeitTage = 180 }
 */
export function schaetzeModell(alle, optionen = {}) {
  const monate = optionen.monate ?? 18
  const halbwertszeitTage = optionen.halbwertszeitTage ?? 180
  if (!alle.length) throw new Error('Keine brauchbaren Laeufe gefunden.')

  const letzterTag = alle[alle.length - 1].datum
  const grenze = new Date(Date.parse(letzterTag) - monate * 30.44 * 86400000).toISOString().slice(0, 10)
  const fenster = alle.filter(l => l.datum >= grenze)
  if (fenster.length < 12) {
    throw new Error(`Nur ${fenster.length} Laeufe im Fenster ab ${grenze} — zu wenig fuer ein Modell.`)
  }

  // Fehlende Hoehenangaben auf den Median setzen: sie wegzuwerfen waere teurer
  // als sie mit dem typischen Gelaende zu fuellen.
  const hmWerte = fenster.map(l => l.hmProKm).filter(v => v !== null).sort((a, b) => a - b)
  const hmMedian = hmWerte.length ? hmWerte[Math.floor(hmWerte.length / 2)] : 0
  for (const l of fenster) if (l.hmProKm === null) l.hmProKm = hmMedian

  const fitte = (laeufe) => {
    const zeilen = laeufe.map(l => [1, l.hf, l.hmProKm, l.stunden])
    const ziel = laeufe.map(l => l.pace)
    const gew = laeufe.map(l => Math.pow(0.5, tagAbstand(l.datum, letzterTag) / halbwertszeitTage))
    const b = gewichteteRegression(zeilen, ziel, gew)
    if (!b) throw new Error('Die Laeufe sind zu einfoermig fuer eine Schaetzung.')
    const rest = laeufe.map(l => l.pace - (b[0] + b[1] * l.hf + b[2] * l.hmProKm + b[3] * l.stunden))
    const wSum = gew.reduce((s, w) => s + w, 0)
    const sigma = Math.sqrt(rest.reduce((s, r, i) => s + gew[i] * r * r, 0) / wSum)
    return { b, gew, rest, sigma, wSum }
  }

  // Erste Schaetzung, dann eine Runde gegen Ausreisser. Ein einziger falsch
  // gemessener Lauf verzieht sonst die ganze Gerade. Was herausfaellt, wird vom
  // Aufrufer NAMENTLICH gemeldet — stilles Aussortieren waere Rechnen im Dunkeln.
  const erste = fitte(fenster)
  const ausreisser = fenster.filter((l, i) => Math.abs(erste.rest[i]) > AUSREISSER_SIGMA * erste.sigma)
  const behalten = fenster.filter(l => !ausreisser.includes(l))
  if (behalten.length < 12) throw new Error('Nach dem Aussortieren bleiben zu wenige Laeufe uebrig.')

  const { b, gew, wSum } = fitte(behalten)
  const [a0, bHf, bHm, bStd] = b
  const vorhersageRoh = (hf, hmProKm, stunden) => a0 + bHf * hf + bHm * hmProKm + bStd * stunden

  const mittel = behalten.reduce((s, l, i) => s + gew[i] * l.pace, 0) / wSum
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < behalten.length; i++) {
    const r = behalten[i].pace - vorhersageRoh(behalten[i].hf, behalten[i].hmProKm, behalten[i].stunden)
    ssRes += gew[i] * r * r
    ssTot += gew[i] * Math.pow(behalten[i].pace - mittel, 2)
  }

  const hfSort = behalten.map(l => l.hf).sort((x, y) => x - y)
  const hfUnten = hfSort[Math.floor(hfSort.length * 0.05)]
  const hfOben = hfSort[Math.floor(hfSort.length * 0.95)]

  // Ausserhalb der belegten Pulsspanne zaehlt jeder Schlag nur gedaempft.
  // Die Guetezahlen oben bleiben bewusst auf der ungedaempften Schaetzung:
  // sie beschreiben die Anpassung an die Daten, nicht die Hochrechnung.
  const daempfe = (hf) => {
    if (hf > hfOben) return hfOben + (hf - hfOben) * DAEMPFUNG_AUSSERHALB
    if (hf < hfUnten) return hfUnten - (hfUnten - hf) * DAEMPFUNG_AUSSERHALB
    return hf
  }
  const vorhersage = (hf, hmProKm, stunden) => vorhersageRoh(daempfe(hf), hmProKm, stunden)
  const maxHfSort = behalten.map(l => l.maxHf).filter(v => v !== null).sort((x, y) => y - x)
  const juengste = behalten.slice(-FORM_LAEUFE)

  return {
    vorhersage,
    vorhersageRoh,
    koeffizienten: { a0, bHf, bHm, bStd, daempfung: DAEMPFUNG_AUSSERHALB },
    behalten,
    ausreisser,
    kennzahlen: {
      gesamt: alle.length,
      imModell: behalten.length,
      erstesDatum: alle[0].datum,
      letzterTag,
      grenze,
      monate,
      halbwertszeitTage,
      hmMedian,
      r2: 1 - ssRes / ssTot,
      streuung: Math.sqrt(ssRes / wSum),
      hfBelegtVon: hfUnten,
      hfBelegtBis: hfOben,
      maxHfBeobachtet: maxHfSort[0] ?? null,
      maxHfRobust: maxHfSort.length >= 5 ? maxHfSort[Math.floor(maxHfSort.length * 0.05)] : (maxHfSort[0] ?? null),
      // Mittlerer Rest der juengsten Laeufe: positiv = derzeit langsamer als der
      // Schnitt der letzten Monate (Formverlust), negativ = besser in Form.
      formOffset: juengste.reduce((s, l) => s + (l.pace - vorhersage(l.hf, l.hmProKm, l.stunden)), 0) / juengste.length,
      formAb: juengste[0].datum,
      formLaeufe: juengste.length
    }
  }
}
