// Muskelgrafik: die 18 Muskel-Ids, die Grobgruppen der App und die Dateien
// der Grafik unter public/muskelgrafik/.
//
// Reines JS ohne Vite-Eigenheiten: die Komponente (MuscleMap.vue), das
// Bau-Skript (scripts/muskelgrafik-bauen.mjs) und die Vertragstests
// (scripts/musclemap-pruefen.mjs, scripts/uebungsbilder-matching-test.mjs)
// lesen dieselben Werte. Die Muskeln je Uebung stehen im Bild-Manifest
// (src/data/uebungskatalog.json, `primaer`/`sekundaer`).

export const MUSKEL_IDS = [
  'neck', 'traps', 'shoulders', 'chest', 'biceps', 'triceps', 'forearms',
  'abdominals', 'obliques', 'lats', 'middle_back', 'lower_back', 'glutes',
  'abductors', 'adductors', 'quadriceps', 'hamstrings', 'calves'
]

// Grobgruppen der App (constants.js MUSCLE_GROUPS) -> Muskel-Ids. Greift nur
// fuer Uebungen ohne Manifest-Eintrag. full_body markiert alle Muskeln, aber
// nur hell (sekundaer).
export const GROBGRUPPEN = {
  chest: ['chest'],
  back: ['lats', 'middle_back', 'lower_back', 'traps'],
  shoulders: ['shoulders'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['abdominals', 'obliques'],
  full_body: MUSKEL_IDS
}

// Graue Grundfigur (vorn links, hinten rechts) und je Muskel eine Maske in
// halber Kantenlaenge; die Komponente zieht beide auf dieselbe Flaeche.
// Die Masse schreibt scripts/muskelgrafik-bauen.mjs genau so.
export const GRUNDFIGUR = 'muskelgrafik/grundfigur.webp'
export const GRUNDFIGUR_BREITE = 900
export const GRUNDFIGUR_HOEHE = 780
export const MASKE_BREITE = 450
export const MASKE_HOEHE = 390

export function maskenPfad(id) {
  return `muskelgrafik/${id}.png`
}

// Pfad unter die Vite-Base haengen (wie bildUrl in utils/uebungsBilder.js);
// die Base wird erst beim Aufruf gelesen, damit Node-Skripte das Modul laden.
export function muskelgrafikUrl(relativ, base = import.meta.env.BASE_URL) {
  const wurzel = base.endsWith('/') ? base : base + '/'
  return `${wurzel}${relativ}`
}
