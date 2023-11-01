import { config } from 'dotenv';
config();

import crypto from 'crypto';

// Function to generate a random session secret
export function generateSessionSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}
export const sessionSecret = generateSessionSecret(32);
