# RAG Customer Service PDAM

Prototype sistem Retrieval-Augmented Generation (RAG) untuk Customer Service PDAM Kota Makassar. Sistem ini menggunakan knowledge base terstruktur yang di-embed ke ChromaDB, kemudian di-retrieve dan di-generate menggunakan Gemini 2.0 Flash.

## Arsitektur

```
Knowledge Base (JSON) -> Ingestion Pipeline -> ChromaDB (Vector Store)
                                                    |
User Question -> Query Router -> Retrieval (top-k) -> Context Assembly -> LLM (Gemini) -> Response
```

## Struktur Proyek

```
rag-pdam/
  knowledge_base/
    pdam_faq.json          # Knowledge base terstruktur (FAQ, prosedur, tarif)
  src/
    ingest.js              # Pipeline ingestion ke ChromaDB
    rag_pipeline.js        # Core RAG pipeline (retrieve + generate)
    chat.js                # Interactive CLI chat
    server.js              # Express API server
    test_queries.js        # Automated test suite
  .env.example             # Template environment variables
  package.json
```

## Setup

### 1. Install Dependencies

```bash
cd rag-pdam
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi `GOOGLE_API_KEY` dengan API key dari [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Ingest Knowledge Base

```bash
npm run ingest
```

### 4. Jalankan Chat (CLI)

```bash
npm run chat
```

### 5. Jalankan API Server

```bash
npm run serve
```

## API Endpoints

| Method | Path | Body | Keterangan |
|--------|------|------|------------|
| GET | `/api/health` | - | Health check |
| POST | `/api/chat` | `{ "message": "..." }` | Chat dengan RAG |
| POST | `/api/retrieve` | `{ "query": "...", "top_k": 5 }` | Retrieve tanpa generate |

## Testing

```bash
npm run test-queries
```

## Koneksi ke Tanki-Request

Sistem ini dirancang untuk diintegrasikan ke dalam `tanki-request` (Next.js) sebagai:
- Chat widget di portal publik (`/`)
- API route `/api/chat` di Next.js
- Asisten operator di dashboard
