const app = require('../src/index');

module.exports = async (req, res) => {

  const origin = req.headers.origin;

  // allow localhost + any vercel deployment
  if (
    origin &&
    (
      origin.includes("localhost") ||
      origin.includes("vercel.app")
    )
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS,PATCH"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Skip-Error-Toast, X-Skip-Loader, X-CSRF-Token, X-Requested-With, Accept"
  );

  // handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {

    // ensure DB connected
    if (app.startServer) {
      await app.startServer();
    }

    return app(req, res);

  } catch (error) {

    console.error("API error:", error);

    return res.status(500).json({
      status: "Error",
      message: "Internal server error"
    });

  }
};