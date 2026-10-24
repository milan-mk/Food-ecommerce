const { port } = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await connectDB();
    const server = app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('unhandledRejection', (e) => {
      console.error('Unhandled rejection:', e);
      server.close(() => process.exit(1));
    });
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }
})();
