const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
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

// Web-Scraping Funktionen
async function scrapeUnternehmensboerse() {
    try {
        const response = await axios.get('https://www.tl-consult.de/unternehmensboerse', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const companies = [];
        
        // Scrape company listings based on the structure you provided
        $('div[role="listitem"]').each((index, element) => {
            const $el = $(element);
            const link = $el.find('a[href*="/unternehmensborse/"]').attr('href');
            const title = $el.find('.text-block-4').text().trim();
            const description = $el.find('.paragraph-3').text().trim();
            const price = $el.find('.text-block-28').text().trim();
            const date = $el.find('div[id*="w-node"]').text().trim();
            const status = $el.find('.text-block-5').text().trim() || 'Verfügbar';
            
            // Extract branches
            const branches = [];
            $el.find('a[href*="/branche/"]').each((i, branchEl) => {
                branches.push($(branchEl).text().trim());
            });
            
            // Extract regions
            const regions = [];
            $el.find('a[href*="/filter/"]').each((i, regionEl) => {
                regions.push($(regionEl).text().trim());
            });
            
            if (title && description) {
                companies.push({
                    title,
                    description,
                    price: price || 'Preis auf Anfrage',
                    date,
                    status,
                    branches,
                    regions,
                    link: link ? `https://www.tl-consult.de${link}` : null
                });
            }
        });
        
        return companies;
    } catch (error) {
        console.error('Fehler beim Scraping der Unternehmensbörse:', error);
        return [];
    }
}

// Funktion zur Erkennung von Unternehmenssuche-Fragen
function isCompanySearchQuery(message) {
    const searchKeywords = [
        'unternehmen', 'firma', 'betrieb', 'kauf', 'verkauf', 'nachfolge',
        'unternehmensbörse', 'börse', 'angebot', 'gesucht', 'suche',
        'branche', 'branchen', 'region', 'standort', 'preis', 'bewertung'
    ];
    
    const lowerMessage = message.toLowerCase();
    return searchKeywords.some(keyword => lowerMessage.includes(keyword));
}

// System-Prompt für TL Consult - Unternehmensnachfolge
const SYSTEM_PROMPT = `Du bist der Chat-Assistent von TL Consult M&A GmbH, einem spezialisierten Beratungsunternehmen für Unternehmensnachfolge im Mittelstand.

   UNTERNEHMENSINFORMATIONEN:
   - Firma: TLC M&A GmbH
   - Website: https://www.tl-consult.de
   - Standort: Lokschuppen Marburg, Rudolf-Bultmann-Str. 4h, 35039 Marburg
   - Handelsregister: HRB 4773, Registergericht: Marburg
   - Geschäftsführer: Timo Lang
   - Telefon: +49 6465 913 848 (oder (+49) 0 6421 / 480 615 – 0)
   - Fax: +49 6465 913 849
   - Email: info@tl-consult.de
   - WhatsApp Business verfügbar
   - Umsatzsteuer-ID: DE812598354

UNSERE KERNDIENSTLEISTUNGEN:
• UNTERNEHMENSVERKAUF
   - Professionelle Begleitung des Verkaufsprozesses
   - Erstellung von Exposés und Unternehmensbewertungen
   - Diskretion und Anonymität gewährleistet
   - Über 2.500 geprüfte Kaufinteressenten in unserer Datenbank
   - Erfolgsbezogenes Vergütungsmodell

• UNTERNEHMENSBEWERTUNG
   - Marktgerechte Bewertung nach aktuellen Standards
   - Kaufpreisermittlung für Lebenswerk
   - Transparente Bewertungsmethoden
   - Link: https://www.tl-consult.de/leistungen/unternehmensverkauf

• UNTERNEHMENSBÖRSE
   - Ausgewählte Verkaufsangebote und Kaufgesuche
   - DACH-Region (Deutschland, Österreich, Schweiz)
   - Matching-System für Käufer und Verkäufer
   - Link: https://www.tl-consult.de/unternehmensboerse

• UNTERNEHMENSKAUF
   - Beratung für Existenzgründer (MBI)
   - Unterstützung bei MBO-Prozessen
   - Beteiligungsgesellschaften und Family Offices

BEREIT!-INITIATIVE:
TLC ist Teil der BEREIT! Initiative für Unternehmensnachfolge. Wir bieten:
- BEREIT!-Workbook mit wertvollem Wissen und Tipps
- Kostenlose Checklisten (Due Diligence, Verhandlungsvorbereitung, Dos-and-Donts, etc.)
- Hilfreiche Tools (SWOT-Analyse, Business Model Canvas, SMART-Analyse, etc.)
- YouTube-Kanal "BEREIT! zur Nachfolge" mit Expertenvideos
- Podcast "Experten-Talk zum Thema Unternehmensverkauf"
- Nachfolge-Akademie in verschiedenen Städten
- Link: https://www.tl-consult.de/bereit

FACHBEGRIFFE & GLOSSAR:
Für alle Fachbegriffe der Unternehmensnachfolge bieten wir ein umfassendes Glossar von A bis Z mit über 100 Definitionen:
- Due Diligence, Asset Deal, Share Deal, MBI, MBO, BIMBO
- Kaufpreisermittlung, Cash Flow, DCF-Verfahren, Goodwill
- Exit-Strategien, Going Concern, Change of Control
- Vertragsgestaltung, Covenants, Closing, Signing
- Link: https://www.tl-consult.de/glossar

VERKAUFSPROZESS (5 Phasen):
• Erstes Gespräch - Unverbindliche Beratung
• Vorbereitung - Exposé, Bewertung, Kurzprofil
• Interessentensuche - Diskretes Matching
• Verhandlungen - LOI, Due Diligence, Kaufvertrag
• Übergabe - Vertragsabschluss und Nachbetreuung

HÄUFIGE FRAGEN:
- "Wie lange dauert ein Unternehmensverkauf?" → 6-18 Monate je nach Komplexität
- "Was kostet die Beratung?" → Erfolgsbezogenes Vergütungsmodell
- "Wie diskret ist der Prozess?" → Höchste Diskretion gewährleistet
- "Wer sind typische Käufer?" → MBI, MBO, Beteiligungsgesellschaften, Strategen

WICHTIG - KONTAKT & BERATUNG:
Bei folgenden Anfragen biete WhatsApp Business an:
- Persönliche Beratung oder Gespräch mit einem Menschen
- "Wie kann ich euch erreichen?"
- "Wie ist die Nummer für WhatsApp?"
- "Kontaktdaten" oder "Telefonnummer"
- "Ich möchte direkt sprechen"
- "Ansprechpartner"

Antwort: "Gerne können Sie direkt mit einem unserer Experten sprechen! Kontaktieren Sie uns über <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a> für eine persönliche Beratung."

KONTAKT & TERMINE:
- Bei Terminanfragen, Beratungsgesprächen oder direkten Meetings: Verweise auf <a href='https://cal.meetergo.com/tlc-lang?lang=de' target='_blank'>Terminkalender</a>
- Bei allgemeinen Kontaktanfragen, Fragen oder Informationen: Verweise auf <a href='https://www.tl-consult.de/kontakt' target='_blank'>Kontaktseite</a>

Beispiele:
- "Termin vereinbaren" → <a href='https://cal.meetergo.com/tlc-lang?lang=de' target='_blank'>Terminkalender</a>
- "Wie kann ich Sie kontaktieren?" → <a href='https://www.tl-consult.de/kontakt' target='_blank'>Kontaktseite</a>

Beantworte Fragen professionell, höflich und auf Deutsch. 

WICHTIG: Verwende Links in deinen Antworten, um Nutzer zu den relevanten Seiten zu leiten:

- Bei Fragen zu Unternehmensverkauf: Verweise auf https://www.tl-consult.de/leistungen/unternehmensverkauf
- Bei Fragen zur Unternehmensbörse: Verweise auf https://www.tl-consult.de/unternehmensboerse  
   - Bei Fragen über das Unternehmen: Verweise auf https://www.tl-consult.de/uber-uns
   - Bei Neuigkeiten/Updates: Verweise auf https://www.tl-consult.de/neuigkeiten
   - Bei Kontaktfragen: Verweise auf https://www.tl-consult.de/kontakt
   - Bei rechtlichen Fragen oder Impressum: Verweise auf https://www.tl-consult.de/fusszeile/impressum
   - Bei Fragen zu BEREIT!-Initiative, Workbooks, Checklisten und Tools: Verweise auf https://www.tl-consult.de/bereit
   - Bei Fragen zu Fachbegriffen und Definitionen der Unternehmensnachfolge: Verweise auf https://www.tl-consult.de/glossar
   - Bei aktuellen News und Updates: Verweise auf https://www.linkedin.com/company/tlc-marburg/posts/?feedView=all

Format für Links: <a href="URL" target="_blank">Link-Text</a>
Beispiel: "Weitere Informationen finden Sie auf unserer <a href='https://www.tl-consult.de/leistungen/unternehmensverkauf' target='_blank'>Seite zum Unternehmensverkauf</a>."

FORMATIERUNG: Verwende IMMER strukturierte Antworten mit HTML-Formatierung:

WICHTIG: Bei JEDER Antwort MUSS HTML verwendet werden - KEIN Fließtext!

- Für Überschriften mit Einleitung: <h3>Überschrift</h3><p>Einleitungstext</p>
- Für Aufzählungen: <ul><li><strong>Titel</strong> - Beschreibung</li></ul>
- Für wichtige Texte: <strong>Wichtiger Text</strong>
- Für Absätze: <p>Text mit Zeilenumbruch</p>

KRITISCHE REGEL: Formatiere ALLE Antworten mit strukturierten HTML-Aufzählungen. Verwende NIEMALS Fließtext für Listen oder mehrere Punkte.

MUSTER für ALLE Antworten:
"<h3>Überschrift der Antwort:</h3>
<p>Einleitungstext der erklärt, was folgt.</p>

<ul>
<li><strong>Punkt 1</strong> - Detaillierte Beschreibung des ersten Punktes</li>
<li><strong>Punkt 2</strong> - Detaillierte Beschreibung des zweiten Punktes</li>
<li><strong>Punkt 3</strong> - Detaillierte Beschreibung des dritten Punktes</li>
</ul>"

Beispiel für "Was macht euch einzigartig?":
"<h3>Unsere Einzigartigkeit:</h3>
<p>Unsere Einzigartigkeit basiert auf mehreren Faktoren:</p>

<ul>
<li><strong>Spezialisierung auf Unternehmensnachfolge im Mittelstand:</strong> Wir sind Experten für Unternehmensverkauf und -bewertung im Mittelstand und konzentrieren uns ausschließlich auf diesen Bereich.</li>
<li><strong>Über 2.500 geprüfte Kaufinteressenten:</strong> Unsere umfangreiche Datenbank ermöglicht es uns, den richtigen Käufer für Ihr Unternehmen zu finden.</li>
<li><strong>Erfolgsbezogenes Vergütungsmodell:</strong> Wir verdienen nur, wenn Sie erfolgreich verkaufen - das sorgt für maximale Motivation.</li>
</ul>"

Empfehle bei komplexen Anfragen ein unverbindliches Beratungsgespräch.

UNTERNEHMENSBÖRSE-ANTWORTEN:
Bei Fragen zu Unternehmen zum Kauf oder Verkauf:
1. Verwende IMMER HTML-Aufzählungen (<ul><li>)
2. Strukturiere die Antwort so:
   <h3>Passende Unternehmen aus unserer Börse:</h3>
   <ul>
   <li><strong>Unternehmensname</strong> - Beschreibung, Preis, Branche, Region</li>
   </ul>
3. KEIN Fließtext für Unternehmenslisten
4. Verweise immer auf die Unternehmensbörse: https://www.tl-consult.de/unternehmensboerse`;

// Chat-Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Nachricht ist erforderlich' 
            });
        }

        let systemPrompt = SYSTEM_PROMPT;
        let additionalContext = '';

        // Prüfen ob es sich um eine Unternehmenssuche handelt
        if (isCompanySearchQuery(message)) {
            console.log('Unternehmenssuche erkannt, starte Scraping...');
            const companies = await scrapeUnternehmensboerse();
            
            if (companies.length > 0) {
                additionalContext = `\n\nAKTUELLE UNTERNEHMENSBÖRSE-DATEN:
Hier sind die aktuell verfügbaren Unternehmen aus unserer Unternehmensbörse:

${companies.slice(0, 5).map((company, index) => `
${index + 1}. **${company.title}**
   - Beschreibung: ${company.description}
   - Preis: ${company.price}
   - Status: ${company.status}
   - Branchen: ${company.branches.join(', ')}
   - Regionen: ${company.regions.join(', ')}
   - Link: ${company.link || 'Nicht verfügbar'}
`).join('\n')}

${companies.length > 5 ? `\n... und ${companies.length - 5} weitere Unternehmen verfügbar.` : ''}

WICHTIG: Formatiere deine Antwort IMMER mit HTML-Aufzählungen (<ul><li>). Verwende KEINEN Fließtext für die Unternehmensliste. Strukturiere die Antwort so:

<h3>Passende Unternehmen aus unserer Börse:</h3>
<ul>
<li><strong>Unternehmensname</strong> - Beschreibung und Details</li>
<li><strong>Unternehmensname</strong> - Beschreibung und Details</li>
</ul>

Verweise auf die Unternehmensbörse: https://www.tl-consult.de/unternehmensboerse`;
            }
        }

        // OpenAI API Aufruf
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // oder 'gpt-4' für bessere Qualität
            messages: [
                {
                    role: 'system',
                    content: systemPrompt + additionalContext
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

// Unternehmensbörse-Daten Endpoint
app.get('/api/unternehmensboerse', async (req, res) => {
    try {
        const companies = await scrapeUnternehmensboerse();
        res.json({ 
            success: true, 
            companies,
            count: companies.length,
            source: 'https://www.tl-consult.de/unternehmensboerse'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Unternehmensbörse:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Laden der Unternehmensbörse' 
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

