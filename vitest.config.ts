import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

const env = config({ processEnv: {} }).parsed ?? {};

export default defineConfig({
  test: {
    environment: 'node',
    env,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
