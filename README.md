# Q Systems · DermaScan

Marketing- und Rechtstexte-Website für die iOS-App **DermaScan**.

Statische Seite (HTML/CSS/JS, kein Build-Schritt), ausgeliefert über GitHub Pages.
Keine Cookies, keine externen Ressourcen, keine Schriften von Dritten – alles ist selbst enthalten
oder System-Font.

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Produktseite DermaScan |
| `dermascan.html` | Weiterleitung auf `index.html` |
| `datenschutz.html` | Datenschutzerklärung |
| `agb.html` | Nutzungsbedingungen, Abo- und Verbraucherinformationen |
| `impressum.html` | Impressum & Offenlegung |
| `rechtliches.html` | Verteilerseite für Rechtstexte |
| `styles.css` | Gemeinsames Designsystem |
| `app.js` | SVG-Icon-Sprite und Interaktionen |

## Lokal starten

```sh
python3 -m http.server 8080
```

Dann im Browser: http://localhost:8080/
