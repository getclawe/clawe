export async function register() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_RUNTIME === "nodejs"
  ) {
    const pino = (await import("pino")).default;
    const logger = pino({ level: process.env.LOG_LEVEL || "info" });

    globalThis.console.log = (...args: unknown[]) =>
      logger.info(args.length === 1 ? args[0] : args);
    globalThis.console.info = (...args: unknown[]) =>
      logger.info(args.length === 1 ? args[0] : args);
    globalThis.console.warn = (...args: unknown[]) =>
      logger.warn(args.length === 1 ? args[0] : args);
    globalThis.console.error = (...args: unknown[]) =>
      logger.error(args.length === 1 ? args[0] : args);
    globalThis.console.debug = (...args: unknown[]) =>
      logger.debug(args.length === 1 ? args[0] : args);
  }
}
