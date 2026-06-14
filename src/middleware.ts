import { defineMiddleware } from 'astro:middleware';
import { initDb } from './lib/db';

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    // Automatically initialize database schema and extensions before handling requests
    await initDb();
  } catch (error) {
    console.error('[Middleware] Database initialization failed:', error);
  }
  return next();
});
