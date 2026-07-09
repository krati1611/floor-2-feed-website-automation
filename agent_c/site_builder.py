import os
import json
import re
import anthropic
from supabase import Client
from typing import Tuple

class SiteBuilder:
    """Agent C: AI Frontend Developer. Builds a fully custom HTML/Tailwind website from scratch."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.base_dir = os.path.dirname(os.path.dirname(__file__))
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if self.anthropic_key:
            self.claude = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.claude = None

    def run_task(self, task: dict) -> Tuple[bool, str]:
        print(f"Agent C: Building website from scratch for project {task['project_id']}")
        try:
            project_id = task["project_id"]
            
            # Fetch project details
            res = self.supabase.table("projects").select("*").eq("id", project_id).execute()
            if not res.data:
                return False, "Project not found."
            project = res.data[0]
            
            template_id = project.get("template_id")
            client_name = project.get("client_name", "Luxury Real Estate")
            location = project.get("location", "Prime Location")
            
            # Load Design Guidelines (Templates Registry)
            templates_path = os.path.join(self.base_dir, "templates.json")
            with open(templates_path, "r") as f:
                templates = json.load(f)
                
            template_meta = next((t for t in templates if t["id"] == template_id), templates[0])
            design_guidelines = template_meta.get("guidelines", {})
                
            # Load AI Generated Copy
            copy_json = {}
            copy_path = os.path.join(self.base_dir, "uploads", f"{project_id}_copy.json")
            if os.path.exists(copy_path):
                with open(copy_path, "r", encoding="utf-8") as f:
                    copy_json = json.load(f)
                    
            # Load AI Generated Images
            images_meta = {}
            output_dir = os.path.join(self.base_dir, "public", "websites", project_id)
            meta_path = os.path.join(output_dir, "assets", "images_meta.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    images_meta = json.load(f)
            
            if not self.claude:
                return False, "No Anthropic API key found to build website."

            # Construct the Prompt for the AI Frontend Developer
            prompt = f"""
            You are an elite Frontend Developer and UI/UX Designer. Your task is to build a beautiful, photorealistic, luxury real estate landing page from scratch.
            
            PROPERTY DETAILS:
            Client Name: {client_name}
            Location: {location}
            
            DESIGN GUIDELINES (You MUST follow these exactly):
            Vibe: {design_guidelines.get('vibe')}
            Colors: {json.dumps(design_guidelines.get('colors', {}))}
            Typography: {json.dumps(design_guidelines.get('typography', {}))}
            Layout: {design_guidelines.get('layout')}
            
            COPYWRITER CONTENT (Inject this text exactly into the page):
            {json.dumps(copy_json, indent=2)}
            
            AVAILABLE IMAGES (Use these exact URLs in your <img> tags or background-images):
            {json.dumps(images_meta, indent=2)}
            Note: The image URLs are relative paths (e.g. 'assets/kitchen.jpg'). Use them directly.

            TECHNICAL CONSTRAINTS:
            1. Output a SINGLE valid HTML5 file containing everything.
            2. Use TailwindCSS via CDN (`<script src="https://cdn.tailwindcss.com"></script>`).
            3. Import the required Google Fonts in the <head> to match the Typography guidelines.
            4. The design must be responsive (mobile-friendly).
            5. Use modern techniques like CSS Grid/Flexbox, subtle hover animations, and cinematic full-screen hero sections.
            6. If you use a background image for the hero section, ensure there is a dark/light overlay so the text remains legible.
            
            Return ONLY the raw HTML code wrapped in a ```html ``` code block. Do not include any other explanations.
            """
            
            message = self.claude.messages.create(
                model="claude-sonnet-5",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
            
            # Extract HTML block
            html_match = re.search(r"```html\n(.*?)\n```", content, re.DOTALL)
            if html_match:
                html_content = html_match.group(1)
            else:
                # If no code block, assume the whole response is HTML
                html_content = content.replace("```html", "").replace("```", "")
                
            # Ensure the output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Save the final HTML
            final_path = os.path.join(output_dir, "index.html")
            with open(final_path, "w", encoding="utf-8") as f:
                f.write(html_content)
                
            # Upload to Supabase Storage
            try:
                self.supabase.storage.from_("Websites").upload(f"{project_id}/index.html", final_path, file_options={"upsert": "true", "contentType": "text/html"})
                print(f"Agent C: Uploaded index.html to Supabase Storage")
            except Exception as e:
                print(f"Agent C: Failed to upload index.html to Supabase: {e}")
                
            print(f"Agent C: Website generated from scratch successfully at {final_path}")
            return True, "Website built successfully."
            
        except Exception as e:
            return False, f"Agent C Error: {str(e)}"
