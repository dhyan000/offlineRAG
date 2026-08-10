import os
import hashlib
from sentence_transformers import SentenceTransformer
from backend.core.logging import logger

class EmbeddingService:
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            model_name = "sentence-transformers/all-MiniLM-L6-v2"
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            cache_dir = os.path.abspath(os.path.join(base_dir, "storage", "models"))
            os.makedirs(cache_dir, exist_ok=True)
            logger.info(f"Loading local embedding model '{model_name}' from/into {cache_dir}...")
            cls._model = SentenceTransformer(model_name, cache_folder=cache_dir)
            logger.success(f"Embedding model '{model_name}' loaded successfully.")
        return cls._model

    @classmethod
    def calculate_file_hash(cls, file_path: str) -> str:
        """Calculates MD5 hash of file content for embedding cache checking."""
        hasher = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def get_embedding(cls, text: str) -> list[float]:
        """Generate embedding for a single text."""
        model = cls.get_model()
        embedding = model.encode(text, convert_to_numpy=True).tolist()
        return embedding

    @classmethod
    def get_embeddings(cls, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts in batch."""
        if not texts:
            return []
        model = cls.get_model()
        embeddings = model.encode(texts, convert_to_numpy=True, batch_size=32).tolist()
        return embeddings
