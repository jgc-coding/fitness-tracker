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
      (Ausserhalb der Kette; Tabelle in `privat\`, Schreiben steht aus.)
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

## Ablauf mit dem Autopiloten (2026-11-18)

- **Schritt 1 und 4 laufen NICHT im Autopiloten**, sondern in der
  Begleitsitzung: Die Tabelle braucht Gabriels Freigabe, und das Schreiben
  in die Cloud geschieht nur danach. Das Skript `scripts/wdh-bereiche.mjs`
  liegt darum schon fertig im Repo.
- **Kein Paket-Lauf liest oder schreibt die echte Cloud.** Nie
  `scripts/wdh-bereiche.mjs`, `uebungen-*.mjs` oder `lauf-cloud.mjs`
  ausfuehren; Browser-Tests nur auf einer frischen `*.localhost`-Subdomain
  ohne Anmeldung (CLAUDE.md, "Deploy und Umgebung").
- **Version und CHANGELOG** setzt allein P5: Das Projekt hat keine Datei
  VERSION, die Version steht in `package.json`. P1 bis P4 aendern beides nicht.
- Paketfolge: Regeln (P1) -> Speicherorte und Ansichten fuer Einstellung und
  Bereich (P2) -> Karte (P3) -> Browser-Test (P4) -> Release-Doku und
  Regression (P5). Deploy macht der Abschluss nach der Abnahme.

## Pakete
- [x] P1: Regeln der Steigern-Erinnerung stehen als Vertrag
  - Wie: Schritt 2 und "Regeln im Detail". Zuerst `scripts/steigerung-test.mjs` im Stil von `scripts/zyklustag-test.mjs`, dann `src/utils/steigerung.js` als reine Funktionen (`einheitenDerGruppe`, `istSteigerung`, `stillstandZaehler`, `obenImBereich`, `erinnerung` mit Rueckgabe `{ faellig, grund, zaehler }`, Konstante `STILLSTAND_EINHEITEN = 3`, Standardbereich 8-12). Eingaben sind setLogs in der Form, die `src/composables/useHistory.js` schon liest; Gewichte als Zahl mit Komma-Werten wie 61.25 ohne Rundung.
  - Kriterium: `node ./scripts/steigerung-test.mjs` gruen und je mindestens ein Fall fuer jede Aufzaehlung aus Schritt 2 des Plans
  - Kriterium: Ein Fall belegt Entscheidung 7: Ein Tag mit Saetzen nur in Uebungen ausserhalb der Gruppe aendert deren Zaehler nicht
  - Kriterium: pruefen.txt gruen (die Zeile fuer `steigerung-test.mjs` steht schon darin)
- [x] P2: Erinnerung und Wdh-Bereich sind je Person einstellbar
  - Wie: Schritt 3, 6 und 7. Einstellung `steigernErinnerung_<userId>` in `db.meta` ueber `src/stores/auth.js` wie `satzZahl` (fehlt = an). Bereich `wdhBereich_<userId>_<exerciseId>` als `{ min, max }` (fehlt = 8-12), Lesen und Schreiben an genau einer Stelle, die P3 wiederverwendet. Form wie `saetze_<userId>`: `{ key, value: { min, max }, updatedAt }`; die Startwerte (nur Abweichungen von 8-12) schreibt `scripts/wdh-bereiche.mjs` ausserhalb der Kette. Einstellungen: Abschnitt "Steigern-Erinnerung" unter "Saetze je Uebung", je Person An/Aus in derselben Knopf-Optik. `ExerciseDetail.vue`: Zeile "Wdh-Bereich 8-12" je Person, Tipp oeffnet zwei kleine Zahlen-Raeder als Unteransicht (nie ein zweites Modal, CLAUDE.md), min kleiner als max.
  - Kriterium: Dexie-Schema bleibt v4 ohne neue Tabelle; die neuen Werte sind reine `db.meta`-Eintraege und laufen ueber den bestehenden Sync
  - Kriterium: Die Einstellungen zeigen "Steigern-Erinnerung" je Person, Standard an, Umschalten schreibt `steigernErinnerung_<userId>`
  - Kriterium: Die Detailansicht zeigt je Person den gespeicherten Bereich oder 8-12 und speichert eine Aenderung als `wdhBereich_<userId>_<exerciseId>`
  - Kriterium: pruefen.txt gruen
- [x] P3: Der Steigern-Knopf erinnert mit pulsierendem Ring und merkt sich "markiert"
  - Wie: Schritt 5 und "Fund im bestehenden Steigern-Knopf". Je Person und Uebung `aus | erinnern | markiert`, berechnet in `ladeVorschlag` mit `erinnerung` aus P1, Gruppe = `ringFuer(ex)`, Einstellung und Bereich ueber die Stelle aus P2. `increaseToggles` entfaellt, "markiert" kommt aus dem Merker, den `toggleIncreaseNextTime` in `src/stores/workout.js` setzt. Nach jedem gespeicherten Satz, nach "Rueckgaengig" (`undoSet`) und nach jedem Tipp auf den Knopf `ladeVorschlag` erneut. Ring als `::after` mit `transform` und `opacity` wie Variante 1 in `docs/entwuerfe/steigern-symbol-varianten.html`, Personenfarbe ohne `color-mix`, bei `prefers-reduced-motion: reduce` ruhend. `aria-label` nennt den Grund ("12 Wdh erreicht" bzw. "3 Mal ohne Steigerung").
  - Kriterium: `increaseToggles` kommt in `src/` nicht mehr vor, und `.increase-icon-btn` samt Ring nutzt kein `color-mix`
  - Kriterium: Ein Tipp vor dem ersten Satz von heute laedt den Vorschlag sofort um einen Schritt hoeher (1,25 kg bei Barbell und Machine-Weight, sonst 1 kg)
  - Kriterium: "markiert" wird aus den gespeicherten Daten gelesen und ueberlebt so einen Neustart der App
  - Kriterium: Der Ring erscheint nur bei der Person, fuer die `erinnerung` faellig ist, und nie bei ausgeschalteter Einstellung oder schon markierter Uebung
  - Kriterium: pruefen.txt gruen
- [x] P4: Ein Browser-Test bei 360 px belegt die Erinnerung
  - Wie: Headless-Chrome per DevTools-Protokoll gegen den Produktions-Build (`npm run build`, Vorschau-Server mit eigenem Port und `--strictPort`), frische `*.localhost`-Subdomain ohne Anmeldung, Testdaten per Backup-Import. Vorlagen aus der Sitzung vom 14.11.: `privat/browsertests/cdp.mjs`, `privat/browsertests/v216-test.mjs`. Den Chrome-Profilordner legt das Testskript selbst an und raeumt ihn selbst per `fs.rmSync` auf, genau wie die Vorlagen (nie unter AppData, CLAUDE.md-Stolperfalle "Headless-Chrome"). Neuer Test `privat/browsertests/v217-test.mjs`. Findet er Fehler in P1 bis P3, dort beheben und den Vertrag aus P1 um den Fall ergaenzen. Bericht `docs/tests/v2.17.0-browsertest.md` mit Ergebnis je Pruefung, nur user1-3, keine Namen, keine Benutzerpfade.
  - Kriterium: `node privat/browsertests/v217-test.mjs` gruen mit je einer Pruefung fuer: 3x 60x10 in einer Gruppe, auch verteilt auf deren Uebungen, ergibt beim 4. Training den Ring nur bei der betroffenen Person; ein Training ohne Satz und eines mit ausgelassener Gruppe aendern nichts; oben im Bereich beim letzten Mal; oben im Bereich heute direkt nach dem Speichern; Tipp nimmt an (Vorschlag sofort einen Schritt hoeher, "markiert", nach Neuladen weiter "markiert"); Einstellung aus blendet den Ring aus; Wdh-Bereich in der Detailansicht sichtbar und aenderbar
  - Kriterium: Derselbe Test belegt bei 360 px mit zwei Personen keinen Zeilenumbruch durch das Symbol und bei emuliertem `prefers-reduced-motion` einen ruhenden Ring
  - Kriterium: pruefen.txt gruen
- [x] P5: Version 2.17.0 mit Doku, Handy-Checkliste und gruener Regression
  - Wie: Rest von Schritt 8 ohne Deploy. `package.json` auf 2.17.0; CHANGELOG-Eintrag 2.17.0 vom 2026-11-18 im Format des Eintrags 2.16.0 (der Runner schreibt hier keinen, weil VERSION fehlt). Regel-Abschnitt "Steigern-Erinnerung" in der CLAUDE.md unter "Architektur: Kraft-Training", nur dauerhafte Regeln mit Funktionsnamen, und `steigerung` in die utils-Liste der Dateistruktur. `docs/tests/v2.17.0-handy.md` im Stil von `docs/tests/v2.16.0-handy.md` mit jedem Akzeptanzkriterium, das nur am Handy pruefbar ist (Pulsieren, Tippgefuehl, zwei Handys). Regression: `privat/browsertests/v216-test.mjs` und `privat/browsertests/v215-regress.mjs`, angepasst nur dort, wo 2.17.0 gewollt anders ist (etwa die Versionsnummer), mit Begruendung im Bericht aus P4.
  - Kriterium: `package.json` steht auf 2.17.0, und `node privat/browsertests/v217-test.mjs` findet 2.17.0 in den Einstellungen
  - Kriterium: CHANGELOG hat genau einen Eintrag 2.17.0, der die Erinnerung, die Einstellung, den Wdh-Bereich und die drei Reparaturen am Steigern-Knopf nennt
  - Kriterium: Die CLAUDE.md enthaelt den Regel-Abschnitt und bleibt unter 30.000 Zeichen
  - Kriterium: `docs/tests/v2.17.0-handy.md` existiert und nennt jedes Akzeptanzkriterium des Plans, das nur am Handy pruefbar ist
  - Kriterium: `node privat/browsertests/v216-test.mjs` und `node privat/browsertests/v215-regress.mjs` gruen
  - Kriterium: pruefen.txt gruen
