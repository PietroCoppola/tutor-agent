import sys
import json
import os
from study_material import get_study_material

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    
    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    try:
        # Call the existing function from main.py
        result = get_study_material(pdf_path)
        
        # Output the result as JSON
        print(json.dumps({"success": True, "data": result}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
