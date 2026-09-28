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
