import { createApp } from "./app.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3100", 10);

async function startServer() {
  const app = await createApp();

  app.listen(PORT, () => {
    console.log();
    console.log("=".repeat(56));
    console.log("  RAG Customer Service PDAM Makassar");
    console.log("=".repeat(56));
    console.log();
    console.log(`  Web Chat UI : http://localhost:${PORT}`);
    console.log(`  API Health  : http://localhost:${PORT}/api/health`);
    console.log(`  API Chat    : POST http://localhost:${PORT}/api/chat`);
    console.log(`  API Retrieve: POST http://localhost:${PORT}/api/retrieve`);
    console.log();
    console.log("  Buka browser ke URL di atas untuk mulai chat.");
    console.log("=".repeat(56));
  });
}

startServer().catch(console.error);
