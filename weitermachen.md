# Weitermachen — Stand 2026-10-02 (v2.9.0 ist live)

## Stand
- **Diese Sitzung (02.10.): v2.9.0 — geschaetztes 1RM im Verlauf.** Gabriel
  sah vorher zwei Vorschau-Bilder (eine Skala gegen zweite Skala rechts) und
  waehlte die eine Skala. Gestrichelte 1RM-Linie in Nutzerfarbe auf derselben
  kg-Achse, Ring am abgelesenen Tag, Legende, "· 1RM ≈ 62 kg" in der
  Ablesezeile, "≈ 62" klein vor jedem Listeneintrag. Epley, je Tag der beste
  Satz, ohne Wdh kein 1RM, Koerpergewicht-Uebungen ohne 1RM.
- **Geprueft:** Gate gruen (14 Befehle, `verlauf-test` mit 16 neuen Faellen).
  Headless-Test gegen den Produktions-Build auf frischer Adresse, 360 px:
  29 Pruefungen gruen (Werte, Linie, Ring beim Antippen, bester Satz, Tag ohne
  Wdh, 1 Wdh, Dips ohne 1RM, lange Zahlen ohne Querscrollen, keine sich
  ueberdeckenden Zahlen, keine Konsolenfehler). Fotos angesehen. Actions-Lauf
  gruen, live per HTTP gegengeprueft (Settings-Chunk 2.9.0, 1RM im
  ExerciseDetail-Chunk, `sw.js` precacht ihn). Tag `v2.9.0` gepusht.
- **Danach (02.10.): Geraete in der Cloud umgestellt** (Auftrag Gabriel):
  lunges Langhantel, hip thrusts und chest supported row Maschine (Gewichte).
  Trockenlauf, Sicherung `privat\cloud-sicherung-uebungen-2026-10-02T10-54-49-229Z.json`,
  Nachkontrolle und `uebungen-cloud.mjs` bestaetigen den neuen Stand.
  `uebungen-korrigieren.mjs` kann dafuer jetzt Geraete und Gruppen.
- **Gabriel hat am 02.10. alle Handy-Tests v2.0-v2.9.0 und Bens Backup
  abgehakt**, ohne Befunde zu melden.
- **Rueckkehr:** vor dieser Sitzung `4ff9935` (v2.8.1), jetzt `18a0ec7`
  (v2.9.0). Gleiches Datenbank-Schema, nichts an den Daten geaendert.
- **Aus frueheren Sitzungen:** Rueckkehrpunkte `01031c1` (v2.6.0),
  `be06855` (v2.7.1), `5ab01dc` (v2.8.1). Cloud-Sicherungen der Uebungs- und
  Log-Korrekturen vom 30.09./01.10. liegen in `privat\`. impeccable auf 4.3.1
  (Claude-Skills-Commit `d45f982`, nicht gepusht); `PRODUCT.md` steht noch im
  Schema von 3.5.0.

## Stolperfallen (aktuell)
- **Ein Handy, das offline ein altes Geraet haelt,** koennte es beim
  naechsten Satz zurueckschreiben. Pruefen mit `uebungen-cloud.mjs`; falls
  noetig `uebungen-korrigieren.mjs --gruppe geraete` erneut (Trockenlauf
  zuerst).
- **Beinplan nach dem Tausch:** Platz 3 = Leg Extension, Platz 7 = Leg Curl
  (so wurde trainiert). Umsortieren nur auf Gabriels Wunsch.
- **Rollback auf v1.8.1 nur mit Hotfix:** ein Handy auf Schema v4 wirft mit der
  unveraenderten v1.8.1 einen Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`.
- **Browser-Pane:** ausgeblendet steht `requestAnimationFrame` still (rAF per
  `setTimeout` ersetzen, per `element.click()` klicken); Tests als EIN
  `browser_batch`, der mit `navigate` beginnt. Besser Headless (CLAUDE.md).
- **Dev-Server liest eine geaenderte `package.json` nicht neu;** Pinia-Stores
  haben kein HMR; Konsolenfehler mit `?t=`-Zeitstempel sind Zwischenstaende.
- **Thumbnail-Tipps stoppen die Weiterleitung** (`@click.stop`);
  **UserSelectModal uebernimmt nur ueber Bestaetigen** — beibehalten.

## Naechste Schritte (Claude)
1. **Meldet Gabriel spaeter Probleme aus v2.0-v2.9.0** (Tests am 02.10.
   ohne Befund abgehakt; Checklisten in `docs/tests/`). v2.9: 1RM-Regel `einRM`/`mitEinRM` in
   `utils/verlauf.js` (zuerst `scripts/verlauf-test.mjs`); Lage der Zahlen
   in `beschriftungen`, Linie `einRMLinie` in `UebungsVerlauf.vue`. Eine
   zweite Skala hat Gabriel verworfen. v2.8.1: Regel
   `utils/trainingGeraet.js` (zuerst `scripts/training-geraet-test.mjs`),
   Kennung `deviceId` im auth store. v2.8: `UebungsVerlauf.vue` (Masse
   B/H/RL/RR/RO/RU, Antippen `zeigeAuf`). v2.7: `StartNutzerwahl.vue`,
   `resetActiveUsers` (App.vue, `finishWorkout`, `onSwMessage`). v2.4:
   Tastatur in `Modal.vue` (`TASTATUR_AB_PX`); Saetze zuerst in
   `scripts/saetze-test.mjs`; Karte ueber `kartenZeilen` in
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
- [ ] **Sagen, ob Uebungsbilder nachgebessert werden sollen** (Brustpresse an der Maschine, Ausfallschritt; siehe Naechste Schritte 2) — oder ob sie passen (seit 2026-10-02)
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  Noch vier (Stand 02.10.). Ignoriert liegt darin nur `.claude/` und
  nachbaubares `dist/` bzw. `node_modules/`. Je Zeile ein Worktree (PowerShell):
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fittrack-fortsetzung-ef2a20"`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"`
