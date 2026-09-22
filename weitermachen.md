# Weitermachen — Stand 2026-09-22 (v2.0.0 ist live)

## Stand
- **v2.0.0 ist LIVE:** Tag `v2.0.0` auf `51ff4ef`, GitHub-Actions-Lauf
  35776949589 gruen (build + deploy). Live-Gegenprobe per HTTP: der
  SettingsView-Chunk enthaelt 2.0.0, `sw.js` precacht die neuen Zeichnungen,
  `/single/` und die alten Fotos liefern 404. Telegram-Hinweis an Gabriel ist
  raus (Update-Anleitung, Warnung zu Bens Single-App, Handy-Tests).
- **Inhalt von v2** (Details: CHANGELOG 2.0.0): Autopilot-Lauf P1-P13 nach
  `docs/plan-fittrack-v2.md` (13/13 im ersten Anlauf gruen, rund 82 USD),
  danach interaktiv nachgezogen: Startdialog hakt nur den Standard-Nutzer
  vor; Chin Up im Standard-Katalog; Standard-Uebung JE NUTZER im
  Alternativen-Ring (Stern, gesynct am Plan); Zeichnungen aus Workout Guide
  statt Fotos (CC BY-SA 4.0, Nachweis in Settings -> Info und
  `public/uebungsbilder/LIZENZ.md`).
- **Vor dem Deploy geprueft:** Gate gruen (7 Tests + Build); Regressionstest
  auf dem Produktions-Build (frische Adresse, ohne Login): Version 2.0.0,
  Startdialog, Uebungen laden + Bilder zuordnen, Training starten, Satz
  speichern, History zeigt ihn, Laufen-Reiter. Die Pane war ausgeblendet —
  nur per DOM belegt, keine Optik; Offline-Verhalten ist nur am Handy pruefbar.
- **Rueckkehr:** Tag `v1.8.1` ist der vorherige Live-Stand (siehe Stolperfallen).

## Offen
- **In Gabriels intervals.icu-Konto liegt noch keine Aktivitaet** (seit 19.07.
  nicht gelaufen); erster echter Garmin-Test mit seinem Plan-Lauf.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung** — ihr
  intervals.icu-Konto bekommt nur Laeufe nach dem Verbinden (Stand 10.09.).
- **V14** (Deploy-Actions auf Node-24-faehige Versionen heben) wartet auf
  Gabriels Freigabe. Der v2-Deploy am 22.09. lief damit noch gruen.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7**
  (Beschreibungen in `verbesserungen.md`).

## Naechste Schritte (Claude)
1. **Rueckmeldungen aus Gabriels Handy-Test von v2 abarbeiten** (Checkliste
   unten). Wischen: `onCardTouchEnd` in `TrackingView.vue`; Quick-Log:
   `buildNotificationQuickLog` und `public/sw-custom.js`; Zeichnungen:
   Manifest + `uebungsBilder.js`, Vertrag im Matching-Test.
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

## Was Gabriel selbst tun muss
- [ ] **Bens altes Single-Backup sichern — jetzt.** Die Single-App ist seit dem
  v2-Deploy abgeschaltet. Auf Bens Handy die alte App oeffnen (sie startet
  vermutlich noch aus dem Zwischenspeicher), Settings -> "Backup exportieren
  (JSON)", Datei aufheben. (seit 2026-09-22)
- [ ] **v2.0.0 auf beiden Handys pruefen** (seit 2026-09-22)
  - App ganz schliessen und neu oeffnen, unter Settings steht 2.0.0
  - Settings: Standard-Nutzer je Handy pruefen (der Startdialog hakt nur ihn vor)
  - Einmal, ein Handy reicht: Settings -> "Bilder automatisch zuordnen"
  - Chin Up anlegen: Katalog, Plus, Bild "Chin-up" ("Standard-Uebungen laden"
    legt auch bewusst geloeschte Standard-Uebungen wieder an)
  - Planung: Alternativen hinterlegen (z.B. Latzug und Chin Up), im Workout
    per Stern den eigenen Standard merken; Wischen auf dem eigenen
    Karten-Bereich wechselt nur die eigene Uebung
  - Sperrbildschirm-Knopf mit 1 und mit 3 aktiven Nutzern
  - Zeichnungen offline: nach dem ersten Laden Flugmodus, Detailansicht oeffnen
  - Lisas Zyklustag-Rad
  - Aus der v1.8.1-Pruefung uebernommen: Karte zeigt vor dem Eintragen
    Gewicht x Wdh; Uebung tauschen, Wdh bleiben stehen; Rad startet mit
    genau diesen Zahlen
- [ ] **Worktree-Rest entfernen:** `.claude\worktrees\vigorous-elion-220387`
  enthaelt nur eine pruefsummengleiche Kopie der Autopilot-Protokolle, sein
  Branch ist gemergt. Zeigt in der Desktop-App eine Sitzung auf diesen
  Ordner, sie vorher schliessen. Befehl (PowerShell):
  `Remove-Item -LiteralPath "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387\.claude\autopilot" -Recurse -Force; git -C "C:\Projekte\Fitness Tracker" worktree remove "C:\Projekte\Fitness Tracker\.claude\worktrees\vigorous-elion-220387"; if ($?) { git -C "C:\Projekte\Fitness Tracker" branch -d claude/wiederholungszahl-exercise-switch-8b736b }`
  (seit 2026-09-22)
- [ ] Rueckmeldung nach dem Lauf am Handy testen (v1.6.0 ist live) (seit 2026-09-07)
  - App schliessen und neu oeffnen, sonst zeigt sie noch 1.5.0
  - Laufen, Woche: einen erledigten Lauf antippen, Wie war es? tippen, Stufe und Notiz speichern
  - Laufen, Plan: Nur Rueckmeldungen kopieren antippen und den Text in den Chat kleben
- [ ] Lisas Handy: App neu starten, damit die Tempovorgaben ankommen (seit 2026-09-09)
- [ ] Claude Rueckmeldung geben (Stand 16.09., ergaenzt 22.09.) (seit 2026-09-16)
  - Soll die Zeile Erledigt ohne Rueckmeldung im kopierten Kurztext bleiben?
  - save-state clean und ignorierte privat-Dateien: Skill anpassen?
  - V14 freigeben: Deploy-Actions auf neue Version heben?
  - Die Projekt-CLAUDE.md ist auf rund 19.600 Zeichen gewachsen: Straffung vorschlagen lassen?

## Stolperfallen (aktuell)
- **Rollback auf v1.8.1 nur mit Hotfix:** Ein Handy, das v2 geoeffnet hat,
  steht auf IndexedDB-Schema v4; die unveraenderte v1.8.1 wirft dort einen
  Versionsfehler. Rezept: `docs/plan-fittrack-v2.md`, Abschnitt "Rollback".
- **Echte Uebungen haben nach dem Update noch keinen `imageKey`:** Bis jemand
  "Bilder automatisch zuordnen" tippt, zeigen Karten die Muskel-Grafik.
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
