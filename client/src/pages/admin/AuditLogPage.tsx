import React, { useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '../../config';
import { ScrollText, ChevronDown, ChevronUp, RefreshCw, Filter, Search } from 'lucide-react';

interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export const AuditLogPage: React.FC = () => {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const limit = 25;

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      });
      if (actionFilter) {
        params.set('action', actionFilter);
      }

      const res = await fetch(`${getApiUrl()}/api/v2/admin/audit?${params}`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('[AuditLog] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [offset, actionFilter]);

  const fetchActions = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/v2/admin/audit/actions`);
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
      }
    } catch (e) {
      console.error('[AuditLog] Failed to fetch actions:', e);
    }
  }, []);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleRefresh = () => {
    setOffset(0);
    fetchAuditLog();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-7 h-7 text-emerald-500" />
            Audit Log
          </h1>
          <p className="text-slate-400 mt-1">Track all admin actions and changes</p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setOffset(0);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        <span className="text-sm text-slate-400">
          {total} total entries
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 mt-3">Loading audit log...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-white font-medium">No audit entries found</p>
            <p className="text-slate-400 text-sm mt-1">Admin actions will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {items.map((item) => (
              <div key={item.id} className="hover:bg-slate-700/30 transition-colors">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full px-4 py-3 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-emerald-600/20 text-emerald-400 text-xs font-medium rounded">
                          {item.action}
                        </span>
                        {item.targetType && (
                          <span className="text-slate-400 text-sm">
                            {item.targetType}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <span className="text-white">{item.actorName}</span>
                        {item.targetId && (
                          <>
                            <span className="text-slate-500">→</span>
                            <span className="text-slate-400 font-mono text-xs">
                              {item.targetId.slice(0, 8)}...
                            </span>
                          </>
                        )}
                      </div>
                      {item.reason && (
                        <p className="text-slate-500 text-sm mt-1 truncate">
                          Reason: {item.reason}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                      {item.meta && Object.keys(item.meta).length > 0 && (
                        expandedId === item.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )
                      )}
                    </div>
                  </div>
                </button>
                
                {/* Expanded Meta */}
                {expandedId === item.id && item.meta && (
                  <div className="px-4 pb-3">
                    <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-slate-300 font-mono">
                        {JSON.stringify(item.meta, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total || loading}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;

