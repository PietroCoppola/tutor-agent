from agent.pdf_utils import pdf_to_string
from agent.study_material import load_study_material_cache

pdf_path = "/Users/pietrocoppola/Downloads/infdesc_v0.6.pdf"

original_text = pdf_to_string(pdf_path)
compressed_text = load_study_material_cache()

print("Original chars:", len(original_text))
print("Compressed chars:", len(compressed_text) if compressed_text else 0)

if original_text and compressed_text:
    ratio = len(compressed_text) / len(original_text)
    print("Compression ratio (chars):", ratio)