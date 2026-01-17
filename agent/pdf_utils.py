import pypdf

def pdf_to_string(pdf_path: str) -> str:
    """
    Reads a PDF file and converts it into a single string.
    
    Args:
        pdf_path (str): The path to the PDF file.
        
    Returns:
        str: The extracted text from the PDF.
    """
    text_content = []
    
    try:
        with open(pdf_path, 'rb') as file:
            reader = pypdf.PdfReader(file)
            
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
                    
        return "\n".join(text_content)
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""
