# Weitermachen — Stand 2026-09-09

## Stand
- **v1.7.1 ist LIVE** (Tags `v1.7.0` und `v1.7.1`, master, Actions gruen,
  Live-Bundle geprueft: Version 1.7.1 und die Vorgabe-Anzeige stecken im
  ausgelieferten `RunningView`-Bundle). Gabriel hat am Handy bestaetigt, dass
  die Vorgaben ankommen.
- **Der PC haengt jetzt direkt an der Cloud** (`scripts/lauf-cloud.mjs`):
  `holen` schreibt den Stand als normale Plandatei nach `privat\`, `schreiben`
  fuehrt eine Plandatei ueber DASSELBE Merge-Modul wie die App mit der Cloud
  zusammen. Ohne `--jetzt` immer Trockenlauf, davor eine Sicherung, beim
  Loeschen ein Tombstone. Der Dateiaustausch von Hand entfaellt damit.
- **Jeder geplante Lauf traegt Puls und Tempo** (`targets`, bis zu vier
  Abschnitte je Lauf). Beide Jahresplaene stehen damit in der Cloud — Gab 51,
  Lisa 120 Laeufe, danach zurueckgelesen und zeichengenau gegen die Quelldateien
  verglichen, null Abweichungen.
- **Das Modell** (`scripts/lib/pace-modell-kern.mjs`) schaetzt
  `Tempo = Puls + Hoehenmeter/km + Dauer`, gewichtet juengere Laeufe staerker,
  sortiert Ausreisser aus und meldet sie namentlich. Guete: Gab 74 Prozent bei
  18 s/km Streuung, Lisa 62 Prozent bei 23 s/km.
- Vertraege: `laufplan-merge-test.mjs` 112 Faelle (T1-T13 fuer die Vorgabe),
  neuer `pace-modell-test.mjs` 19 Faelle. Beide im Done-Gate.
- Aufgeraeumt: Branch und Worktree `garmin-connection-sync-319408` sind weg.
- **CLAUDE.md gestrafft** (Gabriels Ok am 09.09.): 17.288 -> 12.718 Zeichen, unter
  dem Richtwert 13.000. Keine Regel entfernt, nur Prosa verdichtet und der
  Dateibaum auf das reduziert, was der Dateiname nicht verraet. Dabei zwei
  veraltete Angaben berichtigt (Dexie-Schema v2 -> v3, "5 Routen" -> 6 Reiter)
  und drei Stolperfallen entfernt, die doppelt hier standen.

## Offen
- **Praxistest der Rueckmeldung am Handy** (v1.6.0: Stufe und Notiz geben,
  Kurztext kopieren) steht weiterhin aus. Steht im Hub.
- **In Gabriels intervals.icu-Konto liegt noch keine einzige Aktivitaet.** Er
  ist seit 19.07.2026 nicht gelaufen; die Garmin-Verbindung holt keine Historie
  nach. Erster echter Test mit seinem Plan-Lauf am Sa 19.09.2026 — dann ist
  `source: "GARMIN"` statt `"UPLOAD"` zu erwarten.
- **Lisas erster Lauf ist der eigentliche Test der Garmin-Anbindung.** Ihr Zugang
  steht (10.09.), aber intervals.icu bekommt nur Laeufe, die NACH dem Verbinden
  aufgezeichnet wurden — bis dahin ist ihr Konto dort leer. Gleiche Lage wie bei
  Gabriel.
- **Offene Frage zum Kurztext:** Soll die Zeile "Erledigt ohne Rueckmeldung: N"
  im kopierten Text bleiben? Frage liegt im Hub.
- Drei leere Worktree-Huellen unter `.claude\worktrees\` sind weiterhin von
  einem Prozess gesperrt (`garmin-connection-sync-319408`,
  `lisa-training-plan-e35753`, `lisa-training-tracking-extract-f10072`). Git
  kennt sie nicht mehr, es sind reine Ordnerreste.
- Zurueckgestellt, nur auf Zuruf: **V8**, **I1**, **I5**, **I7** (Beschreibungen
  in `verbesserungen.md`).
- Der echte Knopfdruck auf "Workout beenden" am Android-Sperrbildschirm ist
  weiterhin ungetestet (nur am Geraet pruefbar, steht im Hub).

## Naechste Schritte (Claude)
1. **Vorgaben nachrechnen, sobald echte Laeufe da sind** (sinnvoll ab etwa vier
   Wochen, fruehestens nach dem 19.09.): Garmin-Export in `privat\`
   aktualisieren, `pace-modell.mjs` ansehen (vor allem Formkorrektur und
   Ausreisser), `wiedereinstieg` in `privat\pace-profil.json` anpassen,
   `laufplan-vorgaben.mjs` laufen lassen, mit `lauf-cloud.mjs schreiben` in die
   Cloud. Ablauf steht in `docs/laufplan-vorgaben.md` Abschnitt 5.
2. **Nach dem ersten Lauf den Garmin-Abgleich pruefen** (bei beiden, Zugaenge
   stehen seit 10.09.): kommt die
   Aktivitaet an, trifft sie den geplanten Lauf, stimmen km und Zeit? Bei
   Abweichungen zuerst `scripts/runmatch-test.mjs` um den Fall erweitern, dann
   `src/utils/runMatch.js` — der Test ist der Vertrag.
3. **Rueckmeldungen in die Plananpassung einbauen:** Sie stehen jetzt selbst in
   der Cloud, `lauf-cloud.mjs holen` bringt sie mit. Kennungen behalten,
   erledigte Laeufe gewinnen lokal (`docs/laufplan-format.md` Abschnitt 5).
4. Leere Ordnerhuellen entfernen, sobald kein Prozess sie mehr haelt:
   `Remove-Item "C:\Projekte\Fitness Tracker\.claude\worktrees\<name>" -Recurse -Force`
   fuer die drei oben genannten.
5. Meldet Gabriel ein Problem mit "Workout beenden" oder dem Quick-Log-Knopf:
   zuerst `public/sw-custom.js` und die Notification-Payload in
   `TrackingView.vue` pruefen.
6. Sagt Gabriel, dass die sechs Reiter auf seinem Handy zu eng sind: die
   Beschriftungen blenden sich heute erst unter 340 px aus
   (`BottomNav.vue`, Media-Query) — Schwelle anheben statt Labels kuerzen.
7. Paket 3 (Wochenbericht per Telegram, `docs/laufplaner-plan.md` Abschnitt 7)
   nur nach ausdruecklicher Freigabe bauen.

## Stolperfallen (aktuell)
- **`process.exit()` nach einem `fetch` bricht unter Windows ab.** Node meckert
  mit "Assertion failed ... async.c" und liefert Rueckgabewert 127 statt 1 — die
  eigentliche Fehlermeldung ist dann verdeckt. Stattdessen werfen und ganz am
  Ende `process.exitCode` setzen (so geloest in `scripts/lauf-cloud.mjs`).
- **Browser-Pane fuehrt bei Dateien ausserhalb des Projekts kein JavaScript aus**
  ("static snapshot"), und `navigate` verstuemmelt `file://`-Adressen zu
  `https://file:///...`. Lokale HTML-Seiten darum ueber den Dev-Server testen
  (kurz nach `public/` kopieren) oder in Claude-in-Chrome oeffnen.
- **Bash frisst `${...}` in `node -e`-Aufrufen**, und Python-Heredocs fressen
  Backslashes (`\f` wurde zum Steuerzeichen, `\n` zur echten Zeilenschaltung).
  Fuer Text mit Backslashes oder Template-Literals das Write/Edit-Tool nehmen.
- **Zwischenablage im Browser-Pane ist gesperrt:** `navigator.clipboard.writeText`
  scheitert mit "Document is not focused". Kopier-Knoepfe sind nur ueber ihren
  Fehlerpfad pruefbar; den Inhalt direkt aus dem Store holen
  (`#app.__vue_app__.config.globalProperties.$pinia._s.get('running')`).
- **Pinia-Stores haben kein HMR:** Nach jeder Store-Aenderung die Seite neu
  laden, sonst prueft man die alte Fassung.
- **Browser-Pane und Service Worker:** Zum Pruefen des Live-Stands erst den
  Service Worker abmelden und die Caches leeren (Regel dazu in der CLAUDE.md).
- **Browser-Pane: `requestAnimationFrame` ist eingefroren**, solange die Ansicht
  nicht sichtbar ist. Abhilfe nach jedem Reload:
  `window.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0)`.
  Klicks per `computer` scheitern dann; `javascript_tool` mit `element.click()`
  funktioniert.
