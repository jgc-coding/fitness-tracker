// Uebungsbilder: Manifest-Zugriff, Pfad-Aufloesung und Namens-Matching.
//
// Reine Funktionen ohne eigenen Zustand — das Manifest (uebungskatalog.json)
// kommt immer als Parameter herein. So laufen die Funktionen unveraendert im
// Browser (Vue importiert das JSON via Vite) und unter Node (der Vertragstest
// liest es mit readFileSync); ein JSON-Import hier im Modul wuerde Node ohne
// Import-Attribut zum Abbruch bringen.
//
// Vertrag fuers Matching: scripts/uebungsbilder-matching-test.mjs — wer die
// Regeln hier anfasst, erweitert ZUERST den Test.

// Namen vergleichbar machen: klein schreiben, Anfuehrungszeichen (gerade und
// typografische) und Doppelpunkte entfernen, Mehrfach-Leerzeichen glaetten.
// WICHTIG: beide Seiten normalisieren — die aliasse im Manifest stehen zwar
// klein, tragen aber noch Doppelpunkte ("machine: chest press").
export function normalisiereName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/["'“”„‘’‚]/g, '')
    .replace(/:/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Manifest-Eintrag zu einem Uebungsnamen (Abgleich gegen `aliasse`) — oder null.
export function findeKatalogEintrag(katalog, name) {
  const gesucht = normalisiereName(name)
  if (!gesucht) return null
  return katalog.find(e => (e.aliasse || []).some(a => normalisiereName(a) === gesucht)) || null
}

// Nur der Bild-Schluessel zu einem Uebungsnamen — oder null.
export function findeImageKey(katalog, name) {
  return findeKatalogEintrag(katalog, name)?.key || null
}

// Manifest-Eintrag zu einem gespeicherten imageKey — oder null.
export function eintragFuerKey(katalog, key) {
  if (!key) return null
  return katalog.find(e => e.key === key) || null
}

// Absoluter Bildpfad unterhalb der Vite-Base (Foto 0 oder 1). Die Base wird
// erst beim Aufruf gelesen, damit der Vertragstest das Modul unter Node
// importieren kann und dort eine eigene Base uebergibt.
export function bildPfad(key, position = 0, base = import.meta.env.BASE_URL) {
  const wurzel = base.endsWith('/') ? base : base + '/'
  return `${wurzel}uebungsbilder/${key}/${position}.webp`
}
