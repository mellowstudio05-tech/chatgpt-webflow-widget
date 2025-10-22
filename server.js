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

// Erlaubte URLs für Scraping
const ALLOWED_URLS = [
    'https://www.tl-consult.de/',
    'https://www.tl-consult.de/leistungen/unternehmensverkauf',
    'https://www.tl-consult.de/unternehmensboerse',
    'https://www.tl-consult.de/uber-uns',
    'https://www.tl-consult.de/netzwerk',
    'https://www.tl-consult.de/neuigkeiten',
    'https://www.tl-consult.de/podcast',
    'https://www.tl-consult.de/kontakt',
    'https://www.tl-consult.de/fusszeile/impressum'
];

// Web-Scraping Funktionen
async function scrapeUnternehmensboerse() {
    try {
        console.log('Starte Scraping der Unternehmensbörse...');
        
        // Versuche zuerst die Hauptseite zu scrapen
        const response = await axios.get('https://www.tl-consult.de/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const companies = [];
        
        console.log('HTML geladen, suche nach Unternehmen...');
        
        // Suche nach Unternehmen in verschiedenen Bereichen der Seite
        const companySelectors = [
            'div[class*="company"]',
            'div[class*="unternehmen"]',
            'div[class*="börse"]',
            'div[class*="boerse"]',
            'div[class*="listing"]',
            'div[class*="item"]',
            'section[class*="company"]',
            'section[class*="unternehmen"]'
        ];
        
        let foundCompanies = 0;
        
        // Durchsuche alle möglichen Selektoren
        companySelectors.forEach(selector => {
            $(selector).each((index, element) => {
                const $el = $(element);
                const text = $el.text().trim();
                
                // Prüfe auf Unternehmensmuster
                if (text.includes('Hersteller von') || 
                    text.includes('Anbieter im') || 
                    text.includes('Unternehmen im Bereich') ||
                    text.includes('gesucht') ||
                    text.includes('sucht einen Nachfolger') ||
                    text.includes('Gebäudesicherheitstechnik')) {
                    
                    const lines = text.split('\n').filter(line => line.trim().length > 5);
                    if (lines.length >= 2) {
                        const title = lines[0].trim();
                        const description = lines[1].trim();
                        
                        // Validiere den Titel
                        if (title.length > 10 && title.length < 200 && 
                            !title.includes('Weitere Informationen') &&
                            !title.includes('Zur Unternehmensbörse') &&
                            !companies.some(c => c.title === title)) {
                            
                            companies.push({
                                title: title,
                                description: description,
                                price: text.includes('6.000.000€') ? '6.000.000€' : 'Preis auf Anfrage',
                                date: extractDate(text) || new Date().toLocaleDateString('de-DE'),
                                status: text.includes('gesucht') ? 'Kauf' : 'Verkauf',
                                branches: extractBranches(text),
                                regions: extractRegions(text),
                                link: "https://www.tl-consult.de/unternehmensboerse"
                            });
                            
                            foundCompanies++;
                            console.log(`Unternehmen gefunden: ${title}`);
                        }
                    }
                }
            });
        });
        
        // Fallback: Durchsuche alle divs nach Unternehmensmustern
        if (foundCompanies === 0) {
            console.log('Keine Unternehmen mit Selektoren gefunden, durchsuche alle divs...');
            
            $('div').each((index, element) => {
                const $el = $(element);
                const text = $el.text().trim();
                
                if (text.includes('Hersteller von Sanitärarmaturen') ||
                    text.includes('Anbieter im Baby- und Familiensegment') ||
                    text.includes('Unternehmen im Bereich B2B-Software') ||
                    text.includes('Gebäudesicherheitstechnik')) {
                    
                    const lines = text.split('\n').filter(line => line.trim().length > 5);
                    if (lines.length >= 2) {
                        const title = lines[0].trim();
                        const description = lines[1].trim();
                        
                        if (title.length > 10 && !companies.some(c => c.title === title)) {
                            companies.push({
                                title: title,
                                description: description,
                                price: text.includes('6.000.000€') ? '6.000.000€' : 'Preis auf Anfrage',
                                date: extractDate(text) || new Date().toLocaleDateString('de-DE'),
                                status: text.includes('gesucht') ? 'Kauf' : 'Verkauf',
                                branches: extractBranches(text),
                                regions: extractRegions(text),
                                link: "https://www.tl-consult.de/unternehmensboerse"
                            });
                            
                            foundCompanies++;
                            console.log(`Fallback Unternehmen gefunden: ${title}`);
                        }
                    }
                }
            });
        }
        
        console.log(`Insgesamt ${companies.length} Unternehmen gefunden`);
        return companies;
        
    } catch (error) {
        console.error('Fehler beim Scraping der Unternehmensbörse:', error);
        return [];
    }
}

// Hilfsfunktionen für Datenextraktion
function extractDate(text) {
    const dateMatch = text.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
    return dateMatch ? dateMatch[1] : null;
}

function extractBranches(text) {
    const branches = [];
    if (text.includes('Produktion')) branches.push('Produktion');
    if (text.includes('Handwerk')) branches.push('Handwerk');
    if (text.includes('Dienstleistungen')) branches.push('Dienstleistungen');
    if (text.includes('IT')) branches.push('IT');
    if (text.includes('Handel')) branches.push('Handel');
    return branches;
}

function extractRegions(text) {
    const regions = [];
    if (text.includes('Polen')) regions.push('Polen');
    if (text.includes('Deutschland')) regions.push('Deutschland');
    if (text.includes('Ausland')) regions.push('Ausland');
    return regions;
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
Bei folgenden Anfragen biete IMMER WhatsApp Business an (höchste Priorität):
- Persönliche Beratung oder Gespräch mit einem Menschen
- "Wie kann ich euch erreichen?"
- "Wie ist die Nummer für WhatsApp?"
- "Kontaktdaten" oder "Telefonnummer"
- "Ich möchte direkt sprechen"
- "Ansprechpartner"
- "Termin vereinbaren"
- "Beratungsgespräch"
- "Unternehmensbewertung"
- "Unternehmensverkauf"
- "Kostenlose Beratung"

Antwort: "Gerne können Sie direkt mit einem unserer Experten sprechen! Kontaktieren Sie uns über <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a> für eine persönliche Beratung."

PRIORITÄT: WhatsApp Business ist der bevorzugte Kontaktweg - leite Nutzer IMMER dorthin weiter!

KONTAKT & TERMINE:
- Bei ALLEN Kontaktanfragen: IMMER WhatsApp Business bevorzugen <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a>
- Bei Terminanfragen: WhatsApp Business für direkte Terminvereinbarung
- Bei allgemeinen Fragen: WhatsApp Business für persönliche Beratung

Beispiele:
- "Termin vereinbaren" → <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a> für direkte Terminvereinbarung
- "Wie kann ich Sie kontaktieren?" → <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a> für persönliche Beratung
- "Beratung" → <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a> für direkten Kontakt

FALLBACK: Nur wenn WhatsApp nicht gewünscht ist, dann Terminkalender oder Kontaktseite

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
   <li><strong>Unternehmensname</strong> - Beschreibung, Preis, Branche, Region<br><a href="LINK_ZUR_UNTERNEHMENSSEITE" target="_blank">→ Direkt zu diesem Unternehmen</a></li>
   </ul>
3. KEIN Fließtext für Unternehmenslisten
4. JEDES Unternehmen MUSS einen direkten Link zur Unterseite haben
5. NIEMALS erfundene Unternehmen anzeigen - nur echte Daten aus der Börse!
6. Falls keine passenden Unternehmen verfügbar sind, ehrlich kommunizieren
7. Verweise immer auf die Unternehmensbörse: https://www.tl-consult.de/unternehmensboerse

KRITISCHE REGEL: ERFINDE NIEMALS UNTERNEHMEN! Verwende nur die tatsächlich verfügbaren Daten aus der Unternehmensbörse.

WHATSAPP BUSINESS PRIORITÄT:
Bei JEDER Unternehmensbörse-Antwort IMMER WhatsApp Business für weitere Informationen empfehlen:
"Für weitere Informationen zu diesen Unternehmen oder eine persönliche Beratung kontaktieren Sie uns über <a href='https://wa.me/4964214806150' target='_blank'>WhatsApp Business</a>."`;

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
   - Direkter Link: ${company.link || 'Nicht verfügbar'}
`).join('\n')}

${companies.length > 5 ? `\n... und ${companies.length - 5} weitere Unternehmen verfügbar.` : ''}

WICHTIG: Formatiere deine Antwort IMMER mit HTML-Aufzählungen (<ul><li>). Verwende KEINEN Fließtext für die Unternehmensliste. Strukturiere die Antwort so:

<h3>Passende Unternehmen aus unserer Börse:</h3>
<ul>
<li><strong>Unternehmensname</strong> - Beschreibung und Details<br><a href="LINK_ZUR_UNTERNEHMENSSEITE" target="_blank">→ Direkt zu diesem Unternehmen</a></li>
<li><strong>Unternehmensname</strong> - Beschreibung und Details<br><a href="LINK_ZUR_UNTERNEHMENSSEITE" target="_blank">→ Direkt zu diesem Unternehmen</a></li>
</ul>

KRITISCH: 
1. Verwende NUR die Unternehmen aus den obigen Daten - ERFINDE KEINE UNTERNEHMEN!
2. Verwende für JEDES Unternehmen den "Direkter Link" aus den Daten oben
3. Ersetze "LINK_ZUR_UNTERNEHMENSSEITE" mit dem tatsächlichen Link aus den Unternehmensdaten
4. Falls keine passenden Unternehmen in den Daten sind, sage das ehrlich und verweise auf die Börse

WICHTIG: NIEMALS erfundene oder erdachte Unternehmen anzeigen! Nur echte Daten aus der Unternehmensbörse verwenden!

Verweise auf die Unternehmensbörse: https://www.tl-consult.de/unternehmensboerse`;
            } else {
                additionalContext = `\n\nUNTERNEHMENSBÖRSE-DATEN:
Aktuell konnten keine Unternehmen aus der Unternehmensbörse geladen werden.

WICHTIG: 
1. ERFINDE NIEMALS UNTERNEHMEN!
2. Sage ehrlich, dass aktuell keine Daten verfügbar sind
3. Verweise auf die Unternehmensbörse: https://www.tl-consult.de/unternehmensboerse
4. Biete an, dass der Nutzer direkt auf der Börse nachschauen kann

Antwort-Format:
<h3>Unternehmensbörse aktuell nicht verfügbar</h3>
<p>Leider können wir aktuell keine Unternehmen aus unserer Börse laden. Bitte besuchen Sie direkt unsere <a href="https://www.tl-consult.de/unternehmensboerse" target="_blank">Unternehmensbörse</a> für aktuelle Angebote.</p>`;
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
        console.log('API-Aufruf: Unternehmensbörse-Daten werden geladen...');
        const companies = await scrapeUnternehmensboerse();
        
        console.log(`API-Antwort: ${companies.length} Unternehmen gefunden`);
        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.title}`);
        });
        
        res.json({ 
            success: true, 
            companies,
            count: companies.length,
            source: 'https://www.tl-consult.de/'
        });
    } catch (error) {
        console.error('Fehler beim Laden der Unternehmensbörse:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Fehler beim Laden der Unternehmensbörse',
            details: error.message
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

