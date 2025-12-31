/**
 * Ranger HTTP API Server
 *
 * Express server providing REST API for Cortexis frontend integration.
 * This serves as an additional interface alongside the CLI and MCP server.
 *
 * @module api/server
 */
import express, { Express } from 'express';
import { createUnifiedMemory, UnifiedMemory } from '../memory/index.js';
import { CollectionManager, createCollectionManager } from '../memory/collections.js';
import { createCorsMiddleware, errorHandler, notFoundHandler } from './middleware/index.js';
import { createApiRouter } from './routes/index.js';

// ============================================================================
// Server Configuration
// ============================================================================

interface ServerConfig {
  /** Port to listen on (default: 3000) */
  port?: number;
  /** CORS origin (default: '*') */
  corsOrigin?: string;
  /** Data directory for storage (default: './data') */
  dataDir?: string;
  /** Vector database path (default: './ruvector.db') */
  vectorDbPath?: string;
  /** Enable cognitive features (default: true) */
  enableCognitive?: boolean;
}

// ============================================================================
// Server Class
// ============================================================================

/**
 * RangerServer - HTTP API server for Ranger
 */
export class RangerServer {
  private app: Express;
  private memory: UnifiedMemory;
  private collectionManager: CollectionManager;
  private config: Required<ServerConfig>;
  private server: ReturnType<Express['listen']> | null = null;

  constructor(config: ServerConfig = {}) {
    this.config = {
      port: config.port || parseInt(process.env.PORT || '3000', 10),
      corsOrigin: config.corsOrigin || process.env.CORS_ORIGIN || '*',
      dataDir: config.dataDir || process.env.DATA_DIR || './data',
      vectorDbPath: config.vectorDbPath || process.env.VECTOR_DB_PATH || './ruvector.db',
      enableCognitive: config.enableCognitive ?? true
    };

    // Initialize UnifiedMemory
    this.memory = createUnifiedMemory();

    // Initialize CollectionManager
    this.collectionManager = createCollectionManager(
      this.config.dataDir,
      this.memory.getGraphStore()
    );

    // Initialize Express app
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    this.app.use(createCorsMiddleware());

    // JSON body parsing
    this.app.use(express.json({ limit: '10mb' }));

    // URL-encoded body parsing (for multipart form fields like 'collection' in uploads)
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging (simple)
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
      });
      next();
    });
  }

  /**
   * Configure API routes
   */
  private setupRoutes(): void {
    // API routes (includes PKA-STRAT routes: pyramid, alignment, drift, teams, reports)
    const apiRouter = createApiRouter(this.memory, this.collectionManager);
    this.app.use('/api', apiRouter);

    // Root redirect to health
    this.app.get('/', (req, res) => {
      res.redirect('/api/health');
    });

    // 404 handler (must be last)
    this.app.use(notFoundHandler);

    // Error handler (must be last)
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    Ranger API Server                          ║
╠══════════════════════════════════════════════════════════════╣
║  Status:     Running                                          ║
║  Port:       ${String(this.config.port).padEnd(46)}║
║  CORS:       ${this.config.corsOrigin.padEnd(46)}║
║  Data Dir:   ${this.config.dataDir.padEnd(46)}║
╠══════════════════════════════════════════════════════════════╣
║  Core Endpoints:                                              ║
║    GET  /api/health           - Health check                  ║
║    GET  /api/collections      - List collections              ║
║    POST /api/collections      - Create collection             ║
║    GET  /api/collections/:n   - Get collection                ║
║    DEL  /api/collections/:n   - Delete collection             ║
║    POST /api/collections/:n/search - Search collection        ║
║    POST /api/documents/upload - Upload document               ║
║    GET  /api/documents/upload/:id/status - Job status         ║
║    POST /api/chat             - Send chat message (RAG)       ║
║    GET  /api/chat/history     - Get chat history              ║
║    GET  /api/metrics          - System metrics                ║
║    GET  /api/insights         - Learning insights             ║
╠══════════════════════════════════════════════════════════════╣
║  PKA-STRAT Endpoints:                                         ║
║    GET  /api/pyramid/:orgId   - Get pyramid tree              ║
║    POST /api/pyramid/entity   - Create pyramid entity         ║
║    GET  /api/alignment/summary - Alignment summary            ║
║    GET  /api/alignment/heatmap - Alignment heatmap            ║
║    GET  /api/drift/alerts     - Drift alerts                  ║
║    GET  /api/drift/monitor    - Real-time monitoring          ║
║    GET  /api/teams            - List teams                    ║
║    GET  /api/reports/board-narrative - Board report           ║
╚══════════════════════════════════════════════════════════════╝
          `);
          resolve();
        });

        this.server.on('error', (err: Error) => {
          console.error('Server error:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        this.server!.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Server stopped');
            resolve();
          }
        });
      });
    }
  }

  /**
   * Get the Express app instance (for testing)
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the UnifiedMemory instance
   */
  getMemory(): UnifiedMemory {
    return this.memory;
  }

  /**
   * Get the CollectionManager instance
   */
  getCollectionManager(): CollectionManager {
    return this.collectionManager;
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Start the server when run directly
 */
async function main() {
  const server = new RangerServer();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });

  try {
    await server.start();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Run if this is the main module
const isMainModule = process.argv[1]?.includes('server');
if (isMainModule) {
  main();
}

export { ServerConfig };
export default RangerServer;
