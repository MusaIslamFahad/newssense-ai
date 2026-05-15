# 📰 NewsSense AI

**Intelligent News Understanding System** which classify any news headline or article into 10 categories, detect sentiment, and extract named entities using state of the art NLP.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/newssense-ai)

---

## ✨ Features

| Feature | Model | Avg. Latency |
|---|---|---|
| News category classification (10 classes) | `facebook/bart-large-mnli` (zero-shot) | ~2s |
| Sentiment analysis (positive/neutral/negative) | `cardiffnlp/twitter-roberta-base-sentiment-latest` | ~1s |
| Named entity recognition (PER, ORG, LOC, MISC) | `dslim/bert-base-NER` | ~1s |
| All 3 run **in parallel** | — | **~2–3s total** |

---

## 🏗️ Architecture

```
newssense-ai/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home page
│   │   ├── layout.tsx            # Root layout + metadata
│   │   ├── globals.css           # Editorial newspaper theme
│   │   └── api/analyze/
│   │       └── route.ts          # POST /api/analyze (serverless)
│   ├── components/
│   │   ├── Header.tsx            # Newspaper masthead + live ticker
│   │   ├── NewsAnalyzer.tsx      # Main input + state orchestration
│   │   ├── ResultsPanel.tsx      # Results layout container
│   │   ├── ConfidenceChart.tsx   # Animated bar chart for all 10 scores
│   │   ├── SentimentBadge.tsx    # Sentiment indicator with confidence
│   │   └── EntityHighlighter.tsx # Inline entity spans with tooltips
│   ├── lib/
│   │   └── hf-client.ts          # HuggingFace Inference API (server-only)
│   └── types/
│       └── index.ts              # Shared TypeScript interfaces
└── notebook/
    └── training_pipeline.py      # Full ML training pipeline (Kaggle/Colab)
```

**Tech stack:** Next.js 14 · TypeScript · Tailwind CSS · HuggingFace Inference API · Vercel

---

## 🚀 Quick Start (Local)

### 1. Clone & install
```bash
git clone https://github.com/your-username/newssense-ai.git
cd newssense-ai
npm install
```

### 2. Set up environment
```bash
cp .env.example .env.local
# Edit .env.local and add your HuggingFace token
```

Get a free HuggingFace token at **https://huggingface.co/settings/tokens**  
(Read access is sufficient — no GPU needed.)

### 3. Run development server
```bash
npm run dev
# Open http://localhost:3000
```

---

## ☁️ Deploy to Vercel

### One-click
Click the **Deploy** button at the top of this README.

### Manual
```bash
npm i -g vercel
vercel
```

**Required environment variable in Vercel dashboard:**
| Key | Value |
|---|---|
| `HF_TOKEN` | Your HuggingFace API token |

---

## 🧪 API Reference

### `POST /api/analyze`

**Request**
```json
{ "text": "Federal Reserve raises interest rates amid inflation fears" }
```

**Response**
```json
{
  "input": "Federal Reserve raises interest rates amid inflation fears",
  "topCategory": { "label": "Business", "score": 0.87 },
  "classification": [
    { "label": "Business", "score": 0.87 },
    { "label": "Politics", "score": 0.09 },
    ...
  ],
  "sentiment": { "label": "negative", "score": 0.74 },
  "entities": [
    { "word": "Federal Reserve", "entity_group": "ORG", "score": 0.99, "start": 0, "end": 15 }
  ],
  "processingTime": 2341
}
```

**Error responses**
| Status | Meaning |
|---|---|
| `400` | Text too short/long or invalid JSON |
| `429` | Rate limited (10 req/min per IP) |
| `502` | HuggingFace model unavailable (retry after 20s) |

---

## 🔬 ML Training Pipeline

The `notebook/training_pipeline.py` file is a full ML research pipeline (run on Kaggle with GPU):

1. **Data loading & validation**: 90K+ news headlines, null checks
2. **Robust text cleaning**: HTML stripping, URL removal, lowercasing
3. **EDA**: class distribution, word count stats, per-category word clouds
4. **Feature engineering**: TF-IDF (15K features, bigrams, sublinear TF)
5. **Classical ML**: Logistic Regression + Linear SVM with **5-fold stratified CV**
6. **Model comparison**: per-class F1 bar charts, confusion matrices
7. **Error analysis**: misclassified examples sorted by confidence
8. **DistilBERT fine-tuning**: `fp16`, early stopping, `load_best_model_at_end`
9. **Explainability**: LIME with **batched** `predict_proba_fn` (fixed from v1)
10. **HuggingFace Hub push**: deploy model artifact for production inference

### Typical results on this dataset

| Model | Macro F1 | Notes |
|---|---|---|
| Logistic Regression | ~0.91 | 5-fold CV, balanced weights |
| Linear SVM | ~0.90 | Fast, competitive |
| DistilBERT | ~0.95–0.97 | Fine-tuned, 4 epochs |

---

## 🐛 Known Limitations

- **Cold start**: HuggingFace free-tier models hibernate after inactivity. First request may take 20–30s.
- **Rate limit**: 10 requests/min per IP (configurable via `RATE_LIMIT_RPM`).
- **Text length**: Optimized for headlines and short paragraphs (10–2000 chars).

---

## 📄 License

MIT — use freely, attribution appreciated.
