from backend.core.logging import logger

def extract_text_from_txt(file_path: str) -> list[tuple[int, str]]:
    """
    Extracts text from a plain text file read using UTF-8 encoding.
    Returns:
        A list containing a single tuple of (1, text).
    """
    logger.info(f"Extracting text from TXT: {file_path}")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        logger.info(f"Successfully read TXT: {file_path}")
        return [(1, text)]
    except Exception as e:
        logger.error(f"Error reading TXT {file_path}: {e}")
        raise e
