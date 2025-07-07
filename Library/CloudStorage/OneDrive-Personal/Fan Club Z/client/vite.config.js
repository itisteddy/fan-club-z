import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@shared": path.resolve(__dirname, "../shared"),
        },
    },
    server: {
        host: '0.0.0.0', // Allow external connections
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5001', // Use 127.0.0.1 instead of localhost
                changeOrigin: true,
                secure: false,
                ws: true,
                configure: function (proxy, _options) {
                    proxy.on('error', function (err, _req, _res) {
                        console.log('Proxy error:', err);
                    });
                    proxy.on('proxyReq', function (proxyReq, req, _res) {
                        console.log('Proxying request:', req.method, req.url, '-> target:', proxyReq.path);
                    });
                    proxy.on('proxyRes', function (proxyRes, req, _res) {
                        console.log('Proxy response:', req.url, '->', proxyRes.statusCode);
                    });
                },
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
