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
- `assets/js/i18n.js`, `assets/js/locales.js` und `assets/css/i18n.css`: Browsersprache und gespeicherte Sprachwahl, übersetzte Produkttexte und Sprachauswahl.
- `assets/js/language-menu.js`: eigene Sprachansicht mit nativem Dialog, Suche, Tastatursteuerung und Fokusübergabe.
- `assets/i18n/`: ausformulierte Übersetzungen; `schema.json` beschreibt die Reihenfolge der Texte in jedem Abschnitt.
- `assets/css/mobile-story.css` und `assets/js/mobile-story.js`: mobile Scroll-Sequenz für Analyse, Routine und Verlauf.
- `assets/img/product/`: originale Geräterenderings und App-Screenshots.
- `legal/`: veröffentlichte Rechtstexte. Quellen und Build-Skripte bleiben privat.

Die Scroll-Sequenz läuft bis 640px Viewportbreite. Das erste Gerät wächst mit dem
Scroll-Fortschritt, danach wechseln die drei Ansichten seitlich. Die Linie am
Viewport-Rand zeigt den Gesamtfortschritt der Sequenz. Beim ersten Herunterscrollen
hält die eingehende Geste genau am Ende der ersten Vergrößerung an.
Das erste Handy bleibt dort mindestens 300ms stehen; auch nachlaufender nativer
Scroll-Schwung kann diese Grenze nicht überspringen. Eine neue Bewegung geht
anschließend frei weiter. Rückwärtsbewegungen bleiben jederzeit möglich.
Danach scrollt der Browser nativ; auch beim Zurückscrollen und erneuten Betreten
greift keine Sperre mehr. Die drei Punkte wählen die Ansichten direkt aus.
Im vollformatigen Handybereich wechselt auch seitliches Wischen die Ansicht:
nach links zur nächsten, nach rechts zur vorherigen. Die Geräte folgen dem Finger;
beim Loslassen landet die Ansicht vollständig auf einem Screen. Kurze Flicks
berücksichtigen die Geschwindigkeit, pro Geste geht es höchstens ein Handy weiter.
Vertikales Scrollen und Pinch-Zoom bleiben möglich; der Fortschrittsrahmen und die
vertikale Scrollposition bleiben mit der gewählten Ansicht synchron.
Prüfung von Einstiegssperre, Rahmen und Wischen: `node tests/mobile-story-entry.test.cjs`.
Der Rahmen folgt direkt der `visualViewport.height`, ohne verzögerte Größenanimation.
Die Höhe wird bei sichtbaren Größenänderungen und beim Scrollen abgeglichen; SVG
und Ausschnitt werden gemeinsam ausgerichtet, auch beim schnellen Einstieg.
Sein Abstand bleibt rundherum bei 0,5cm, auch wenn die Browserleiste verschwindet.
Die Gerätehöhe bleibt an `svh` gebunden. Die Gesamthöhe aus `360svh` plus derselben
sichtbaren Höhe hält die Scroll-Strecke konstant und verhindert Fortschrittssprünge.
Pinch-Zoom bleibt nativ; ohne VisualViewport-API dient `dvh` als Fallback.
Der Rahmen blendet auf dem letzten Stück aus und ist ab 100 % vollständig verborgen;
beim Zurückscrollen erscheint er passend zum Fortschritt wieder.
Bei reduzierter Bewegung oder ohne JavaScript bleibt die normale App-Demo sichtbar.
Die Tabs wechseln nur durch Nutzereingabe, nicht automatisch.
Die Sprachauswahl steht links bei den großen Navigationspunkten im Desktop-Menü, hinter dem Globus im mobilen
Header und im Footer. Alle drei Zugänge öffnen dieselbe eigene Sprachansicht mit Suche und Auswahlmarkierung. Ein explizites
`?lang=fr` hat Vorrang vor der gespeicherten Sprache, danach folgt die Browsersprache.
„Automatisch“ löscht die manuelle Auswahl. Unbekannte Sprachen fallen auf Englisch
zurück; regionale Angaben wie `fr-CA` werden einer vorhandenen Übersetzung zugeordnet.
19 vollständige Sprachkataloge decken jeweils 120 Texte ab, einschließlich FAQs,
Barrierefreiheitslabels, Handy-Sequenz und Menü. Arabisch und Hebräisch verwenden RTL.
Die Rechtstexte und die Texte in den vorhandenen App-Screenshots bleiben unverändert.
Die Übersetzung erfolgt lokal, ohne Übersetzungsdienst oder Sprach-API.
Nach Änderungen an den Übersetzungen `python3 scripts/build_locales.py` ausführen.
Das erzeugte `locales.js` wird mit ausgeliefert; beim Aufrufen ist kein Build nötig.
Prüfung: `node tests/i18n.test.cjs`.
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

Die zwölf aktiven CSS- und JavaScript-URLs in `index.html` tragen dieselbe Version
(`?v=60`). Bei Änderungen vor dem nächsten Deploy gemeinsam erhöhen, damit GitHub
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
