# Weitermachen — Stand 2026-09-24 (v2.3.0 ist live)

## Stand
- **v2.3.0 ist LIVE (24.09.):** Tracking-Kopf mit Farbkreisen der
  Trainierenden, Werkzeugzeile "+ Uebung / Notiz / Zyklus" unter der Liste
  (Variante C aus drei Skizzen, Gabriels Wahl), die vier in der App
  nachgetragenen Uebungen sind Standard, Butterfly reverse hat die Zeichnung
  reverse-pec-deck (Details: CHANGELOG 2.3.0). Tag `v2.3.0` auf `9cdb3a2`,
  Actions-Lauf 35999523856 gruen. Live-Gegenprobe per HTTP: Settings-Chunk
  enthaelt 2.3.0, `sw.js` precacht 66 WebP-Phasen und 5 SVGs. Vorher: Gate
  gruen, Browser-Test auf frischer Adresse (36/36 zugeordnet), Screenshots
  der Werkzeugzeile per Headless-Chrome auf 360 px (Pane war ausgeblendet).
- **v2.2.0 (24.09.):** KI-Bilder fuer die Arm-Uebungen und Dips (Sammelbilder
  6 und 7); v2.1.0 (23.09.): KI-Bilder fuer 28 Uebungen aus Sammelbild 1-5.
- **Alle Uebungen der App sichtbar:** `scripts/uebungen-cloud.mjs` (nur lesen)
  zeigte am 24.09. 36 Uebungen, alle jetzt in der Standardliste.
- **Werkzeug fuer Bildtausch:** `scripts/uebungsbilder-schneiden.mjs` mit
  Tabelle `scripts/uebungsbilder-zuschnitt.mjs` (Regeln in der CLAUDE.md).
- **Design-Werkzeug impeccable auf 4.3.1** (Claude-Skills-Commit `d45f982`,
  nicht gepusht; Ordner aus der Originalquelle ersetzt, nicht per npx).
  `PRODUCT.md` steht im Projekt, noch im Schema von 3.5.0.
- **Rueckkehr:** Tag `v2.2.0` ist der vorherige Live-Stand (gleiches Schema).
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
1. **Rueckmeldungen aus Gabriels Handy-Tests von v2.0-v2.3 abarbeiten**
   (Checklisten in `docs/tests/`). Wischen: `onCardTouchEnd` in
   `TrackingView.vue`; Quick-Log: `buildNotificationQuickLog` und
   `public/sw-custom.js`; Bilder: Rahmen, Masken, Ausrichtung in
   `scripts/uebungsbilder-zuschnitt.mjs`, danach
   `uebungsbilder-schneiden.mjs --bogen <datei>` ansehen; neues Sammelbild
   erst mit `--vermessen <ordner>` ausmessen (anderer Massstab: vorher
   verkleinern, siehe Kopfkommentar). Vertrag im Matching-Test. Neue
   Uebungen in der App: zuerst `uebungen-cloud.mjs` laufen lassen.
2. **Muskelbild (KI, 25 Figurenpaare, Anhang vom 24.09.) ist beurteilt,
   nicht eingebaut:** 14 von 36 Uebungen passen sauber, 16 mit Abstrichen,
   6 fehlen (Leg curl, seated leg curl, seated leg extension, Dips, beide
   Bizeps-Curls). Maengel: Bizeps-Paare markieren hinten den Trizeps, Reihe 2
   zeigt zwei Rueckansichten, Reihe 5 ist unten abgeschnitten, Haupt- und
   Hilfsmuskeln nicht unterschieden. Liefert Gabriel ein ergaenztes Bild:
   ein Paar je Muskelprofil (rund 20, Profile = primaer/sekundaer im
   Manifest) und erst dann entscheiden, ob es die MuscleMap ersetzt.
3. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (fruehestens nach dem
   ersten Garmin-Lauf): Ablauf in `docs/laufplan-vorgaben.md` Abschnitt 5.
4. Nach dem ersten Lauf den Garmin-Abgleich pruefen; bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` erweitern, dann `src/utils/runMatch.js`.
5. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
6. Meldet Gabriel die Wdh-Luecke erneut: Diagnose in die App bauen
   (Trefferzahl je Uebung/Nutzer sichtbar machen), nicht raten.
7. Probleme mit "Workout beenden"/Quick-Log: `public/sw-custom.js` und die
   Notification-Payload in `TrackingView.vue` pruefen.
8. Reiter zu eng auf Gabriels Handy: Schwelle der Label-Media-Query in
   `BottomNav.vue` anheben statt Labels kuerzen.
9. Paket 3 des Laufplaners (Wochenbericht per Telegram) nur nach
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
- [ ] **v2.3.0 am Handy durchklicken** — App neu starten, dann Settings -> "Bilder automatisch zuordnen", sonst bleibt Butterfly reverse ohne Bild; Liste: `docs/tests/v2.2.0-handy.md` (seit 2026-09-24)
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
