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

// Pfade kommen aus dem Manifest (`bilder`, `vorschau` — relativ zu public/)
// und werden unter die Vite-Base gehaengt. Die Base wird erst beim Aufruf
// gelesen, damit der Vertragstest das Modul unter Node importieren kann und
// dort eine eigene Base uebergibt.
function mitBase(relativ, base) {
  const wurzel = base.endsWith('/') ? base : base + '/'
  return `${wurzel}${relativ}`
}

// Zeichnung Nummer `position` eines Eintrags (Animationsreihenfolge; ein
// Eintrag hat 1 Bild = Standbild oder 2 Bilder = Start und Ende) — oder null.
export function bildUrl(eintrag, position = 0, base = import.meta.env.BASE_URL) {
  const relativ = eintrag?.bilder?.[position]
  return relativ ? mitBase(relativ, base) : null
}

// Vorschaubild fuer Karten und Katalog (kraeftigere Linie, randlos
// zugeschnitten — die feinen Zeichnungen verschwinden bei 40 px) — oder null.
export function vorschauUrl(eintrag, base = import.meta.env.BASE_URL) {
  return eintrag?.vorschau ? mitBase(eintrag.vorschau, base) : null
}
