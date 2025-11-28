import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, ExternalLink, Info, Clock, Shield } from 'lucide-react';
import { getApiUrl } from '@/utils/environment';

interface SettlementCriteria {
  type: string;
  verification_requirements: {
    minimum_sources: number;
    required_source_types: string[];
    confirmation_delay?: string;
  };
  edge_cases?: Record<string, string>;
  data_source_priority?: string[];
}

interface VerificationSource {
  id: string;
  name: string;
  category: string;
  reliability_score: number;
  auto_verification_enabled: boolean;
}

interface CriteriaTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  criteria_template: SettlementCriteria;
  verification_sources: string[];
  auto_settlement_capable: boolean;
}

interface SettlementCriteriaSetupProps {
  category: string;
  onCriteriaChange: (criteria: SettlementCriteria | null, autoSettlement: boolean) => void;
  value?: SettlementCriteria | null;
  autoSettlement?: boolean;
}

export const SettlementCriteriaSetup: React.FC<SettlementCriteriaSetupProps> = ({
  category,
  onCriteriaChange,
  value,
  autoSettlement = false
}) => {
  const [templates, setTemplates] = useState<CriteriaTemplate[]>([]);
  const [verificationSources, setVerificationSources] = useState<VerificationSource[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customCriteria, setCustomCriteria] = useState<SettlementCriteria | null>(value ?? null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplatesAndSources();
  }, [category]);

  const fetchTemplatesAndSources = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const apiBase = getApiUrl();
      
      // Fetch templates for category
      const templatesResponse = await fetch(`${apiBase}/api/v2/settlement/criteria-templates?category=${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch verification sources
      const sourcesResponse = await fetch(`${apiBase}/api/v2/settlement/verification-sources?category=${category}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (templatesResponse.ok && sourcesResponse.ok) {
        const templatesData = await templatesResponse.json();
        const sourcesData = await sourcesResponse.json();
        
        setTemplates(templatesData.templates || []);
        setVerificationSources(sourcesData.sources || []);
      }
    } catch (error) {
      console.error('Error fetching settlement criteria data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setIsCustomMode(false);
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setCustomCriteria(template.criteria_template);
      onCriteriaChange(template.criteria_template, template.auto_settlement_capable);
    }
  };

  const handleCustomCriteriaChange = (updatedCriteria: SettlementCriteria) => {
    setCustomCriteria(updatedCriteria);
    onCriteriaChange(updatedCriteria, autoSettlement);
  };

  const renderCriteriaPreview = (criteria: SettlementCriteria) => {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Shield size={16} />
          Settlement Criteria Summary
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Resolution Method:</span>
            <span className="font-medium text-blue-900">{criteria.type.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Required Sources:</span>
            <span className="font-medium text-blue-900">{criteria.verification_requirements.minimum_sources}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Source Types:</span>
            <span className="font-medium text-blue-900">
              {criteria.verification_requirements.required_source_types.join(', ')}
            </span>
          </div>
          {criteria.verification_requirements.confirmation_delay && (
            <div className="flex justify-between">
              <span className="text-blue-700">Settlement Delay:</span>
              <span className="font-medium text-blue-900">{criteria.verification_requirements.confirmation_delay}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Settlement Criteria</h3>
        <p className="text-sm text-gray-600">
          Define how your prediction will be resolved. Clear criteria prevent disputes and enable automatic settlement.
        </p>
      </div>

      {/* Template Selection */}
      {templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose Settlement Method
          </label>
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`
                  border rounded-lg p-4 cursor-pointer transition-all
                  ${selectedTemplate === template.id
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${selectedTemplate === template.id
                          ? 'border-teal-500 bg-teal-500'
                          : 'border-gray-300'
                        }
                      `}>
                        {selectedTemplate === template.id && (
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{template.name}</h4>
                      {template.auto_settlement_capable && (
                        <span className="px-2 py-1 text-xs bg-teal-100 text-teal-700 rounded-full">
                          AUTO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Shield size={12} />
                        <span>{template.criteria_template.verification_requirements.minimum_sources} sources required</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{template.criteria_template.verification_requirements.confirmation_delay || 'Immediate'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Custom Option */}
            <div
              className={`
                border rounded-lg p-4 cursor-pointer transition-all
                ${isCustomMode
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => setIsCustomMode(true)}
            >
              <div className="flex items-center gap-2">
                <div className={`
                  w-4 h-4 rounded-full border-2 flex items-center justify-center
                  ${isCustomMode
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                  }
                `}>
                  {isCustomMode && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </div>
                <h4 className="font-semibold text-gray-900">Custom Criteria</h4>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  MANUAL
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Define your own settlement criteria and verification requirements
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Criteria Form */}
      {isCustomMode && (
        <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
          <h4 className="font-semibold text-blue-900 mb-4">Custom Settlement Criteria</h4>
          
          <div className="space-y-4">
            {/* Resolution Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Method *
              </label>
              <input
                type="text"
                placeholder="e.g., official_results, final_score, market_close"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={customCriteria?.type || ''}
                onChange={(e) => customCriteria && handleCustomCriteriaChange({
                  ...customCriteria,
                  type: e.target.value
                })}
              />
            </div>

            {/* Minimum Sources */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Verification Sources *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={customCriteria?.verification_requirements.minimum_sources || 1}
                onChange={(e) => customCriteria && handleCustomCriteriaChange({
                  ...customCriteria,
                  verification_requirements: {
                    ...customCriteria.verification_requirements,
                    minimum_sources: parseInt(e.target.value)
                  }
                })}
              >
                <option value={1}>1 source</option>
                <option value={2}>2 sources</option>
                <option value={3}>3 sources</option>
              </select>
            </div>

            {/* Acceptable Sources */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acceptable Verification Sources
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {verificationSources.map((source) => (
                  <label key={source.id} className="flex items-center gap-2 p-2 hover:bg-white rounded">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={customCriteria?.data_source_priority?.includes(source.name) || false}
                      onChange={(e) => {
                        if (!customCriteria) return;
                        const currentSources = customCriteria.data_source_priority || [];
                        const newSources = e.target.checked
                          ? [...currentSources, source.name]
                          : currentSources.filter(s => s !== source.name);
                        
                        handleCustomCriteriaChange({
                          ...customCriteria,
                          data_source_priority: newSources
                        });
                      }}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                    <span className="text-xs text-gray-500">({source.reliability_score}/10)</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Settlement Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Settlement Confirmation Delay
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={customCriteria?.verification_requirements.confirmation_delay || 'immediate'}
                onChange={(e) => customCriteria && handleCustomCriteriaChange({
                  ...customCriteria,
                  verification_requirements: {
                    ...customCriteria.verification_requirements,
                    confirmation_delay: e.target.value
                  }
                })}
              >
                <option value="immediate">Immediate</option>
                <option value="30_minutes">30 minutes</option>
                <option value="1_hour">1 hour</option>
                <option value="6_hours">6 hours</option>
                <option value="24_hours">24 hours</option>
                <option value="official_certification">Wait for official certification</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Preview */}
      {(customCriteria || selectedTemplate) && (
        <>
          {customCriteria && renderCriteriaPreview(customCriteria)}
          
          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm">
                <h4 className="font-semibold text-yellow-900 mb-1">Important</h4>
                <p className="text-yellow-800">
                  Settlement criteria cannot be changed after your prediction is published. 
                  Make sure these criteria clearly define how the outcome will be determined.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Helper Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="text-gray-600 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-gray-600">
            <h4 className="font-semibold mb-2">How Settlement Criteria Work</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Clear criteria prevent disputes and confusion</li>
              <li>Multiple verification sources increase reliability</li>
              <li>Auto-settlement enables instant payouts when possible</li>
              <li>Confirmation delays allow for verification of results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettlementCriteriaSetup;
