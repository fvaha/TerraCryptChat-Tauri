# Port Configuration and CORS Setup

## Current Configuration

- **Frontend Port**: `4001` (Vite dev server)
- **Tauri Dev URL**: `http://localhost:4001`
- **API Base URL**: Automatically detected based on environment

## How It Works

1. **Development Mode** (localhost):
   - Uses `http://localhost:8080/api/v1` for API calls
   - This matches the API server's allowed origins

2. **Production Mode** (non-localhost):
   - Uses `https://dev.v1.terracrypt.cc/api/v1` for API calls

## CORS Solution

The CORS error was resolved by:
- Using environment-specific API endpoints
- Development uses localhost:8080 (which allows localhost:4001)
- Production uses the remote server

## Port Conflicts

If port 4001 is busy, Vite will automatically find the next available port.
The Tauri configuration will adapt accordingly.

## To Change Ports

1. Update `vite.config.ts` server.port
2. Update `src-tauri/tauri.conf.json` build.devUrl
3. Ensure the new port is in the API server's allowed origins
