import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/safety/**/*.test.ts'],environment:'node'}});
