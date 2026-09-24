# Weitermachen — Stand 2026-09-24 (v2.2.0 ist live)

## Stand
- **v2.2.0 ist LIVE (24.09.):** KI-Bilder auch fuer die vier Arm-Uebungen,
  neues Bild fuer Dips (Sammelbilder 6 und 7), Notiz- und Zyklustag-Knopf
  unter der Uebungsliste (Details: CHANGELOG 2.2.0). Tag `v2.2.0` auf
  `4a676ea`, Actions-Lauf 35975652599 gruen. Live-Gegenprobe per HTTP:
  SettingsView-Chunk enthaelt 2.2.0, `sw.js` precacht 66 WebP-Phasen und nur
  noch 3 SVGs, alte Arm-SVGs liefern 404. Vorher: Gate gruen, voller
  Neuschnitt liess die 28 alten Bilder byte-gleich, Browser-Test auf frischer
  Adresse (33/33 zugeordnet, Ueberblendung wechselt, Notiz-Knopf zwischen
  "+ Uebung hinzufuegen" und "Workout beenden") — Pane ausgeblendet, Optik nur
  per Uebersichtsbogen.
- **v2.1.0 (23.09.):** KI-Bilder fuer 28 Uebungen aus Sammelbild 1-5.
- **Werkzeug fuer Bildtausch:** `scripts/uebungsbilder-schneiden.mjs` mit
  Tabelle `scripts/uebungsbilder-zuschnitt.mjs` (Regeln in der CLAUDE.md).
- **Rueckkehr:** Tag `v2.1.0` ist der vorherige Live-Stand (gleiches Schema).
  Vor v2 liegt `v1.8.1` (siehe Stolperfallen).

## Stolperfallen (aktuell)
- **Rollback auf v1.8.1 nur mit Hotfix:** Ein Handy, das v2 geoeffnet hat,
  steht auf IndexedDB-Schema v4; die unveraenderte v1.8.1 wirft dort einen
  Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`, Abschnitt "Rollback".
- **Uebungen ohne gueltigen `imageKey`:** Nach v2.0 fehlt er ganz, seit v2.1
  ist er bei beiden Brustpressen, Low Row und Cable Row verwaist. Bis jemand
  "Bilder automatisch zuordnen" tippt, zeigen diese Karten die Muskel-Grafik.
- **Browser-Pane ausgeblendet:** `requestAnimationFrame` steht still, Vue-
  Seitenuebergaenge bleiben haengen. Ansicht per Direkt-URL laden, dann
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`
  setzen und per `element.click()` im javascript_tool klicken. Screenshots
  gehen dann nicht — nur DOM belegen und das so melden.
- **Pane springt zwischen zwei Runden auf die Preview-Adresse zurueck:** Tests
  als EIN `browser_batch`, der mit `navigate` beginnt. Nach einem Neustart der
  Pane ist die IndexedDB der Testadressen leer.
- **Dev-Server liest eine geaenderte `package.json` nicht neu;** Pinia-Stores
  haben kein HMR (nach Store-Aenderung neu laden); Konsolenfehler mit
  `?t=`-Zeitstempel stammen aus Editier-Zwischenstaenden.
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop` in TrackingView
  und CatalogView); **UserSelectModal uebernimmt nur ueber Bestaetigen**
  (Android-Back = abbrechen) — bei Umbauten beibehalten.

## Naechste Schritte (Claude)
1. **Rueckmeldungen aus Gabriels Handy-Tests von v2.0-v2.2 abarbeiten**
   (Checklisten in `docs/tests/`). Wischen: `onCardTouchEnd` in
   `TrackingView.vue`; Quick-Log: `buildNotificationQuickLog` und
   `public/sw-custom.js`; Bilder: Rahmen, Masken, Ausrichtung in
   `scripts/uebungsbilder-zuschnitt.mjs`, danach
   `uebungsbilder-schneiden.mjs --bogen <datei>` ansehen; neues Sammelbild
   erst mit `--vermessen <ordner>` ausmessen (anderer Massstab: vorher
   verkleinern, siehe Kopfkommentar). Vertrag im Matching-Test. Soll der
   Zyklustag-Knopf doch oben bleiben: nur er zurueck in den Kopf.
2. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (fruehestens nach dem
   ersten Garmin-Lauf): Ablauf in `docs/laufplan-vorgaben.md` Abschnitt 5.
3. Nach dem ersten Lauf den Garmin-Abgleich pruefen; bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` erweitern, dann `src/utils/runMatch.js`.
4. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
5. Meldet Gabriel die Wdh-Luecke erneut: Diagnose in die App bauen
   (Trefferzahl je Uebung/Nutzer sichtbar machen), nicht raten.
6. Probleme mit "Workout beenden"/Quick-Log: `public/sw-custom.js` und die
   Notification-Payload in `TrackingView.vue` pruefen.
7. Reiter zu eng auf Gabriels Handy: Schwelle der Label-Media-Query in
   `BottomNav.vue` anheben statt Labels kuerzen.
8. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
   ausdruecklicher Freigabe.

## Offen
- **In Gabriels intervals.icu-Konto liegt noch keine Aktivitaet** (seit 19.07.
  nicht gelaufen); erster echter Garmin-Test mit seinem Plan-Lauf.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung** — ihr
  intervals.icu-Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.).
- **V14** (Deploy-Actions anheben) wartet auf Gabriels Freigabe — jetzt mit
  Frist: `ubuntu-latest` wechselt ab 19.10.2026 auf Ubuntu 26.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**
  (Beschreibungen in `verbesserungen.md`).

## Was Gabriel selbst tun muss
- [ ] **v2.2.0 am Handy durchklicken** — App neu starten, dann Settings -> "Bilder automatisch zuordnen", sonst bleibt Dips ohne Bild; Liste: `docs/tests/v2.2.0-handy.md` (seit 2026-09-24)
- [ ] **v2.1.0 am Handy durchklicken** — zuerst einmal Settings -> "Bilder automatisch zuordnen", sonst fehlen bei vier Uebungen die Bilder; Liste: `docs/tests/v2.1.0-handy.md` (seit 2026-09-23)
- [ ] **Bens altes Single-Backup sichern — jetzt** (seit 2026-09-22)
  Die Single-App ist seit dem v2-Deploy abgeschaltet. Auf Bens Handy die alte
  App oeffnen (sie startet vermutlich noch aus dem Zwischenspeicher),
  Settings -> "Backup exportieren (JSON)", Datei aufheben.
- [ ] **v2.0.0 auf beiden Handys durchklicken** — Liste: `docs/tests/v2.0.0-handy.md` (seit 2026-09-22)
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  - `vigorous-elion-220387`: enthaelt nur eine pruefsummengleiche Kopie der
    Autopilot-Protokolle, Branch gemergt. Befehl (PowerShell):
    `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/wiederholungszahl-exercise-switch-8b736b }`
  - `fitnesstracker-fortsetzung-f8ed8f` (angelegt 23.09., keine eigenen
    Commits) und nach dem Ende dieser Sitzung `exercise-images-crop-e10a06`:
    beide gemergt, ignoriert liegt nur eine Kopie der Autopilot-Protokolle
    (identisch mit dem Hauptbaum). Befehl je Ordner:
    `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\<ordner>"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d <branch> }`
    (Branches: `claude/fitnesstracker-fortsetzung-f8ed8f`, `claude/exercise-images-crop-e10a06`)
- [ ] Rueckmeldung nach dem Lauf am Handy testen (v1.6.0 ist live) (seit 2026-09-07)
  - App schliessen und neu oeffnen, sonst zeigt sie noch 1.5.0
  - Laufen, Woche: einen erledigten Lauf antippen, Wie war es? tippen, Stufe und Notiz speichern
  - Laufen, Plan: Nur Rueckmeldungen kopieren antippen und den Text in den Chat kleben
- [ ] Lisas Handy: App neu starten, damit die Tempovorgaben ankommen (seit 2026-09-09)
- [ ] Claude Rueckmeldung geben (Stand 16.09., ergaenzt 24.09.) (seit 2026-09-16)
  - Soll die Zeile Erledigt ohne Rueckmeldung im kopierten Kurztext bleiben?
  - save-state clean und ignorierte privat-Dateien: Skill anpassen?
  - V14 freigeben: Deploy-Actions auf neue Version heben — vor dem 19.10.2026?
  - Die Projekt-CLAUDE.md ist auf rund 20.700 Zeichen gewachsen: Straffung vorschlagen lassen?
