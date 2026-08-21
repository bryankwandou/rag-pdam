import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SimpleVectorStore } from "./vector_store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_PATH = join(__dirname, "..", "knowledge_base", "pdam_faq.json");
const INDEX_PATH = join(__dirname, "..", "knowledge_base", "vector_index.json");

/**
 * Ingestion pipeline:
 * 1. Load knowledge base JSON
 * 2. Flatten entries menjadi dokumen individual
 * 3. Build TF-IDF index dan simpan ke file
 */
async function ingest() {
  console.log("[INGEST] Memuat knowledge base...");

  const raw = readFileSync(KB_PATH, "utf-8");
  const kb = JSON.parse(raw);

  const documents = [];

  for (const category of kb.categories) {
    for (let i = 0; i < category.entries.length; i++) {
      const entry = category.entries[i];

      // Gabungkan question + answer sebagai satu dokumen
      const docText = `Pertanyaan: ${entry.question}\n\nJawaban: ${entry.answer}`;

      documents.push({
        content: docText,
        metadata: {
          category_id: category.id,
          category_title: category.title,
          tags: entry.tags.join(","),
          source: "pdam_faq",
        },
      });
    }
  }

  console.log(`[INGEST] Total dokumen: ${documents.length}`);

  // Build vector store
  const store = new SimpleVectorStore();
  store.addDocuments(documents);

  console.log(
    `[INGEST] Vocabulary size: ${store.vocabulary.size} unique tokens`,
  );

  // Persist ke file
  store.save(INDEX_PATH);
  console.log(`[INGEST] Index disimpan ke: ${INDEX_PATH}`);

  // Test query sederhana
  console.log("\n[INGEST] Test retrieval...\n");

  const testQueries = [
    "cara daftar sambungan baru PDAM",
    "tarif air per meter kubik",
    "air saya mati",
    "cara bayar tagihan",
    "apa itu tanki jene",
  ];

  for (const q of testQueries) {
    const results = store.query(q, 3);
    console.log(`Q: "${q}"`);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      console.log(
        `  ${i + 1}. [${r.metadata.category_title}] similarity=${r.similarity.toFixed(4)}`,
      );
      console.log(`     ${r.content.substring(0, 100)}...`);
    }
    console.log();
  }

  console.log("[INGEST] Selesai.");
}

ingest().catch(console.error);
