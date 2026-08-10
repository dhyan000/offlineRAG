import time
import json
from backend.core.logging import logger
from backend.processors.embeddings.embedding_service import EmbeddingService
from backend.processors.vectordb.chroma_service import ChromaService
from backend.processors.llm.ollama_service import OllamaService

class ChatService:
    @classmethod
    async def chat_with_docs(cls, question: str, source_type: str = "all", top_k: int = 5):
        """
        Executes Top-K Multimodal Retrieval RAG with metadata filtering, timing metrics, and streaming Ollama response.
        """
        t0 = time.perf_counter()
        logger.info(f"Received RAG chat question: '{question}' (filter='{source_type}', top_k={top_k})")

        # 1. Generate Query Embedding
        try:
            query_embedding = EmbeddingService.get_embedding(question)
        except Exception as e:
            logger.error(f"Failed to generate embedding for query: {e}")
            yield json.dumps({"error": "Error generating query embeddings."}) + "\n"
            return
        t1 = time.perf_counter()

        # 2. Retrieve Top-K Chunks with Source Filter
        try:
            matching_chunks = ChromaService.query_similar(
                query_embedding=query_embedding,
                top_k=top_k,
                source_filter=source_type
            )
        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {e}")
            yield json.dumps({"error": "Error querying vector database."}) + "\n"
            return
        t2 = time.perf_counter()

        seen_sources = set()
        sources = []
        retrieved_details = []

        if not matching_chunks:
            logger.warning(f"No relevant chunks found for filter '{source_type}'.")
            fallback = True
            context = ""
            max_confidence = 0.0
        else:
            fallback = False
            context_parts = []
            total_chars = 0
            confidences = []

            for chunk in matching_chunks:
                meta = chunk.get("metadata", {})
                filename = meta.get("filename", "Unknown File")
                file_type = meta.get("type", "doc")
                page = meta.get("page")
                timestamp = meta.get("timestamp")
                confidence = chunk.get("confidence_pct", 0.0)
                confidences.append(confidence)

                loc_info = f"Page {page}" if page else (f"Timestamp {timestamp}" if timestamp else "")
                header = f"[Source: {filename} ({file_type.upper()}){f', {loc_info}' if loc_info else ''}]"

                text_content = chunk.get("text", "")
                if total_chars + len(text_content) > 10000:
                    text_content = text_content[:10000 - total_chars]

                if text_content:
                    context_parts.append(f"{header}\n{text_content}")
                    total_chars += len(text_content)

                source_key = (filename, file_type, loc_info)
                if source_key not in seen_sources:
                    seen_sources.add(source_key)
                    sources.append({
                        "filename": filename,
                        "type": file_type,
                        "location": loc_info,
                        "confidence": confidence
                    })

                retrieved_details.append({
                    "chunk_id": chunk.get("chunk_id"),
                    "filename": filename,
                    "type": file_type,
                    "location": loc_info,
                    "text": chunk.get("text"),
                    "confidence": confidence,
                    "similarity": chunk.get("similarity")
                })

                if total_chars >= 10000:
                    break

            context = "\n\n".join(context_parts)
            max_confidence = max(confidences) if confidences else 0.0

        t3 = time.perf_counter()

        # Send initial metadata header to frontend before streaming text
        meta_payload = {
            "sources": sources,
            "retrieved_chunks": retrieved_details,
            "chunks_retrieved_count": len(matching_chunks),
            "max_confidence": max_confidence,
            "retrieval_ms": round((t2 - t1) * 1000, 1),
            "embedding_ms": round((t1 - t0) * 1000, 1)
        }
        yield json.dumps({"metadata": meta_payload}) + "\n"

        # 3. Stream Ollama Response
        try:
            if fallback:
                yield json.dumps({"chunk": "I could not find this information in the uploaded documents."}) + "\n"
            else:
                async for chunk in OllamaService.generate_answer(question, context):
                    yield json.dumps({"chunk": chunk}) + "\n"
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            yield json.dumps({"error": f"Error communicating with local AI model. Detail: {str(e)}"}) + "\n"
            return
        t4 = time.perf_counter()

        # 4. Final Timing Metrics Summary
        timings = {
            "embedding_ms": round((t1 - t0) * 1000, 1),
            "retrieval_ms": round((t2 - t1) * 1000, 1),
            "prompt_ms": round((t3 - t2) * 1000, 1),
            "ollama_ms": round((t4 - t3) * 1000, 1),
            "total_ms": round((t4 - t0) * 1000, 1),
            "chunks_retrieved": len(matching_chunks)
        }

        yield json.dumps({"timings": timings}) + "\n"
