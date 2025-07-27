const cron = require('node-cron');
const { format } = require('date-fns');
const PropertyFinderService = require('./propertyFinder');
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
            filename: 'scheduler-error.log',
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: 'scheduler.log' 
        })
    ]
});

class SchedulerService {
    constructor(options = {}) {
        this.scheduleTime = options.scheduleTime || '0 9 * * *'; // Default 9:00 AM
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 5 * 60 * 1000; // 5 minuti
        this.job = null;
        this.isRunning = false;
    }

    async start() {
        logger.info('Avvio scheduler con configurazione:', {
            scheduleTime: this.scheduleTime,
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay
        });

        this.job = cron.schedule(this.scheduleTime, () => {
            this.executeTask();
        });
    }

    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('Scheduler fermato');
        }
    }

    async executeTask(retryCount = 0) {
        if (this.isRunning) {
            logger.warn('Task già in esecuzione, skip');
            return;
        }

        this.isRunning = true;
        const propertyFinder = new PropertyFinderService({
            headless: true,
            propertyLimit: 10
        });

        try {
            logger.info('Inizio esecuzione task schedulato');
            
            await propertyFinder.initialize();
            const properties = await propertyFinder.searchDubaiMarinaProperties();
            
            logger.info('Task completato con successo', {
                propertiesFound: properties.length,
                date: format(new Date(), 'yyyy-MM-dd HH:mm:ss')
            });

            // Qui puoi aggiungere la logica per inviare notifiche
            this.sendNotification('Task completato', `Trovate ${properties.length} proprietà`);

        } catch (error) {
            logger.error('Errore durante l\'esecuzione del task:', error);

            if (retryCount < this.maxRetries) {
                logger.info(`Retry ${retryCount + 1}/${this.maxRetries} tra ${this.retryDelay/1000} secondi`);
                
                setTimeout(() => {
                    this.executeTask(retryCount + 1);
                }, this.retryDelay);
            } else {
                logger.error('Numero massimo di retry raggiunto');
                this.sendNotification('Errore Task', 
                    `Errore durante la ricerca proprietà dopo ${this.maxRetries} tentativi`);
            }
        } finally {
            await propertyFinder.close();
            this.isRunning = false;
        }
    }

    sendNotification(title, message) {
        // Qui implementa la logica per inviare notifiche
        // Potresti usare electron-notifier o altre librerie
        logger.info('Notifica:', { title, message });
    }

    // Metodo per esecuzione manuale
    async executeManualSearch() {
        logger.info('Avvio ricerca manuale');
        return this.executeTask();
    }
}

module.exports = SchedulerService; 