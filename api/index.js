const app = require('../src/index');

module.exports = async (req, res) => {
  // Ensure database is connected before handling the request
  if (app.startServer) {
    await app.startServer();
  }
  return app(req, res);
};
