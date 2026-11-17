# Plan: Die App erinnert ans Steigern (v2.17.0)

Erstellt 2026-11-17 nach Gabriels Wunsch (Sprachnachricht). Umsetzung erst
nach Gabriels Antworten auf die offenen Fragen (geplant ab 2026-11-18).
Symbol-Entwuerfe: `docs/entwuerfe/steigern-symbol-varianten.html`
(auch als private Seite: https://claude.ai/artifact/KjWMjCAevp5EemwvF2quEH).

## Ziel

Der Steigern-Knopf auf der Uebungskarte (das Logo rechts neben dem Wert)
bekommt einen dritten Zustand: **Erinnerung von der App**. Er erscheint je
Person und Uebung, wenn

1. **Stillstand:** die Person sich in dieser Uebung laenger nicht gesteigert
   hat (Zaehlung siehe Frage 2), oder
2. **Oben im Bereich:** die Person beim letzten Mal am oberen Ende ihres
   Wiederholungsbereichs fuer diese Uebung war (z.B. 12 bei 8-12).

Der Bereich gilt je Uebung (und evtl. je Person, Frage 4). Startwerte kommen
aus der Analyse des letzten halben Jahres; ohne Eintrag gilt 8-12.
Jede Person schaltet die Erinnerung in den Einstellungen an oder aus,
Standard ist **an**.

Ein Tipp auf die Erinnerung nimmt sie an: Das ist derselbe Weg wie heute beim
Selbst-Markieren. Der Vorschlag springt um einen Schritt hoch (1,25 kg bzw.
1 kg), und der Knopf zeigt "selbst markiert".

## Offene Fragen an Gabriel (vor dem Start klaeren)

| Nr | Frage | Empfehlung |
|----|-------|------------|
| 1 | Zaehlt "gleiches Gewicht, mehr Wdh" als Steigerung? | **Ja.** Sonst meldet sich die Erinnerung, obwohl du im Bereich planmaessig Wdh aufbaust (60x8, 60x9, 60x10 ...). Das Gewicht-Signal kommt dann ueber "oben im Bereich". |
| 2 | Ab wann gilt "laenger als 3 Mal nicht gesteigert"? Beispiel: 4 Trainings nacheinander 60x10. | **Erinnerung beim 5. Training** (die letzten 3 Male brachten nichts Neues). Die Zahl 3 wird eine Konstante, leicht aenderbar. |
| 3 | Zaehlt die App je Uebung oder je Uebungsgruppe (Plan-Platz mit Alternativen, z.B. Schraegbank KH/LH/Maschine)? | **Je Uebung.** Die Gewichte der drei Varianten sind nicht vergleichbar. Nachteil: Wer oft wechselt, wird seltener erinnert. |
| 4 | Gilt der Wdh-Bereich fuer alle drei Personen gleich oder je Person? | **Je Person**, falls die Analyse Unterschiede zeigt; sonst ein Wert fuer alle. |
| 5 | Wer mehrere Saetze erfasst (user1: 3): Reicht Satz 1 am oberen Ende, oder muessen es alle Saetze sein? | **Alle Saetze.** Erst wenn auch der letzte Satz oben ankommt, traegt das hoehere Gewicht. |
| 6 | Welches Symbol (1-10, oder eine Mischung)? | **Variante 2** (gestrichelter Ring): gestrichelt = Vorschlag, durchgezogen = angenommen. |

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
   Regel: Satz-Wdh ohne `null`; liegen fast alle Werte in 8-12, bleibt 8-12;
   sonst unteres und oberes typisches Ende (z.B. 10.- und 90.-Perzentil,
   gerundet). Ausgabe als Tabelle fuer Gabriel. **Gabriel bestaetigt oder
   korrigiert die Tabelle**, erst dann Schritt 4.
2. **Regeln + Vertrag zuerst:** `src/utils/steigerung.js` mit
   `scripts/steigerung-test.mjs` (in `.claude/pruefen.txt`):
   - `einheiten(saetze)`: je Datum der beste Satz (schwerstes Gewicht, bei
     Gleichstand die meisten Wdh).
   - `istSteigerung(vorher, nachher)` nach Frage 1.
   - `stillstandZaehler(einheiten)` nach Frage 2.
   - `obenImBereich(letzteEinheit, bereich)` nach Frage 5.
   - `erinnerung({ saetze, bereich, aktiv, markiert })` liefert
     `{ faellig, grund: 'oben' | 'stillstand', zaehler }`.
   - Faelle: Wechsel zwischen Alternativen, Rueckschritt (Deload), Wdh `null`,
     0 kg (Koerpergewicht), mehrere Saetze am selben Tag, heute mitgezaehlt
     bzw. nicht, schon markiert = keine Erinnerung, Einstellung aus = keine,
     kein Bereich = 8-12, Kommawerte (61,25).
3. **Speicherorte (gesynct, keine Schema-Aenderung):**
   - Einstellung: `db.meta` `steigernErinnerung_<userId>`; fehlt = an. Im
     auth store wie `satzZahl` (`stores/auth.js`).
   - Bereich: `db.meta` `wdhBereich_<userId>_<exerciseId>` = `{ min, max }`
     (ein Eintrag je Paar, damit zwei Handys sich nicht gegenseitig
     ueberschreiben). Bei "fuer alle gleich" (Frage 4) je Person derselbe
     Wert.
4. **Startwerte schreiben:** `scripts/wdh-bereiche.mjs --jetzt` schreibt die
   bestaetigte Tabelle in die Cloud. Ohne `--jetzt` Trockenlauf, vorher
   Sicherung nach `privat\`.
5. **Karte (`TrackingView.vue`):** je Person und Uebung drei Zustaende
   `aus | erinnern | markiert`, berechnet in `ladeVorschlag` (laeuft schon je
   Uebung und Person). Nach jedem gespeicherten Satz neu rechnen: Wer heute
   12 schafft, sieht die Erinnerung sofort fuer das naechste Mal. Ein Tipp
   ruft wie bisher `toggleIncreaseNextTime`, danach `ladeVorschlag`.
   `increaseToggles` entfaellt. Knopf-Text fuer Vorleseprogramme nennt den
   Grund ("12 Wdh erreicht" / "3 Mal gleich").
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
- **Wechsel zwischen Alternativen** macht die Stillstand-Erinnerung selten
  (Frage 3). Die Regel "oben im Bereich" greift trotzdem bei jeder Einheit.
- **Uebungen ohne Historie** starten mit 8-12. Liegt eine solche Uebung
  bewusst hoeher, erinnert die App zu frueh, bis der Bereich angepasst ist.
- **Koerpergewicht-Uebungen (0 kg):** "steigern" heisst dort +1 kg wie heute.
  Falls das stoert: Erinnerung dort nur fuer "oben im Bereich".
- **Die Wdh-Luecke** (Saetze ohne Wdh) zaehlt nicht fuer "oben im Bereich".
- Annahme: Die Erinnerung bezieht sich immer auf die naechste Einheit, wie
  der bestehende Knopf (vor dem ersten Satz = heute, danach = naechstes Mal).

## Nicht enthalten

- Keine Erinnerung auf dem Sperrbildschirm oder als Benachrichtigung.
- Keine Anzeige in History oder Auswertung.
- Die App erhoeht nie selbst: Ohne Tipp bleibt der Vorschlag beim alten Wert.
- Kein "fuer heute ausblenden". Die Erinnerung bleibt, bis gesteigert wurde.
- Keine Wdh-Ziele ("versuch heute 11"), keine Aenderung am Laufplaner.

## Akzeptanzkriterien

- [ ] Vertrag `steigerung-test.mjs` gruen, im Gate eingetragen.
- [ ] Analyse-Tabelle von Gabriel bestaetigt, Startwerte in der Cloud.
- [ ] Nach 3 Einheiten ohne Steigerung (Zaehlung nach Frage 2) zeigt die
      Karte die Erinnerung, nur bei der betroffenen Person.
- [ ] Wer beim letzten Mal am oberen Ende war, sieht die Erinnerung.
- [ ] Wer heute oben ankommt, sieht sie direkt nach dem Speichern.
- [ ] Ein Tipp nimmt an: Vorschlag +1 Schritt sofort, Knopf "markiert",
      auch nach Neustart der App noch "markiert".
- [ ] Einstellung "aus" blendet die Erinnerung fuer diese Person auf allen
      Geraeten aus; neue Installation = an.
- [ ] Wdh-Bereich in der Detailansicht sichtbar und aenderbar.
- [ ] Bei 360 px mit zwei Personen kein Umbruch durch das neue Symbol.
- [ ] v2.16-Regression gruen, Version 2.17.0 in den Einstellungen.
