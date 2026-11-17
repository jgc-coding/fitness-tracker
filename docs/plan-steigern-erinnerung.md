# Plan: Die App erinnert ans Steigern (v2.17.0)

Erstellt 2026-11-17 nach Gabriels Wunsch (Sprachnachricht), Entscheidungen
von Gabriel am selben Tag. Umsetzung ab 2026-11-18, nicht vorher.
Symbol-Entwuerfe: `docs/entwuerfe/steigern-symbol-varianten.html`
(auch als private Seite: https://claude.ai/artifact/KjWMjCAevp5EemwvF2quEH).

## Ziel

Der Steigern-Knopf auf der Uebungskarte (das Logo rechts neben dem Wert)
bekommt einen dritten Zustand: **Erinnerung von der App**, dargestellt als
**pulsierender Ring** in der Personenfarbe (Variante 1). Er erscheint je
Person, wenn

1. **Stillstand:** die Person in dieser Uebungsgruppe dreimal nacheinander
   ohne Steigerung war — dann beim vierten Mal, oder
2. **Oben im Bereich:** die Person beim letzten Mal in dieser Uebung in
   allen Saetzen am oberen Ende ihres Wiederholungsbereichs war (z.B. 12
   bei 8-12).

Jede Person schaltet die Erinnerung in den Einstellungen an oder aus,
Standard ist **an**. Ein Tipp auf die Erinnerung nimmt sie an: derselbe Weg
wie heute beim Selbst-Markieren. Der Vorschlag springt sofort um einen
Schritt hoch (1,25 kg bzw. 1 kg), der Knopf zeigt "selbst markiert".

## Entscheidungen (Gabriel, 2026-11-17)

1. **Steigerung** = mehr Gewicht ODER gleiches Gewicht mit mehr Wdh.
2. **Zaehlweise:** Nach drei Einheiten ohne Steigerung erinnert die App beim
   vierten Mal. Beispiel: 60x10, 60x10, 60x10 -> beim 4. Training die
   Erinnerung. Es zaehlt nur ein Training, in dem wirklich etwas
   eingetragen wurde (egal ob gesteigert oder nicht). Ein Training, das nur
   gestartet und wieder beendet wurde (zum Nachschauen), zaehlt nie.
3. **Gezaehlt wird je Uebungsgruppe:** die Uebung eines Plan-Platzes samt
   ihren Alternativen (z.B. Schraegbank Kurzhantel / Langhantel / Maschine),
   also der Ring der Karte `[basisExerciseId, ...alternativen]`. Ohne
   Alternativen ist die Gruppe die Uebung allein.
4. **Wdh-Bereich je Person**, falls die Analyse Unterschiede zeigt; sonst
   ein Wert fuer alle.
5. **Mehrere Saetze (user1: 3):** "oben im Bereich" erst, wenn ALLE Saetze
   der letzten Einheit oben angekommen sind.
6. **Symbol:** Variante 1, pulsierender Ring.
7. **Ausgelassene Gruppe zaehlt nicht:** Laesst die Person die Gruppe in
   einem Training aus und macht andere Uebungen, aendert das den Zaehler
   dieser Gruppe nicht. Es zaehlt nur, wenn in der Gruppe selbst ein Satz
   gespeichert wurde, denn nur dann gibt es Gewicht x Wdh zum Vergleichen.

## Regeln im Detail (Vertrag zuerst)

- **Einheit** = Kalendertag, an dem die Person mindestens einen Satz in
  einer Uebung der Gruppe gespeichert hat (wie `getLastSets`). Die Zaehlung
  liest nur gespeicherte Saetze — leere Trainings sind darum von selbst
  ausgeschlossen, ohne Sonderregel.
- **Wert einer Einheit** = bester Satz der dort gemachten Uebung: schwerstes
  Gewicht, bei Gleichstand die meisten Wdh. Saetze ohne Wdh zaehlen nur mit
  dem Gewicht.
- **Vergleich je Uebung**, nie quer: Kurzhantel wird nur mit Kurzhantel
  verglichen. Je Uebung gibt es einen laufenden Bestwert.
  - besser als der Bestwert (mehr Gewicht, oder gleiches Gewicht und mehr
    Wdh) = **Steigerung**, Zaehler der Gruppe beginnt neu.
  - weniger Gewicht als der Bestwert = **Neuanfang** (bewusst
    zurueckgegangen), Zaehler beginnt ebenfalls neu, der neue Wert ist der
    Bestwert.
  - erstes Mal in dieser Uebung = Neuanfang.
  - sonst (gleich, oder gleiches Gewicht mit weniger Wdh) = **keine
    Steigerung**. 60x10, 60x9, 60x10 sind also drei Einheiten ohne
    Steigerung.
- **Zaehler der Gruppe** = Anzahl der juengsten Einheiten seit (und
  einschliesslich) der letzten Steigerung bzw. dem letzten Neuanfang.
  Erinnerung ab Zaehler 3 (Konstante `STILLSTAND_EINHEITEN = 3`).
- **Oben im Bereich:** letzte Einheit der Uebung auf der Karte, alle dort
  gespeicherten Saetze mit Wdh >= Obergrenze.
- **Heute zaehlt mit**, sobald heute ein Satz gespeichert ist. Vor dem
  ersten Satz gilt die Erinnerung fuer heute; danach fuer das naechste Mal
  (wie der bestehende Knopf). Wer heute 12 schafft oder zum dritten Mal
  gleich bleibt, sieht die Erinnerung direkt nach dem Speichern.
- **Keine Erinnerung**, wenn die Person die Uebung schon markiert hat oder
  die Erinnerung in den Einstellungen aus ist.
- **Ohne gespeicherten Bereich** gilt 8-12.

## Fund im bestehenden Steigern-Knopf (wird mit repariert)

- **Der markierte Zustand vergisst sich.** Ob der Knopf "aktiv" aussieht,
  steht nur in einer Variablen dieser Ansicht (`increaseToggles`,
  `TrackingView.vue:206`). Nach einem Neustart sieht ein markierter Knopf
  wieder blass aus; ein Tipp darauf hebt die Markierung dann auf, statt sie
  zu setzen.
- **Der Vorschlag springt erst nach einem Neustart.** Markiert man vor dem
  ersten Satz von heute, aendert `toggleIncrease` nur die Daten, laedt den
  Vorschlag aber nicht neu (`ladeVorschlag` fehlt).
- `.increase-icon-btn.active` nutzt `color-mix` (gegen die Projektregel fuer
  alte Android-WebViews).

Alle drei betreffen genau den Knopf, den die Erinnerung umbaut. Der Zustand
kommt kuenftig aus den Daten (Merker an den Saetzen), nie aus der Ansicht.

## Schritte

1. **Analyse (nur lesen):** neues Skript `scripts/wdh-bereiche.mjs` liest die
   setLogs der letzten 6 Monate aus der Cloud (Zugang wie
   `uebungen-cloud.mjs`) und schlaegt je Uebung und Person einen Bereich vor.
   Liegen fast alle Wdh in 8-12, bleibt 8-12; sonst unteres und oberes
   typisches Ende (z.B. 10.- und 90.-Perzentil, gerundet). Ausgabe als
   Tabelle fuer Gabriel. **Gabriel bestaetigt oder korrigiert die Tabelle**,
   erst dann Schritt 4.
2. **Regeln + Vertrag zuerst:** `src/utils/steigerung.js` mit
   `scripts/steigerung-test.mjs` (in `.claude/pruefen.txt`), Regeln wie
   oben: `einheitenDerGruppe`, `istSteigerung`, `stillstandZaehler`,
   `obenImBereich`, `erinnerung({ ... })` liefert
   `{ faellig, grund: 'oben' | 'stillstand', zaehler }`.
   Faelle mindestens: Gabriels Beispiel (3x 60x10 -> 4. Mal), Wechsel
   zwischen den Uebungen einer Gruppe, 60x10/60x9/60x10, Neuanfang mit
   weniger Gewicht, erstes Mal, Wdh `null`, 0 kg, mehrere Saetze am selben
   Tag, alle Saetze vs. nur Satz 1 oben, heute mit/ohne Satz, schon
   markiert, Einstellung aus, kein Bereich = 8-12, Kommawerte (61,25),
   Uebung ohne Alternativen.
3. **Speicherorte (gesynct, keine Schema-Aenderung):**
   - Einstellung: `db.meta` `steigernErinnerung_<userId>`; fehlt = an. Im
     auth store wie `satzZahl` (`stores/auth.js`).
   - Bereich: `db.meta` `wdhBereich_<userId>_<exerciseId>` = `{ min, max }`
     (ein Eintrag je Paar, damit zwei Handys sich nicht gegenseitig
     ueberschreiben). Bei "fuer alle gleich" je Person derselbe Wert.
4. **Startwerte schreiben:** `scripts/wdh-bereiche.mjs --jetzt` schreibt die
   bestaetigte Tabelle in die Cloud. Ohne `--jetzt` Trockenlauf, vorher
   Sicherung nach `privat\`.
5. **Karte (`TrackingView.vue`):** je Person und Uebung drei Zustaende
   `aus | erinnern | markiert`, berechnet in `ladeVorschlag` (laeuft schon je
   Uebung und Person, auch fuer die Ring-Uebungen). Gruppe = `ringFuer(ex)`.
   Nach jedem gespeicherten Satz und nach "Rueckgaengig" neu rechnen. Ein
   Tipp ruft wie bisher `toggleIncreaseNextTime`, danach `ladeVorschlag`.
   `increaseToggles` entfaellt. Pulsring als `::after` mit `transform` und
   `opacity` (wie im Entwurf), bei `prefers-reduced-motion` ein ruhender
   Ring; Farben ohne `color-mix`. Knopf-Text fuer Vorleseprogramme nennt
   den Grund ("12 Wdh erreicht" / "3 Mal ohne Steigerung").
6. **Einstellungen (`SettingsView.vue`):** Abschnitt "Steigern-Erinnerung"
   unter "Saetze je Uebung", je Person An/Aus, gleiche Knopf-Optik.
7. **Bereich ansehen und aendern (`ExerciseDetail.vue`):** Zeile
   "Wdh-Bereich 8-12" je Person, Tipp oeffnet zwei kleine Zahlen-Raeder.
   Ohne das braucht jede Aenderung Claude.
8. **Doku und Release:** Regel-Abschnitt in der CLAUDE.md (Architektur:
   Kraft-Training), CHANGELOG 2.17.0, Handy-Checkliste
   `docs/tests/v2.17.0-handy.md`, Gate gruen, Headless-Test bei 360 px
   (frische `*.localhost`, Testdaten per Backup-Import) inkl. Regression
   v2.16, dann Deploy.

## Betroffene Dateien

`src/utils/steigerung.js` (neu), `scripts/steigerung-test.mjs` (neu),
`scripts/wdh-bereiche.mjs` (neu), `.claude/pruefen.txt`,
`src/views/TrackingView.vue`, `src/stores/workout.js` (nur falls der
Rueckgabewert von `toggleIncreaseNextTime` angepasst werden muss),
`src/stores/auth.js`, `src/views/SettingsView.vue`,
`src/components/tracking/ExerciseDetail.vue`, `CLAUDE.md`, `CHANGELOG.md`,
`docs/tests/v2.17.0-handy.md`.

## Risiken und Annahmen

- **Datenverlust:** keiner absehbar. Nur neue `meta`-Eintraege, Dexie-Schema
  bleibt v4, alte Saetze werden nur gelesen. Ein Handy auf alter Version
  ignoriert die neuen Eintraege.
- **Mehrere pulsierende Karten** koennen unruhig wirken. Gabriels Wahl; faellt
  es im Studio auf, ist "nur die ersten Sekunden pulsieren" eine kleine
  Aenderung.
- **Gruppe auf zwei Trainingstagen mit unterschiedlichen Alternativen:** Die
  Gruppe ist immer der Ring der gerade gezeigten Karte. Zwei leicht
  verschiedene Ringe koennen so leicht verschieden zaehlen.
- **Uebungen ohne Historie** starten mit 8-12. Liegt eine solche Uebung
  bewusst hoeher, erinnert die App zu frueh, bis der Bereich angepasst ist.
- **Koerpergewicht-Uebungen (0 kg):** "steigern" heisst dort +1 kg wie heute.
  Falls das stoert: Erinnerung dort nur fuer "oben im Bereich".

## Nicht enthalten

- Keine Erinnerung auf dem Sperrbildschirm oder als Benachrichtigung.
- Keine Anzeige in History oder Auswertung.
- Die App erhoeht nie selbst: Ohne Tipp bleibt der Vorschlag beim alten Wert.
- Kein "fuer heute ausblenden". Die Erinnerung bleibt, bis gesteigert wurde.
- Keine Wdh-Ziele ("versuch heute 11"), keine Aenderung am Laufplaner.

## Akzeptanzkriterien

- [ ] Vertrag `steigerung-test.mjs` gruen, im Gate eingetragen.
- [ ] Analyse-Tabelle von Gabriel bestaetigt, Startwerte in der Cloud.
- [ ] 3x 60x10 in einer Gruppe (auch verteilt auf deren Uebungen) -> beim 4.
      Training pulsiert der Ring, nur bei der betroffenen Person.
- [ ] Ein gestartetes und ohne Satz beendetes Training aendert den Zaehler
      nicht, ein Training mit ausgelassener Gruppe ebenso wenig.
- [ ] Wer beim letzten Mal in allen Saetzen am oberen Ende war, sieht die
      Erinnerung; wer heute dort ankommt, sieht sie direkt nach dem Speichern.
- [ ] Ein Tipp nimmt an: Vorschlag +1 Schritt sofort, Knopf "markiert",
      auch nach Neustart der App noch "markiert".
- [ ] Einstellung "aus" blendet die Erinnerung fuer diese Person auf allen
      Geraeten aus; neue Installation = an.
- [ ] Wdh-Bereich in der Detailansicht sichtbar und aenderbar.
- [ ] Bei 360 px mit zwei Personen kein Umbruch durch das neue Symbol;
      bei reduzierter Bewegung ruhender Ring.
- [ ] v2.16-Regression gruen, Version 2.17.0 in den Einstellungen.
