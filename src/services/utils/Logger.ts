export class Logger {
 static info(message: string, ...args: any[]) {
   console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
 }

 static warn(message: string, ...args: any[]) {
   console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
 }

 static error(message: string, ...args: any[]) {
   console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
 }
} 