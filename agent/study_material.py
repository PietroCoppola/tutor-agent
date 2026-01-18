import requests
import os
from dotenv import load_dotenv

try:
    from .pdf_utils import pdf_to_string
except ImportError:
    from pdf_utils import pdf_to_string

load_dotenv()
TTC_API_KEY = os.getenv("TTC_API_KEY")

# --- 1. THE TOKEN COMPANY INTEGRATION (Mock) ---
# In production, you would fetch this from your backend where the 
# PDF was compressed.
def get_study_material(pdf_path: str = None):
    # Example: If a PDF path is provided, read it
    if pdf_path:
        #print(f"Reading PDF from: {pdf_path}")
        pdf_text = pdf_to_string(pdf_path)
        # You could then send this 'pdf_text' to the compression API
        # or use it directly if it's small enough.
        # For now, we'll continue with the mock flow below.
        
        # If we have text, we might want to use it in the request or just pass it through
        # For this specific implementation, we'll keep the existing logic
        pass
    else:
        pdf_text = "Default context if no PDF provided"

    # Placeholder for The Token Company's output
    # We'll use a try/except block to handle API failures gracefully
    try:
        if not TTC_API_KEY:
            raise RuntimeError("TTC_API_KEY is not set in the environment")

        response = requests.post(
            "https://api.thetokencompany.com/v1/compress",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {TTC_API_KEY}"
            },
            json={
                "model": "bear-1",
                "compression_settings": {
                    "aggressiveness": 0.5,
                    "max_output_tokens": None,
                    "min_output_tokens": None
                },
                "input": pdf_text
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get("output", "")
        else:
            # Fallback if API fails
            return f"Error processing material: {response.text}"
            
    except Exception:
        # Return something so the flow continues (or re-raise if critical)
        return "Error connecting to compression service."
