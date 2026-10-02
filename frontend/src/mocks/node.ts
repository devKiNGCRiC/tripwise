/**
 * node.ts — the same mock API for Node (Vitest), intercepting fetch in-process.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
