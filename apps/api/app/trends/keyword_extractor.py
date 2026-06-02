from collections import Counter
import string

STOPWORDS = {
    "about",
    "after",
    "again",
    "also",
    "and",
    "are",
    "because",
    "been",
    "but",
    "can",
    "could",
    "for",
    "from",
    "had",
    "has",
    "have",
    "her",
    "his",
    "how",
    "into",
    "its",
    "not",
    "now",
    "our",
    "out",
    "over",
    "she",
    "that",
    "the",
    "their",
    "then",
    "there",
    "these",
    "they",
    "this",
    "was",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "will",
    "with",
    "you",
    "your",
}

PUNCTUATION_TRANSLATION = str.maketrans({character: " " for character in string.punctuation})


def extract_keywords(titles: list[str]) -> dict[str, int]:
    counts: Counter[str] = Counter()

    for title in titles:
        normalized = title.lower().translate(PUNCTUATION_TRANSLATION)
        words = normalized.split()

        for word in words:
            if len(word) < 3 or word in STOPWORDS:
                continue

            counts[word] += 1

    return dict(counts)
