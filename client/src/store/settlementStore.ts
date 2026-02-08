import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { CategorySlug } from '@/constants/categories';

export interface ApprovedSource {
  id: string;
  name: string;
  url: string;
  category: CategorySlug | string;
  trust_level: 'high' | 'medium' | 'pending';
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SettlementConfig {
  id: string;
  prediction_id: string;
  method: 'api' | 'web' | 'oracle' | 'manual';
  primary_source_id?: string;
  backup_source_id?: string;
  rule_text: string;
  timezone: string;
  contingencies: {
    postponed?: 'auto_void' | 'extend_lock' | 'keep_open';
    source_down?: 'use_backup' | 'pause_and_escalate';
  };
  risk_flags: string[];
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface Settlement {
  id: string;
  prediction_id: string;
  state: 'open' | 'locked' | 'settling' | 'settled' | 'voided' | 'disputed' | 'resolved';
  outcome?: 'YES' | 'NO';
  settled_at?: string;
  proof: {
    fetched_at?: string;
    source_url?: string;
    screenshot_url?: string;
    content_hash?: string;
    parser_note?: string;
  };
  audit_log: Array<{
    ts: string;
    actor: string;
    event: string;
    data?: any;
  }>;
  acceptance_window_hours: number;
  acceptance_stats: {
    accepted?: number;
    auto_accepted?: number;
    disputed?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface PlayerAcceptance {
  id: string;
  prediction_id: string;
  user_id: string;
  action: 'accepted' | 'auto_accepted' | 'disputed';
  timestamp: string;
}

export interface Dispute {
  id: string;
  prediction_id: string;
  opened_by: string;
  opened_at: string;
  reason: 'source_updated' | 'wrong_source' | 'timing' | 'other';
  evidence: Array<{
    type: 'link' | 'image';
    value: string;
  }>;
  state: 'open' | 'under_review' | 'upheld' | 'overturned';
  resolution_note?: string;
  resolved_by?: string;
  resolved_at?: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  prediction_id: string;
  timestamp: string;
  actor_type: 'system' | 'user' | 'admin' | 'oracle';
  actor_id?: string;
  event: string;
  data?: any;
  ip_address?: string;
  user_agent?: string;
}

interface SettlementState {
  // Data
  approvedSources: ApprovedSource[];
  settlementConfigs: Record<string, SettlementConfig>;
  settlements: Record<string, Settlement>;
  playerAcceptances: Record<string, PlayerAcceptance[]>;
  disputes: Record<string, Dispute[]>;
  auditTimeline: Record<string, AuditEvent[]>;
  
  // UI State
  loading: boolean;
  error: string | null;
  selectedSource: ApprovedSource | null;
  settlementModalOpen: boolean;
  disputeModalOpen: boolean;
  
  // Actions
  fetchApprovedSources: (category?: string) => Promise<void>;
  createSettlementConfig: (predictionId: string, config: Partial<SettlementConfig>) => Promise<void>;
  fetchSettlement: (predictionId: string) => Promise<void>;
  updateSettlementState: (predictionId: string, state: Settlement['state'], outcome?: string, proof?: any) => Promise<void>;
  acceptOutcome: (predictionId: string) => Promise<void>;
  createDispute: (predictionId: string, reason: Dispute['reason'], evidence?: any[]) => Promise<void>;
  fetchPlayerAcceptances: (predictionId: string) => Promise<void>;
  fetchDisputes: (predictionId: string) => Promise<void>;
  fetchAuditTimeline: (predictionId: string) => Promise<void>;
  setSelectedSource: (source: ApprovedSource | null) => void;
  setSettlementModalOpen: (open: boolean) => void;
  setDisputeModalOpen: (open: boolean) => void;
  clearError: () => void;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  // Initial state
  approvedSources: [],
  settlementConfigs: {},
  settlements: {},
  playerAcceptances: {},
  disputes: {},
  auditTimeline: {},
  loading: false,
  error: null,
  selectedSource: null,
  settlementModalOpen: false,
  disputeModalOpen: false,

  // Fetch approved sources
  fetchApprovedSources: async (category?: string) => {
    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('approved_sources')
        .select('*')
        .eq('status', 'approved')
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ approvedSources: data || [] });
    } catch (error) {
      console.error('Error fetching approved sources:', error);
      set({ error: 'Failed to fetch approved sources' });
    } finally {
      set({ loading: false });
    }
  },

  // Create settlement configuration
  createSettlementConfig: async (predictionId: string, config: Partial<SettlementConfig>) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('settlement_configs')
        .insert({
          prediction_id: predictionId,
          method: config.method || 'manual',
          primary_source_id: config.primary_source_id,
          backup_source_id: config.backup_source_id,
          rule_text: config.rule_text || '',
          timezone: config.timezone || 'Africa/Lagos',
          contingencies: config.contingencies || {},
          risk_flags: config.risk_flags || [],
          badges: config.badges || []
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        settlementConfigs: {
          ...state.settlementConfigs,
          [predictionId]: data
        }
      }));
    } catch (error) {
      console.error('Error creating settlement config:', error);
      set({ error: 'Failed to create settlement configuration' });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settlement data
  fetchSettlement: async (predictionId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('prediction_id', predictionId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      if (data) {
        set(state => ({
          settlements: {
            ...state.settlements,
            [predictionId]: data
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching settlement:', error);
      set({ error: 'Failed to fetch settlement data' });
    } finally {
      set({ loading: false });
    }
  },

  // Update settlement state
  updateSettlementState: async (predictionId: string, state: Settlement['state'], outcome?: string, proof?: any) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('update_settlement_state', {
          prediction_uuid: predictionId,
          new_state: state,
          outcome_val: outcome,
          proof_data: proof || {}
        });

      if (error) throw error;

      // Refresh settlement data
      await get().fetchSettlement(predictionId);
    } catch (error) {
      console.error('Error updating settlement state:', error);
      set({ error: 'Failed to update settlement state' });
    } finally {
      set({ loading: false });
    }
  },

  // Accept outcome
  acceptOutcome: async (predictionId: string) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .rpc('record_player_acceptance', {
          prediction_uuid: predictionId,
          user_uuid: user.id,
          action_val: 'accepted'
        });

      if (error) throw error;

      // Refresh acceptance data
      await get().fetchPlayerAcceptances(predictionId);
    } catch (error) {
      console.error('Error accepting outcome:', error);
      set({ error: 'Failed to accept outcome' });
    } finally {
      set({ loading: false });
    }
  },

  // Create dispute
  createDispute: async (predictionId: string, reason: Dispute['reason'], evidence?: any[]) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .rpc('create_dispute', {
          prediction_uuid: predictionId,
          user_uuid: user.id,
          reason_val: reason,
          evidence_data: evidence || []
        });

      if (error) throw error;

      // Refresh disputes
      await get().fetchDisputes(predictionId);
    } catch (error) {
      console.error('Error creating dispute:', error);
      set({ error: 'Failed to create dispute' });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch player acceptances
  fetchPlayerAcceptances: async (predictionId: string) => {
    try {
      const { data, error } = await supabase
        .from('player_acceptances')
        .select('*')
        .eq('prediction_id', predictionId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      set(state => ({
        playerAcceptances: {
          ...state.playerAcceptances,
          [predictionId]: data || []
        }
      }));
    } catch (error) {
      console.error('Error fetching player acceptances:', error);
    }
  },

  // Fetch disputes
  fetchDisputes: async (predictionId: string) => {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('prediction_id', predictionId)
        .order('opened_at', { ascending: false });

      if (error) throw error;

      set(state => ({
        disputes: {
          ...state.disputes,
          [predictionId]: data || []
        }
      }));
    } catch (error) {
      console.error('Error fetching disputes:', error);
    }
  },

  // Fetch audit timeline
  fetchAuditTimeline: async (predictionId: string) => {
    try {
      const { data, error } = await supabase
        .from('audit_timeline')
        .select('*')
        .eq('prediction_id', predictionId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      set(state => ({
        auditTimeline: {
          ...state.auditTimeline,
          [predictionId]: data || []
        }
      }));
    } catch (error) {
      console.error('Error fetching audit timeline:', error);
    }
  },

  // UI Actions
  setSelectedSource: (source) => set({ selectedSource: source }),
  setSettlementModalOpen: (open) => set({ settlementModalOpen: open }),
  setDisputeModalOpen: (open) => set({ disputeModalOpen: open }),
  clearError: () => set({ error: null })
}));
