"""Hybrid embedding & similarity engine (Cloud embeddings + deterministic local vector/BM25 fallback)."""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter
from typing import List

from app.config import settings

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "else", "when",
    "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from",
    "up", "down", "in", "out", "on", "off", "over", "under", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "of", "it", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "my", "your", "our", "their", "what", "which", "who",
    "how", "can", "will", "should", "would", "could"
}

LOCAL_DIM = 128


def tokenize(text: str) -> List[str]:
    """Normalize text into meaningful lowercase tokens."""
    raw_tokens = re.findall(r"[a-z0-9_]+", text.lower())
    return [t for t in raw_tokens if len(t) > 1 and t not in STOPWORDS]


def compute_local_embedding(text: str, dim: int = LOCAL_DIM) -> List[float]:
    """
    Deterministic feature-hashing embedding over word unigrams, bigrams, and char trigrams.
    Works offline with zero external dependencies and provides fast L2-normalized vectors.
    """
    vec = [0.0] * dim
    tokens = tokenize(text)
    if not tokens:
        return vec

    features: List[tuple[str, float]] = []
    counts = Counter(tokens)
    for tok, c in counts.items():
        # Sublinear TF weight
        weight = 1.0 + math.log(c)
        features.append((f"w:{tok}", weight * 2.0))
        # Character 3-grams for typo/morphological resilience
        if len(tok) >= 4:
            for i in range(len(tok) - 2):
                features.append((f"c:{tok[i:i+3]}", 0.5))

    # Word bigrams
    for i in range(len(tokens) - 1):
        features.append((f"b:{tokens[i]}_{tokens[i+1]}", 1.25))

    for feat, weight in features:
        digest = hashlib.blake2b(feat.encode("utf-8"), digest_size=8).digest()
        h = int.from_bytes(digest, "little")
        idx = h % dim
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        vec[idx] += sign * weight

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 1e-9:
        vec = [round(v / norm, 6) for v in vec]
    return vec


def embed_text(text: str) -> List[float]:
    """
    Generate an embedding vector for `text`.
    Uses OpenAI embeddings if explicitly configured and reachable, otherwise uses local hybrid vectors.
    """
    if settings.llm_provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
                timeout=8.0,
            )
            resp = client.embeddings.create(
                input=text[:4000],
                model=settings.openai_embedding_model,
            )
            return list(resp.data[0].embedding)
        except Exception:
            pass
    return compute_local_embedding(text)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity safely even if vector dimensions differ."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return max(0.0, min(1.0, dot / (norm_a * norm_b)))


def hybrid_relevance_score(
    query: str,
    query_vec: List[float],
    candidate_text: str,
    candidate_vec: List[float],
) -> float:
    """
    Combine dense/hashed vector cosine similarity with lexical keyword overlap & phrase bonus.
    Returns a normalized relevance score in [0.0, 1.0].
    """
    q_tokens = tokenize(query)
    c_tokens = tokenize(candidate_text)
    if not q_tokens or not c_tokens:
        return 0.0

    # 1. Vector similarity (handles mismatched dim by falling back to local vector on the fly)
    if len(query_vec) != len(candidate_vec):
        q_local = compute_local_embedding(query)
        c_local = compute_local_embedding(candidate_text)
        vec_sim = cosine_similarity(q_local, c_local)
    else:
        vec_sim = cosine_similarity(query_vec, candidate_vec)

    # 2. Lexical recall & Jaccard overlap
    q_set = set(q_tokens)
    c_set = set(c_tokens)
    intersection = q_set & c_set
    recall = len(intersection) / max(1, len(q_set))

    # 3. Exact substring / phrase match bonus
    q_clean = " ".join(q_tokens)
    c_clean = " ".join(c_tokens)
    phrase_bonus = 0.20 if (len(q_clean) >= 4 and q_clean in c_clean) else 0.0

    combined = (0.45 * vec_sim) + (0.45 * recall) + phrase_bonus
    return round(min(1.0, combined), 4)

