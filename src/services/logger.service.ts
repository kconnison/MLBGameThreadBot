export class LoggerService {
    private LOG_PREFIX: string;
    constructor(name: string) {        
        this.LOG_PREFIX = `[${name}] `;
    }

    debug(...args: any[]) {
        let timestamp = new Date().toISOString();
        console.debug(`[${timestamp}]${this.LOG_PREFIX}`, ...args);
    }

    info(...args: any[]) {
        let timestamp = new Date().toISOString();
        console.info(`[${timestamp}]${this.LOG_PREFIX}`, ...args);
    }

    log(...args: any[]) {
        let timestamp = new Date().toISOString();
        console.log(`[${timestamp}]${this.LOG_PREFIX}`, ...args);
    }

    warn(...args: any[]) {
        let timestamp = new Date().toISOString();
        console.warn(`[${timestamp}]${this.LOG_PREFIX}`, ...args);
    }

    error(...args: any[]) {
        let timestamp = new Date().toISOString();
        console.error(`[${timestamp}]${this.LOG_PREFIX}`, ...args);
    }
}