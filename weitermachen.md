# Weitermachen — Stand 2026-10-01 (v2.8.1 ist live)

## Stand
- **Diese Sitzung (30.09.-01.10.), vier Releases, alle live per HTTP
  gegengeprueft** (Settings-Chunk mit Versionsnummer, `sw.js` precacht):
  - **v2.7.0:** Nutzerwahl per Farbkreise auf dem Startbildschirm statt
    Startdialog. In der Cloud tauschten seated leg curl/extension Name und Bild
    (waren von Anfang an vertauscht, Lisa und Gab); "bad girl"/"good girl"
    heissen Hip Abduction/Adduction. Cloud-Sicherung davor:
    `privat\cloud-sicherung-uebungen-2026-09-30T16-32-50-060Z.json`, Rueckweg
    `node .\scripts\uebungen-korrigieren.mjs --zurueck --jetzt`.
  - **v2.7.1:** Deploy-Workflow auf checkout@v7, setup-node@v7 (Node 24),
    upload-pages-artifact@v5, deploy-pages@v5 (V14 erledigt).
  - **v2.8.0:** "Verlauf ansehen" in der Detailansicht (SVG-Diagramm je
    Nutzer, 3 Mon./6 Mon./1 Jahr/Alle, Liste darunter).
  - **v2.8.1:** Ein Training gehoert seinem Handy (`deviceId` am workoutLog).
    Anlass: Gabs Handy sprang am 01.10. dreimal in Lisas laufendes Training
    von IHREM Handy und schrieb dessen Besetzung auf Gab um; per Cloud-Daten
    bewiesen. Lisas Log `mupah29r47yzcou` ist wieder auf Lisa gestellt
    (Sicherung in `privat\cloud-sicherung-workoutlog-*`).
- **Geprueft:** Gate gruen (14 Befehle, neu `verlauf-test`,
  `training-geraet-test`). Headless-Tests je Release auf frischer Adresse:
  Startkreise, Verlauf (27 Pruefungen), fremdes Training (13) — alle gruen,
  keine Konsolenfehler; die frueheren Tests liefen gegen 2.8.1 erneut gruen.
- **CLAUDE.md gestrafft** (01.10., Auftrag Gabriel): 30.100 -> 20.300 Zeichen,
  keine Regel entfernt; Details stehen jetzt in Skript-Koepfen, `pruefen.txt`
  und den Tests.
- **Nicht geprueft, nur am Handy:** Optik/Tippen der Kreise, Wischen im
  Verlauf, das Verhalten mit zwei Handys (Listen in `docs/tests/`).
- **Rueckkehr:** vor dieser Sitzung `01031c1` (v2.6.0), vor 2.8.0 `be06855`,
  vor der Straffung `5ab01dc` (v2.8.1). Alle mit gleichem Datenbank-Schema.
- **Aus frueheren Sitzungen:** impeccable auf 4.3.1 (Claude-Skills-Commit
  `d45f982`, nicht gepusht); `PRODUCT.md` steht noch im Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Bis BEIDE Handys 2.8.1 zeigen:** eine alte Version springt weiter in das
  offene Training des anderen Handys, und sie kennt die neuen Uebungsnamen
  nicht — dort nicht "Standard-Uebungen laden" (legt "bad girl"/"good girl"
  neu an; `uebungen-dubletten.mjs` hilft nur bei gleichem Namen).
- **Trainings von vor 2.8.1 gelten als fremd:** ein am Update-Tag schon
  laufendes Training setzt die App nicht fort — den Tag einfach neu antippen.
- **Beinplan nach dem Tausch:** Platz 3 = Leg Extension, Platz 7 = Leg Curl
  (so wurde trainiert). Umsortieren nur auf Gabriels Wunsch.
- **Rollback auf v1.8.1 nur mit Hotfix:** ein Handy auf Schema v4 wirft mit der
  unveraenderten v1.8.1 einen Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`.
- **Geraete in der Cloud noch alt:** lunges (Kurzhantel), hip thrusts
  (Langhantel), chest supported row (Kurzhantel) — `uebungen-cloud.mjs` zeigt
  Abweichungen zur Standardliste, bis Gabriel im Katalog umstellt.
- **Browser-Pane:** ausgeblendet steht `requestAnimationFrame` still (rAF per
  `setTimeout` ersetzen, per `element.click()` klicken); Tests als EIN
  `browser_batch`, der mit `navigate` beginnt. Besser Headless (CLAUDE.md).
- **Dev-Server liest eine geaenderte `package.json` nicht neu;** Pinia-Stores
  haben kein HMR; Konsolenfehler mit `?t=`-Zeitstempel sind Zwischenstaende.
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop`);
  **UserSelectModal uebernimmt nur ueber Bestaetigen** — beibehalten.

## Naechste Schritte (Claude)
1. **Rueckmeldungen aus Gabriels Handy-Tests von v2.0-v2.8.1 abarbeiten**
   (Checklisten in `docs/tests/`). v2.8.1: Regel `utils/trainingGeraet.js`
   (zuerst `scripts/training-geraet-test.mjs`), Kennung `deviceId` im auth store.
   v2.8: `components/tracking/UebungsVerlauf.vue` (Masse B/H/RL/RR/RO/RU,
   Antippen `zeigeAuf`), Regeln zuerst in `scripts/verlauf-test.mjs`. v2.7:
   `StartNutzerwahl.vue`, `resetActiveUsers` (App.vue, `finishWorkout`,
   `onSwMessage`). v2.4: Tastatur in `Modal.vue` (`TASTATUR_AB_PX`); Saetze
   zuerst in `scripts/saetze-test.mjs`; Karte ueber `kartenZeilen` in
   `TrackingView.vue` (`.user-ring-btn` auf 360 px gekuerzt). Wischen:
   `onCardTouchEnd`; Quick-Log: `buildNotificationQuickLog`,
   `public/sw-custom.js`. v2.5: `PlanningView.vue` (`HALTEN_MS`, `RAND_TEMPO`).
   v2.6: Bilder nach `docs/uebungsbilder-chatgpt.md`, Rad-Regel
   `utils/radWerte.js`. Neue Uebungen in der App: zuerst `uebungen-cloud.mjs`.
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
- **Erster Deploy nach dem 19.10.2026** laeuft auf Ubuntu 26
  (`ubuntu-latest`): Actions-Lauf dann ansehen; bricht er, `runs-on` in
  `.github/workflows/deploy.yml` voruebergehend auf `ubuntu-24.04` setzen.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**, **I8**
  (alle Saetze eines Tages in der History), **I9** (einzelnen Satz loeschen)
  — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **Beide Handys auf 2.8.1 bringen und durchklicken** — App auf BEIDEN Handys ganz schliessen und neu oeffnen, unter Settings steht 2.8.1; bis dahin auf keinem Handy "Standard-Uebungen laden" tippen. Liste: `docs/tests/v2.8.1-handy.md` (seit 2026-10-01)
- [ ] **v2.8.0 am Handy durchklicken** (Verlauf) — Liste: `docs/tests/v2.8.0-handy.md` (seit 2026-10-01)
- [ ] **v2.7.0 am Handy durchklicken** (Startkreise, Uebungsnamen) — Liste: `docs/tests/v2.7.0-handy.md` (seit 2026-09-30)
- [ ] **v2.6.0 am Handy durchklicken** — Liste: `docs/tests/v2.6.0-handy.md`; dabei sagen, welche Bilder nachgebessert werden sollen (seit 2026-09-28)
- [ ] **Geraete im Katalog umstellen:** lunges auf Langhantel, hip thrusts und chest supported row auf Maschine (Gewichte) — die Standardliste ist schon korrigiert, die Eintraege in der App nicht; seit dem Rad-Fix gefahrlos (seit 2026-09-28)
- [ ] **v2.5.0 am Handy durchklicken** — Liste: `docs/tests/v2.5.0-handy.md` (seit 2026-09-27)
- [ ] **v2.4.0 am Handy durchklicken** — Settings -> "Saetze je Uebung" -> bei Lisa 3; Liste: `docs/tests/v2.4.0-handy.md` (seit 2026-09-26)
- [ ] **v2.3.0 am Handy durchklicken** — Liste: `docs/tests/v2.2.0-handy.md`; "Bilder automatisch zuordnen" ist nicht mehr noetig, alle Bild-Keys in der Cloud sind gueltig (seit 2026-09-24)
- [ ] **v2.1.0 am Handy durchklicken** — Liste: `docs/tests/v2.1.0-handy.md`; der Bilder-Teil ist durch v2.6.0 ueberholt (seit 2026-09-23)
- [ ] **Bens altes Single-Backup sichern — jetzt** (seit 2026-09-22)
  Die Single-App ist seit dem v2-Deploy abgeschaltet. Auf Bens Handy die alte
  App oeffnen (sie startet vermutlich noch aus dem Zwischenspeicher),
  Settings -> "Backup exportieren (JSON)", Datei aufheben.
- [ ] **v2.0.0 auf beiden Handys durchklicken** — Liste: `docs/tests/v2.0.0-handy.md` (seit 2026-09-22)
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  Noch vier (Stand 01.10.). Ignoriert liegt darin nur `.claude/` und
  nachbaubares `dist/` bzw. `node_modules/`. Je Zeile ein Worktree (PowerShell):
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fittrack-fortsetzung-ef2a20"`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"`
