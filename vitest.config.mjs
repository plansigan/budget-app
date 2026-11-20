import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'react-native': path.resolve(__dirname, 'src/__tests__/__mocks__/react-native.ts'),
      '@react-native-async-storage/async-storage': path.resolve(
        __dirname,
        'src/__tests__/__mocks__/async-storage.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
  },
});
