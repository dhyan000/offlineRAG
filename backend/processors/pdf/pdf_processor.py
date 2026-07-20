import fitz  # PyMuPDF
from backend.core.logging import logger

def extract_text_from_pdf(file_path: str) -> list[tuple[int, str]]:
    """
    Extracts text from each page of a PDF file.
    Returns:
        A list of tuples, where each tuple contains (page_number, text).
        page_number is 1-indexed.
    """
    logger.info(f"Extracting text from PDF: {file_path}")
    pages = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            pages.append((page_num + 1, text))
        logger.info(f"Successfully extracted {len(pages)} pages from PDF: {file_path}")
    except Exception as e:
        logger.error(f"Error extracting text from PDF {file_path}: {e}")
        raise e
    return pages
