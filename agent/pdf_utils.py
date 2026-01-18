import pypdf
import io
from typing import Union, BinaryIO

def pdf_to_string(pdf_input: Union[str, BinaryIO]) -> str:
    """
    Reads a PDF file and converts it into a single string.
    
    Args:
        pdf_input (Union[str, BinaryIO]): The path to the PDF file or a file-like object.
        
    Returns:
        str: The extracted text from the PDF.
    """
    text_content = []
    
    try:
        # Check if input is a string (path) or a file-like object
        if isinstance(pdf_input, str):
            with open(pdf_input, 'rb') as file:
                reader = pypdf.PdfReader(file)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
        else:
            # Assume it's a file-like object (bytes)
            reader = pypdf.PdfReader(pdf_input)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
                    
        return "\n".join(text_content)
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""
