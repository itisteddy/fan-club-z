import React from 'react';

interface AuditEvent {
  id: string;
  timestamp: string;
  actor_type: 'system' | 'user' | 'admin' | 'oracle';
  actor_id?: string;
  event: string;
  data?: any;
}

interface AuditTimelineProps {
  events: AuditEvent[];
  className?: string;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events, className = "" }) => {
  const getEventIcon = (event: string, actorType: string) => {
    switch (event.toLowerCase()) {
      case 'locked':
        return '🔒';
      case 'source_fetched':
        return '📥';
      case 'settled':
        return '✅';
      case 'disputed':
        return '⚠️';
      case 'voided':
        return '❌';
      case 'accepted':
        return '👍';
      default:
        return actorType === 'system' ? '⚙️' : '👤';
    }
  };

  const getEventColor = (event: string) => {
    switch (event.toLowerCase()) {
      case 'settled':
        return 'text-emerald-600';
      case 'disputed':
        return 'text-red-600';
      case 'voided':
        return 'text-red-600';
      case 'locked':
        return 'text-amber-600';
      case 'source_fetched':
        return 'text-blue-600';
      case 'accepted':
        return 'text-emerald-600';
      default:
        return 'text-gray-600';
    }
  };

  const getActorLabel = (actorType: string, actorId?: string) => {
    switch (actorType) {
      case 'system':
        return 'System';
      case 'oracle':
        return 'Oracle';
      case 'admin':
        return `Admin ${actorId ? `(${actorId.slice(0, 8)})` : ''}`;
      case 'user':
        return `User ${actorId ? `(${actorId.slice(0, 8)})` : ''}`;
      default:
        return actorType;
    }
  };

  const formatEventTitle = (event: string) => {
    return event
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!events || events.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p className="text-sm">No audit events available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Audit Timeline</h4>
      
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full border-2 border-white 
                flex items-center justify-center text-xs
                ${getEventColor(event.event)} bg-gray-50
              `}>
                {getEventIcon(event.event, event.actor_type)}
              </div>
              {index < events.length - 1 && (
                <div className="w-0.5 bg-gray-200 h-6 mt-2"></div>
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className={`text-sm font-medium ${getEventColor(event.event)}`}>
                    {formatEventTitle(event.event)}
                  </h5>
                  <p className="text-xs text-gray-500 mt-1">
                    by {getActorLabel(event.actor_type, event.actor_id)}
                  </p>
                </div>
                <time className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {formatTimestamp(event.timestamp)}
                </time>
              </div>

              {/* Event data */}
              {event.data && Object.keys(event.data).length > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <pre className="text-gray-700 whitespace-pre-wrap">
                    {JSON.stringify(event.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
