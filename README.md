# ChatGPT Widget für Webflow

Ein vollständiges Chat-Widget mit ChatGPT-Integration, das Sie einfach in Ihre Webflow-Seite einbinden können.

## 📋 Übersicht

Dieses Projekt besteht aus zwei Teilen:
1. **Frontend** (`chat-widget.html`) - Ein modernes Chat-Widget mit HTML/CSS/JavaScript
2. **Backend** (`server.js`) - Node.js Server mit Express und OpenAI API Integration

## 🚀 Installation und Setup

### Schritt 1: Dependencies installieren

```bash
npm install
```

### Schritt 2: OpenAI API-Schlüssel einrichten

1. Erstellen Sie eine `.env` Datei im Hauptverzeichnis:

```bash
touch .env
```

2. Fügen Sie Ihren OpenAI API-Schlüssel hinzu:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3000
```

3. Holen Sie sich Ihren API-Schlüssel von: https://platform.openai.com/api-keys

### Schritt 3: Backend starten

```bash
npm start
```

Für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

Der Server läuft nun auf `http://localhost:3000`

## 🌐 Webflow Integration

### Variante 1: Custom Code Embed (Empfohlen)

1. Öffnen Sie Ihre Webflow-Seite im Designer
2. Fügen Sie ein **Embed** Element hinzu (Custom Code)
3. Kopieren Sie den **gesamten Inhalt** von `chat-widget.html`
4. Fügen Sie ihn in das Embed Element ein
5. **WICHTIG**: Ändern Sie die API-URL in der HTML-Datei:

```javascript
// Zeile ~250 in chat-widget.html
const API_URL = 'https://ihre-backend-url.com/api/chat';
```

### Variante 2: Externe Datei

1. Hosten Sie `chat-widget.html` auf Ihrem Server
2. Fügen Sie in Webflow einen Custom Code Block in den `<head>` oder `</body>` ein:

```html
<iframe src="https://ihre-domain.com/chat-widget.html" 
        style="position:fixed;bottom:0;right:0;width:100%;height:100%;border:none;pointer-events:none;">
</iframe>
```

## 🔧 Konfiguration

### Backend anpassen (server.js)

**System-Prompt ändern** (Zeile 18-25):
```javascript
const SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent für [IHR UNTERNEHMEN]. 
Beantworte Fragen höflich und professionell auf Deutsch. 
Du kannst über folgende Themen Auskunft geben:
- Ihre spezifischen Themen hier
- Weitere Themen
- Kontaktinformationen`;
```

**OpenAI Modell ändern** (Zeile 39):
```javascript
model: 'gpt-4', // Für bessere Qualität, aber teurer
// oder
model: 'gpt-3.5-turbo', // Schneller und günstiger
```

### Frontend anpassen (chat-widget.html)

**Farben anpassen**:
```css
/* Hauptfarbe - Zeile 23, 68, 208, 291 */
background: #E9453A; /* Ihre Firmenfarbe */

/* Akzentfarbe - Zeile 100 */
background: #0081B7; /* Ihre Akzentfarbe */
```

**Texte ändern**:
```html
<!-- Zeile 180-183 -->
<h3>Chat Assistent</h3>
<p>Wie kann ich Ihnen helfen?</p>
```

## 🖥️ Backend auf Server deployen

### Option 1: Heroku

1. Installieren Sie Heroku CLI
2. Erstellen Sie eine neue Heroku App:
```bash
heroku create ihr-app-name
```

3. Setzen Sie Environment Variables:
```bash
heroku config:set OPENAI_API_KEY=sk-your-key-here
```

4. Deployen:
```bash
git push heroku main
```

### Option 2: DigitalOcean / VPS

1. Verbinden Sie sich mit Ihrem Server via SSH
2. Klonen Sie das Repository oder laden Sie die Dateien hoch
3. Installieren Sie Dependencies: `npm install`
4. Erstellen Sie `.env` Datei mit Ihrem API-Schlüssel
5. Verwenden Sie PM2 für dauerhafte Ausführung:
```bash
npm install -g pm2
pm2 start server.js
pm2 save
```

### Option 3: Vercel (Serverless)

1. Installieren Sie Vercel CLI: `npm i -g vercel`
2. Erstellen Sie eine `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```
3. Deploy: `vercel`
4. Setzen Sie Environment Variables im Vercel Dashboard

## 🔒 Sicherheit

**Wichtige Hinweise:**

1. ✅ **Niemals** Ihren OpenAI API-Schlüssel im Frontend-Code speichern
2. ✅ Die `.env` Datei ist in `.gitignore` und wird nicht committet
3. ✅ CORS ist aktiviert - beschränken Sie dies in Produktion auf Ihre Domain:

```javascript
// In server.js
app.use(cors({
  origin: 'https://ihre-webflow-domain.com'
}));
```

4. ✅ Implementieren Sie Rate-Limiting für API-Anfragen:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100 // Max 100 Anfragen pro IP
});

app.use('/api/', limiter);
```

## 📊 Features

### Frontend
- ✅ Modernes, responsives Design
- ✅ Animationen und Übergänge
- ✅ Mobile-optimiert
- ✅ Typing-Indikator
- ✅ Zeitstempel für Nachrichten
- ✅ Auto-resize Textarea
- ✅ Keyboard-Shortcuts (Enter zum Senden)

### Backend
- ✅ Express.js Server
- ✅ OpenAI GPT Integration
- ✅ CORS-Support
- ✅ Error Handling
- ✅ Environment Variables
- ✅ Health Check Endpoint
- ✅ Konversations-Historie (Advanced Endpoint)

## 🆘 Troubleshooting

### Problem: "OPENAI_API_KEY nicht gesetzt"
**Lösung**: Erstellen Sie eine `.env` Datei und fügen Sie Ihren API-Schlüssel hinzu.

### Problem: CORS-Fehler im Browser
**Lösung**: Stellen Sie sicher, dass CORS im Backend aktiviert ist (bereits implementiert).

### Problem: "Failed to fetch" Fehler
**Lösung**: 
1. Prüfen Sie, ob der Backend-Server läuft
2. Überprüfen Sie die API_URL im Frontend-Code
3. Prüfen Sie Firewall/Netzwerk-Einstellungen

### Problem: Keine Antwort vom ChatGPT
**Lösung**:
1. Prüfen Sie Ihr OpenAI API-Guthaben
2. Überprüfen Sie die API-Schlüssel-Berechtigungen
3. Schauen Sie in die Server-Logs: `npm start`

## 💰 Kosten

Die Kosten hängen von der Nutzung ab:
- **GPT-3.5-turbo**: ~$0.001 pro 1K Tokens (sehr günstig)
- **GPT-4**: ~$0.03 pro 1K Tokens (teurer, aber bessere Qualität)

Eine typische Konversation (5-10 Nachrichten) kostet ca. $0.01-0.05

## 📝 API Endpoints

### POST /api/chat
Einfacher Chat-Endpoint für einzelne Nachrichten.

**Request:**
```json
{
  "message": "Hallo, wie geht es dir?"
}
```

**Response:**
```json
{
  "reply": "Hallo! Mir geht es gut, danke. Wie kann ich Ihnen helfen?"
}
```

### POST /api/chat-advanced
Erweiterter Endpoint mit Konversations-Historie.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Hallo" },
    { "role": "assistant", "content": "Hallo! Wie kann ich helfen?" },
    { "role": "user", "content": "Was sind eure Öffnungszeiten?" }
  ]
}
```

### GET /health
Health Check Endpoint.

**Response:**
```json
{
  "status": "OK",
  "message": "Server läuft"
}
```

## 📄 Lizenz

MIT License - Frei verwendbar für kommerzielle und private Projekte.

## 🤝 Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Troubleshooting-Sektion
2. Schauen Sie in die OpenAI Dokumentation: https://platform.openai.com/docs
3. Prüfen Sie die Server-Logs auf Fehlermeldungen

---

**Viel Erfolg mit Ihrem Chat-Widget! 🚀**

