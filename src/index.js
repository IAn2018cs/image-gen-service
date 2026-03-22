const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const imageRoutes = require('./routes/images');

const app = express();

// Body parsing with high limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Routes
app.use('/v1', imageRoutes);

// Serve generated images
app.use('/images', express.static(config.localStoragePath));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'internal_error',
      message: err.message || 'Internal server error',
    },
  });
});

app.listen(config.port, () => {
  logger.info(`Image service listening on port ${config.port}`);

  if (config.mcpPort) {
    const apiBaseUrl = `http://localhost:${config.port}/v1`;
    import('./mcp.mjs')
      .then(({ startMcpServer }) => {
        startMcpServer(config.mcpPort, apiBaseUrl);
        logger.info(`MCP server listening on port ${config.mcpPort} (HTTP: /mcp, SSE: /sse)`);
      })
      .catch((err) => {
        logger.error(`Failed to start MCP server: ${err.message}`);
      });
  }
});
