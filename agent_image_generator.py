import os
import json
import requests
import time
import urllib.request
import uuid
from dotenv import load_dotenv
from supabase import Client
from typing import Tuple

class ImageGeneratorAgent:
    """Agent D: Uses ComfyUI to generate images and falls back to Unsplash if ComfyUI fails."""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.base_dir = os.path.dirname(__file__)
        load_dotenv(os.path.join(self.base_dir, ".env.local"), override=True)
        self.comfyui_url = os.environ.get("COMFYUI_URL", "http://127.0.0.1:8188")
        self.comfy_api_key = os.environ.get("COMFY_CLOUD_API_KEY")
        
    def _get_headers(self) -> dict:
        headers = {}
        if self.comfy_api_key:
            headers["Authorization"] = f"Bearer {self.comfy_api_key}"
        return headers
        
    def _queue_comfyui_prompt(self, workflow: dict) -> str:
        """Sends the workflow to ComfyUI and returns the prompt_id"""
        url = f"{self.comfyui_url}/prompt"
        data = {"prompt": workflow, "client_id": str(uuid.uuid4())}
        response = requests.post(url, json=data, headers=self._get_headers())
        response.raise_for_status()
        return response.json().get("prompt_id")
        
    def _poll_and_download(self, prompt_id: str, output_path: str, project_id: str, room_id: str) -> bool:
        """Polls ComfyUI history until done, then downloads the image."""
        history_url = f"{self.comfyui_url}/history/{prompt_id}"
        
        # Poll for up to 5 minutes (300s)
        for _ in range(60):
            try:
                res = requests.get(history_url, headers=self._get_headers())
                res.raise_for_status()
                history = res.json()
                
                if prompt_id in history:
                    outputs = history[prompt_id].get("outputs", {})
                    # Find the first image output
                    for node_id, node_output in outputs.items():
                        if "images" in node_output and len(node_output["images"]) > 0:
                            image_data = node_output["images"][0]
                            filename = image_data.get("filename")
                            subfolder = image_data.get("subfolder", "")
                            folder_type = image_data.get("type", "output")
                            
                            # Download the image
                            view_url = f"{self.comfyui_url}/view?filename={filename}&subfolder={subfolder}&type={folder_type}"
                            img_response = requests.get(view_url, headers=self._get_headers())
                            img_response.raise_for_status()
                            
                            with open(output_path, "wb") as f:
                                f.write(img_response.content)
                                
                            # Upload to Supabase Storage
                            try:
                                self.supabase.storage.from_("Websites").upload(f"{project_id}/assets/{room_id}.jpg", output_path, file_options={"upsert": "true", "contentType": "image/jpeg"})
                            except Exception as e:
                                print(f"Failed to upload {room_id}.jpg to Supabase: {e}")
                                
                            return True
            except requests.exceptions.HTTPError as e:
                print(f"Error polling ComfyUI: {e}")
                if e.response.status_code == 404:
                    print("ComfyUI history endpoint returned 404. Breaking loop immediately.")
                    return False
            except Exception as e:
                print(f"Error polling ComfyUI: {e}")
                
            time.sleep(5)
            
        print("ComfyUI generation timed out.")
        return False
        
    def generate_image(self, prompt: str, output_path: str, project_id: str, room_id: str) -> bool:
        """Tries ComfyUI first, falls back to Unsplash"""
        
        # 1. Try ComfyUI
        workflow_path = os.path.join(self.base_dir, "comfy_workflow.json")
        if os.path.exists(workflow_path):
            try:
                with open(workflow_path, "r") as f:
                    workflow_str = f.read()
                
                workflow_data = json.loads(workflow_str)
                
                # Dynamically set the prompt in Node 3 (GeminiNanoBanana2V2)
                if "3" in workflow_data and "prompt" in workflow_data["3"]["inputs"]:
                    workflow_data["3"]["inputs"]["prompt"] = prompt
                
                print("Queueing ComfyUI prompt...")
                prompt_id = self._queue_comfyui_prompt(workflow_data)
                
                print(f"Waiting for ComfyUI generation (prompt_id: {prompt_id})...")
                success = self._poll_and_download(prompt_id, output_path, project_id, room_id)
                if success:
                    return True
            except Exception as e:
                print(f"ComfyUI Error: {e}")
                print("Falling back to Unsplash...")
        else:
            print(f"No comfy_workflow.json found at {workflow_path}. Falling back to Unsplash...")
            
        # 2. Fallback to Picsum (Unsplash deprecated)
        print("Falling back to Picsum...")
        try:
            url = f"https://picsum.photos/1600/900?random={room_id}"
            response = requests.get(url, allow_redirects=True, timeout=10)
            if response.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(response.content)
                    
                # Upload to Supabase Storage
                try:
                    self.supabase.storage.from_("Websites").upload(f"{project_id}/assets/{room_id}.jpg", output_path, file_options={"upsert": "true", "contentType": "image/jpeg"})
                except Exception as e:
                    print(f"Failed to upload fallback {room_id}.jpg to Supabase: {e}")
                return True
        except Exception as e:
            print(f"Image fallback failed: {e}")
            
        return False

    def run_task(self, task: dict) -> Tuple[bool, str]:
        print(f"Agent Image Generator: Generating assets for project {task['project_id']}")
        try:
            project_id = task["project_id"]
            output_dir = os.path.join(self.base_dir, "public", "websites", project_id, "assets")
            os.makedirs(output_dir, exist_ok=True)
            
            rooms = ["living", "bedroom", "kitchen", "bathroom"]
            images_meta = {}
            
            for room in rooms:
                filename = f"{room}.jpg"
                output_path = os.path.join(output_dir, filename)
                
                # Highly descriptive AI prompt (this gets injected into ComfyUI)
                prompt = f"Photorealistic interior architectural render of a luxury {room}. Editorial lighting, high end materials."
                
                success = self.generate_image(prompt, output_path, project_id, room)
                if success:
                    images_meta[room] = f"assets/{filename}"
                else:
                    return False, f"Failed to generate image for {room}"
                    
            # Save meta
            meta_path = os.path.join(output_dir, "images_meta.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(images_meta, f, indent=2)
                
            # Upload metadata to Supabase Storage
            try:
                self.supabase.storage.from_("Websites").upload(f"{project_id}/assets/images_meta.json", meta_path, file_options={"upsert": "true"})
            except Exception as e:
                pass
                
            return True, "Images generated successfully."
            
        except Exception as e:
            return False, f"Image Generator Error: {str(e)}"
