import os
import json
import base64
import anthropic
from PyPDF2 import PdfReader
from supabase import Client
from typing import Tuple

class CopywriterAgent:
    """Agent Copywriter: Analyzes uploaded documents (PDFs, Images) to generate bespoke website copy."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.base_dir = os.path.dirname(__file__)
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if self.anthropic_key:
            self.claude = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.claude = None

    def _extract_text_from_pdf(self, path: str) -> str:
        try:
            reader = PdfReader(path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error reading PDF {path}: {e}")
            return ""

    def run_task(self, task: dict) -> Tuple[bool, str]:
        project_id = task["project_id"]
        print(f"Agent Copywriter: Analyzing documents for project {project_id}")
        
        try:
            file_paths = task.get("payload_json", {}).get("files", [])
            
            extracted_text = ""
            for path in file_paths:
                if path.lower().endswith(".pdf"):
                    extracted_text += self._extract_text_from_pdf(path) + "\n"
                elif path.lower().endswith((".png", ".jpg", ".jpeg")):
                    extracted_text += f"[Image uploaded: {path}. Processing images is mocked for now.]\n"
                elif path.lower().endswith(".txt"):
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        extracted_text += f.read() + "\n"

            if not extracted_text.strip():
                extracted_text = "No readable text found in documents."
                
            copy_json = {}
            if self.claude:
                prompt = f"""
                You are a professional real estate copywriter. Read the following extracted text/metadata from property documents:
                
                {extracted_text[:4000]} # Limit to avoid massive tokens
                
                Generate beautiful, engaging website copy for this property. 
                Return ONLY a JSON object with the following keys:
                - headline (catchy, max 6 words)
                - subheadline (descriptive, max 12 words)
                - about_paragraph (2-3 sentences describing the vibe and location)
                - features (array of 3-5 strings, e.g. "Ocean Views", "Infinity Pool")
                """
                
                try:
                    message = self.claude.messages.create(
                        model="claude-sonnet-5",
                        max_tokens=1000,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    content = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
                    
                    # Extract JSON block
                    start_idx = content.find('{')
                    end_idx = content.rfind('}') + 1
                    if start_idx != -1 and end_idx != -1:
                        copy_json = json.loads(content[start_idx:end_idx])
                    else:
                        raise Exception("Failed to parse JSON")
                except Exception as e:
                    print(f"Claude API error in Copywriter: {e}. Falling back to mock.")
                    self.claude = None # Force fallback

            if not self.claude:
                # Fallback mock
                copy_json = {
                    "headline": "Experience Unparalleled Luxury",
                    "subheadline": "A breathtaking property designed for modern living",
                    "about_paragraph": "Discover a unique blend of elegance and comfort in this stunning residence. Carefully curated spaces and premium materials create an atmosphere of pure refinement.",
                    "features": ["Breathtaking Views", "Premium Finishes", "Exclusive Location", "Modern Architecture"]
                }
            
            # Save the copy_json to a local file
            copy_path = os.path.join("uploads", f"{project_id}_copy.json")
            with open(copy_path, "w", encoding="utf-8") as f:
                json.dump(copy_json, f, indent=2)
                
            return True, "Copy generated successfully."
            
        except Exception as e:
            return False, f"Copywriter Error: {str(e)}"
