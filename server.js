
const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      app: "PrimeTrade",
      status: "online",
      mode: "testnet",
      message: "Backend is responding"
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({
    error: "Endpoint not found"
  }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`PrimeTrade backend listening on ${PORT}`);
});
