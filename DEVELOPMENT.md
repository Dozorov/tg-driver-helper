# Development Guide

## Hot Reloading Setup

This project is configured with hot reloading for development using `nodemon` and `ts-node`.

### Available Scripts

- `npm run dev` - Run the application once with ts-node
- `npm run watch` - Run with hot reloading (recommended for development)
- `npm run dev:watch` - Alternative hot reloading command
- `npm run dev:debug` - Run with hot reloading and Node.js inspector for debugging
- `npm run build` - Build the TypeScript to JavaScript
- `npm start` - Run the built JavaScript (production)

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server with hot reloading:**
   ```bash
   npm run watch
   ```

### How Hot Reloading Works

- The server automatically restarts when you save changes to any `.ts`, `.js`, or `.json` file in the `src` directory
- Changes are detected within 1 second
- The server maintains the same port (3000) and database connections
- Console output shows when restarts occur

### File Watching

Nodemon watches the following:
- ✅ `src/**/*.ts` - TypeScript source files
- ✅ `src/**/*.js` - JavaScript files
- ✅ `src/**/*.json` - JSON configuration files
- ❌ `dist/**/*` - Built files (ignored)
- ❌ `src/**/*.spec.ts` - Test files (ignored)
- ❌ `src/**/*.test.ts` - Test files (ignored)

### Debugging

For debugging with breakpoints:
```bash
npm run dev:debug
```

Then open Chrome DevTools and go to `chrome://inspect` to connect to the Node.js debugger.

### Production

For production builds:
```bash
npm run build
npm start
```

### Troubleshooting

If hot reloading isn't working:
1. Check that nodemon is running: `ps aux | grep nodemon`
2. Verify file permissions
3. Check the console for any error messages
4. Try restarting: `npm run watch` 