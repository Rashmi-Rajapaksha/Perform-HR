const app = require('./app');
const sequelize = require('./config/database');
const env = require('./config/environment');

async function start() {
  try {
    await sequelize.authenticate();
    // eslint-disable-next-line no-console
    console.log('[database] Connection established successfully.');

    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] HR Plus API running on port ${env.port} (${env.env})`);
      // eslint-disable-next-line no-console
      console.log(`[server] API base: http://localhost:${env.port}${env.apiPrefix}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[server] Unable to start server:', error.message);
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[process] Unhandled promise rejection:', reason);
});
