// Werte des Auswahl-Rads (WheelPicker) plus ein Vorwert, der nicht im Raster
// liegt — aufsteigend einsortiert. So zeigt das Rad genau den gespeicherten
// Wert (z.B. 22 kg im 1,25-kg-Raster, nachdem eine Uebung ein anderes Geraet
// bekommen hat), statt still auf die erste Position zu springen (V15).
//
// Reine Funktion, die Werte kommen aufsteigend herein. Vertrag:
// scripts/radwerte-test.mjs — wer die Regel aendert, erweitert ZUERST den Test.
export function werteMitVorwert(werte, vorwert) {
  if (typeof vorwert !== 'number' || !Number.isFinite(vorwert) || werte.includes(vorwert)) return werte
  const stelle = werte.findIndex(w => w > vorwert)
  return stelle < 0 ? [...werte, vorwert] : [...werte.slice(0, stelle), vorwert, ...werte.slice(stelle)]
}

// Live-Kopplung zweier Raeder (Pro Seite / Gesamt): Waehrend eines Rad
// gezogen wird, steht es zwischen zwei Positionen — `stelle` ist dann eine
// Kommazahl (10,3 = 30 % des Wegs von Position 10 zu 11). Der Wert dort ist
// linear dazwischen; umgekehrt findet stelleFuerWert die Kommastelle eines
// Werts. So dreht das Partner-Rad im festen Verhaeltnis mit (Pro Seite eine
// Position = Gesamt zwei). Ausserhalb der Liste wird auf den Rand geklemmt.
export function wertAnStelle(werte, stelle) {
  if (!werte.length) return null
  if (!(stelle > 0)) return werte[0]
  if (stelle >= werte.length - 1) return werte[werte.length - 1]
  const i = Math.floor(stelle)
  return werte[i] + (stelle - i) * (werte[i + 1] - werte[i])
}

export function stelleFuerWert(werte, wert) {
  if (!werte.length || !(wert > werte[0])) return 0
  const letzte = werte.length - 1
  if (wert >= werte[letzte]) return letzte
  const i = werte.findIndex(w => w > wert) - 1
  return i + (wert - werte[i]) / (werte[i + 1] - werte[i])
}

// Text eines Rad-Werts: ganze Zahlen ohne Komma, sonst zwei Stellen wie
// bisher (47.50). Drei Stellen nur, wenn der Wert sie wirklich hat — die
// Haelfte eines ungeraden Gesamtgewichts (58,75 -> 29,375) stuende sonst
// gerundet und damit falsch im Rad.
export function radText(wert, decimals) {
  if (!decimals || wert % 1 === 0) return String(wert)
  return wert.toFixed(Math.round(wert * 100) === wert * 100 ? 2 : 3)
}
