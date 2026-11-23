import express from 'express';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use((_request, response) => {
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  app.use((error, _request, response, _next) => {
    const status = [400, 413, 415].includes(error.status) ? error.status : 500;
    const errors = {
      400: { code: 'BAD_REQUEST', message: 'Invalid request body' },
      413: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
      415: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Unsupported request encoding',
      },
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    };
    response.status(status).json({ error: errors[status] });
  });

  return app;
}
