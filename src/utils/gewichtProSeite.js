// Gewicht pro Seite (Gabriel 17.10.2026): Bei Langhantel und bei
// Scheiben-Maschinen mit zwei Seiten (Merker `proSeite: true` an der Uebung)
// zeigt das Rad links das Gewicht je Seite, in der Mitte das Gesamtgewicht.
// Gesamt ist die Summe der Scheiben OHNE Stange — so wurde immer notiert, das
// Stangengewicht kennt niemand genau. Pro Seite ist also genau die Haelfte.
// Gespeichert wird nur das Gesamt; am Datenformat der Saetze aendert sich nichts.
//
// Reine Funktionen. Vertrag: scripts/gewicht-pro-seite-test.mjs — wer die
// Regel aendert, erweitert ZUERST den Test.

export function hatZweiSeiten(uebung) {
  if (!uebung) return false
  return uebung.equipment === 'barbell' || uebung.proSeite === true
}

// Auf vier Stellen runden: 58,75 / 2 = 29,375 ist exakt, aber Zwischenwerte
// aus Rad-Rechnungen tragen sonst Rundungsreste (0.1 + 0.2)
function rund(x) {
  return Math.round(x * 10000) / 10000
}

const zahl = (x) => typeof x === 'number' && Number.isFinite(x)

export function proSeite(gesamt) {
  return zahl(gesamt) ? rund(gesamt / 2) : null
}

export function gesamtAusSeite(seite) {
  return zahl(seite) ? rund(seite * 2) : null
}

// Raster des Pro-Seite-Rads: derselbe Schritt wie im Gesamt-Rad (1,25 kg bei
// Langhantel und Maschine), so landet jeder Dreh links auf einer echten
// Scheibe. Ein ungerades Gesamt (58,75 -> 29,375 pro Seite) steht als
// Zusatzwert im Rad (utils/radWerte.js), statt still gerundet zu werden.
export function seitenRaster(schritt, maxGesamt) {
  const werte = []
  for (let i = 1; i * schritt <= maxGesamt / 2 + 1e-9; i++) {
    werte.push(Math.round(i * schritt * 100) / 100)
  }
  return werte
}

// Einmalige Umrechnung alter Eintraege (scripts/gewicht-pro-seite-umrechnen.mjs):
// Wer bisher pro Seite notiert hat, bekommt an Uebungen mit zwei Seiten das
// doppelte Gewicht. `gewichtVorUmrechnung` haelt den alten Wert fest — Merker
// gegen doppeltes Umrechnen und Rueckweg zugleich.
// `bis` (Datum, einschliesslich) ist Pflicht: nach der Umstellung traegt jede
// Person Gesamtwerte ein, ein spaeterer Lauf ohne Stichtag verdoppelte sie.
// `ohne` nimmt einzelne Satz-Ids aus (z.B. ein offensichtlich falscher Wert).
export function umrechnungPlan(saetze, uebungen, userId, { bis, ohne = [] } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(bis || ''))) {
    throw new Error('umrechnungPlan braucht einen Stichtag (bis: JJJJ-MM-TT)')
  }
  const zweiSeiten = new Set(uebungen.filter(hatZweiSeiten).map(u => u.id))
  const ausnahmen = new Set(ohne.map(String))
  const plan = { aendern: [], erledigt: [], ausgenommen: [], nachStichtag: [], gruende: [] }
  for (const satz of saetze) {
    if (satz.userId !== userId || !zweiSeiten.has(satz.exerciseId)) continue
    const eintrag = { id: satz.id, exerciseId: satz.exerciseId, date: satz.date, reps: satz.reps }
    if (satz.gewichtVorUmrechnung != null) {
      plan.erledigt.push({ ...eintrag, vorher: satz.gewichtVorUmrechnung, nachher: satz.weight })
    } else if (ausnahmen.has(String(satz.id))) {
      plan.ausgenommen.push({ ...eintrag, vorher: satz.weight, nachher: satz.weight })
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(satz.date || ''))) {
      plan.gruende.push(`Satz ${satz.id} hat kein gueltiges Datum ("${satz.date}")`)
    } else if (satz.date > bis) {
      plan.nachStichtag.push({ ...eintrag, vorher: satz.weight, nachher: satz.weight })
    } else if (!zahl(satz.weight) || satz.weight < 0) {
      plan.gruende.push(`Satz ${satz.id} hat kein gueltiges Gewicht ("${satz.weight}")`)
    } else {
      plan.aendern.push({ ...eintrag, vorher: satz.weight, nachher: gesamtAusSeite(satz.weight) })
    }
  }
  return plan
}
