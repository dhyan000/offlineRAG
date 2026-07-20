import os
from sentence_transformers import SentenceTransformer
from backend.core.config import settings
from backend.core.logging import logger

class EmbeddingService:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            model_name = "BAAI/bge-small-en-v1.5"
            # settings.STORAGE_DIR is usually absolute or relative to backend
            # Let's resolve settings.STORAGE_DIR correctly relative to backend
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            cache_dir = os.path.abspath(os.path.join(base_dir, "storage", "models"))
            os.makedirs(cache_dir, exist_ok=True)
            logger.info(f"Loading local embedding model '{model_name}' from/into {cache_dir}...")
            cls._model = SentenceTransformer(model_name, cache_folder=cache_dir)
            logger.success(f"Embedding model '{model_name}' loaded successfully.")
        return cls._model

    @classmethod
    def get_embedding(cls, text: str) -> list[float]:
        """Generate embedding for a single text."""
        model = cls.get_model()
        embedding = model.encode(text, convert_to_numpy=True).tolist()
        return embedding

    @classmethod
    def get_embeddings(cls, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        if not texts:
            return []
        model = cls.get_model()
        embeddings = model.encode(texts, convert_to_numpy=True).tolist()
        return embeddings
