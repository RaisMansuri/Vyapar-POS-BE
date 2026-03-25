const app = require("../src/index");

module.exports = async (req, res) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Skip-Loader, X-Skip-Error-Toast, X-Requested-With"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (app.startServer) {
      await app.startServer();
    }
    return app(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};