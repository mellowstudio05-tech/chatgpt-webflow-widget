# Vercel Deployment Anleitung

## 🚀 So deployen Sie Ihr ChatGPT-Widget auf Vercel

### Methode 1: Vercel Dashboard (Am einfachsten)

#### Schritt 1: Vercel Account erstellen
1. Gehen Sie zu: https://vercel.com
2. Klicken Sie auf "Sign Up"
3. Registrieren Sie sich mit GitHub, GitLab oder Email

#### Schritt 2: Projekt vorbereiten

**Option A: Mit GitHub (Empfohlen)**
1. Erstellen Sie ein GitHub Repository
2. Laden Sie alle Projektdateien hoch:
   - server.js
   - package.json
   - vercel.json
   - chat-widget.html
   - .gitignore
   - README.md

**Option B: Ohne GitHub**
1. Installieren Sie Vercel CLI:
```bash
npm install -g vercel
```

2. Im Projektordner ausführen:
```bash
vercel login
vercel
```

#### Schritt 3: Deployment über Vercel Dashboard

1. Klicken Sie auf "Add New..." → "Project"
2. Wählen Sie Ihr GitHub Repository (oder "Import Git Repository")
3. Vercel erkennt automatisch das Node.js Projekt
4. **WICHTIG**: Environment Variables hinzufügen:
   - Klicken Sie auf "Environment Variables"
   - Name: `OPENAI_API_KEY`
   - Value: `sk-ihr-openai-api-key`
   - Klicken Sie auf "Add"
5. Klicken Sie auf "Deploy"

#### Schritt 4: Deployment abwarten
- Vercel deployed automatisch (dauert ca. 1-2 Minuten)
- Sie erhalten eine URL wie: `https://ihr-projekt.vercel.app`

#### Schritt 5: API-URL in chat-widget.html anpassen
1. Öffnen Sie `chat-widget.html`
2. Ändern Sie Zeile ~250:
```javascript
const API_URL = 'https://ihr-projekt.vercel.app/api/chat';
```
3. Speichern und in Webflow einbinden

---

### Methode 2: Vercel CLI (Für Entwickler)

#### Schritt 1: Vercel CLI installieren
```bash
npm install -g vercel
```

#### Schritt 2: Login
```bash
vercel login
```

#### Schritt 3: Deployment
Im Projektordner ausführen:
```bash
vercel
```

Folgen Sie den Anweisungen:
- Set up and deploy? **Y**
- Which scope? Wählen Sie Ihren Account
- Link to existing project? **N**
- Project name? (Drücken Sie Enter für Standard)
- In which directory is your code? **/** (oder Enter)

#### Schritt 4: Environment Variables setzen
```bash
vercel env add OPENAI_API_KEY
```
Geben Sie Ihren OpenAI API-Schlüssel ein und wählen Sie "Production"

#### Schritt 5: Production Deployment
```bash
vercel --prod
```

---

## 🔧 Nach dem Deployment

### 1. Ihre URLs:
- **API Endpoint**: `https://ihr-projekt.vercel.app/api/chat`
- **Health Check**: `https://ihr-projekt.vercel.app/health`

### 2. Testen Sie die API:
Öffnen Sie: `https://ihr-projekt.vercel.app/health`

Sie sollten sehen:
```json
{"status":"OK","message":"Server läuft"}
```

### 3. API in Webflow einbinden:

**In chat-widget.html ändern:**
```javascript
const API_URL = 'https://ihr-projekt.vercel.app/api/chat';
```

Dann den gesamten Code in Webflow Custom Code Embed einfügen.

---

## 📊 Environment Variables im Dashboard verwalten

1. Gehen Sie zu: https://vercel.com/dashboard
2. Wählen Sie Ihr Projekt
3. Klicken Sie auf "Settings" → "Environment Variables"
4. Fügen Sie hinzu:
   - `OPENAI_API_KEY`: Ihr OpenAI Schlüssel
   - `PORT`: 3000 (optional)

---

## 🔄 Updates deployen

### Mit GitHub:
- Einfach Code zu GitHub pushen
- Vercel deployed automatisch!

### Mit CLI:
```bash
vercel --prod
```

---

## ⚡ Vercel Limits (Kostenloser Plan)

- ✅ 100 GB Bandwidth pro Monat
- ✅ Unlimited Deployments
- ✅ Automatic SSL
- ✅ Serverless Functions: 100 GB-Hours

Für die meisten Websites mehr als ausreichend!

---

## 🐛 Troubleshooting

### Problem: "Function Timeout"
**Lösung**: OpenAI kann manchmal länger brauchen. Erhöhen Sie das Timeout in `vercel.json`:
```json
{
  "functions": {
    "server.js": {
      "maxDuration": 30
    }
  }
}
```

### Problem: Environment Variables funktionieren nicht
**Lösung**: 
1. Überprüfen Sie im Vercel Dashboard unter Settings → Environment Variables
2. Stellen Sie sicher, dass Sie "Production" ausgewählt haben
3. Führen Sie ein neues Deployment aus

### Problem: CORS-Fehler
**Lösung**: Bereits im Code implementiert. Falls nötig, passen Sie in `server.js` an:
```javascript
app.use(cors({
  origin: 'https://ihre-webflow-domain.webflow.io'
}));
```

---

## 🎯 Zusammenfassung

1. ✅ Account auf Vercel erstellen
2. ✅ Projekt über Dashboard oder CLI deployen
3. ✅ `OPENAI_API_KEY` als Environment Variable hinzufügen
4. ✅ Deployment-URL kopieren
5. ✅ URL in `chat-widget.html` einfügen
6. ✅ Widget-Code in Webflow einbinden

**Fertig! Ihr ChatGPT-Widget läuft jetzt auf Vercel! 🚀**

