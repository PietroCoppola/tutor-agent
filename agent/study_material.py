import requests
import os
from dotenv import load_dotenv

try:
    from .pdf_utils import pdf_to_string
except ImportError:
    from pdf_utils import pdf_to_string

load_dotenv()
TTC_API_KEY = os.getenv("TTC_API_KEY")


def get_cache_file_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.getenv("STUDY_MATERIAL_CACHE_FILE", os.path.join(base_dir, "study_material_cache.txt"))


def save_study_material_cache(material: str) -> None:
    cache_path = get_cache_file_path()
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(material)


def load_study_material_cache() -> str | None:
    cache_path = get_cache_file_path()
    if not os.path.exists(cache_path):
        return None
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            return content or None
    except OSError:
        return None


def get_study_material(pdf_path: str = None):
    if pdf_path:
        pdf_text = pdf_to_string(pdf_path)
    else:
        pdf_text = "Default context if no PDF provided"

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
            output = result.get("output", "")
            if output:
                save_study_material_cache(output)
            return output
        else:
            return f"Error processing material: {response.text}"

    except Exception:
        return "Error connecting to compression service."
