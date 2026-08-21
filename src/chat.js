import { createInterface } from "readline";
import { RAGPipeline } from "./rag_pipeline.js";

/**
 * Interactive CLI chat dengan RAG pipeline.
 * Ketik pertanyaan dan tekan Enter.
 * Ketik 'exit' atau 'quit' untuk keluar.
 * Ketik 'clear' untuk hapus riwayat percakapan.
 */
async function main() {
  console.log("=".repeat(60));
  console.log("  RAG Customer Service PDAM - Interactive Chat");
  console.log("  Ketik pertanyaan Anda, 'clear' untuk reset, 'exit' untuk keluar");
  console.log("=".repeat(60));
  console.log();

  const pipeline = new RAGPipeline();
  await pipeline.initialize();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("\nAnda: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        askQuestion();
        return;
      }

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\nTerima kasih telah menggunakan layanan CS PDAM. Sampai jumpa.");
        rl.close();
        process.exit(0);
      }

      if (trimmed.toLowerCase() === "clear") {
        pipeline.clearHistory();
        console.log("[System] Riwayat percakapan dihapus.");
        askQuestion();
        return;
      }

      try {
        const result = await pipeline.query(trimmed);
        console.log(`\nCS PDAM: ${result.answer}`);

        // Tampilkan sumber
        if (result.sources.length > 0) {
          console.log("\n  Sumber:");
          for (const src of result.sources.slice(0, 3)) {
            console.log(`    - ${src.category} (relevance: ${(1 - src.distance).toFixed(2)})`);
          }
        }
      } catch (err) {
        console.error(`\n[Error] ${err.message}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
