import os
import json
import anthropic
from supabase import Client
from typing import Tuple

class TemplatePicker:
    """Agent A: Reads project data and location to pick a template and style direction."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
        if self.anthropic_key:
            self.claude = anthropic.Anthropic(api_key=self.anthropic_key)
        else:
            self.claude = None
            print("WARNING: ANTHROPIC_API_KEY not found. Agent A will run in mock mode.")

    def run_task(self, task: dict) -> Tuple[bool, str]:
        """Routes the task to the specific sub-function."""
        task_type = task.get("task_type")
        project_id = task.get("project_id")
        
        if task_type == "style_analysis":
            return self.generate_style_brief(project_id, task.get("payload_json", {}))
        elif task_type == "template_selection":
            return self.select_template(project_id)
        else:
            return False, f"Unknown task type: {task_type}"

    def generate_style_brief(self, project_id: str, payload: dict) -> Tuple[bool, str]:
        print(f"Agent A: Generating Style Brief for project {project_id}")
        
        location = payload.get("location", "Unknown Location")
        property_type = payload.get("property_type", "Standard Property")
        
        brief_json = {}
        
        if self.claude:
            prompt = f"""
            You are a real estate marketing expert. Create a style brief for a {property_type} located in {location}.
            Return ONLY a JSON object with the following keys:
            - property_type
            - market_tier (e.g. luxury, mid-market, affordable)
            - architectural_style
            - materials (array of strings)
            - color_palette (array of strings)
            - light_quality
            - typical_exterior_view
            - cultural_notes
            """
            
            try:
                message = self.claude.messages.create(
                    model="claude-sonnet-5",
                    max_tokens=1000,
                    messages=[{"role": "user", "content": prompt}]
                )
                content = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
                start_idx = content.find('{')
                end_idx = content.rfind('}') + 1
                if start_idx != -1 and end_idx != -1:
                    brief_json = json.loads(content[start_idx:end_idx])
                else:
                    return False, "Failed to parse JSON from Claude response."
                    
            except Exception as e:
                print(f"Claude API error: {str(e)}. Falling back to mock data.")
                brief_json = {
                    "property_type": property_type,
                    "market_tier": "luxury",
                    "architectural_style": "modern",
                    "materials": ["glass", "steel", "concrete"],
                    "color_palette": ["white", "grey", "black"],
                    "light_quality": "bright and natural",
                    "typical_exterior_view": "city skyline",
                    "cultural_notes": "urban professional vibe"
                }
        else:
            # Mock mode
            brief_json = {
                "property_type": property_type,
                "market_tier": "luxury",
                "architectural_style": "modern",
                "materials": ["glass", "steel", "concrete"],
                "color_palette": ["white", "grey", "black"],
                "light_quality": "bright and natural",
                "typical_exterior_view": "city skyline",
                "cultural_notes": "urban professional vibe"
            }
            
        # Insert style brief into DB
        try:
            res = self.supabase.table("style_briefs").insert({
                "project_id": project_id,
                "brief_json": brief_json
            }).execute()
            
            if res.data:
                return True, "Style brief generated."
            else:
                return False, "Failed to insert style brief into DB."
        except Exception as e:
            return False, f"DB Error: {str(e)}"

    def select_template(self, project_id: str) -> Tuple[bool, str]:
        print(f"Agent A: Selecting template for project {project_id}")
        
        try:
            # 1. Fetch style brief
            res = self.supabase.table("style_briefs").select("brief_json").eq("project_id", project_id).execute()
            if not res.data:
                return False, "Style brief not found."
            brief = res.data[0]["brief_json"]
            
            # 2. Load templates.json
            templates_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates.json")
            with open(templates_path, "r") as f:
                templates = json.load(f)
                
            selected_id = templates[0]["id"] # default fallback
            
            # 3. Call Claude to match
            if self.claude:
                prompt = f"""
                You are a template matching agent. Match the following style brief to the BEST template from the registry.
                Style Brief: {json.dumps(brief)}
                Templates Registry: {json.dumps(templates)}
                
                Return ONLY a JSON object containing a single key "template_id" with the ID of the chosen template.
                """
                try:
                    message = self.claude.messages.create(
                        model="claude-sonnet-5",
                        max_tokens=100,
                        messages=[{"role": "user", "content": prompt}]
                    )
                    content = "".join(b.text for b in message.content if getattr(b, "type", "") == "text")
                    start_idx = content.find('{')
                    end_idx = content.rfind('}') + 1
                    if start_idx != -1 and end_idx != -1:
                        result = json.loads(content[start_idx:end_idx])
                        if result.get("template_id"):
                            selected_id = result["template_id"]
                except Exception as e:
                    print(f"Claude template selection failed: {e}. Falling back to {selected_id}")
            
            print(f"Agent A: Selected template {selected_id}")
            
            # 4. Update project row
            self.supabase.table("projects").update({"template_id": selected_id}).eq("id", project_id).execute()
            
            return True, f"Template {selected_id} selected."
            
        except Exception as e:
            return False, f"DB Error: {str(e)}"
