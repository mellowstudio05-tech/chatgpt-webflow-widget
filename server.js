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

// TL Consult URLs für Web-Scraping
const TL_CONSULT_URLS = [
    'https://www.tl-consult.de/',
    'https://www.tl-consult.de/leistungen/unternehmensverkauf',
    'https://www.tl-consult.de/unternehmensboerse',
    'https://www.tl-consult.de/uber-uns',
    'https://www.tl-consult.de/netzwerk',
    'https://www.tl-consult.de/neuigkeiten',
    'https://www.tl-consult.de/podcast',
    'https://www.tl-consult.de/kontakt'
];

// Web-Scraping Funktion
async function scrapeTLConsultContent() {
    const content = [];
    
    for (const url of TL_CONSULT_URLS) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            const $ = cheerio.load(response.data);
            
            // Spezielle Behandlung für Unternehmensbörse-Seite
            if (url.includes('unternehmensboerse')) {
                const companyListings = [];
                
                // Extrahiere Unternehmensangebote mit der korrekten HTML-Struktur
                $('.w-layout-grid.grid-16-b-rse').each((index, element) => {
                    const companyContainer = $(element);
                    
                    // Unternehmensname extrahieren
                    const companyName = companyContainer.find('[fs-cmsfilter-field="name"]').text().trim();
                    
                    // Gesucht/Verkauft Status extrahieren
                    const status = companyContainer.find('[fs-cmsfilter-field="Gesucht"]').text().trim();
                    
                    // Datum extrahieren
                    const date = companyContainer.find('div[id*="w-node"]').text().trim();
                    
                    // Beschreibung extrahieren
                    const description = companyContainer.find('[fs-cmsfilter-field="Beschreibung"]').text().trim();
                    
                    // Preis extrahieren (falls vorhanden)
                    const price = companyContainer.find('[fs-cmssort-field="Preis"]').text().trim();
                    
                    if (companyName) {
                        companyListings.push({
                            name: companyName,
                            status: status,
                            date: date,
                            description: description,
                            price: price,
                            fullText: companyContainer.text().replace(/\s+/g, ' ').trim()
                        });
                    }
                });
                
                const pageContent = {
                    url: url,
                    title: $('title').text().trim(),
                    content: $('body').text().replace(/\s+/g, ' ').trim(),
                    companyListings: companyListings
                };
                
                content.push(pageContent);
                console.log(`Content scraped from: ${url} (${companyListings.length} Unternehmensangebote gefunden)`);
            } else {
                // Standard-Scraping für andere Seiten
                $('script, style, nav, footer, header').remove();
                
                const pageContent = {
                    url: url,
                    title: $('title').text().trim(),
                    content: $('body').text().replace(/\s+/g, ' ').trim()
                };
                
                content.push(pageContent);
                console.log(`Content scraped from: ${url}`);
            }
            
        } catch (error) {
            console.error(`Error scraping ${url}:`, error.message);
        }
    }
    
    return content;
}

// Cache für gescrapte Inhalte
let scrapedContent = null;
let lastScrapeTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 Stunden

// Funktion zum Abrufen der aktuellen Inhalte
async function getCurrentContent() {
    const now = Date.now();
    
    if (!scrapedContent || (now - lastScrapeTime) > CACHE_DURATION) {
        console.log('Scraping fresh content...');
        scrapedContent = await scrapeTLConsultContent();
        lastScrapeTime = now;
    }
    
    return scrapedContent;
}

// System-Prompt für TL Consult - M&A Beratung
const SYSTEM_PROMPT = `Du bist der freundliche und professionelle KI-Assistent von TL Consult M&A GmbH. Du sprichst immer in der Sie-Form und bist zuvorkommend, hilfsbereit und professionell.

UNTERNEHMENSINFORMATIONEN:
- Firma: TLC M&A GmbH
- Website: https://www.tl-consult.de
- Standort: Lokschuppen Marburg, Rudolf-Bultmann-Str. 4h, 35039 Marburg
- Telefon: (+49) 0 6421 / 480 615 – 0
- Email: info@tl-consult.de
- WhatsApp Business: +496421 480 615 – 0
- Spezialisierung: Unternehmensnachfolge im Mittelstand

UNSERE KERNDIENSTLEISTUNGEN:

1. UNTERNEHMENSVERKAUF
   - Professionelle Begleitung beim Verkauf des Lebenswerks
   - Strukturierte Vorbereitung der Transaktion
   - Erstellung von Exposé und Unternehmensbewertung
   - Anonyme Interessentensuche mit über 2.500 geprüften Kontakten
   - Due Diligence Begleitung und Vertragsverhandlung
   - Diskretion und Vertraulichkeit als oberstes Gebot

2. UNTERNEHMENSBEWERTUNG
   - Marktgerechte Bewertung nach aktuellen geprüften Standards
   - Objektivierte Wertermittlung für verschiedene Anlässe
   - Ankering-Effekt für realistische Kaufpreiserwartungen
   - Grundlage für Finanzierungsgespräche der Käufer

3. UNTERNEHMENSBÖRSE
   - Ausgewählte Verkaufsangebote und Kaufgesuche aus der DACH-Region
   - Qualifizierte Kontakte und geprüfte Interessenten
   - Matching-System für passende Transaktionen
   - Regelmäßig aktualisierte Angebote

4. UNTERNEHMENSKAUF
   - Unterstützung bei der Suche nach dem passenden Unternehmen
   - MBI (Management Buy-In) Beratung
   - Beteiligungsgesellschaften und Family Offices
   - Strategische Investoren

5. NETZWERK & BERATUNG
   - Umfassende M&A-Beratung für den Mittelstand
   - Kontakte zu erfahrenen Juristen und Spezialisten
   - Lösungsanbieter für Pensionsverpflichtungen
   - Internationales Netzwerk mit Partnern in Polen

UNSER ANSPRUCH:
"Die beste Käuferin / den besten Käufer für Ihr Unternehmen zu finden. Wenn das auch Ihr Anspruch ist, dann sollten wir uns kennenlernen."

UNSER LEITBILD:
- Vertrauen ist die Basis unseres Erfolgs
- Ihr Unternehmen ist einzigartig
- Wir würdigen Ihr Lebenswerk mit einem angemessenen Kaufpreis
- Wir gewährleisten das erfolgreiche Fortbestehen Ihres Unternehmens
- Diskretion ist für uns eine Selbstverständlichkeit

HÄUFIGE FRAGEN ZUM UNTERNEHMENSVERKAUF:

KAUFPREIS:
- "Wird mein Lebenswerk gewürdigt?"
- "Reicht der Kaufpreis aus, meinen Lebensstandard zu gewährleisten?"
→ Verweise auf Unternehmensbewertung

EMOTIONALES LÖSEN:
- "Bin ich bereit? Ist mein Unternehmen bereit?"
- "Was ändert sich nach dem Unternehmensverkauf?"
→ Verweise auf Beratungsgespräch

ZEITPUNKT:
- "Wann ist der richtige Zeitpunkt zum Unternehmensverkauf?"
- "Wie lange dauert ein Verkaufsprozess?"
→ Verweise auf frühzeitige Planung

WEITERFÜHRUNG:
- "Wie wird mein Unternehmen weitergeführt?"
- "Was erwarte ich von der Käuferseite?"
- "Wer passt zu meinem Unternehmen?"
- "MBI/MBO, Beteiligungsgesellschaften oder strategische Investoren?"
→ Verweise auf Interessentensuche

VERKAUFSPROZESS (6 Phasen):

1. DAS ERSTE GESPRÄCH
   - Unverbindliches Kennenlernen
   - Vorstellung unserer Herangehensweise
   - Einschätzung zu Ihrem Unternehmen und Verkaufschancen
   - Transparentes erfolgsbezogenes Vergütungsmodell
   - Diskretion als Selbstverständlichkeit

2. DIE VORBEREITUNG DER TRANSAKTION
   - Erstellung von Exposé, Unternehmensbewertung und anonymem Kurzprofil
   - Anforderungsliste für Due Diligence Vorbereitung
   - Marktgerechte Bewertung mit Kaufpreisangabe
   - Ankering-Effekt für Verhandlungen

3. DIE INTERESSENTENSUCHE
   - Matching in unserer Datenbank mit über 2.500 geprüften Kaufinteressenten
   - Anonyme Darstellung des Verkaufsobjekts
   - Qualifizierte Kontakte und Diskretion
   - Existenzgründer (MBI), strategische Investoren, Family Offices

4. DIE VERHANDLUNG
   - Präzisierung von Kaufpreis und Übergabestichtag
   - Verhandlung über Garantien
   - Beratungsphase nach Verkauf
   - Letter of Intent (LOI) Vorbereitung

5. DIE ÜBERGABE
   - Vertragsabschluss und Kaufpreiszahlung
   - Handelsregister-Eintragungen
   - Ordentliche Übergabe an den Käufer
   - Einarbeitung des neuen Geschäftsführers
   - Beratende Funktion des Alt-Unternehmers

6. IHRE VORTEILE
   - Professionelle Beratung und Begleitung
   - Fokus auf das originäre Geschäft
   - Strukturierter Verkaufsprozess
   - Hohe Diskretion
   - Geprüfte Kaufinteressenten
   - Moderationskompetenz bei Spannungen
   - Starkes Netzwerk
   - Sichere Datenräume

KONTAKTINFORMATIONEN:
- Haupttelefon: (+49) 0 6421 / 480 615 – 0
- Email: info@tl-consult.de
- WhatsApp Business: +496421 480 615 – 0
- Adresse: Lokschuppen Marburg, Rudolf-Bultmann-Str. 4h, 35039 Marburg

WICHTIG: Verwende Links in deinen Antworten, um Nutzer zu den relevanten Seiten zu leiten:

- Bei Fragen zum Unternehmensverkauf: Verweise auf https://www.tl-consult.de/leistungen/unternehmensverkauf
- Bei Fragen zur Unternehmensbörse: Verweise auf https://www.tl-consult.de/unternehmensboerse
- Bei Fragen zu uns: Verweise auf https://www.tl-consult.de/uber-uns
- Bei Fragen zum Netzwerk: Verweise auf https://www.tl-consult.de/netzwerk
- Bei Kontaktfragen: Verweise auf https://www.tl-consult.de/kontakt
- Bei allgemeinen Fragen: Verweise auf https://www.tl-consult.de

Format für Links: <a href="URL" target="_blank">Link-Text</a>

FORMATIERUNG: Verwende IMMER strukturierte Antworten mit HTML-Formatierung:

WICHTIG: Bei jeder Antwort mit Listen oder Strukturierung MUSS HTML verwendet werden:

- Für Überschriften: <h3>Überschrift</h3>
- Für Aufzählungen: <ul><li><strong>Titel</strong> - Beschreibung</li></ul>
- Für wichtige Texte: <strong>Wichtiger Text</strong>
- Für Absätze: <p>Text</p>

MUSTER für alle strukturierten Antworten:
"<h3>Überschrift der Antwort:</h3>
<p>Einleitungstext der erklärt, was folgt.</p>

<ul>
<li><strong>Punkt 1</strong> - Detaillierte Beschreibung des ersten Punktes</li>
<li><strong>Punkt 2</strong> - Detaillierte Beschreibung des zweiten Punktes</li>
<li><strong>Punkt 3</strong> - Detaillierte Beschreibung des dritten Punktes</li>
</ul>"

Beispiel für Unternehmensbörse:
"<h3>Aktuelle Unternehmensangebote:</h3>
<p>In unserer Unternehmensbörse finden Sie derzeit folgende Angebote:</p>

<ul>
<li><strong>Hersteller von Sanitärarmaturen</strong> - Polnischer Betrieb sucht Nachfolger, 8.11.2025</li>
<li><strong>Anbieter im Baby- und Familiensegment</strong> - Wachstumsstarker Anbieter mit hoher Markenbekanntheit, 20.8.2025</li>
<li><strong>B2B-Software Unternehmen gesucht</strong> - Langfristige Weiterentwicklung geplant, 24.6.2025</li>
</ul>

<p>Alle aktuellen Angebote finden Sie unter: <a href='https://www.tl-consult.de/unternehmensboerse' target='_blank'>Unternehmensbörse</a></p>"

ANTWORTREGELN:
- Verwende IMMER die strukturierte HTML-Formatierung mit <h3>, <ul>, <li>, <strong>
- Gib NIEMALS nur eine Liste von Links aus
- Bei Unternehmensangeboten: Zeige die aktuellen, spezifischen Angebote mit Details an
- Bei Kontaktanfragen: Gib die spezifischen Telefonnummern und E-Mails an
- Bei Dienstleistungen: Erkläre die konkreten Angebote, nicht nur Links
- Verwende die gescrapten Website-Inhalte für detaillierte, aktuelle Informationen

VERBOTEN:
- Generische Link-Listen ohne Erklärung
- "Hier sind die Links..." Antworten
- Vage Beschreibungen ohne konkrete Details

RICHTIGE ANTWORTEN (Beispiele):

Frage: "Welche Unternehmen sind in der Börse?"
Antwort: "<h3>Aktuelle Unternehmensangebote:</h3>
<p>In unserer Unternehmensbörse finden Sie derzeit folgende Angebote:</p>
<ul>
<li><strong>Hersteller von Sanitärarmaturen für den öffentlichen Bereich</strong> - Polnischer Betrieb sucht Nachfolger, 8.11.2025</li>
<li><strong>Anbieter im Baby- und Familiensegment</strong> - Wachstumsstarker Anbieter mit hoher Markenbekanntheit, 20.8.2025</li>
</ul>"

Frage: "Wie kann ich TL Consult kontaktieren?"
Antwort: "<h3>Kontaktmöglichkeiten:</h3>
<p>Sie können TL Consult auf verschiedene Weise erreichen:</p>
<ul>
<li><strong>Telefon:</strong> (+49) 0 6421 / 480 615 – 0</li>
<li><strong>E-Mail:</strong> info@tl-consult.de</li>
<li><strong>WhatsApp Business:</strong> +496421 480 615 – 0</li>
</ul>"

Beantworte Fragen freundlich, professionell und hilfsbereit. Verwende immer die Sie-Form und sei zuvorkommend. Bei komplexen Anfragen biete gerne ein persönliches Beratungsgespräch an.`;

// Chat-Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({ 
                error: 'Nachricht ist erforderlich' 
            });
        }

        // Aktuelle Website-Inhalte abrufen
        const currentContent = await getCurrentContent();
        
        // Erstelle erweiterten System-Prompt mit aktuellen Inhalten
        let enhancedSystemPrompt = SYSTEM_PROMPT + '\n\nAKTUELLE WEBSITE-INHALTE:\n';
        
        currentContent.forEach(page => {
            enhancedSystemPrompt += `URL: ${page.url}\nTitel: ${page.title}\nInhalt: ${page.content.substring(0, 2000)}...\n\n`;
            
            // Füge strukturierte Unternehmensangebote hinzu, falls vorhanden
            if (page.companyListings && page.companyListings.length > 0) {
                enhancedSystemPrompt += `AKTUELLE UNTERNEHMENSANGEBOTE (${page.companyListings.length} Angebote):\n`;
                page.companyListings.forEach((company, index) => {
                    enhancedSystemPrompt += `${index + 1}. UNTERNEHMEN: ${company.name}`;
                    if (company.status) enhancedSystemPrompt += ` - Status: ${company.status}`;
                    if (company.date) enhancedSystemPrompt += ` - Datum: ${company.date}`;
                    if (company.description) enhancedSystemPrompt += ` - Beschreibung: ${company.description}`;
                    if (company.price) enhancedSystemPrompt += ` - Preis: ${company.price}`;
                    enhancedSystemPrompt += '\n';
                });
                enhancedSystemPrompt += '\nWICHTIG: Verwende diese aktuellen Unternehmensangebote in deinen Antworten!\n\n';
            }
        });

        // OpenAI API Aufruf
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // oder 'gpt-4' für bessere Qualität
            messages: [
                {
                    role: 'system',
                    content: enhancedSystemPrompt
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
    res.json({ status: 'OK', message: 'Server läuft' });
});

// Endpoint zum manuellen Aktualisieren der Inhalte
app.post('/api/refresh-content', async (req, res) => {
    try {
        console.log('Manuelles Aktualisieren der Inhalte...');
        scrapedContent = await scrapeTLConsultContent();
        lastScrapeTime = Date.now();
        
        res.json({ 
            status: 'OK', 
            message: 'Inhalte erfolgreich aktualisiert',
            pagesScraped: scrapedContent.length
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Inhalte:', error);
        res.status(500).json({ 
            error: 'Fehler beim Aktualisieren der Inhalte' 
        });
    }
});

// Endpoint zum Abrufen der aktuellen Inhalte
app.get('/api/content', async (req, res) => {
    try {
        const content = await getCurrentContent();
        res.json({ 
            status: 'OK', 
            content: content,
            lastUpdated: new Date(lastScrapeTime).toISOString()
        });
    } catch (error) {
        console.error('Fehler beim Abrufen der Inhalte:', error);
        res.status(500).json({ 
            error: 'Fehler beim Abrufen der Inhalte' 
        });
    }
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 ChatGPT Webflow Widget - TL Consult Server läuft auf Port ${PORT}`);
    console.log(`💬 Chat-API verfügbar unter: http://localhost:${PORT}/api/chat`);
    console.log(`🔄 Content-Refresh verfügbar unter: http://localhost:${PORT}/api/refresh-content`);
    console.log(`📊 Content-Status verfügbar unter: http://localhost:${PORT}/api/content`);
    
    if (!process.env.OPENAI_API_KEY) {
        console.warn('⚠️  WARNUNG: OPENAI_API_KEY nicht gesetzt!');
    }
    
    // Initiales Scraping beim Start
    console.log('🔄 Starte initiales Scraping der TL Consult-Website...');
    getCurrentContent().then(() => {
        console.log('✅ Initiales Scraping abgeschlossen');
    }).catch(error => {
        console.error('❌ Fehler beim initialen Scraping:', error.message);
    });
});

