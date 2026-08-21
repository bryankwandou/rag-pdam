import { RAGPipeline } from "../src/rag_pipeline.js";

let pipeline = null;

async function getPipeline() {
  if (!pipeline) {
    pipeline = new RAGPipeline();
    await pipeline.initialize();
  }
  return pipeline;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message, session_id } = req.body || {};

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Field 'message' wajib diisi." });
  }

  if (message.length > 1000) {
    return res.status(400).json({ error: "Pesan terlalu panjang. Maksimal 1000 karakter." });
  }

  try {
    const p = await getPipeline();
    const result = await p.query(message.trim());

    return res.status(200).json({
      answer: result.answer,
      sources: result.sources.slice(0, 3),
      session_id: session_id || null,
    });
  } catch (err) {
    console.error("[Vercel API Chat] Error:", err.message);
    return res.status(500).json({
      error: "Mohon maaf, terjadi kesalahan pada server RAG.",
    });
  }
}
