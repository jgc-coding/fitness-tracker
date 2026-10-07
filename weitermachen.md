# Weitermachen — Stand 2026-10-07 (v2.12.0)

## Stand
- **Diese Sitzung (07.10.): v2.12.0, live** (Deploy gruen, Live-Seite liefert
  2.12.0, Tag `v2.12.0`). Auftrag von Gabriel (vom Handy): beim Laufen nicht
  nur tauschen, sondern "Anders gelaufen ..." frei eintragen, mit
  Rueckmeldung; "freiwillig" -> "optional" ueberall; fuer die Person mit
  Zyklus-Erfassung der errechnete Zyklustag im Lauf-Formular, korrigierbar.
  Entscheidungen (alle wie empfohlen): Schalter "ausgelassen" (Standard) /
  "offen lassen"; "+ Lauf eintragen" auch in der Woche; das Zyklus-Rad im
  Krafttraining startet ebenfalls beim errechneten Tag. Regeln
  `utils/laufEintrag.js` und `utils/zyklusTag.js` (Vertraege
  `laufeintrag-test`, `zyklustag-test`, Merge-Test F8-F11), Formular
  `RunSpontanForm.vue`, Feld `ZyklusTagFeld.vue`. I7 damit erledigt.
- **Geprueft:** Gate gruen (16 Befehle). Headless-Chrome gegen den
  Produktions-Build, frische `*.localhost`-Adresse, 360 px, Testdaten per
  Backup-Import: 70 Pruefungen gruen (alle Wege, IndexedDB-Inhalt, Fenster
  schliessen, Tombstone, Export-Texte, Training-Rad, keine Konsolenfehler).
  Fotos angesehen. Dabei zwei Fehler gefunden und behoben (leeres Blatt nach
  Loeschen; Blatt blieb nach "Anders gelaufen" offen). Nicht am Handy, kein
  Abgleich zweier Handys, kein echter Uhr-Lauf getestet.
- **Aufgeraeumt (save-state clean):** drei gemergte Branches lokal geloescht,
  verwaisten Worktree-Eintrag bereinigt. Es gibt nur noch `master`, keine
  Worktrees. Uebrig ist ein LEERER Ordner
  `.claude\worktrees\exercise-images-crop-e10a06` (gitignoriert, harmlos).
- **Rueckkehrpunkte:** `c3937d6` (Stand nach dieser Sitzung), `8eaa3de`
  (v2.11.0, vor dieser Sitzung), `6deda0f` (v2.10.0), `e9c2a67` (v2.9.2),
  `2eae34a` (v2.9.0), `5ab01dc` (v2.8.1), `be06855` (v2.7.1), `01031c1`
  (v2.6.0). Datenbank-Schema seit v2.x unveraendert (Dexie v4), v2.12 nur
  neue optionale Felder. Cloud-Sicherungen der Uebungs- und Log-Korrekturen
  liegen in `privat\`. impeccable auf 4.3.1 (Claude-Skills-Commit `d45f982`,
  nicht gepusht); `PRODUCT.md` steht noch im Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Headless-Chrome aus Claude heraus:** Profilordner NICHT unter AppData
  (die App-Kapsel virtualisiert ihn, IndexedDB scheitert mit "backing store"),
  ohne `--incognito`. Erprobt: `C:\Users\chime\fittrack-testprofil-<zeit>`,
  danach loeschen. Testdaten per `DOM.setFileInputFiles` auf das Backup-Feld
  in Settings; Navigation per `__vue_app__...$router.push`. Testskripte liegen
  im Scratchpad der Sitzungen (nicht im Repo), zuletzt `lauf-test.mjs` unter
  `%LOCALAPPDATA%\Temp\claude\C--Projekte\93d43c28-...\scratchpad\`.
  Jedes "Fenster zu" als Pruefung werten — ein still offenes Blatt verdeckte
  sonst zwei Fehler.
- **Derselbe Trainingstag am selben Tag erneut gestartet** uebernimmt den Stand
  seines Logs (gewollt) — Starttests brauchen einen Tag ohne heutigen Log.
- **Ein Handy, das offline ein altes Geraet haelt,** koennte es beim
  naechsten Satz zurueckschreiben. Pruefen mit `uebungen-cloud.mjs`; falls
  noetig `uebungen-korrigieren.mjs --gruppe geraete` erneut (Trockenlauf
  zuerst).
- **Beinplan nach dem Tausch:** Platz 3 = Leg Extension, Platz 7 = Leg Curl
  (so wurde trainiert). Umsortieren nur auf Gabriels Wunsch.
- **Rollback auf v1.8.1 nur mit Hotfix:** ein Handy auf Schema v4 wirft mit der
  unveraenderten v1.8.1 einen Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`.
- **Browser-Pane:** ausgeblendet steht `requestAnimationFrame` still; besser
  Headless (CLAUDE.md). `preview_start` oeffnet sie auf `localhost` — dort
  keine Testdaten (koennte angemeldet sein).
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop`);
  **UserSelectModal uebernimmt nur ueber Bestaetigen** — beibehalten.

## Naechste Schritte (Claude)
0. **Meldet Gabriel Probleme aus v2.12.0** (Checkliste
   `docs/tests/v2.12.0-handy.md`): Regeln zuerst in
   `scripts/laufeintrag-test.mjs` bzw. `zyklustag-test.mjs`, Oberflaeche in
   `RunSpontanForm.vue`, `ZyklusTagFeld.vue`, `RunSessionSheet.vue`.
1. **Meldet Gabriel Probleme aus v2.11.0** (Checkliste
   `docs/tests/v2.11.0-handy.md`): Ziehen in `onTagZiehStart`/`onTagBewegung`
   (`PlanningView.vue`), Regeln zuerst im Vertrag
   `scripts/planreihenfolge-test.mjs`.
2. **Meldet Gabriel Probleme aus v2.10.0** (Checkliste
   `docs/tests/v2.10.0-handy.md`): Wechsel in `wechsleKarte`/`onCardTouchEnd`
   (`TrackingView.vue`), Regeln zuerst im Ring-Vertrag. Zeigt ein Handy
   "Person 1": Sync angemeldet? `meta/userName_*` per REST pruefen.
3. **V15-Rest (Git-Historie)** nur nach Gabriels Entscheidung, siehe
   `verbesserungen.md`.
4. **Fruehere Versionen:** v2.9 1RM in `utils/verlauf.js`; v2.8.1
   `utils/trainingGeraet.js`; v2.8 `UebungsVerlauf.vue`; v2.7
   `StartNutzerwahl.vue`, `resetActiveUsers`; v2.4 Tastatur `Modal.vue`,
   Saetze `scripts/saetze-test.mjs`; Quick-Log `buildNotificationQuickLog`,
   `public/sw-custom.js`; v2.5 `PlanningView.vue`; v2.6 Bilder nach
   `docs/uebungsbilder-chatgpt.md`. Neue Uebungen: zuerst `uebungen-cloud.mjs`.
5. **Weitere Bilder nur auf Zuruf** (Kandidaten: Kurzhantel- und
   Schraegbank-Kurzhantel-Druecken); Herunterladen nur mit Gabriels Ja.
6. **Vorgaben nachrechnen, sobald echte Laeufe da sind:** Ablauf in
   `docs/laufplan-vorgaben.md` Abschnitt 5; Garmin-Abgleich zuerst in
   `scripts/runmatch-test.mjs`.
7. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5) — seit v2.12 mit
   Zyklustag (`feedback.cycleDay`) und ungeplanten Laeufen ("Stattdessen: ...").
8. Wdh-Luecke erneut gemeldet: Diagnose in die App bauen, nicht raten.
9. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
   ausdruecklicher Freigabe.

## Offen
- **Im intervals.icu-Konto von user2 liegt noch keine Aktivitaet** (seit
  19.07.); erster echter Garmin-Test mit einem Plan-Lauf.
- **Der erste Lauf von user1 ist der eigentliche Test der Garmin-Anbindung**
  — das Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.). Seit
  v2.12 auch: ein spontaner Lauf, den die Uhr dem geplanten zuordnet, laesst
  sich per "Anders gelaufen" umhaengen (nur im Test mit Testdaten belegt).
- **Erster Deploy nach dem 19.10.2026** laeuft auf Ubuntu 26
  (`ubuntu-latest`): Actions-Lauf dann ansehen; bricht er, `runs-on` in
  `.github/workflows/deploy.yml` voruebergehend auf `ubuntu-24.04` setzen.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I8**,
  **I9** — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **v2.12.0 am Handy testen** (seit 2026-10-07)
  Beide Handys ganz schliessen und neu oeffnen, dann
  `docs/tests/v2.12.0-handy.md` abhaken. Erst wenn beide 2.12.0 zeigen,
  Rueckmeldungen mit Zyklustag aendern.
- [ ] **v2.10.0 und v2.11.0 am Handy testen** (seit 2026-10-04)
  Beide Handys ganz schliessen und neu oeffnen, dann die Checklisten
  `docs/tests/v2.10.0-handy.md` und `docs/tests/v2.11.0-handy.md` abhaken.
- [ ] **Entscheiden, ob die alten Namen aus der Git-Historie sollen** (seit 2026-10-04)
  V15-Rest in `verbesserungen.md`.
