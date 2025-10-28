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
- Email: marburg@tl-consult.de
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
- Email: marburg@tl-consult.de
- WhatsApp Business: +496421 480 615 – 0 (EMPFOHLEN für schnelle Kontaktaufnahme)
- Terminbuchung: https://cal.meetergo.com/tlc-lang?lang=de (DIREKTE Terminbuchung online)
- Adresse: Lokschuppen Marburg, Rudolf-Bultmann-Str. 4h, 35039 Marburg

WICHTIG: Bei jeder Kontaktanfrage IMMER WhatsApp Business als bevorzugten Kontakt empfehlen und verlinken!
WICHTIG: Bei Beratungswünschen oder Terminanfragen IMMER den Terminbuchungslink anbieten!

WICHTIG: Verwende Links in deinen Antworten, um Nutzer zu den relevanten Seiten zu leiten:

- Bei Fragen zum Unternehmensverkauf: Verweise auf https://www.tl-consult.de/leistungen/unternehmensverkauf
- Bei Fragen zur Unternehmensbörse: Verweise auf https://www.tl-consult.de/unternehmensboerse
- Bei Fragen zu uns: Verweise auf https://www.tl-consult.de/uber-uns
- Bei Fragen zum Netzwerk: Verweise auf https://www.tl-consult.de/netzwerk
- Bei Kontaktfragen: Verweise auf https://www.tl-consult.de/kontakt
- Bei allgemeinen Fragen: Verweise auf https://www.tl-consult.de

Format für Links: <a href="URL" target="_blank">Link-Text</a>

WICHTIG für WhatsApp Business Links:
Verwende IMMER: <a href="https://wa.me/4964214806150" target="_blank" style="color: #1a365d; text-decoration: underline;">WhatsApp Business</a>

WICHTIG für Terminbuchung Links:
Verwende IMMER: <a href="https://cal.meetergo.com/tlc-lang?lang=de" target="_blank" style="color: #1a365d; text-decoration: underline;">Terminbuchung</a>

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
- Bei JEDER Antwort, die Beratung, Kontakt oder persönliches Gespräch empfiehlt: Kontaktmöglichkeiten als klickbare Links anhängen

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
<p>Sie können TL Consult auf verschiedene Weise erreichen. Wir empfehlen besonders WhatsApp Business für eine schnelle und unkomplizierte Kontaktaufnahme:</p>
<ul>
<li><strong><a href='https://wa.me/4964214806150' target='_blank' style='color: #1a365d; text-decoration: underline;'>WhatsApp Business</a></strong> - +496421 480 615 – 0 (Empfohlen für schnelle Kontaktaufnahme)</li>
<li><strong><a href='https://cal.meetergo.com/tlc-lang?lang=de' target='_blank' style='color: #1a365d; text-decoration: underline;'>Terminbuchung</a></strong> - Direkte Online-Terminbuchung (Empfohlen für Beratungsgespräche)</li>
<li><strong>Telefon:</strong> (+49) 0 6421 / 480 615 – 0</li>
<li><strong>E-Mail:</strong> marburg@tl-consult.de</li>
</ul>
<p>Über WhatsApp Business können Sie direkt und unkompliziert mit uns in Kontakt treten! Für ein persönliches Beratungsgespräch können Sie direkt einen Termin buchen.</p>"

Beispiel für Beratungsempfehlung mit Kontaktmöglichkeiten:
Frage: "Ich möchte mein Unternehmen verkaufen"
Antwort: "<h3>Unternehmensverkauf - Professionelle Begleitung</h3>
<p>Der Verkauf Ihres Unternehmens ist ein wichtiger Schritt. Wir unterstützen Sie dabei, den besten Käufer für Ihr Lebenswerk zu finden. Unser strukturierter Prozess umfasst:</p>
<ul>
<li><strong>Vorbereitung:</strong> Exposé, Bewertung und anonymes Kurzprofil</li>
<li><strong>Interessentensuche:</strong> Über 2.500 geprüfte Kaufinteressenten</li>
<li><strong>Verhandlung:</strong> Professionelle Begleitung bis zum Vertragsabschluss</li>
</ul>
<p>Für eine detaillierte Beratung und individuelle Tipps empfehle ich Ihnen, einen persönlichen Beratungstermin zu vereinbaren.</p>

<p><strong>Kontaktmöglichkeiten:</strong><br>
<a href='https://wa.me/4964214806150' target='_blank' style='color: #1a365d; text-decoration: underline;'>WhatsApp Business</a> | 
<a href='https://cal.meetergo.com/tlc-lang?lang=de' target='_blank' style='color: #1a365d; text-decoration: underline;'>Terminbuchung</a> | 
Telefon: (+49) 0 6421 / 480 615 – 0</p>"

Beantworte Fragen freundlich, professionell und hilfsbereit. Verwende immer die Sie-Form und sei zuvorkommend. 

WICHTIG: Bei JEDER Antwort, die Beratung, Kontakt oder ein persönliches Gespräch empfiehlt, MÜSSEN die Kontaktmöglichkeiten als klickbare Links angehängt werden:

"<p><strong>Kontaktmöglichkeiten:</strong><br>
<a href='https://wa.me/4964214806150' target='_blank' style='color: #1a365d; text-decoration: underline;'>WhatsApp Business</a> | 
<a href='https://cal.meetergo.com/tlc-lang?lang=de' target='_blank' style='color: #1a365d; text-decoration: underline;'>Terminbuchung</a> | 
Telefon: (+49) 0 6421 / 480 615 – 0</p>"

Dieses Kontaktformat MUSS bei jeder Beratungsempfehlung angehängt werden!`;

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

// KI-Such-Endpoint für Unternehmensbörse
app.post('/api/ki-search', async (req, res) => {
    try {
        const { query, type } = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Suchanfrage ist erforderlich' 
            });
        }

        // Aktuelle Website-Inhalte abrufen
        const currentContent = await getCurrentContent();
        
        // Erstelle erweiterten System-Prompt für KI-Suche
        const searchSystemPrompt = `Du bist ein KI-Assistent für die Unternehmensbörse von TL Consult. Deine Aufgabe ist es, umgangssprachliche Suchanfragen zu analysieren und in konkrete Filterkriterien für die Unternehmensbörse umzuwandeln.

UNTERNEHMENSBÖRSE-INFORMATIONEN:
- Website: https://www.tl-consult.de/unternehmensboerse
- Zielgruppe: Unternehmenskäufer, Investoren, Nachfolger
- Filterkategorien: Branche, Größe, Standort, Umsatz, Mitarbeiterzahl, Alter, Spezialisierung

VERFÜGBARE FILTERKATEGORIEN (basierend auf fs-cmsfilter-field):
1. NAME:
   - Unternehmensname oder Teil davon
   - WICHTIG: Analysiere auch den Namen auf enthaltene Informationen wie:
     * Regionen/Städte: "München GmbH", "Hamburg Solutions", "Berlin Tech"
     * Geschäftsbereiche: "B2B Services", "Medizintechnik AG", "IT Solutions"
     * Branchen: "Maschinenbau GmbH", "Software Entwickler"
   - Beispiel: "Maschinenbau GmbH", "Tech Solutions", "München B2B"

2. BESCHREIBUNG:
   - Unternehmensbeschreibung oder Schlüsselwörter
   - Beispiel: "Produktion", "Dienstleistung", "Innovation"

3. GESUCHT:
   - Status des Unternehmens (Verkauf/Gesucht)
   - Werte: "Verkauf", "Gesucht", "Nachfolge"

4. REGION:
   - Geografische Lage (auch aus dem Namen extrahieren!)
   - Beispiel: "Hessen", "Bayern", "NRW", "Deutschland", "München", "Hamburg"

5. BRANCHE:
   - Industriezweig oder Geschäftsbereich (auch aus dem Namen extrahieren!)
   - Beispiel: "Maschinenbau", "IT", "Gesundheit", "Handwerk", "B2B", "Medizintechnik"

6. PREIS:
   - Kaufpreis oder Preisbereich
   - Beispiel: "1-5 Mio", "unter 1 Mio", "über 10 Mio"

AKTUELLE UNTERNEHMENSANGEBOTE:
${currentContent.find(page => page.url.includes('unternehmensboerse'))?.companyListings?.map((company, index) => 
    `${index + 1}. ${company.name} - ${company.status} - ${company.description}`
).join('\n') || 'Keine aktuellen Angebote verfügbar'}

WICHTIGE GESCHÄFTSBEGRIFFE zu erkennen:
- Unternehmensgröße: "Marktführer", "KMU" (kleines mittelständisches Unternehmen), "Startup", "Familienunternehmen", "Konzern"
- Unternehmensstatus: "Gesucht" (Kaufgesuch), "Verkauf" (Verkaufsangebot), "Nachfolge gesucht", "Übernahme gesucht"
- Geschäftsbereiche: "B2B", "B2C", "B2B2C", "wholesale", "retail"
- Regions-Hinweise in Namen: Städte (München, Hamburg, Berlin), Bundesländer (Hessen, Bayern, NRW)
- Branchen in Namen: "IT", "Maschinenbau", "Medizintechnik", "Handwerk", "Gesundheit"

AUFGABE:
Analysiere die folgende umgangssprachliche Suchanfrage und wandle sie in konkrete Filterkriterien um. 
Berücksichtige dabei ALLE Informationen:
- Namen der Unternehmen (Regionen, Branchen, Geschäftsbereiche)
- Beschreibungen (Marketing-Begriffe, Status-Indikatoren, Geschäftsbereiche)
- Suchbegriffe mit spezieller Bedeutung (Marktführer, KMU, Gesucht, Verkauf, etc.)

ANTWORTFORMAT (JSON):
{
    "interpretation": "Kurze Erklärung der Interpretation der Anfrage",
    "filters": ["Liste der gefundenen Filterkriterien"],
    "finsweetFilters": [
        {
            "field": "fs-cmsfilter-field Name",
            "value": "Filterwert",
            "type": "checkbox|select|range"
        }
    ],
    "suggestions": ["Zusätzliche Suchvorschläge"],
    "confidence": 0.95
}

BEISPIELE:

Anfrage: "Ich suche ein Maschinenbau-Unternehmen"
Antwort: {
    "interpretation": "Suche nach Unternehmen aus der Maschinenbau-Branche",
    "filters": ["Branche: Maschinenbau"],
    "finsweetFilters": [
        {"field": "Branche", "value": "Maschinenbau", "type": "checkbox"}
    ],
    "suggestions": ["Produktionsbetriebe", "Industrieunternehmen"],
    "confidence": 0.95
}

Anfrage: "Unternehmen in München"
Antwort: {
    "interpretation": "Suche nach Unternehmen in München (Region aus Name extrahieren)",
    "filters": ["Region: München"],
    "finsweetFilters": [
        {"field": "Region", "value": "München", "type": "checkbox"}
    ],
    "suggestions": ["Münchner Unternehmen", "Bayrische Firmen"],
    "confidence": 0.9
}

Anfrage: "B2B Unternehmen"
Antwort: {
    "interpretation": "Suche nach B2B-Unternehmen (Branche aus Name/Beschreibung)",
    "filters": ["Branche: B2B"],
    "finsweetFilters": [
        {"field": "Branche", "value": "B2B", "type": "checkbox"}
    ],
    "suggestions": ["B2B Services", "Business-to-Business"],
    "confidence": 0.9
}

Anfrage: "Medizintechnik AG"
Antwort: {
    "interpretation": "Suche nach Medizintechnik-Unternehmen (Branche aus Name)",
    "filters": ["Branche: Medizintechnik"],
    "finsweetFilters": [
        {"field": "Branche", "value": "Medizintechnik", "type": "checkbox"}
    ],
    "suggestions": ["Gesundheitswesen", "Medizintechnik"],
    "confidence": 0.95
}

Anfrage: "Hamburg Solutions"
Antwort: {
    "interpretation": "Suche nach Unternehmen in Hamburg (Region aus Name)",
    "filters": ["Region: Hamburg"],
    "finsweetFilters": [
        {"field": "Region", "value": "Hamburg", "type": "checkbox"}
    ],
    "suggestions": ["Hamburger Unternehmen", "Norddeutsche Firmen"],
    "confidence": 0.9
}

Anfrage: "Marktführer im Bereich IT"
Antwort: {
    "interpretation": "Suche nach marktführenden IT-Unternehmen",
    "filters": ["Branche: IT", "Unternehmensgröße: Marktführer"],
    "finsweetFilters": [
        {"field": "Branche", "value": "IT", "type": "checkbox"}
    ],
    "suggestions": ["Große IT-Unternehmen", "Führende Tech-Firmen"],
    "confidence": 0.8
}

Anfrage: "KMU gesucht"
Antwort: {
    "interpretation": "Suche nach kleinen mittelständischen Unternehmen zum Verkauf",
    "filters": ["Unternehmensgröße: KMU", "Status: Gesucht"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "Verkauf", "type": "checkbox"}
    ],
    "suggestions": ["Kleine Unternehmen", "Mittelständische Betriebe"],
    "confidence": 0.9
}

Anfrage: "Familienunternehmen zum Verkauf in Bayern"
Antwort: {
    "interpretation": "Suche nach Familienunternehmen zum Verkauf in Bayern",
    "filters": ["Unternehmensgröße: Familienunternehmen", "Region: Bayern", "Status: Verkauf"],
    "finsweetFilters": [
        {"field": "Region", "value": "Bayern", "type": "checkbox"},
        {"field": "Gesucht", "value": "Verkauf", "type": "checkbox"}
    ],
    "suggestions": ["Familienbetriebe", "Bayrische Unternehmen"],
    "confidence": 0.95
}

Anfrage: "Ich suche Unternehmen die zum Kauf stehen"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: KAUF)",
    "filters": ["Status: KAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "KAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.95
}

Anfrage: "Unternehmen zum Verkauf gesucht"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: KAUF)",
    "filters": ["Status: KAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "KAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.9
}

Anfrage: "Welche Unternehmen werden verkauft?"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: KAUF)",
    "filters": ["Status: KAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "KAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.9
}

Anfrage: "Ich suche Unternehmen die gekauft werden können"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: KAUF)",
    "filters": ["Status: KAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "KAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.85
}

Anfrage: "Ich suche ein Unternehmen das zum Verkauf steht"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: VERKAUF)",
    "filters": ["Status: VERKAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "VERKAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.95
}

Anfrage: "Welche Unternehmen stehen zum Verkauf?"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: VERKAUF)",
    "filters": ["Status: VERKAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "VERKAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.9
}

Anfrage: "Unternehmen verkaufen"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: VERKAUF)",
    "filters": ["Status: VERKAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "VERKAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.9
}

Anfrage: "Ich will ein Unternehmen kaufen"
Antwort: {
    "interpretation": "Suche nach Unternehmen zum Verkauf (Status: VERKAUF)",
    "filters": ["Status: VERKAUF"],
    "finsweetFilters": [
        {"field": "Gesucht", "value": "VERKAUF", "type": "checkbox"}
    ],
    "suggestions": ["Verkaufsangebote", "Unternehmen zum Verkauf"],
    "confidence": 0.85
}

WICHTIG: Die fs-cmsfilter-field Werte müssen EXAKT mit den Werten in Ihrer Webflow Collection übereinstimmen!
Beispiel: Wenn in Webflow "Maschinenbau" steht, dann muss der Filter-Wert auch "Maschinenbau" sein.

ANALYSE-REGELN für Unternehmensnamen und Beschreibungen:
- Extrahiere Städte/Regionen: "München GmbH" → Region: München
- Extrahiere Branchen: "B2B Services" → Branche: B2B
- Extrahiere Geschäftsbereiche: "Medizintechnik AG" → Branche: Medizintechnik
- Extrahiere Marketing-Begriffe: "Marktführer", "etabliert", "innovativ"
- Extrahiere Status-Indikatoren: "gesucht", "verkauf", "nachfolge", "übernahme"
- Extrahiere Unternehmensgröße: "KMU", "Startup", "Familienunternehmen", "Konzern"
- Extrahiere Geschäftsbereiche: "B2B", "B2C", "wholesale", "retail"

STATUS-ERKENNUNG für fs-cmsfilter-field="Gesucht":
- "zum Verkauf stehen", "verkaufen", "steht zum verkauf", "Verkauf", "verkauft werden" → Wert: "VERKAUF"
- "zum Kauf stehen", "kaufen", "gekauft werden können", "Kauf", "gesucht" → Wert: "KAUF"
- "gesucht", "kaufgesuch", "nachfolge gesucht", "GESUCHT" → Wert: "GESUCHT"
- "nachfolge", "übernahme", "nachfolger gesucht", "NACHFOLGE" → Wert: "NACHFOLGE"

WICHTIG: Prüfe die genauen Werte in Ihrer Webflow Collection für fs-cmsfilter-field="Gesucht"!
Mögliche Werte in Webflow: "VERKAUF" (zum Verkauf), "KAUF" (zum Kauf), "GESUCHT", "NACHFOLGE"
- Verwende EXAKT diese Werte wie sie in Webflow gespeichert sind!
- "Ich suche Unternehmen die zum Verkauf stehen" → filtere nach "VERKAUF"
- "Ich suche Unternehmen die zum Kauf stehen" → filtere nach "KAUF"

- Kombiniere ALLE Informationen für maximale Trefferqualität

Analysiere jetzt diese Anfrage: "${query}"`;

        // OpenAI API Aufruf für KI-Suche
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: searchSystemPrompt
                },
                {
                    role: 'user',
                    content: query
                }
            ],
            temperature: 0.3,
            max_tokens: 500
        });

        const reply = completion.choices[0].message.content;
        
        // Versuche JSON zu parsen
        let searchResult;
        try {
            searchResult = JSON.parse(reply);
        } catch (parseError) {
            // Fallback falls JSON-Parsing fehlschlägt
            searchResult = {
                interpretation: reply,
                filters: ["Allgemeine Suche"],
                finsweetFilters: [],
                suggestions: [],
                confidence: 0.7
            };
        }

        res.json(searchResult);

    } catch (error) {
        console.error('Fehler bei KI-Suche:', error);
        
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

