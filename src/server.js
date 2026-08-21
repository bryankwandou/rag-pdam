import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { RAGPipeline } from "./rag_pipeline.js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3100", 10);

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use(express.static(join(__dirname, "..", "public")));

  const pipeline = new RAGPipeline();
  await pipeline.initialize();

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "rag-pdam-cs",
      documents: pipeline.store ? pipeline.store.documents.length : 0,
      llm_active: pipeline.chain !== null,
    });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, session_id } = req.body || {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Field 'message' wajib diisi." });
    }

    if (message.length > 1000) {
      return res
        .status(400)
        .json({ error: "Pesan terlalu panjang. Maksimal 1000 karakter." });
    }

    try {
      const result = await pipeline.query(message.trim());
      res.json({
        answer: result.answer,
        sources: result.sources.slice(0, 3),
        session_id: session_id || null,
      });
    } catch (err) {
      console.error("[API] Error:", err.message);
      res.status(500).json({
        error: "Mohon maaf, terjadi kesalahan pada server RAG.",
      });
    }
  });

  app.post("/api/retrieve", async (req, res) => {
    const { query, top_k } = req.body || {};
    if (!query) {
      return res.status(400).json({ error: "Field 'query' wajib diisi." });
    }
    try {
      const results = await pipeline.retrieve(query, top_k || 5);
      res.json({ results });
    } catch (err) {
      console.error("[API] Retrieve error:", err.message);
      res.status(500).json({ error: "Retrieval gagal." });
    }
  });

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
