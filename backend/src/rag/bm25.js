const STOP_WORDS = new Set([
  "the", "a", "an", "is", "in", "on", "of", "and", "or", "for", 
  "with", "to", "from", "by", "at", "this", "that", "it", "its"
]);

function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // replace punctuation with space
    .split(/\s+/) // split on whitespace
    .filter(word => word.length > 0 && !STOP_WORDS.has(word));
}

export class BM25Index {
  constructor() {
    this.invertedIndex = new Map(); // token -> Map<docId, termFrequency>
    this.docLengths = new Map();    // docId -> number of tokens
    this.docCount = 0;
    this.avgDocLength = 0;
    this.k1 = 1.5;
    this.b = 0.75;
  }

  addDocument(docId, text) {
    const tokens = tokenize(text);
    this.docLengths.set(docId, tokens.length);
    this.docCount++;

    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Map());
      }
      const postingList = this.invertedIndex.get(token);
      postingList.set(docId, (postingList.get(docId) || 0) + 1);
    }
  }

  build() {
    let totalLength = 0;
    for (const len of this.docLengths.values()) {
      totalLength += len;
    }
    this.avgDocLength = this.docCount > 0 ? totalLength / this.docCount : 0;
  }

  search(query, topK = 50) {
    if (this.docCount === 0 || this.avgDocLength === 0) return [];
    
    const queryTokens = tokenize(query);
    const scores = new Map(); // docId -> score

    for (const token of queryTokens) {
      if (!this.invertedIndex.has(token)) continue;

      const postingList = this.invertedIndex.get(token);
      const docFreq = postingList.size;
      
      // Calculate IDF
      const idf = Math.log((this.docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);

      for (const [docId, tf] of postingList.entries()) {
        const docLength = this.docLengths.get(docId) || 0;
        
        // TF Saturation and Length Normalization
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
        
        const termScore = idf * (numerator / denominator);
        scores.set(docId, (scores.get(docId) || 0) + termScore);
      }
    }

    // Convert map to sorted array
    const results = Array.from(scores.entries()).map(([id, score]) => ({ id, score }));
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }
}
