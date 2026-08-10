import os
import chromadb
from backend.core.logging import logger

class ChromaService:
    _client = None
    _collection = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            persist_dir = os.path.abspath(os.path.join(base_dir, "storage", "chromadb"))
            os.makedirs(persist_dir, exist_ok=True)
            logger.info(f"Initializing persistent ChromaDB at {persist_dir}...")
            cls._client = chromadb.PersistentClient(path=persist_dir)
            cls._collection = cls._client.get_or_create_collection(
                name="documents",
                metadata={"hnsw:space": "cosine"}
            )
            logger.success("ChromaDB initialized successfully with Cosine Distance.")
        return cls._client, cls._collection

    @classmethod
    def add_chunks(
        cls,
        doc_id: str,
        filename: str,
        chunk_ids: list[str],
        chunk_texts: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict]
    ):
        """
        Add chunks with embeddings and metadata to ChromaDB.
        """
        _, collection = cls.get_client()
        logger.info(f"Adding {len(chunk_ids)} chunks for document {filename} ({doc_id}) to ChromaDB...")
        try:
            collection.add(
                ids=chunk_ids,
                embeddings=embeddings,
                documents=chunk_texts,
                metadatas=metadatas
            )
            logger.success(f"Successfully indexed {len(chunk_ids)} chunks in ChromaDB.")
        except Exception as e:
            logger.error(f"Error adding chunks to ChromaDB: {e}")
            raise e

    @classmethod
    def query_similar(
        cls,
        query_embedding: list[float],
        top_k: int = 5,
        source_filter: str = "all"
    ) -> list[dict]:
        """
        Search for top_k semantically similar chunks with optional metadata filtering.
        source_filter options: 'all', 'pdf', 'audio', 'video', 'txt'
        """
        _, collection = cls.get_client()
        logger.info(f"Querying ChromaDB (top_k={top_k}, source_filter='{source_filter}')...")

        where_clause = None
        if source_filter and source_filter.lower() != "all":
            where_clause = {"type": source_filter.lower()}

        try:
            query_kwargs = {
                "query_embeddings": [query_embedding],
                "n_results": top_k
            }
            if where_clause:
                query_kwargs["where"] = where_clause

            results = collection.query(**query_kwargs)

            formatted = []
            if not results or not results.get("ids") or len(results["ids"][0]) == 0:
                logger.warning(f"No similar chunks retrieved for filter: {source_filter}")
                return formatted

            ids = results["ids"][0]
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(ids)

            for i in range(len(ids)):
                dist = distances[i] if distances[i] is not None else 0.0
                # Cosine distance: similarity = 1 - distance
                similarity_score = max(0.0, min(1.0, 1.0 - dist))

                formatted.append({
                    "chunk_id": ids[i],
                    "text": documents[i],
                    "metadata": metadatas[i],
                    "distance": round(dist, 4),
                    "similarity": round(similarity_score, 4),
                    "confidence_pct": round(similarity_score * 100, 1)
                })

            logger.info(f"Retrieved {len(formatted)} matching chunks from ChromaDB.")
            return formatted
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {e}")
            raise e

    @classmethod
    def delete_document_chunks(cls, doc_id: str):
        """
        Delete all chunks associated with doc_id.
        """
        _, collection = cls.get_client()
        logger.info(f"Deleting all ChromaDB chunks for document ID: {doc_id}...")
        try:
            collection.delete(where={"document_id": doc_id})
            logger.success(f"Deleted ChromaDB chunks for document: {doc_id}")
        except Exception as e:
            logger.error(f"Error deleting ChromaDB chunks for document {doc_id}: {e}")
            raise e
