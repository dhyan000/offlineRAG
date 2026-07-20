import httpx
from backend.core.config import settings
from backend.core.logging import logger

class OllamaService:
    @classmethod
    async def generate_answer(cls, question: str, context: str) -> str:
        """
        Sends the question and context to Ollama local instance and returns the generated answer.
        """
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        
        # Build prompt enforcing requirements
        prompt = (
            f"You are an AI assistant.\n"
            f"Answer ONLY from the provided context.\n"
            f"If the answer is not available inside the uploaded documents, reply exactly:\n"
            f"\"I could not find this information in the uploaded documents.\"\n"
            f"Never hallucinate.\n\n"
            f"--- Context ---\n{context}\n\n"
            f"--- Question ---\n{question}\n\n"
            f"Answer:"
        )
        
        payload = {
            "model": settings.DEFAULT_LLM_MODEL,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": 0.0  # Force zero temperature to align with non-hallucination constraint
            }
        }
        
        logger.info(f"Sending prompt to Ollama model {settings.DEFAULT_LLM_MODEL}...")
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream("POST", url, json=payload) as response:
                    if response.status_code != 200:
                        text = await response.aread()
                        logger.error(f"Ollama returned status code {response.status_code}: {text.decode('utf-8')}")
                        raise Exception(f"Ollama server error (status code {response.status_code})")
                    
                    import json
                    async for line in response.aiter_lines():
                        if line:
                            data = json.loads(line)
                            chunk = data.get("response", "")
                            if chunk:
                                yield chunk
                    logger.success("Ollama stream completed successfully.")
        except httpx.ConnectError as ce:
            logger.error(f"Cannot connect to Ollama at {settings.OLLAMA_BASE_URL}. Ensure Ollama is running.")
            raise Exception("Ollama server is unreachable. Please make sure Ollama is running locally.")
        except Exception as e:
            logger.error(f"Error querying Ollama API: {e}")
            raise e

    @classmethod
    async def is_healthy(cls) -> bool:
        """Checks if the local Ollama service is running and has the llama3.2:3b model loaded."""
        url = f"{settings.OLLAMA_BASE_URL}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    # Check if model is pulled
                    if settings.DEFAULT_LLM_MODEL in models or any(settings.DEFAULT_LLM_MODEL in m for m in models):
                        return True
                    logger.warning(f"Ollama is online, but model {settings.DEFAULT_LLM_MODEL} was not found in: {models}")
                    # Still operational, but maybe degraded or missing the specific model
                    return False
                return False
        except Exception:
            return False
