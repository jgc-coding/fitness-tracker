# Weitermachen — Stand 2026-09-28 (v2.6.0 ist live)

## Stand
- **v2.6.0 ist LIVE (28.09.):** Alle 36 Uebungsbilder neu aus ChatGPT (12
  Reihenbilder mit je drei Uebungen, Stil-Vorbild aus den besten alten Figuren,
  Rueckenstrecker nach Gabriels Studio-Foto), neue Muskelgrafik aus EINER
  farbigen KI-Figur (18 Masken), Gewichts-Rad zeigt krumme Vorwerte (V15),
  alte Zeichnungen und Sammelbilder geloescht, Standardliste mit Gabriels
  Geraeten. Details: CHANGELOG 2.6.0, Ablauf `docs/uebungsbilder-chatgpt.md`.
  Tag `v2.6.0` auf `90e85c6`, Actions-Lauf 36409445025 gruen. Live-Gegenprobe
  per HTTP: Settings-Chunk mit 2.6.0 und neuem Bildnachweis, Muskelgrafik und
  neue Frames 200, alte SVG 404, `sw.js` precacht die Muskelgrafik.
- **Geprueft vor dem Deploy:** Gate gruen (12 Befehle, neu `radwerte-test.mjs`).
  Headless-Chrome auf frischer Adresse mit Test-Backup ueber den echten Import:
  Katalog (36 Vorschaubilder, Muskelgrafik als Platzhalter), Detailansicht
  (Ueberblendung, Muskelgrafik mit Masken), Training starten, Rad bei Lunges
  mit Vorwert 22 kg (zeigt 22 zwischen 21,25 und 22,50, speichert 22 x 8),
  Latzug 43 im 1-kg-Raster, alle Reiter ohne Konsolenfehler.
- **Nicht geprueft, nur am Handy:** Optik und Ueberblenden auf dem Geraet,
  Offline aus dem Zwischenspeicher, Rad nach echtem Geraete-Umstellen
  (Checkliste `docs/tests/v2.6.0-handy.md`).
- **Rueckkehr:** Rueckkehrpunkt vor diesem Release ist `5f0e87b` (Stand v2.5.0,
  gleiches Datenbank-Schema, keine Daten-Aenderung). Vor v2 liegt `v1.8.1`
  (siehe Stolperfallen).
- **v2.5.0 (27.09., andere Sitzung ohne Uebergabe):** Reihenfolge per Finger,
  "Standard-Uebungen laden" nur mit Cloud-Stand, Dubletten in der Cloud
  zusammengefuehrt. Cloud am 28.09.: 36 Uebungen, alle mit gueltigem Bild-Key.
- **Aus frueheren Sitzungen:** impeccable auf 4.3.1 (Claude-Skills-Commit
  `d45f982`, nicht gepusht); `PRODUCT.md` steht noch im Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Rollback auf v1.8.1 nur mit Hotfix:** Ein Handy, das v2 geoeffnet hat,
  steht auf IndexedDB-Schema v4; die unveraenderte v1.8.1 wirft dort einen
  Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`, Abschnitt "Rollback".
- **Geraete in der Cloud noch alt:** lunges (Kurzhantel), hip thrusts
  (Langhantel), chest supported row (Kurzhantel). Die Standardliste traegt seit
  v2.6.0 Gabriels Angaben — `uebungen-cloud.mjs` zeigt darum Abweichungen, bis
  Gabriel im Katalog umstellt.
- **Browser-Pane ausgeblendet:** `requestAnimationFrame` steht still, Vue-
  Seitenuebergaenge bleiben haengen. Ansicht per Direkt-URL laden, dann
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`
  setzen und per `element.click()` im javascript_tool klicken; Layout-Masse
  (`getBoundingClientRect`) stimmen trotzdem. Verlaesslicher fuer Ablauf-Tests
  und Fotos: Headless-Chrome per DevTools-Protokoll (Emulation 390 x 844,
  `--incognito` — ein Profilordner unter AppData laesst IndexedDB scheitern),
  Testdaten ueber den echten Import (Datei-Feld per `DataTransfer`).
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
1. **Rueckmeldungen aus Gabriels Handy-Tests von v2.0-v2.6 abarbeiten**
   (Checklisten in `docs/tests/`). v2.4: Tastatur in `Modal.vue`
   (`messeSichtbarenBereich`, Schwelle `TASTATUR_AB_PX`); Saetze zuerst in
   `scripts/saetze-test.mjs`, dann `src/utils/saetze.js`; Karte ueber
   `kartenZeilen` und CSS in `TrackingView.vue` — lange Namen im
   Wechsel-Knopf sind auf 360 px gekuerzt (`.user-ring-btn`, Stern und
   Steigern-Knopf nehmen je 24 px). Wischen: `onCardTouchEnd`; Quick-Log:
   `buildNotificationQuickLog` und `public/sw-custom.js`. v2.5: Umsortieren in
   `PlanningView.vue` (`HALTEN_MS`, `RAND_TEMPO`), Regeln
   `utils/planReihenfolge.js`. v2.6: Bilder nach `docs/uebungsbilder-chatgpt.md`,
   Muskelgrafik `scripts/muskelgrafik-bauen.mjs`, Rad-Regel `utils/radWerte.js`
   (zuerst `scripts/radwerte-test.mjs`). Neue Uebungen in der App: zuerst
   `uebungen-cloud.mjs` laufen lassen.
2. **Bilder nachbessern, wenn Gabriel am Handy geschaut hat** (er wollte erst
   abwarten): Kandidaten sind die Brustpresse an der Maschine (Endbild zeigt
   eine andere Maschine) und der Ausfallschritt (Endbild gedreht); schwaecher
   Kurzhantel- und Schraegbank-Kurzhantel-Druecken (Endbild aus anderem Winkel,
   nach dem Ausrichten tragbar). Ein Auftrag mit drei Reihen, Ablauf
   `docs/uebungsbilder-chatgpt.md`; Herunterladen nur mit Gabriels Ja.
3. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (fruehestens nach dem
   ersten Garmin-Lauf): Ablauf in `docs/laufplan-vorgaben.md` Abschnitt 5.
4. Nach dem ersten Lauf den Garmin-Abgleich pruefen; bei Abweichungen zuerst
   `scripts/runmatch-test.mjs` erweitern, dann `src/utils/runMatch.js`.
5. Rueckmeldungen in die Plananpassung einbauen (`lauf-cloud.mjs holen`,
   Regeln in `docs/laufplan-format.md` Abschnitt 5).
6. Meldet Gabriel die Wdh-Luecke erneut: Diagnose in die App bauen
   (Trefferzahl je Uebung/Nutzer sichtbar machen), nicht raten. Die
   Vorschlaege laufen seit v2.4 ueber `ladeVorschlag` (eine Abfrage
   `getLastSets` ohne das laufende Workout).
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
  Frist: `ubuntu-latest` wechselt ab 19.10.2026 auf Ubuntu 26 (Hinweis auch
  im Lauf 36409445025).
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**, **I8**
  (alle Saetze eines Tages in der History), **I9** (einzelnen Satz loeschen)
  — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **v2.6.0 am Handy durchklicken** — App ganz schliessen und neu oeffnen, unter Settings steht 2.6.0; Liste: `docs/tests/v2.6.0-handy.md`; dabei sagen, welche Bilder nachgebessert werden sollen (seit 2026-09-28)
- [ ] **Geraete im Katalog umstellen:** lunges auf Langhantel, hip thrusts und chest supported row auf Maschine (Gewichte) — die Standardliste ist schon korrigiert, die Eintraege in der App nicht; seit dem Rad-Fix gefahrlos (seit 2026-09-28)
- [ ] **v2.5.0 am Handy durchklicken** — Liste: `docs/tests/v2.5.0-handy.md` (seit 2026-09-27)
- [ ] **v2.4.0 am Handy durchklicken** — beide Handys neu starten, dann Settings -> "Saetze je Uebung" -> bei Lisa 3; Liste: `docs/tests/v2.4.0-handy.md` (seit 2026-09-26)
- [ ] **v2.3.0 am Handy durchklicken** — Liste: `docs/tests/v2.2.0-handy.md`; "Bilder automatisch zuordnen" ist nicht mehr noetig, alle Bild-Keys in der Cloud sind gueltig (seit 2026-09-24)
- [ ] **v2.1.0 am Handy durchklicken** — Liste: `docs/tests/v2.1.0-handy.md`; der Bilder-Teil ist durch v2.6.0 ueberholt (seit 2026-09-23)
- [ ] **Bens altes Single-Backup sichern — jetzt** (seit 2026-09-22)
  Die Single-App ist seit dem v2-Deploy abgeschaltet. Auf Bens Handy die alte
  App oeffnen (sie startet vermutlich noch aus dem Zwischenspeicher),
  Settings -> "Backup exportieren (JSON)", Datei aufheben.
- [ ] **v2.0.0 auf beiden Handys durchklicken** — Liste: `docs/tests/v2.0.0-handy.md` (seit 2026-09-22)
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  Alle Branches darin sind gemergt; ihre Branches loescht danach der naechste
  `/save-state clean`. Ignoriert liegt nur `.claude/` (Autopilot-Protokolle,
  am 26.09. identisch mit dem Hauptordner) und nachbaubares `dist/` bzw.
  `node_modules/`. Je Zeile ein Worktree (PowerShell):
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\backyard-ultra-training-6744b9"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\festive-mclaren-e87f6a"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fitnesstracker-fortsetzung-f8ed8f"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"`
  - nach dem Ende der Sitzung vom 28.09.: `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fittrack-fortsetzung-ef2a20"`
- [ ] Rueckmeldung nach dem Lauf am Handy testen (v1.6.0 ist live) (seit 2026-09-07)
  - App schliessen und neu oeffnen, sonst zeigt sie noch 1.5.0
  - Laufen, Woche: einen erledigten Lauf antippen, Wie war es? tippen, Stufe und Notiz speichern
  - Laufen, Plan: Nur Rueckmeldungen kopieren antippen und den Text in den Chat kleben
- [ ] Lisas Handy: App neu starten, damit die Tempovorgaben ankommen (seit 2026-09-09)
- [ ] Claude Rueckmeldung geben (Stand 16.09., ergaenzt 28.09.) (seit 2026-09-16)
  - Soll die Zeile Erledigt ohne Rueckmeldung im kopierten Kurztext bleiben?
  - save-state clean und ignorierte privat-Dateien: Skill anpassen?
  - V14 freigeben: Deploy-Actions auf neue Version heben — vor dem 19.10.2026?
  - Die Projekt-CLAUDE.md ist auf rund 28.100 Zeichen gewachsen: Straffung vorschlagen lassen?
