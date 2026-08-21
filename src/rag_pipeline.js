import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SimpleVectorStore } from "./vector_store.js";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, "..", "knowledge_base", "vector_index.json");

const SYSTEM_PROMPT = `Kamu adalah asisten virtual Customer Service PDAM Kota Makassar (Tanki Jene).

Panduan perilaku:
1. Jawab HANYA berdasarkan konteks yang diberikan di bawah. Jangan mengarang informasi.
2. Gunakan Bahasa Indonesia yang sopan, jelas, dan ramah.
3. Jika informasi tidak tersedia dalam konteks, katakan:
   "Mohon maaf, saya belum memiliki informasi tersebut. Silakan hubungi Customer Service PDAM untuk informasi lebih lanjut."
4. Jangan mengarang angka tarif, biaya, atau data spesifik yang tidak ada dalam konteks.
5. Untuk keadaan darurat (kebocoran besar, kontaminasi air), arahkan langsung ke hotline darurat PDAM.
6. Berikan jawaban yang ringkas tapi lengkap. Gunakan penomoran jika ada langkah-langkah.
7. Jika pertanyaan di luar domain PDAM / air minum, tolak dengan sopan.

Konteks dari knowledge base:
{context}

Riwayat percakapan sebelumnya:
{chat_history}

Pertanyaan pelanggan: {question}

Jawaban:`;

export class RAGPipeline {
  constructor() {
    this.store = null;
    this.llm = null;
    this.chain = null;
    this.chatHistory = [];
    this.maxHistoryTurns = 5;
  }

  async initialize() {
    // Load vector store dari file
    this.store = new SimpleVectorStore();
    const loaded = this.store.load(INDEX_PATH);

    if (!loaded) {
      console.error(
        "[RAG] Vector index tidak ditemukan. Jalankan 'npm run ingest' terlebih dahulu.",
      );
      process.exit(1);
    }

    console.log(
      `[RAG] Vector store loaded: ${this.store.documents.length} dokumen`,
    );

    // Setup LLM (Gemini) - dynamic import untuk menghindari error jika tidak terpakai
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      console.warn(
        "[RAG] GOOGLE_API_KEY belum diset. LLM tidak akan berfungsi.",
      );
      console.warn(
        "[RAG] Dapatkan API key di: https://aistudio.google.com/app/apikey",
      );
      console.warn("[RAG] Mode retrieval-only aktif (tanpa generasi).\n");
      this.llm = null;
    } else {
      try {
        const { ChatGoogleGenerativeAI } = await import(
          "@langchain/google-genai"
        );
        const { PromptTemplate } = await import("@langchain/core/prompts");
        const { StringOutputParser } = await import(
          "@langchain/core/output_parsers"
        );
        const { RunnableSequence } = await import(
          "@langchain/core/runnables"
        );

        this.llm = new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          model: "gemini-3.6-flash",
          temperature: 0.3,
          maxOutputTokens: 1024,
        });

        const prompt = PromptTemplate.fromTemplate(SYSTEM_PROMPT);
        const parser = new StringOutputParser();
        this.chain = RunnableSequence.from([prompt, this.llm, parser]);

        console.log("[RAG] LLM (Gemini 2.0 Flash) ready");
      } catch (err) {
        console.warn(`[RAG] Gagal memuat LLM: ${err.message}`);
        console.warn("[RAG] Mode retrieval-only aktif.\n");
        this.llm = null;
      }
    }

    return this;
  }

  retrieve(query, topK = 5) {
    const k = parseInt(process.env.RETRIEVAL_TOP_K || topK, 10);
    return this.store.query(query, k);
  }

  formatContext(retrievedDocs) {
    return retrievedDocs
      .map((doc, i) => {
        return `[Sumber ${i + 1}: ${doc.metadata.category_title}]\n${doc.content}`;
      })
      .join("\n\n---\n\n");
  }

  formatChatHistory() {
    if (this.chatHistory.length === 0) return "(belum ada percakapan)";

    return this.chatHistory
      .slice(-this.maxHistoryTurns)
      .map((turn) => `Pelanggan: ${turn.question}\nAsisten: ${turn.answer}`)
      .join("\n\n");
  }

  async query(question) {
    // Step 1: Retrieve relevant documents
    const retrieved = this.retrieve(question);

    // Step 2: Format context
    const context = this.formatContext(retrieved);

    // Step 3: Generate response
    let answer;

    if (this.chain) {
      // Full RAG: retrieve + generate
      answer = await this.chain.invoke({
        context: context,
        chat_history: this.formatChatHistory(),
        question: question,
      });
    } else {
      // Retrieval-only mode (tanpa LLM)
      answer =
        "=== MODE RETRIEVAL ONLY (LLM belum dikonfigurasi) ===\n\n" +
        "Dokumen relevan yang ditemukan:\n\n" +
        retrieved
          .map(
            (doc, i) =>
              `${i + 1}. [${doc.metadata.category_title}] (similarity: ${doc.similarity.toFixed(4)})\n${doc.content}\n`,
          )
          .join("\n");
    }

    // Step 4: Update chat history
    this.chatHistory.push({ question, answer });

    return {
      answer,
      sources: retrieved.map((doc) => ({
        category: doc.metadata.category_title,
        distance: doc.distance,
        similarity: doc.similarity,
      })),
    };
  }

  clearHistory() {
    this.chatHistory = [];
  }
}
