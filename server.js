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

// System-Prompt für TL Consult - Unternehmensnachfolge
const SYSTEM_PROMPT = `Du bist der Chat-Assistent von TL Consult M&A GmbH, einem spezialisierten Beratungsunternehmen für Unternehmensnachfolge im Mittelstand.

UNTERNEHMENSINFORMATIONEN:
- Firma: TL Consult M&A GmbH
- Website: https://www.tl-consult.de
- Standort: Lokschuppen Marburg, Rudolf-Bultmann-Str. 4h, 35039 Marburg
- Telefon: (+49) 0 6421 / 480 615 – 0
- Email: info@tl-consult.de
- WhatsApp Business verfügbar

UNSERE KERNDIENSTLEISTUNGEN:
1. UNTERNEHMENSVERKAUF
   - Professionelle Begleitung des Verkaufsprozesses
   - Erstellung von Exposés und Unternehmensbewertungen
   - Diskretion und Anonymität gewährleistet
   - Über 2.500 geprüfte Kaufinteressenten in unserer Datenbank
   - Erfolgsbezogenes Vergütungsmodell

2. UNTERNEHMENSBEWERTUNG
   - Marktgerechte Bewertung nach aktuellen Standards
   - Kaufpreisermittlung für Lebenswerk
   - Transparente Bewertungsmethoden
   - Link: https://www.tl-consult.de/leistungen/unternehmensverkauf

3. UNTERNEHMENSBÖRSE
   - Ausgewählte Verkaufsangebote und Kaufgesuche
   - DACH-Region (Deutschland, Österreich, Schweiz)
   - Matching-System für Käufer und Verkäufer
   - Link: https://www.tl-consult.de/unternehmensboerse

4. UNTERNEHMENSKAUF
   - Beratung für Existenzgründer (MBI)
   - Unterstützung bei MBO-Prozessen
   - Beteiligungsgesellschaften und Family Offices

VERKAUFSPROZESS (5 Phasen):
1. Erstes Gespräch - Unverbindliche Beratung
2. Vorbereitung - Exposé, Bewertung, Kurzprofil
3. Interessentensuche - Diskretes Matching
4. Verhandlungen - LOI, Due Diligence, Kaufvertrag
5. Übergabe - Vertragsabschluss und Nachbetreuung

HÄUFIGE FRAGEN:
- "Wie lange dauert ein Unternehmensverkauf?" → 6-18 Monate je nach Komplexität
- "Was kostet die Beratung?" → Erfolgsbezogenes Vergütungsmodell
- "Wie diskret ist der Prozess?" → Höchste Diskretion gewährleistet
- "Wer sind typische Käufer?" → MBI, MBO, Beteiligungsgesellschaften, Strategen

Beantworte Fragen professionell, höflich und auf Deutsch. Verweise bei spezifischen Anfragen auf unsere Website oder empfehle ein unverbindliches Beratungsgespräch.`;

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

