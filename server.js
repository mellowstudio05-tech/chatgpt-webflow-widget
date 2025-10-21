const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

// Dynamische Imports für optionale Dependencies
let axios, cheerio;
try {
    axios = require('axios');
    cheerio = require('cheerio');
} catch (error) {
    console.log('Dependencies für Website-Scraping nicht verfügbar. Verwende Fallback-Modus.');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'https://www.diakonieffb.de',
        'https://diakonieffb.de',
        'https://www.tl-consult.de',
        'https://tl-consult.de',
        'https://tl-consult.webflow.io',
        'http://localhost:3000',
        'file://'
    ],
    credentials: true
}));
app.use(express.json());

// OpenAI Konfiguration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Diakonie Website URLs
const DIAKONIE_URLS = [
    'https://www.diakonieffb.de',
    'https://www.diakonieffb.de/ueber-uns/die-diakonie',
    'https://www.diakonieffb.de/ueber-uns/das-heisst-diakonie',
    'https://www.diakonieffb.de/ueber-uns/diakonie-und-kirche',
    'https://www.diakonieffb.de/neuigkeiten',
    'https://www.diakonieffb.de/projekte',
    'https://www.diakonieffb.de/ueber-uns/presse',
    'https://www.diakonieffb.de/ueber-uns/diakonie-als-arbeitgeber',
    'https://www.diakonieffb.de/ueber-uns/spenden',
    'https://www.diakonieffb.de/ueber-uns/aushangpflichtige-gesetze',
    'https://www.diakonieffb.de/stellenanzeigen',
    'https://www.diakonieffb.de/arbeiten/gehaltsrechner',
    'https://www.diakonieffb.de/das-plus-an-leistungen',
    'https://www.diakonieffb.de/arbeiten/honorarkrafte',
    'https://www.diakonieffb.de/arbeiten/ehrenamt',
    'https://www.diakonieffb.de/senioren/seniorenzentren',
    'https://www.diakonieffb.de/senioren',
    'https://www.diakonieffb.de/kinder',
    'https://www.diakonieffb.de/familien',
    'https://www.diakonieffb.de/notlagen'
];

// Content Cache
let contentCache = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 Minuten

// Funktion zum Abrufen von Website-Inhalten
async function fetchWebsiteContent(url) {
    if (!axios || !cheerio) {
        // Fallback-Modus: Verwende statische Informationen
        return {
            url,
            title: 'Diakonie Oberbayern West',
            content: 'Website-Inhalte werden geladen...'
        };
    }
    
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Diakonie-Chat-Bot/1.0)'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Entferne Scripts, Styles und andere unwichtige Elemente
        $('script, style, nav, footer, header').remove();
        
        // Extrahiere den Hauptinhalt
        const title = $('title').text().trim();
        const mainContent = $('main, .content, .main-content, body').text().replace(/\s+/g, ' ').trim();
        
        return {
            url,
            title,
            content: mainContent.substring(0, 5000) // Begrenze auf 5000 Zeichen
        };
    } catch (error) {
        console.error(`Fehler beim Abrufen von ${url}:`, error.message);
        return {
            url,
            title: 'Diakonie Oberbayern West',
            content: 'Inhalt temporär nicht verfügbar'
        };
    }
}

// Funktion zum Abrufen aller Website-Inhalte
async function fetchAllContent() {
    const now = Date.now();
    
    // Prüfe Cache
    if (contentCache.timestamp && (now - contentCache.timestamp) < CACHE_DURATION) {
        return contentCache.content;
    }
    
    console.log('Lade Website-Inhalte...');
    const contents = [];
    
    // Fallback-Modus: Verwende statische Informationen
    if (!axios || !cheerio) {
        console.log('Verwende statische Informationen (Dependencies nicht verfügbar)');
        const staticContent = DIAKONIE_URLS.map(url => ({
            url,
            title: 'Diakonie Oberbayern West',
            content: 'Aktuelle Informationen finden Sie auf unserer Website. Wir bieten umfassende soziale Dienstleistungen in den Bereichen Seniorenbetreuung, Kinderbetreuung, Familienberatung und Notfallhilfe.'
        }));
        
        contentCache = {
            content: staticContent,
            timestamp: now
        };
        
        return staticContent;
    }
    
    for (const url of DIAKONIE_URLS) {
        const content = await fetchWebsiteContent(url);
        if (content) {
            contents.push(content);
        }
        // Kleine Pause zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    contentCache = {
        content: contents,
        timestamp: now
    };
    
    console.log(`Geladen: ${contents.length} Seiten`);
    return contents;
}

// Dynamischer System-Prompt
function createSystemPrompt(websiteContent) {
    const contentText = websiteContent.map(page => 
        `URL: ${page.url}\nTitel: ${page.title}\nInhalt: ${page.content}`
    ).join('\n\n---\n\n');

    return `Du bist der Chat-Assistent der Diakonie Oberbayern West. Antworte basierend auf den aktuellen Inhalten der Diakonie-Website.

AKTUELLE WEBSITE-INHALTE:
${contentText}

WICHTIGE REGELN:
1. Antworte mit Informationen über die Diakonie Oberbayern West
2. Wenn du keine spezifische Information findest, verweise auf die Website
3. Verwende IMMER direkte Link-Buttons für Seitenvorschläge
4. Format: <a href="URL" class="direct-link-button" target="_blank">Zur Seite →</a>
5. Verwende HTML-Formatierung für strukturierte Antworten
6. Sei professionell, höflich und hilfsbereit

KONTAKT-INFO:
- Telefon: 08141 36 34 23 0
- E-Mail: zentrale-verwaltung@diakonieffb.de
- Adresse: Dachauer Str. 48, 82256 Fürstenfeldbruck
- Website: https://www.diakonieffb.de

WICHTIGE BEREICHE:
- Seniorenbetreuung: https://www.diakonieffb.de/senioren
- Kinderbetreuung: https://www.diakonieffb.de/kinder
- Familienberatung: https://www.diakonieffb.de/familien
- Stellenanzeigen: https://www.diakonieffb.de/stellenanzeigen
- Spenden: https://www.diakonieffb.de/ueber-uns/spenden
- Notlagen: https://www.diakonieffb.de/notlagen

Antworte auf Deutsch und verweise immer auf die entsprechenden Seiten der Website.`;
}

// Chat-Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Nachricht ist erforderlich' 
            });
        }

        // Lade aktuelle Website-Inhalte
        const websiteContent = await fetchAllContent();
        const systemPrompt = createSystemPrompt(websiteContent);

        // OpenAI API Aufruf
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 800
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });

    } catch (error) {
        console.error('Fehler bei OpenAI API:', error);
        
        if (error.status === 401) {
            return res.status(500).json({ 
                error: 'API-Schlüssel ungültig' 
            });
        }
        
        if (error.status === 429) {
            return res.status(429).json({ 
                error: 'Rate-Limit überschritten. Bitte versuchen Sie es später erneut.' 
            });
        }

        res.status(500).json({ 
            error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' 
        });
    }
});

// Erweiterter Chat-Endpoint mit Konversations-Historie
app.post('/api/chat-advanced', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: 'Nachrichten-Array ist erforderlich' 
            });
        }

        // System-Prompt hinzufügen
        const messagesWithSystem = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        // OpenAI API Aufruf
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messagesWithSystem,
            temperature: 0.7,
            max_tokens: 500
        });

        const reply = completion.choices[0].message.content;

        res.json({ reply });

    } catch (error) {
        console.error('Fehler bei OpenAI API:', error);
        res.status(500).json({ 
            error: 'Ein Fehler ist aufgetreten' 
        });
    }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Diakonie Chat Assistent Server läuft',
        cors_origins: [
            'https://www.diakonieffb.de',
            'https://diakonieffb.de'
        ]
    });
});

// CORS Preflight Handler
app.options('*', cors());

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Chat-API verfügbar unter: http://localhost:${PORT}/api/chat`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNUNG: OPENAI_API_KEY nicht gesetzt!');
    }
});

