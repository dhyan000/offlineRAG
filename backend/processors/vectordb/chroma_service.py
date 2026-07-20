import os
import chromadb
from backend.core.config import settings
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
            cls._collection = cls._client.get_or_create_collection(name="documents")
            logger.success("ChromaDB initialized successfully.")
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
        Add chunks with their embeddings and metadata to ChromaDB.
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
    def query_similar(cls, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        """
        Search for top_k semantically similar chunks.
        """
        _, collection = cls.get_client()
        logger.info(f"Querying ChromaDB for top {top_k} similar chunks...")
        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )
            
            # Format results into a list of dicts
            formatted = []
            if not results or not results["ids"] or len(results["ids"][0]) == 0:
                logger.warning("No similar chunks retrieved.")
                return formatted
                
            ids = results["ids"][0]
            documents = results["documents"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results and results["distances"] else [0.0] * len(ids)

            for i in range(len(ids)):
                formatted.append({
                    "chunk_id": ids[i],
                    "text": documents[i],
                    "metadata": metadatas[i],
                    "distance": distances[i],
                    "similarity": round(1.0 - (distances[i] / 2.0), 4) if distances[i] is not None else 1.0
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
