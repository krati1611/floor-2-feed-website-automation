import os
import time
import asyncio
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException, File, Form, UploadFile
from fastapi.staticfiles import StaticFiles
import shutil
from supabase import create_client, Client
from dotenv import load_dotenv

# Try to load .env.local first (Next.js standard), then fallback to .env
load_dotenv(".env.local")
load_dotenv()

app = FastAPI(title="Floor2Feed Master Agent")

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the generated HTML sites
os.makedirs("public/websites", exist_ok=True)
app.mount("/websites", StaticFiles(directory="public/websites"), name="websites")

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    print("WARNING: Supabase credentials not found in environment. Running in mock mode.")
    supabase = None

class ProjectStatus(str, Enum):
    INTAKE = "INTAKE"
    STYLE_ANALYSIS = "STYLE_ANALYSIS"
    TEMPLATE_SELECTION = "TEMPLATE_SELECTION"
    GEOMETRY_EXTRACTION = "GEOMETRY_EXTRACTION"
    IMAGE_GENERATION = "IMAGE_GENERATION"
    IMAGE_QA = "IMAGE_QA"
    WEBSITE_BUILD = "WEBSITE_BUILD"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    PUBLISH = "PUBLISH"
    DONE = "DONE"
    FAILED = "FAILED"

class TaskStatus(str, Enum):
    WAITING = "waiting"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"

@app.get("/projects")
async def get_projects():
    """Fetch all projects and their nested tasks."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    res = supabase.table("projects").select("*, tasks(*)").order("created_at", desc=True).execute()
    return {"projects": res.data}

class ProjectCreateReq(BaseModel):
    client_name: str
    location: str
    property_type: str

@app.post("/projects")
async def create_project(req: ProjectCreateReq, background_tasks: BackgroundTasks):
    """Create a new project and trigger the first task (Agent A)."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Create project in DB
    project_res = supabase.table("projects").insert({
        "client_name": req.client_name,
        "location": req.location,
        "property_type": req.property_type,
        "status": ProjectStatus.INTAKE.value
    }).execute()
    
    if not project_res.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
        
    project = project_res.data[0]
    
    # Create the first task: Style Analysis (Agent A)
    task_res = supabase.table("tasks").insert({
        "project_id": project["id"],
        "agent": "agent_a",
        "task_type": "style_analysis",
        "status": TaskStatus.WAITING.value,
        "payload_json": {"location": req.location, "property_type": req.property_type}
    }).execute()
    
    # Trigger background worker to poll/process tasks
    background_tasks.add_task(process_tasks)
    
    return {"message": "Project created", "project": project, "task": task_res.data[0]}

@app.post("/projects/with-documents")
async def create_project_with_documents(
    background_tasks: BackgroundTasks,
    client_name: str = Form(...),
    location: str = Form(...),
    property_type: str = Form(...),
    files: List[UploadFile] = File(None)
):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    # Create project in DB
    project_res = supabase.table("projects").insert({
        "client_name": client_name,
        "location": location,
        "property_type": property_type,
        "status": ProjectStatus.INTAKE.value
    }).execute()
    
    if not project_res.data:
        raise HTTPException(status_code=500, detail="Failed to create project")
        
    project = project_res.data[0]
    
    # Save files
    os.makedirs("uploads", exist_ok=True)
    file_paths = []
    if files:
        for file in files:
            file_path = os.path.join("uploads", f"{project['id']}_{file.filename}")
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_paths.append(file_path)
            
            # Record in documents table
            supabase.table("documents").insert({
                "project_id": project["id"],
                "file_type": file.content_type,
                "storage_path": file_path
            }).execute()
            
            # Upload to Supabase Storage
            try:
                supabase.storage.from_("Uploads").upload(f"{project['id']}/{file.filename}", file_path, file_options={"upsert": "true"})
                print(f"Uploaded {file.filename} to Supabase Storage")
            except Exception as e:
                print(f"Failed to upload to Supabase: {e}")

    # Create Style Analysis task
    supabase.table("tasks").insert({
        "project_id": project["id"],
        "agent": "agent_a",
        "task_type": "style_analysis",
        "status": TaskStatus.WAITING.value,
        "payload_json": {"location": location, "property_type": property_type}
    }).execute()
    
    # Create Copy Generation & Image Generation tasks
    if file_paths:
        supabase.table("tasks").insert({
            "project_id": project["id"],
            "agent": "agent_copywriter",
            "task_type": "copy_generation",
            "status": TaskStatus.WAITING.value,
            "payload_json": {"files": file_paths}
        }).execute()
        
        supabase.table("tasks").insert({
            "project_id": project["id"],
            "agent": "agent_image_generator",
            "task_type": "image_generation",
            "status": TaskStatus.WAITING.value,
            "payload_json": {"files": file_paths}
        }).execute()
    
    # Trigger worker
    background_tasks.add_task(process_tasks)
    
    return {"message": "Project created with documents", "project": project}

import threading

def check_website_build_ready(project_id):
    """Spawns the website build task only if both dependencies are DONE."""
    if not supabase: return
    res = supabase.table("tasks").select("task_type, status").eq("project_id", project_id).in_("task_type", ["template_selection", "copy_generation", "image_generation"]).execute()
    tasks = res.data
    
    # We need all three tasks to exist and be DONE
    if len(tasks) == 3 and all(t["status"] == TaskStatus.DONE.value for t in tasks):
        # Check if website_build is already spawned
        res2 = supabase.table("tasks").select("id").eq("project_id", project_id).eq("task_type", "website_build").execute()
        if not res2.data:
            supabase.table("projects").update({"status": ProjectStatus.WEBSITE_BUILD.value}).eq("id", project_id).execute()
            supabase.table("tasks").insert({
                "project_id": project_id,
                "agent": "agent_c",
                "task_type": "website_build",
                "status": TaskStatus.WAITING.value
            }).execute()
            process_tasks()

def run_agent_worker(task):
    """Runs a single agent task in a background thread."""
    try:
        if task["agent"] == "agent_a":
            from agent_a.template_picker import TemplatePicker
            picker = TemplatePicker(supabase)
            success, message = picker.run_task(task)
            
            if success:
                supabase.table("tasks").update({"status": TaskStatus.DONE.value}).eq("id", task["id"]).execute()
                if task["task_type"] == "style_analysis":
                    supabase.table("projects").update({"status": ProjectStatus.STYLE_ANALYSIS.value}).eq("id", task["project_id"]).execute()
                    
                    supabase.table("tasks").insert({
                        "project_id": task["project_id"],
                        "agent": "agent_a",
                        "task_type": "template_selection",
                        "status": TaskStatus.WAITING.value
                    }).execute()
                    process_tasks()
                elif task["task_type"] == "template_selection":
                    check_website_build_ready(task["project_id"])
            else:
                supabase.table("tasks").update({"status": TaskStatus.FAILED.value, "error_message": message}).eq("id", task["id"]).execute()
                
        elif task["agent"] == "agent_copywriter":
            from agent_copywriter import CopywriterAgent
            agent = CopywriterAgent(supabase)
            success, message = agent.run_task(task)
            
            if success:
                supabase.table("tasks").update({"status": TaskStatus.DONE.value}).eq("id", task["id"]).execute()
                check_website_build_ready(task["project_id"])
            else:
                supabase.table("tasks").update({"status": TaskStatus.FAILED.value, "error_message": message}).eq("id", task["id"]).execute()
                
        elif task["agent"] == "agent_image_generator":
            from agent_image_generator import ImageGeneratorAgent
            agent = ImageGeneratorAgent(supabase)
            success, message = agent.run_task(task)
            
            if success:
                supabase.table("tasks").update({"status": TaskStatus.DONE.value}).eq("id", task["id"]).execute()
            else:
                supabase.table("tasks").update({"status": TaskStatus.FAILED.value, "error_message": message}).eq("id", task["id"]).execute()
                
        elif task["agent"] == "agent_c":
            from agent_c.site_builder import SiteBuilder
            builder = SiteBuilder(supabase)
            success, message = builder.run_task(task)
            
            if success:
                supabase.table("tasks").update({"status": TaskStatus.DONE.value}).eq("id", task["id"]).execute()
                supabase.table("projects").update({"status": ProjectStatus.HUMAN_REVIEW.value}).eq("id", task["project_id"]).execute()
            else:
                supabase.table("tasks").update({"status": TaskStatus.FAILED.value, "error_message": message}).eq("id", task["id"]).execute()
                
    except Exception as e:
        print(f"Task execution failed: {str(e)}")
        supabase.table("tasks").update({
            "status": TaskStatus.FAILED.value, 
            "error_message": str(e)
        }).eq("id", task["id"]).execute()

def process_tasks():
    """Background worker that spins up threads for all WAITING tasks."""
    if not supabase: return
        
    res = supabase.table("tasks").select("*").eq("status", TaskStatus.WAITING.value).order("created_at").execute()
    tasks = res.data
    
    if not tasks: return
        
    for task in tasks:
        # Mark as running FIRST so another thread doesn't grab it simultaneously
        supabase.table("tasks").update({"status": TaskStatus.RUNNING.value}).eq("id", task["id"]).execute()
        print(f"Spawning async thread for task: {task['task_type']} for project {task['project_id']}")
        thread = threading.Thread(target=run_agent_worker, args=(task,))
        thread.start()

@app.get("/health")
def health_check():
    return {"status": "healthy", "supabase_connected": supabase is not None}

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI Orchestrator...")
    uvicorn.run("orchestrator:app", host="0.0.0.0", port=8000, reload=True)
