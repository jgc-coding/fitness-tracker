# Weitermachen — Stand 2026-09-26 (v2.4.0 ist live)

## Stand
- **v2.4.0 ist LIVE (26.09.):** Wuensche von Gabriel und Lisa umgesetzt
  (Details: CHANGELOG 2.4.0). Satzzahl je Person in den Einstellungen (Lisa
  soll auf 3), kompakte Tracking-Karte (Variante A aus zwei Skizzen, Gabriels
  Wahl), Wechsel-Knopf nennt die Alternative, Schiebe-Animation nach Tipp und
  Wisch, Alternativen in der Planung eingerueckt mit Pfeil und x (Gabriels
  eigene Mischung), Suchfenster ueber der Bildschirmtastatur. Tag `v2.4.0` auf
  `8c9197a`, Actions-Lauf 36260889519 gruen. Live-Gegenprobe per HTTP:
  Settings-Chunk enthaelt 2.4.0, TrackingView-Chunk mit Satz-Punkten und
  Schiebe-Animation, `sw.js` precacht ihn.
- **Geprueft vor dem Deploy:** Gate gruen (9 Befehle, neu `saetze-test.mjs`).
  Browser-Test auf frischer Adresse: Planung, Wechsel und Wischen samt
  Animations-Klassen, Satz-Ablauf Lisa -> Gab -> Lisa -> Lisa, Neuladen mitten
  im Training, Tausch, Hinzufuegen, individuelles Training, History, Katalog,
  Laufen, Anordnung fuer 1/2/3 Personen. Tastatur per nachgestelltem
  `visualViewport`, Quick-Log-Warteschlange und Sperrbildschirm-Zeilen direkt
  an der Komponente, Screenshots per Headless-Chrome auf 360 px.
- **Nicht geprueft, nur am Handy:** echte Tastatur, Gefuehl der Animation,
  Sperrbildschirm-Knopf, Sync der Satz-Einstellung zwischen den Handys
  (Checkliste `docs/tests/v2.4.0-handy.md`).
- **Rueckkehr:** Rueckkehrpunkt vor diesem Release ist `91707d3` (Tag `v2.3.0`
  auf `9cdb3a2`, gleiches Schema, keine Datenbank-Aenderung). Vor v2 liegt
  `v1.8.1` (siehe Stolperfallen).
- **Aus frueheren Sitzungen:** impeccable auf 4.3.1 (Claude-Skills-Commit
  `d45f982`, nicht gepusht); `PRODUCT.md` steht noch im Schema von 3.5.0.

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
  setzen und per `element.click()` im javascript_tool klicken; Layout-Masse
  (`getBoundingClientRect`) stimmen trotzdem. Screenshots dann per
  Headless-Chrome mit DevTools-Protokoll (Emulation 360 x 800) und
  `--incognito` — ein Profilordner unter AppData laesst IndexedDB scheitern.
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
1. **Rueckmeldungen aus Gabriels Handy-Tests von v2.0-v2.4 abarbeiten**
   (Checklisten in `docs/tests/`). v2.4: Tastatur in `Modal.vue`
   (`messeSichtbarenBereich`, Schwelle `TASTATUR_AB_PX`); Saetze zuerst in
   `scripts/saetze-test.mjs`, dann `src/utils/saetze.js`; Karte ueber
   `kartenZeilen` und CSS in `TrackingView.vue` — lange Namen im
   Wechsel-Knopf sind auf 360 px gekuerzt (`.user-ring-btn`, Stern und
   Steigern-Knopf nehmen je 24 px). Wischen: `onCardTouchEnd`; Quick-Log:
   `buildNotificationQuickLog` und `public/sw-custom.js`; Bilder: Rahmen,
   Masken, Ausrichtung in `scripts/uebungsbilder-zuschnitt.mjs`, danach
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
  Frist: `ubuntu-latest` wechselt ab 19.10.2026 auf Ubuntu 26.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**, **I8**
  (alle Saetze eines Tages in der History), **I9** (einzelnen Satz loeschen)
  — Beschreibungen in `verbesserungen.md`.

## Was Gabriel selbst tun muss
- [ ] **v2.4.0 am Handy durchklicken** — beide Handys neu starten, dann Settings -> "Saetze je Uebung" -> bei Lisa 3; Liste: `docs/tests/v2.4.0-handy.md` (seit 2026-09-26)
- [ ] **v2.3.0 am Handy durchklicken** — App neu starten, dann Settings -> "Bilder automatisch zuordnen", sonst bleibt Butterfly reverse ohne Bild; Liste: `docs/tests/v2.2.0-handy.md` (seit 2026-09-24)
- [ ] **v2.1.0 am Handy durchklicken** — zuerst einmal Settings -> "Bilder automatisch zuordnen", sonst fehlen bei vier Uebungen die Bilder; Liste: `docs/tests/v2.1.0-handy.md` (seit 2026-09-23)
- [ ] **Bens altes Single-Backup sichern — jetzt** (seit 2026-09-22)
  Die Single-App ist seit dem v2-Deploy abgeschaltet. Auf Bens Handy die alte
  App oeffnen (sie startet vermutlich noch aus dem Zwischenspeicher),
  Settings -> "Backup exportieren (JSON)", Datei aufheben.
- [ ] **v2.0.0 auf beiden Handys durchklicken** — Liste: `docs/tests/v2.0.0-handy.md` (seit 2026-09-22)
- [ ] **Alte Worktrees entfernen**, nur wenn in der Desktop-App keine Sitzung mehr darauf zeigt (seit 2026-09-22)
  In allen liegt ignoriert nur eine Kopie der Autopilot-Protokolle, am
  26.09. geprueft: identisch mit dem Hauptordner. Alle Branches sind gemergt.
  Ordnername und Branch passen inzwischen nicht mehr zusammen — die Befehle
  (PowerShell, je Zeile ein Worktree) nennen das richtige Paar:
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\exercise-images-crop-e10a06"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/laufplan-review-reschedule-970ea5 }`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\festive-mclaren-e87f6a"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/exercise-images-crop-e10a06 }`
  - `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\fitnesstracker-fortsetzung-f8ed8f"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/exercise-muscle-images-f1d6f8 }`
  - `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/wiederholungszahl-exercise-switch-8b736b }`
  - nach dem Ende der Sitzung vom 26.09.: `git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\ubungen-system-refinements-64f8ad"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/ubungen-system-refinements-64f8ad }`
- [ ] Rueckmeldung nach dem Lauf am Handy testen (v1.6.0 ist live) (seit 2026-09-07)
  - App schliessen und neu oeffnen, sonst zeigt sie noch 1.5.0
  - Laufen, Woche: einen erledigten Lauf antippen, Wie war es? tippen, Stufe und Notiz speichern
  - Laufen, Plan: Nur Rueckmeldungen kopieren antippen und den Text in den Chat kleben
- [ ] Lisas Handy: App neu starten, damit die Tempovorgaben ankommen (seit 2026-09-09)
- [ ] Claude Rueckmeldung geben (Stand 16.09., ergaenzt 26.09.) (seit 2026-09-16)
  - Soll die Zeile Erledigt ohne Rueckmeldung im kopierten Kurztext bleiben?
  - save-state clean und ignorierte privat-Dateien: Skill anpassen?
  - V14 freigeben: Deploy-Actions auf neue Version heben — vor dem 19.10.2026?
  - Die Projekt-CLAUDE.md ist auf rund 24.900 Zeichen gewachsen: Straffung vorschlagen lassen?
