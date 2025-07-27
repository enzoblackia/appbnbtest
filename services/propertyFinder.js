const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const ExcelJS = require('exceljs');
const path = require('path');
const { format } = require('date-fns');
const winston = require('winston');

// Configurazione logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'property-finder-error.log',
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'property-finder.log' 
        })
    ]
});

// Aggiungi plugin stealth a puppeteer
puppeteer.use(StealthPlugin());

class PropertyFinderService {
    constructor(options = {}) {
        this.browser = null;
        this.page = null;
        this.isHeadless = options.headless ?? false;
        this.propertyLimit = options.propertyLimit ?? 10;
        this.baseUrl = 'https://www.propertyfinder.ae';
        this.searchResults = [];
    }

    async initialize() {
        try {
            logger.info('Inizializzazione browser');
            this.browser = await puppeteer.launch({
                headless: this.isHeadless,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu'
                ],
                defaultViewport: { width: 1920, height: 1080 }
            });

            this.page = await this.browser.newPage();
            await this.page.setDefaultNavigationTimeout(30000);
            await this.page.setDefaultTimeout(30000);

            // Intercetta e blocca analytics e trackers non necessari
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                if (request.resourceType() === 'image' || request.resourceType() === 'font') {
                    request.abort();
                } else {
                    request.continue();
                }
            });

            logger.info('Browser inizializzato con successo');
            return true;
        } catch (error) {
            logger.error('Errore nell\'inizializzazione del browser:', error);
            throw error;
        }
    }

    async searchDubaiMarinaProperties() {
        try {
            logger.info('Inizio ricerca proprietà Dubai Marina');
            
            // Naviga alla homepage
            await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
            
            // Cerca "Dubai Marina"
            await this.page.type('input[name="search"]', 'Dubai Marina');
            await this.page.keyboard.press('Enter');
            
            // Attendi caricamento risultati
            await this.page.waitForSelector('.property-list');
            
            // Filtra per affitto
            await this.page.click('button[data-testid="rent-button"]');
            await this.page.waitForNavigation({ waitUntil: 'networkidle0' });

            // Estrai dati proprietà
            const properties = await this.extractProperties();
            
            // Genera Excel
            await this.generateExcel(properties);

            logger.info(`Ricerca completata. Trovate ${properties.length} proprietà`);
            return properties;

        } catch (error) {
            logger.error('Errore durante la ricerca proprietà:', error);
            throw error;
        }
    }

    async extractProperties() {
        try {
            logger.info('Inizio estrazione dati proprietà');
            
            const properties = await this.page.evaluate(async (limit) => {
                const items = Array.from(document.querySelectorAll('.property-list__item'));
                return items.slice(0, limit).map(item => {
                    const title = item.querySelector('.property-card__title')?.textContent.trim();
                    const price = item.querySelector('.property-card__price')?.textContent.trim();
                    const size = item.querySelector('.property-card__size')?.textContent.trim();
                    const agent = item.querySelector('.property-card__agent-name')?.textContent.trim();
                    const phone = item.querySelector('.property-card__agent-phone')?.textContent.trim();
                    const link = item.querySelector('a.property-card__link')?.href;
                    
                    return {
                        title,
                        price: price?.replace(/[^0-9]/g, ''),
                        size: size?.replace(/[^0-9]/g, ''),
                        agent,
                        phone,
                        link
                    };
                });
            }, this.propertyLimit);

            logger.info(`Estratte ${properties.length} proprietà`);
            return properties;

        } catch (error) {
            logger.error('Errore durante l\'estrazione dei dati:', error);
            throw error;
        }
    }

    async generateExcel(properties) {
        try {
            logger.info('Inizio generazione file Excel');
            
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Dubai Marina Properties');

            // Configura colonne
            worksheet.columns = [
                { header: 'Nome Proprietà', key: 'title', width: 40 },
                { header: 'Prezzo (AED/mese)', key: 'price', width: 15 },
                { header: 'Metri Quadrati', key: 'size', width: 15 },
                { header: 'Agente', key: 'agent', width: 25 },
                { header: 'Telefono', key: 'phone', width: 20 },
                { header: 'Link', key: 'link', width: 50 },
                { header: 'Data Ricerca', key: 'date', width: 20 }
            ];

            // Aggiungi dati
            const now = new Date();
            properties.forEach(property => {
                worksheet.addRow({
                    ...property,
                    date: format(now, 'yyyy-MM-dd HH:mm:ss')
                });
            });

            // Stile intestazioni
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Salva file
            const fileName = `dubai_marina_properties_${format(now, 'yyyy-MM-dd')}.xlsx`;
            const filePath = path.join(process.cwd(), 'exports', fileName);
            await workbook.xlsx.writeFile(filePath);

            logger.info(`File Excel generato: ${fileName}`);
            return filePath;

        } catch (error) {
            logger.error('Errore durante la generazione del file Excel:', error);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            logger.info('Browser chiuso');
        }
    }
}

module.exports = PropertyFinderService; 