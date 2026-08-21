import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Simple in-memory vector store menggunakan cosine similarity.
 * Tidak membutuhkan ChromaDB server — cocok untuk prototype/riset.
 *
 * Embedding menggunakan TF-IDF sederhana (bag-of-words) yang cukup
 * untuk knowledge base berukuran kecil-menengah dalam Bahasa Indonesia.
 * Untuk produksi, ganti dengan embedding model (Gemini / sentence-transformers).
 */
export class SimpleVectorStore {
  constructor() {
    this.documents = [];
    this.embeddings = [];
    this.vocabulary = new Map();
    this.idf = new Map();
  }

  /**
   * Build vocabulary dan IDF dari seluruh dokumen
   */
  buildVocabulary(docs) {
    const docFreq = new Map();
    const totalDocs = docs.length;

    for (const doc of docs) {
      const tokens = this.tokenize(doc.content);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    let idx = 0;
    for (const [token, freq] of docFreq) {
      this.vocabulary.set(token, idx);
      // IDF = log(N / df) + 1 (smoothed)
      this.idf.set(token, Math.log(totalDocs / freq) + 1);
      idx++;
    }
  }

  /**
   * Tokenize teks ke lowercase tokens, hapus stopwords umum
   */
  tokenize(text) {
    const stopwords = new Set([
      "yang", "dan", "di", "ke", "dari", "ini", "itu", "dengan",
      "untuk", "pada", "adalah", "atau", "juga", "akan", "sudah",
      "tidak", "ada", "bisa", "jika", "maka", "oleh", "saat",
      "dalam", "agar", "dapat", "serta", "bagi", "lebih", "telah",
      "anda", "kamu", "saya", "kami", "mereka", "nya", "the",
      "a", "an", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did",
      "akan", "harus", "perlu", "bisa", "dapat", "boleh",
      "setiap", "semua", "beberapa", "suatu", "satu",
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stopwords.has(t));
  }

  /**
   * Hitung TF-IDF vector untuk sebuah teks
   */
  computeVector(text) {
    const tokens = this.tokenize(text);
    const tf = new Map();

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize TF
    const maxTf = Math.max(...tf.values(), 1);

    const vector = new Float64Array(this.vocabulary.size);
    for (const [token, freq] of tf) {
      const idx = this.vocabulary.get(token);
      if (idx !== undefined) {
        const normalizedTf = freq / maxTf;
        const idfVal = this.idf.get(token) || 1;
        vector[idx] = normalizedTf * idfVal;
      }
    }

    return vector;
  }

  /**
   * Cosine similarity antara dua vector
   */
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  /**
   * Tambahkan dokumen ke store
   */
  addDocuments(docs) {
    this.documents = docs;
    this.buildVocabulary(docs);

    this.embeddings = docs.map((doc) => this.computeVector(doc.content));
  }

  /**
   * Query: cari top-k dokumen paling relevan
   */
  query(queryText, topK = 5) {
    const queryVector = this.computeVector(queryText);

    const scores = this.embeddings.map((emb, idx) => ({
      index: idx,
      similarity: this.cosineSimilarity(queryVector, emb),
    }));

    scores.sort((a, b) => b.similarity - a.similarity);

    return scores.slice(0, topK).map((s) => ({
      content: this.documents[s.index].content,
      metadata: this.documents[s.index].metadata,
      similarity: s.similarity,
      distance: 1 - s.similarity, // distance = 1 - similarity untuk kompatibilitas
    }));
  }

  /**
   * Simpan index ke file JSON (persist)
   */
  save(filepath) {
    const data = {
      documents: this.documents,
      vocabulary: Array.from(this.vocabulary.entries()),
      idf: Array.from(this.idf.entries()),
    };
    writeFileSync(filepath, JSON.stringify(data));
  }

  /**
   * Load index dari file JSON
   */
  load(filepath) {
    if (!existsSync(filepath)) return false;

    const data = JSON.parse(readFileSync(filepath, "utf-8"));
    this.documents = data.documents;
    this.vocabulary = new Map(data.vocabulary);
    this.idf = new Map(data.idf);

    // Rebuild embeddings dari documents
    this.embeddings = this.documents.map((doc) =>
      this.computeVector(doc.content),
    );

    return true;
  }
}
