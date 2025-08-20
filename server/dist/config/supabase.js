"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Try multiple environment variable names for flexibility
const supabaseUrl = process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'https://ihtnsyhknvltgrksffun.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodG5zeWhrbnZsdGdya3NmZnVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NzA2MzYsImV4cCI6MjA2OTI0NjYzNn0.ZmoZ5cGVHfhDwTvkmaw9LSVHm_awoyMOTyQKewr7rYo';
console.log('Supabase Config Debug:');
console.log('URL:', supabaseUrl ? 'Present' : 'Missing');
console.log('Key:', supabaseKey ? 'Present' : 'Missing');
console.log('Environment variables available:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
if (!supabaseUrl || !supabaseKey) {
    console.error('Available environment variables:', {
        SUPABASE_URL: process.env.SUPABASE_URL,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '[PRESENT]' : '[MISSING]',
    });
    throw new Error(`Missing Supabase environment variables. URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseKey ? 'OK' : 'MISSING'}`);
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
exports.default = exports.supabase;
