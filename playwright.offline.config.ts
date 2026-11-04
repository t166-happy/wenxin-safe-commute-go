import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/offline',outputDir:'test-results-offline',timeout:45000,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:4173',headless:true},webServer:{command:'npm run preview -- --port 4173',url:'http://127.0.0.1:4173',reuseExistingServer:true}});
