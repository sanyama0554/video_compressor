# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron video compression application designed to compress video and audio files for GitHub PR attachments. The app provides a drag-and-drop interface with multiple compression presets optimized for different use cases.

## Architecture

The project uses a modern Electron architecture with three main packages:

- **main**: Electron main process (Node.js) - handles file operations, FFmpeg processing, settings, and IPC
- **preload**: Security layer that exposes APIs to renderer via contextBridge
- **renderer**: React UI running in a sandboxed environment

## Technology Stack

- **Electron 30+** with security-first configuration
- **TypeScript** for type safety across all packages
- **React 18** with Vite for the UI
- **FFmpeg** for video/audio processing (bundled binaries)
- **electron-store** for settings persistence

## Development Commands

```bash
# Install dependencies
npm install

# Development (starts all processes)
npm run dev

# Build all packages
npm run build

# Build individual packages
npm run build:main
npm run build:preload  
npm run build:renderer

# Run in development mode
npm run electron:dev

# Create distribution packages
npm run dist          # All platforms
npm run dist:win      # Windows
npm run dist:mac      # macOS  
npm run dist:linux    # Linux
```

## Project Structure

```
packages/
├── main/           # Electron main process
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── media/MediaManager.ts # FFprobe file analysis
│   │   ├── jobs/JobManager.ts    # FFmpeg processing queue
│   │   ├── settings/             # App settings management
│   │   ├── history/              # Compression history
│   │   └── ipc/handlers.ts       # IPC message handlers
├── preload/        # Security bridge
│   └── src/index.ts              # API exposure via contextBridge
└── renderer/       # React UI
    ├── src/
    │   ├── App.tsx               # Main app component
    │   ├── components/           # UI components
    │   └── types.ts              # Shared type definitions
```

## Key Features Implemented

- Drag & drop file input with format validation
- Multiple compression presets (GitHub PR, High Compression, Quality Priority, Audio Only)
- Real-time progress tracking with FFmpeg output parsing
- Parallel job processing (configurable 1-4 concurrent jobs)
- Settings management with electron-store
- Compression history tracking
- Cross-platform FFmpeg binary bundling

## FFmpeg Integration

The app includes platform-specific FFmpeg and FFprobe binaries:
- Development: Uses @ffmpeg-installer packages
- Production: Bundles binaries in extraResources
- Processing: Spawns child processes with progress monitoring

## Security Configuration

- `nodeIntegration: false` - No Node.js in renderer
- `contextIsolation: true` - Isolated execution contexts  
- `sandbox: true` - Renderer runs in sandbox
- `webSecurity: true` - Standard web security policies
- All APIs exposed through secure preload script

## Type Safety

Types are shared across packages by copying `types.ts` to each package during build. The main types include:
- `MediaInfo` - FFprobe output structure
- `CompressionPreset` - Encoding settings
- `JobConfig` - Processing job configuration
- `FileItem` - UI file representation

## Testing

- Unit tests: Jest (configured but tests need implementation)
- E2E tests: Playwright (configured but tests need implementation)
- Manual testing: Use `npm run electron:dev`

## Known Limitations

- Target size mode (2-pass encoding) needs duration detection from MediaInfo
- fluent-ffmpeg dependency is deprecated (consider direct FFmpeg spawn)
- Some advanced presets and settings UI not fully implemented
- Error handling could be more robust

## Development Tips

- Use `npm run dev` for development with hot reload
- Check console for FFmpeg output and errors
- Settings are stored in OS-specific config directory
- History limited to 100 items by default

## Next Steps for Development

1. Implement remaining UI components (detailed settings, advanced history)
2. Add comprehensive error handling and user feedback
3. Implement target size calculation with proper duration detection
4. Add comprehensive test suites
5. Set up code signing for distribution
6. Add update mechanism with electron-updater