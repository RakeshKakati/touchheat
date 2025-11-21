'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  api_key: string;
  allowed_domains: string[] | null;
  created_at: string;
}

interface ProjectStatus {
  status: 'active' | 'inactive' | 'no_data';
  totalEvents: number;
  isInstalled: boolean;
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [projectStatuses, setProjectStatuses] = useState<Record<string, ProjectStatus>>({});
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      // Fetch status for all projects
      projects.forEach((project) => {
        fetchProjectStatus(project.id);
      });
      
      // Poll status every 60 seconds
      const statusInterval = setInterval(() => {
        projects.forEach((project) => {
          fetchProjectStatus(project.id);
        });
      }, 60000);
      
      return () => clearInterval(statusInterval);
    }
  }, [projects]);

  const fetchProjectStatus = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/status`);
      if (res.ok) {
        const data = await res.json();
        setProjectStatuses((prev) => ({
          ...prev,
          [projectId]: {
            status: data.status,
            totalEvents: data.totalEvents,
            isInstalled: data.isInstalled,
          },
        }));
      }
    } catch (error) {
      // Silently fail - status is optional
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (res.ok) {
        const data = await res.json();
        setProjects([data.project, ...projects]);
        setNewProjectName('');
        setShowApiKey(data.project.id);
        alert(`Project created! API Key: ${data.project.api_key}\n\nSave this key - it won't be shown again!`);
      } else {
        alert('Failed to create project');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const getSnippetCode = (projectId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://touchheat.app';
    return `<script async src="${baseUrl}/touchheat.min.js" data-project="${projectId}"></script>`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your mobile analytics projects
        </p>
      </div>

      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
        <form onSubmit={handleCreateProject} className="flex gap-4">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600">No projects yet. Create your first project above.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const status = projectStatuses[project.id];
            return (
              <div key={project.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {project.name}
                  </h3>
                  {status && (
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          status.status === 'active'
                            ? 'bg-green-500'
                            : status.status === 'inactive'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                        }`}
                        title={
                          status.status === 'active'
                            ? 'Active'
                            : status.status === 'inactive'
                            ? 'Inactive'
                            : 'No data'
                        }
                      />
                      <span className="text-xs text-gray-500">
                        {status.totalEvents.toLocaleString()} events
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Snippet Code
                  </label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {getSnippetCode(project.id)}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getSnippetCode(project.id));
                        alert('Copied to clipboard!');
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <Link
                  href={`/dashboard/${project.id}`}
                  className="block w-full text-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  View Analytics
                </Link>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

