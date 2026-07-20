import re

def clean_text(text: str) -> str:
    """
    Cleans text by removing unnecessary blank lines, normalizing spaces,
    and preserving paragraphs.
    """
    if not text:
        return ""
    
    # Normalize line endings
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Normalize spaces within each line
    lines = []
    for line in text.split('\n'):
        # Collapse multiple spaces and tabs into a single space
        cleaned_line = re.sub(r'[ \t]+', ' ', line).strip()
        lines.append(cleaned_line)
    
    # Group lines by paragraphs (consecutive non-empty lines)
    # Consecutive non-empty lines are joined with a space.
    # Paragraphs are separated by double newlines.
    cleaned_paragraphs = []
    current_paragraph = []
    
    for line in lines:
        if line:
            current_paragraph.append(line)
        else:
            if current_paragraph:
                cleaned_paragraphs.append(" ".join(current_paragraph))
                current_paragraph = []
    
    if current_paragraph:
        cleaned_paragraphs.append(" ".join(current_paragraph))
        
    return "\n\n".join(cleaned_paragraphs)
