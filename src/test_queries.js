import { RAGPipeline } from "./rag_pipeline.js";

/**
 * Test suite otomatis untuk evaluasi kualitas retrieval dan respons.
 * Menjalankan serangkaian pertanyaan dan mengukur relevansi.
 */
const TEST_QUERIES = [
  {
    question: "Bagaimana cara daftar sambungan baru PDAM?",
    expected_category: "Prosedur Sambungan Baru",
    expected_keywords: ["pendaftaran", "dokumen", "persyaratan"],
  },
  {
    question: "Berapa tarif air per meter kubik?",
    expected_category: "Informasi Tarif Air",
    expected_keywords: ["tarif", "progresif", "golongan"],
  },
  {
    question: "Air saya mati, harus lapor kemana?",
    expected_category: "Prosedur Pengaduan dan Keluhan",
    expected_keywords: ["laporkan", "pengaduan", "call center"],
  },
  {
    question: "Cara bayar tagihan PDAM online",
    expected_category: "Pembayaran Tagihan",
    expected_keywords: ["pembayaran", "online", "tagihan"],
  },
  {
    question: "Apa itu Tanki Jene?",
    expected_category: "Layanan Mobil Tangki Air (Tanki Jene)",
    expected_keywords: ["tangki", "layanan", "makassar"],
  },
  {
    question: "Meteran air saya rusak",
    expected_category: "Prosedur Pengaduan dan Keluhan",
    expected_keywords: ["meteran", "rusak", "penggantian"],
  },
  {
    question: "Siapa yang tanggung jawab jika pipa bocor?",
    expected_category: "Prosedur Pengaduan dan Keluhan",
    expected_keywords: ["tanggung jawab", "sebelum", "sesudah", "meteran"],
  },
  {
    question: "Cara request tangki air",
    expected_category: "Layanan Mobil Tangki Air (Tanki Jene)",
    expected_keywords: ["tangki", "permintaan", "formulir"],
  },
  {
    question: "Apa saja golongan pelanggan PDAM?",
    expected_category: "Informasi Tarif Air",
    expected_keywords: ["sosial", "rumah tangga", "niaga", "industri"],
  },
  {
    question: "Tagihan saya membengkak tidak wajar",
    expected_category: "Prosedur Pengaduan dan Keluhan",
    expected_keywords: ["tagihan", "kebocoran", "verifikasi"],
  },
];

async function runTests() {
  console.log("=".repeat(60));
  console.log("  RAG PDAM CS - Automated Retrieval Test");
  console.log("=".repeat(60));
  console.log();

  const pipeline = new RAGPipeline();
  await pipeline.initialize();

  let passCount = 0;
  let totalCount = TEST_QUERIES.length;

  const results = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const test = TEST_QUERIES[i];
    console.log(`\n--- Test ${i + 1}/${totalCount} ---`);
    console.log(`Q: "${test.question}"`);

    const retrieved = await pipeline.retrieve(test.question, 3);

    // Check if top result matches expected category
    const topCategory = retrieved[0]?.metadata?.category_title || "N/A";
    const topDistance = retrieved[0]?.distance || 1;
    const categoryMatch = topCategory === test.expected_category;

    // Check if response contains expected keywords
    const topContent = retrieved[0]?.content?.toLowerCase() || "";
    const keywordHits = test.expected_keywords.filter((kw) =>
      topContent.includes(kw.toLowerCase()),
    );
    const keywordScore = keywordHits.length / test.expected_keywords.length;

    const passed = categoryMatch && keywordScore >= 0.5;
    if (passed) passCount++;

    const status = passed ? "PASS" : "FAIL";
    console.log(`  Top category: ${topCategory} (expected: ${test.expected_category})`);
    console.log(`  Category match: ${categoryMatch ? "YES" : "NO"}`);
    console.log(`  Distance: ${topDistance.toFixed(4)}`);
    console.log(`  Keyword hits: ${keywordHits.length}/${test.expected_keywords.length} (${(keywordScore * 100).toFixed(0)}%)`);
    console.log(`  Result: ${status}`);

    results.push({
      question: test.question,
      expected_category: test.expected_category,
      actual_category: topCategory,
      category_match: categoryMatch,
      distance: topDistance,
      keyword_score: keywordScore,
      passed,
    });
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Total: ${totalCount}`);
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${totalCount - passCount}`);
  console.log(`  Accuracy: ${((passCount / totalCount) * 100).toFixed(1)}%`);

  const avgDistance =
    results.reduce((sum, r) => sum + r.distance, 0) / results.length;
  console.log(`  Avg Distance: ${avgDistance.toFixed(4)}`);

  const avgKeyword =
    results.reduce((sum, r) => sum + r.keyword_score, 0) / results.length;
  console.log(`  Avg Keyword Score: ${(avgKeyword * 100).toFixed(1)}%`);
  console.log("=".repeat(60));

  // Return exit code based on pass rate
  if (passCount / totalCount < 0.7) {
    console.log("\n[WARN] Pass rate di bawah 70%. Knowledge base perlu diperkaya.");
    process.exit(1);
  }
}

runTests().catch(console.error);
