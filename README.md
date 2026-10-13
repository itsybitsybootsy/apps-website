# Skinmetrics

Statische Produktseite für Skinmetrics, ausgeliefert über GitHub Pages.
HTML, CSS und JavaScript ohne Build-Schritt, externe Schriften oder Bibliotheken.

## Aktive Dateien

- `index.html`: Produktseite mit dem originalen Drei-iPhone-Hero, App-Demo, Datenschutz, FAQ und App-Store-Badge.
- `assets/css/styles.css`: ursprüngliche grüne Desktopansicht (ab 641px).
- `assets/css/landing.css`: Handyansicht mit ursprünglichem grünem Hero und reduzierten Abschnitten (bis 640px).
- `assets/css/closing.css`: gemeinsamer Abschluss, Footer und FAQ.
- `assets/css/desktop-nav.css` und `assets/js/desktop-nav.js`: Desktopnavigation mit App-Icon, mittigem Menüknopf und Datenschutz-Link; natives Popover mit Escape, Außenklick und Tastatursteuerung.
- `assets/js/landing.js`: App-Tabs mit Tastatursteuerung, Magnet-Buttons und die Bewertungsleiste auf dem Desktop.
- `assets/css/mobile-story.css` und `assets/js/mobile-story.js`: mobile Scroll-Sequenz für Analyse, Routine und Verlauf.
- `assets/img/product/`: originale Geräterenderings und App-Screenshots.
- `legal/`: veröffentlichte Rechtstexte. Quellen und Build-Skripte bleiben privat.

Die Scroll-Sequenz läuft bis 640px Viewportbreite. Kleine, langsame Eingaben reagieren
früh und können ohne Pause Screen für Screen weiterführen. Kräftige Wischbewegungen
steuern einen vollständigen Haltepunkt an; ihr auslaufender Schwung überspringt keinen
Screen. Ein Richtungswechsel kann die laufende Federbewegung direkt umkehren. Oberhalb und
unterhalb der Tour scrollt die Seite normal. Die stabile Höhe mit `svh` verhindert
Größensprünge beim Einblenden der Browserleiste. Die Linie am Viewport-Rand zeigt
den Gesamtfortschritt der Sequenz.
Der Rahmen blendet auf dem letzten Stück aus und ist ab 100 % vollständig verborgen;
beim Zurückscrollen erscheint er passend zum Fortschritt wieder.
Bei reduzierter Bewegung oder ohne JavaScript bleibt die normale App-Demo sichtbar.
Die Tabs wechseln nur durch Nutzereingabe, nicht automatisch.
Die Eingabelogik lässt sich mit `node tests/mobile-story.test.cjs` prüfen: kleine und
kräftige Impulse, kontinuierliche Gesten, Momentum, Richtungswechsel und beide Ausstiege.
Die vier Datenschutz-Karten teilen sich ihr HTML auf Desktop und Handy; mobil stehen
sie untereinander, auf dem Laptop in einer Reihe. Mobil bleiben sieben FAQ sichtbar.
Auf dem Laptop sind vier direkt sichtbar, der Rest klappt über „Weitere Fragen“ auf.
Die FAQ öffnen und schließen per Zeiger mit einer umkehrbaren 200ms-Höhenanimation.
Tastatur und reduzierte Bewegung bleiben unmittelbar. Desktop-Tabs blenden in
200ms über; magnetische Buttons bewegen sich dezenter und zeitbasiert statt pro Frame.

Die Dateien der früheren filmischen Landingpage bleiben im Repo, werden von der
Produktseite aber nicht mehr geladen. Die alten Kopfdaten stammen von Lee
Perry-Smith (CC BY 3.0).

## Lokal starten

```sh
python3 -m http.server 8080
```

Vorschau: http://localhost:8080/

## Vor der Veröffentlichung

Der App-Store-Badge verwendet weiterhin die bestehende Platzhalteradresse
`https://apps.apple.com/app/id0000000000`. Diese durch die echte App-Store-URL ersetzen.
Chrome zeigt im Hero zusätzlich den offiziellen deutschen Google-Play-Badge
(`https://play.google.com/intl/en_us/badges/static/images/badges/de_badge_web_generic.png`).
Er bleibt deaktiviert, bis die Android-App veröffentlicht ist.
Safari und andere Browser zeigen dort nur den App Store. Ohne JavaScript bleibt
Google Play ebenfalls verborgen. Nach Veröffentlichung den echten Store-Link ergänzen.
Die Hero-Überschrift verwendet die lokal gespeicherte Outfit Semibold (SIL OFL,
Lizenz in `assets/fonts/Outfit-OFL.txt`); dafür gibt es keinen externen Font-Aufruf.
Produkttexte müssen dem aktuellen Stand der iOS-App entsprechen.

## Cache

Die acht aktiven CSS- und JavaScript-URLs in `index.html` tragen dieselbe Version
(`?v=48`). Bei Änderungen vor dem nächsten Deploy gemeinsam erhöhen, damit GitHub
Pages keine alten Dateien aus dem Browsercache mit neuen Dateien kombiniert.

Die Desktop-Bewertungsleiste zeigt nur die Überschrift. Die Karten bleiben Beispieltexte,
keine verifizierten App-Store-Bewertungen. Sie pausiert bei Hover/Fokus,
außerhalb des Viewports und in inaktiven Tabs. Reduzierte Bewegung zeigt statische Karten.
Die FAQ-Texte zum Export wurden mit der lokalen iOS-App abgeglichen (Premium-Textexport).

Die Desktopnavigation verwendet einen 112px hohen Blur-Verlauf (20px) und eine
500ms lange, umkehrbare Öffnung vom Menüknopf zur Karte. Beim Schließen blenden
die Links in 110ms aus; die Fläche faltet sich nach 40ms über 360ms zurück.
Die letzten 80ms übergeben die Darstellung an den exakt ausgerichteten Knopf. Links erscheinen
mit 35ms Versatz. Tastatur und reduzierte Bewegung öffnen ohne räumliche Animation.

Safari: Das Menü bleibt als manuelles natives Popover während der gesamten
Schließbewegung geöffnet. Erst nach dem Opacity-Übergang wird hidePopover()
aufgerufen. Keine Abhängigkeit von display-/overlay-Transitions oder @starting-style.
