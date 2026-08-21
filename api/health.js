import { RAGPipeline } from "../src/rag_pipeline.js";

let pipeline = null;

export default async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!pipeline) {
      pipeline = new RAGPipeline();
      await pipeline.initialize();
    }

    return res.status(200).json({
      status: "ok",
      service: "rag-pdam-cs",
      documents: pipeline.store ? pipeline.store.documents.length : 0,
      llm_active: pipeline.chain !== null,
    });
  } catch (err) {
    return res.status(500).json({ status: "error", error: err.message });
  }
}
