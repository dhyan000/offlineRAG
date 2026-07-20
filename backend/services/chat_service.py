from backend.core.logging import logger
from backend.processors.embeddings.embedding_service import EmbeddingService
from backend.processors.vectordb.chroma_service import ChromaService
from backend.processors.llm.ollama_service import OllamaService

import time
import json

class ChatService:
    @classmethod
    async def chat_with_docs(cls, question: str):
        """
        Coordinates the RAG flow as an async generator yielding JSON strings.
        """
        t0 = time.perf_counter()
        logger.info(f"Received chat question: '{question}'")
        
        # 1. Embed the query question
        try:
            query_embedding = EmbeddingService.get_embedding(question)
        except Exception as e:
            logger.error(f"Failed to generate embedding for query: {e}")
            yield json.dumps({"error": "Error generating query embeddings."}) + "\n"
            return
        t1 = time.perf_counter()

        # 2. Retrieve similar chunks
        try:
            matching_chunks = ChromaService.query_similar(query_embedding, top_k=3)
        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {e}")
            yield json.dumps({"error": "Error querying the vector database."}) + "\n"
            return
        t2 = time.perf_counter()

        seen_sources = set()
        sources = []
        if not matching_chunks:
            logger.warning("No relevant chunks found in the vector database.")
            fallback = True
            context = ""
        else:
            fallback = False
            # 3. Construct context
            context_parts = []
            total_chars = 0
            
            for chunk in matching_chunks:
                meta = chunk.get("metadata", {})
                filename = meta.get("filename", "unknown")
                page = meta.get("page", "unknown")
                
                text_content = chunk.get('text', '')
                if total_chars + len(text_content) > 10000:
                    text_content = text_content[:10000 - total_chars]
                    
                if text_content:
                    context_parts.append(f"[Source: {filename}, Page: {page}]\n{text_content}")
                    total_chars += len(text_content)
                
                doc_name = meta.get("filename")
                if doc_name:
                    source_key = (doc_name, page)
                    if source_key not in seen_sources:
                        seen_sources.add(source_key)
                        sources.append({"document": doc_name, "page": page})
                        
                if total_chars >= 10000:
                    break
                    
            context = "\n\n".join(context_parts)
        t3 = time.perf_counter()

        # 4. Generate answer using Ollama
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

        # 5. Format and Finalize
        t5 = time.perf_counter()
        
        timings = {
            "embedding_ms": round((t1 - t0) * 1000, 1),
            "retrieval_ms": round((t2 - t1) * 1000, 1),
            "prompt_ms": round((t3 - t2) * 1000, 1),
            "ollama_ms": round((t4 - t3) * 1000, 1),
            "formatting_ms": round((t5 - t4) * 1000, 1),
            "total_ms": round((t5 - t0) * 1000, 1),
        }
        
        logger.info(
            f"\n--- Performance Summary ---\n"
            f"Embedding: {timings['embedding_ms']} ms\n"
            f"Retrieval: {timings['retrieval_ms']} ms\n"
            f"Prompt: {timings['prompt_ms']} ms\n"
            f"Ollama: {timings['ollama_ms']} ms\n"
            f"Formatting: {timings['formatting_ms']} ms\n"
            f"Total: {timings['total_ms']} ms\n"
            f"---------------------------"
        )

        yield json.dumps({"sources": sources, "timings": timings}) + "\n"
