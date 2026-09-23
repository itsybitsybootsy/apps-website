# Q Systems · Skinmetrics

Marketing- und Rechtstexte-Website für die iOS-App **Skinmetrics** (skinmetrics.app).

Statische Seite (HTML/CSS/JS, kein Build-Schritt), ausgeliefert über GitHub Pages.
Keine Cookies, keine externen Ressourcen, keine Schriften von Dritten, keine Bibliotheken.
Alles ist selbst enthalten oder System-Font.

## Projektstruktur

```
apps-website/
├── index.html                 # Produktseite Skinmetrics
├── assets/
│   ├── css/main.css           # Seitenlayout (Nav, Hero, Stages, Preis, FAQ, Footer)
│   ├── css/app.css            # iPhone-Rahmen und nachgebaute App-Oberfläche (iOS-Punkte)
│   ├── css/scenes/*.css       # Stile je Szene
│   ├── css/legal.css          # Layout der Rechtstexte
│   ├── js/main.js             # Zeitleiste beider Stages, Nav, Reveals
│   ├── js/engine.js           # Scroll-Engine: Fortschritt, Szenen, Captions
│   ├── js/phone.js            # Live-iPhone (393×852 pt) und Finger
│   ├── js/rail.js             # Große Zahl neben dem iPhone
│   ├── js/ui-kit.js           # Statusleiste, Tab-Leiste, Icons
│   ├── js/face3d.js           # 3D-Gesicht (WebGL, ohne Bibliothek)
│   ├── js/scenes/*.js         # Szenen: today, scan, results, verlauf, score, routine, streak
│   ├── models/                # Gesichtsmesh (MediaPipe, Apache 2.0) und SVG-Fallback
│   └── img/                   # Icons, App-Store-Badge, og.jpg
├── legal/                     # Rechtstexte
└── *.html                     # Weiterleitungen für alte URLs
```

Die App wird nicht mit Screenshots gezeigt, sondern in HTML nachgebaut und beim Scrollen
bedient (Finger tippt, Werte zählen hoch). Jede Szene ist eine reine Funktion des
Scroll-Fortschritts, rückwärts scrollen spielt alles exakt zurück. Alle Zeitbereiche stehen
zentral in `assets/js/main.js`, Beispieldaten in `assets/js/scenes/data.js`.

## Lokal starten

```sh
python3 -m http.server 8080
```

Dann im Browser: http://localhost:8080/

## Hinweise zu den Texten

- Sichtbare Texte auf der Produktseite enthalten bewusst keine Binde- oder Gedankenstriche.
- Jede Aussage über die App muss dem aktuellen App-Code entsprechen. Die nachgebaute App ist als
  „Nachgebaute Ansicht der App mit Beispieldaten“ gekennzeichnet. Innerhalb des iPhones stehen die
  echten App-Texte (auch „Check-in“), außerhalb gilt die Regel ohne Bindestriche.
- Alle „Laden“-Links und die App-Store-Badges zeigen auf den Platzhalter
  `https://apps.apple.com/app/id0000000000`. Nach dem Launch in `index.html` durch die echte
  App-Store-URL ersetzen (alle Vorkommen von `id0000000000`). Die Badge stammt von Apple (`assets/img/app-store-badge-de.svg`).
- Rechtstext-Quellen und Build-Skripte liegen bewusst **nicht** in diesem Repo (siehe `.gitignore`).
