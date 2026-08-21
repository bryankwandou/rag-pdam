import { RAGPipeline } from "../src/rag_pipeline.js";

let pipeline = null;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { query, top_k } = req.body || {};
  if (!query) return res.status(400).json({ error: "Field 'query' wajib diisi." });

  try {
    if (!pipeline) {
      pipeline = new RAGPipeline();
      await pipeline.initialize();
    }
    const results = await pipeline.retrieve(query, top_k || 5);
    return res.status(200).json({ results });
  } catch (err) {
    return res.status(500).json({ error: "Retrieval gagal: " + err.message });
  }
}
