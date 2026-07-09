import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { ExternalLink, Plus, RefreshCw, Compass } from 'lucide-react'

function App() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form State
  const [clientName, setClientName] = useState('')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState('Luxury Villa')
  
  const [files, setFiles] = useState<FileList | null>(null)
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8002'

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${apiUrl}/projects`)
      if (response.ok) {
        const data = await response.json()
        const projects = data.projects || []
        
        // Sort tasks by created_at for each project
        const sortedData = projects.map((p: any) => ({
          ...p,
          tasks: p.tasks ? p.tasks.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : []
        }))
        setProjects(sortedData)
      }
    } catch (error) {
      console.error("Error fetching projects from backend:", error)
    }
  }

  useEffect(() => {
    fetchProjects()
    
    // Poll every 3 seconds to get status updates from the Python orchestrator
    const interval = setInterval(fetchProjects, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName || !location) return
    
    setLoading(true)
    
    // Use FormData for file upload
    const formData = new FormData()
    formData.append('client_name', clientName)
    formData.append('location', location)
    formData.append('property_type', propertyType)
    
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }
    }
    
    // Call FastAPI backend to create project and trigger background worker
    try {
      const response = await fetch(`${apiUrl}/projects/with-documents`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to create project')
      }
      
      setClientName('')
      setLocation('')
      setFiles(null)
      fetchProjects()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Floor2Feed</h1>
        <p>Agentic Website Generation Dashboard</p>
      </header>

      <div className="grid-layout">
        
        {/* Left Sidebar: Intake Form */}
        <aside>
          <div className="card">
            <h2>New Project</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Client Name</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Florida Sun Real Estate" 
                  required
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Miami Beach, FL" 
                  required
                />
              </div>
              <div className="form-group">
                <label>Property Type</label>
                <select value={propertyType} onChange={e => setPropertyType(e.target.value)}>
                  <option value="Luxury Villa">Luxury Villa</option>
                  <option value="Modern Apartment">Modern Apartment</option>
                  <option value="Beachfront Condo">Beachfront Condo</option>
                  <option value="Commercial Office">Commercial Office</option>
                </select>
              </div>
              <div className="form-group">
                <label>Property Documents (PDF/Images)</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,image/*"
                  onChange={e => setFiles(e.target.files)}
                />
              </div>
              
              <button type="submit" className="btn" disabled={loading}>
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Plus size={18} />}
                {loading ? 'Submitting...' : 'Submit to AI Agents'}
              </button>
            </form>
          </div>
        </aside>

        {/* Right Main: Projects Feed */}
        <main>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h2 style={{ border: 'none', margin: 0, padding: 0 }}>Active Projects</h2>
              <button onClick={fetchProjects} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <RefreshCw size={18} />
              </button>
            </div>
            
            <div className="project-list">
              {projects.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No projects yet. Submit one to get started!</p>
              ) : (
                projects.map(project => (
                  <div key={project.id} className="project-item">
                    <div className="project-info">
                      <h3>{project.client_name}</h3>
                      <p>{project.property_type} &middot; {project.location}</p>
                      
                      {/* Sub-tasks list */}
                      {project.tasks && project.tasks.length > 0 && (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {project.tasks.map((t: any) => (
                            <div key={t.id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ 
                                display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                background: t.status === 'done' ? '#047857' : t.status === 'running' ? '#B45309' : t.status === 'failed' ? '#ef476f' : '#9ca3af'
                              }}></span>
                              <span style={{ color: 'var(--text-secondary)' }}>
                                {t.agent.replace('agent_', '').replace('_', ' ').toUpperCase()} 
                                {' - '}
                                {t.task_type.replace('_', ' ')}: 
                                <strong style={{ marginLeft: '4px', color: 'var(--text-primary)' }}>{t.status.toUpperCase()}</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                      <span className={`status-badge status-${project.status}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                      
                      {(project.status === 'HUMAN_REVIEW' || project.status === 'DONE') && (
                        <a 
                          href={`http://127.0.0.1:8002/websites/${project.id}/index.html`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="view-btn"
                        >
                          <Compass size={16} /> View Site
                        </a>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
