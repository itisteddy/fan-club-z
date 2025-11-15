// Sentry module shims for optional error monitoring
declare module '@sentry/react' {
  export function init(options: any): void;
  export function captureException(error: any, context?: any): void;
  export function captureMessage(message: string, level?: any): void;
  export function setUser(user: any): void;
  export function setContext(name: string, context: any): void;
  export function addBreadcrumb(breadcrumb: any): void;
  export const BrowserTracing: any;
  export const Replay: any;
}

declare module '@sentry/tracing' {
  export const BrowserTracing: any;
}
