'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Insight {
  type: string;
  data: any;
  score?: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

interface Project {
  id: string;
  name: string;
  allowed_domains: string[] | null;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [updatingDomains, setUpdatingDomains] = useState(false);
  const [snippetStatus, setSnippetStatus] = useState<{
    status: 'active' | 'inactive' | 'no_data';
    lastEventTime: string | null;
    minutesSinceLastEvent: number | null;
    totalEvents: number;
    recentEventsCount: number;
    uniqueUrls: string[];
    isInstalled: boolean;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    fetchProject();
    fetchInsights();
    fetchSnippetStatus();
    
    // Poll status every 30 seconds
    const statusInterval = setInterval(fetchSnippetStatus, 30000);
    return () => clearInterval(statusInterval);
  }, [projectId, selectedUrl]);

  const fetchSnippetStatus = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/status`);
      if (res.ok) {
        const data = await res.json();
        setSnippetStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch snippet status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        const foundProject = data.projects?.find((p: Project) => p.id === projectId);
        if (foundProject) {
          setProject(foundProject);
        }
      }
    } catch (error) {
      console.error('Failed to fetch project:', error);
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const url = selectedUrl
        ? `/api/insights?project_id=${projectId}&url=${encodeURIComponent(selectedUrl)}`
        : `/api/insights?project_id=${projectId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const misTapInsight = insights.find((i) => i.type === 'mis_tap_rate');
  const thumbZoneInsight = insights.find((i) => i.type === 'thumb_zone_distribution');
  const unreachableCTAs = insights.find((i) => i.type === 'unreachable_ctas');
  const scrollComfort = insights.find((i) => i.type === 'scroll_comfort_score');
  const reachabilityScores = insights.find((i) => i.type === 'reachability_scores');

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !project) return;

    const domains = project.allowed_domains || [];
    if (domains.includes(newDomain.trim())) {
      alert('Domain already added');
      return;
    }

    setUpdatingDomains(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowed_domains: [...domains, newDomain.trim()],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
        setNewDomain('');
      } else {
        alert('Failed to add domain');
      }
    } catch (error) {
      console.error('Failed to add domain:', error);
      alert('Failed to add domain');
    } finally {
      setUpdatingDomains(false);
    }
  };

  const handleRemoveDomain = async (domainToRemove: string) => {
    if (!project) return;

    const domains = (project.allowed_domains || []).filter((d) => d !== domainToRemove);

    setUpdatingDomains(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowed_domains: domains,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        alert('Failed to remove domain');
      }
    } catch (error) {
      console.error('Failed to remove domain:', error);
      alert('Failed to remove domain');
    } finally {
      setUpdatingDomains(false);
    }
  };

  const thumbZoneData = thumbZoneInsight
    ? [
        { name: 'Left', value: thumbZoneInsight.data.left },
        { name: 'Right', value: thumbZoneInsight.data.right },
        { name: 'Center', value: thumbZoneInsight.data.center },
        { name: 'Unknown', value: thumbZoneInsight.data.unknown },
      ]
    : [];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-indigo-600 hover:text-indigo-800 text-sm"
        >
          ← Back to Projects
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="mt-4">
          <input
            type="text"
            value={selectedUrl}
            onChange={(e) => setSelectedUrl(e.target.value)}
            placeholder="Filter by URL (optional)"
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Snippet Installation Status */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Snippet Installation Status</h2>
          <button
            onClick={fetchSnippetStatus}
            disabled={statusLoading}
            className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            {statusLoading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {statusLoading && !snippetStatus ? (
          <div className="text-center py-4 text-gray-500">Loading status...</div>
        ) : snippetStatus ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    snippetStatus.status === 'active'
                      ? 'bg-green-500 animate-pulse'
                      : snippetStatus.status === 'inactive'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                />
                <span className="font-medium">
                  {snippetStatus.status === 'active'
                    ? 'Active - Receiving Data'
                    : snippetStatus.status === 'inactive'
                    ? 'Inactive - No Recent Data'
                    : 'Not Installed - No Data Received'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Events</div>
                <div className="text-2xl font-bold text-gray-900">
                  {snippetStatus.totalEvents.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last 24 Hours</div>
                <div className="text-2xl font-bold text-gray-900">
                  {snippetStatus.recentEventsCount.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Event</div>
                <div className="text-sm font-medium text-gray-900">
                  {snippetStatus.lastEventTime
                    ? snippetStatus.minutesSinceLastEvent !== null
                      ? snippetStatus.minutesSinceLastEvent < 1
                        ? 'Just now'
                        : snippetStatus.minutesSinceLastEvent < 60
                        ? `${snippetStatus.minutesSinceLastEvent}m ago`
                        : `${Math.floor(snippetStatus.minutesSinceLastEvent / 60)}h ago`
                      : new Date(snippetStatus.lastEventTime).toLocaleString()
                    : 'Never'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Pages Tracked</div>
                <div className="text-2xl font-bold text-gray-900">
                  {snippetStatus.uniqueUrls.length}
                </div>
              </div>
            </div>

            {snippetStatus.uniqueUrls.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Recent Pages:
                </div>
                <div className="flex flex-wrap gap-2">
                  {snippetStatus.uniqueUrls.slice(0, 5).map((url, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-xs text-gray-700 rounded"
                    >
                      {url.length > 50 ? url.substring(0, 50) + '...' : url}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!snippetStatus.isInstalled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Snippet Not Detected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        No events have been received yet. Make sure you've added
                        the snippet to your website:
                      </p>
                      <code className="mt-2 block bg-yellow-100 p-2 rounded text-xs">
                        {`<script async src="${typeof window !== 'undefined' ? window.location.origin : 'https://touchheat.app'}/touchheat.min.js" data-project="${projectId}"></script>`}
                      </code>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/projects/${projectId}/test`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                            });
                            if (res.ok) {
                              alert('Test event sent! Refresh the page to see it.');
                              setTimeout(fetchSnippetStatus, 1000);
                            } else {
                              alert('Failed to send test event');
                            }
                          } catch (error) {
                            alert('Failed to send test event');
                          }
                        }}
                        className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                      >
                        Send Test Event
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            Unable to load status
          </div>
        )}
      </div>

      {/* Domain Management Section */}
      <div className="mb-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Domain Verification</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add domains to restrict where events can be sent from. Leave empty to allow all domains.
        </p>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
              placeholder="example.com or www.example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={updatingDomains}
            />
            <button
              onClick={handleAddDomain}
              disabled={updatingDomains || !newDomain.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {project && project.allowed_domains && project.allowed_domains.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Allowed Domains:</div>
              {project.allowed_domains.map((domain) => (
                <div
                  key={domain}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-800">{domain}</span>
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    disabled={updatingDomains}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No domains configured - all domains are allowed
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {misTapInsight && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Mis-Tap Rate</h3>
            <div className="text-3xl font-bold text-gray-900">
              {misTapInsight.data.rate}%
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {misTapInsight.data.count} mis-taps out of {misTapInsight.data.total} total
            </p>
            {misTapInsight.score !== undefined && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">Quality Score</div>
                <div className="text-xl font-semibold text-indigo-600">
                  {misTapInsight.score}/100
                </div>
              </div>
            )}
          </div>
        )}

        {scrollComfort && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Scroll Comfort Score</h3>
            <div className="text-3xl font-bold text-gray-900">
              {scrollComfort.data.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Based on thumb zone distribution and mis-tap rate
            </p>
          </div>
        )}

        {reachabilityScores && reachabilityScores.data.pages.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Average Reachability</h3>
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(
                reachabilityScores.data.pages.reduce(
                  (acc: number, p: any) => acc + p.score,
                  0
                ) / reachabilityScores.data.pages.length
              )}
              /100
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Across {reachabilityScores.data.pages.length} page(s)
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {thumbZoneInsight && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Thumb Zone Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={thumbZoneData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {thumbZoneData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {reachabilityScores && reachabilityScores.data.pages.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Reachability by Page</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reachabilityScores.data.pages.slice(0, 10)}>
                <XAxis
                  dataKey="url"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {unreachableCTAs && unreachableCTAs.data.ctas.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Unreachable CTAs</h3>
          <p className="text-sm text-gray-600 mb-4">
            Elements with less than 1% tap rate but visible in viewport
          </p>
          <div className="space-y-2">
            {unreachableCTAs.data.ctas.map((cta: any, idx: number) => (
              <div
                key={idx}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <code className="text-xs text-gray-800">{cta.selector}</code>
                <span className="text-sm font-medium text-red-600">
                  {cta.tapRate}% tap rate
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href={`/dashboard/${projectId}/heatmap`}
          className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          View Heatmap
        </Link>
      </div>
    </div>
  );
}

