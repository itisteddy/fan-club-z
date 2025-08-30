interface LogLevel {
    info: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
}
declare let logger: LogLevel;
export default logger;
//# sourceMappingURL=logger-simple.d.ts.map