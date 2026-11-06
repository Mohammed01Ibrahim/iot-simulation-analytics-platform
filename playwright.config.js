import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',workers:1,timeout:45000,reporter:[['list'],['json',{outputFile:'docs/evidence/browser-results.json'}]]});
