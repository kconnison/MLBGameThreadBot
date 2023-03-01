export class LoggerService {
    private LOG_PREFIX: string;
    constructor(name: string) {
        this.LOG_PREFIX = `[${name}] `;
    }

    debug(...args: any[]) {
        console.debug(this.LOG_PREFIX, ...args);
    }

    info(...args: any[]) {
        console.info(this.LOG_PREFIX, ...args);
    }

    log(...args: any[]) {
        console.log(this.LOG_PREFIX, ...args);
    }

    warn(...args: any[]) {
        console.warn(this.LOG_PREFIX, ...args);
    }

    error(...args: any[]) {
        console.error(this.LOG_PREFIX, ...args);
    }
}