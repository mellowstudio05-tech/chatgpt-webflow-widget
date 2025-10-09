const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI Konfiguration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// System-Prompt für das Thema - HIER ANPASSEN!
const SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent für eine Webseite. 
Beantworte Fragen höflich und professionell auf Deutsch. 
Du bist ein Experte in verschiedenen Bereichen und kannst über viele Themen sprechen:

- Unternehmen und Firmennachfolge
- Allgemeine Geschäftsthemen
- Produkte und Dienstleistungen
- Häufig gestellte Fragen
- Kontaktinformationen
- Allgemeine Fragen und Gespräche

Antworte immer hilfreich und informativ. Wenn du etwas nicht weißt, sage es ehrlich und biete an, bei anderen Fragen zu helfen.`;

// Chat-Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Nachricht ist erforderlich' 
            });
        }

        // OpenAI API Aufruf
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // oder 'gpt-4' für bessere Qualität
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            temperature: 0.7,
            max_tokens: 500
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
    res.json({ status: 'OK', message: 'Server läuft' });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log(`Chat-API verfügbar unter: http://localhost:${PORT}/api/chat`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNUNG: OPENAI_API_KEY nicht gesetzt!');
    }
});

