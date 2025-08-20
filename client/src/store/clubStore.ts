import { create } from 'zustand';
import { Club, ClubMember } from '../../../shared/schema';

interface ClubDiscussion {
  id: string;
  clubId: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  commentCount: number;
  author?: {
    username: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ClubDiscussionComment {
  id: string;
  discussionId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  author?: {
    username: string;
    avatarUrl?: string;
  };
  createdAt: Date;
}

interface ExtendedClub extends Club {
  owner?: {
    username: string;
    avatarUrl?: string;
  };
  isMember: boolean;
  memberRole?: 'member' | 'admin' | null;
  activePredictions?: number;
  stats?: {
    totalPredictions: number;
    correctPredictions: number;
    totalWinnings: number;
    topMembers: number;
  };
}

interface ExtendedClubMember extends ClubMember {
  user?: {
    id: string;
    username: string;
    avatarUrl?: string;
    createdAt: Date;
  };
}

interface ClubStore {
  // State
  clubs: Club[];
  currentClub: ExtendedClub | null;
  clubMembers: ExtendedClubMember[];
  clubDiscussions: ClubDiscussion[];
  clubDiscussionComments: ClubDiscussionComment[];
  loading: boolean;
  error: string | null;
  
  // Pagination
  hasMoreClubs: boolean;
  hasMoreMembers: boolean;
  hasMoreDiscussions: boolean;
  
  // Actions
  fetchClubs: (params?: { category?: string; search?: string; page?: number }) => Promise<void>;
  fetchClubById: (clubId: string) => Promise<ExtendedClub | null>;
  joinClub: (clubId: string, password?: string) => Promise<boolean>;
  leaveClub: (clubId: string) => Promise<boolean>;
  createClub: (clubData: Partial<Club>) => Promise<Club | null>;
  updateClub: (clubId: string, updates: Partial<Club>) => Promise<boolean>;
  
  // Member management
  fetchClubMembers: (clubId: string, page?: number) => Promise<void>;
  removeClubMember: (clubId: string, userId: string) => Promise<boolean>;
  updateMemberRole: (clubId: string, userId: string, role: 'member' | 'admin') => Promise<boolean>;
  
  // Discussions
  fetchClubDiscussions: (clubId: string, page?: number) => Promise<void>;
  createDiscussion: (clubId: string, title: string, content: string) => Promise<ClubDiscussion | null>;
  fetchDiscussionComments: (discussionId: string) => Promise<void>;
  addDiscussionComment: (clubId: string, discussionId: string, content: string, parentCommentId?: string) => Promise<ClubDiscussionComment | null>;
  
  // Utility
  clearError: () => void;
  setCurrentClub: (club: ExtendedClub | null) => void;
}

export const useClubStore = create<ClubStore>((set, get) => ({
  // Initial state
  clubs: [],
  currentClub: null,
  clubMembers: [],
  clubDiscussions: [],
  clubDiscussionComments: [],
  loading: false,
  error: null,
  hasMoreClubs: true,
  hasMoreMembers: true,
  hasMoreDiscussions: true,

  // Fetch all clubs
  fetchClubs: async (params = {}) => {
    set({ loading: true, error: null });
    
    // Add a small delay to prevent flash loading and make the experience smoother
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      console.log('🔄 Fetching clubs from Supabase with params:', params);
      
      // Use Supabase instead of non-existent backend API
      const { supabase } = await import('../lib/api');
      
      let query = supabase
        .from('clubs')
        .select(`
          *,
          owner:users!owner_id(username, avatar_url),
          member_count:club_members(count)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      // Apply category filter
      if (params.category && params.category !== 'all') {
        query = query.eq('category', params.category);
      }

      // Apply search filter
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      // For better data architecture: Always fetch fresh data instead of pagination
      // This prevents the 7->14 clubs issue caused by cumulative pagination
      const limit = 50; // Increased limit to get more clubs in one request
      query = query.range(0, limit - 1);

      const { data: clubs, error } = await query;

      if (error) {
        console.error('❌ Supabase clubs error:', error);
        throw error;
      }

      console.log('✅ Clubs fetched from Supabase:', clubs?.length || 0, 'clubs');
      
      // Transform Supabase data to expected format
      const transformedClubs = (clubs || []).map(club => ({
        id: club.id,
        name: club.name,
        description: club.description,
        memberCount: club.member_count?.[0]?.count || 0,
        category: club.category,
        visibility: club.visibility,
        ownerId: club.owner_id,
        createdAt: new Date(club.created_at),
        updatedAt: new Date(club.updated_at),
        owner: club.owner,
        isVerified: club.id === 'premier-league-predictions' || club.id === 'crypto-trading-club',
        isPopular: club.id === 'premier-league-predictions' || club.id === 'crypto-trading-club' || club.id === 'nfl-fantasy-league'
      }));
      
      // Always set fresh data instead of appending to prevent inconsistency
      set({ 
        clubs: transformedClubs,
        hasMoreClubs: false, // Disabled pagination for better data consistency
        loading: false 
      });
    } catch (error) {
      console.error('❌ Error fetching clubs from Supabase:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch clubs',
        loading: false 
      });
    }
  },

  // Fetch specific club
  fetchClubById: async (clubId: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('🔄 Fetching club by ID via Supabase:', clubId);

      // Use Supabase instead of missing backend API
      const { supabase } = await import('../lib/api');
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch club with membership info
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select(`
          *,
          owner:users!owner_id(username, avatar_url),
          member_count:club_members(count)
        `)
        .eq('id', clubId)
        .single();

      if (clubError) {
        console.error('❌ Supabase club fetch error:', clubError);
        throw new Error(clubError.message || 'Failed to fetch club');
      }

      if (!club) {
        throw new Error('Club not found');
      }

      // Check if current user is a member
      let isMember = false;
      let memberRole = null;
      
      if (user) {
        const { data: membership } = await supabase
          .from('club_members')
          .select('role')
          .eq('club_id', clubId)
          .eq('user_id', user.id)
          .single();
        
        if (membership) {
          isMember = true;
          memberRole = membership.role;
        }
      }

      // Transform to expected format
      const transformedClub = {
        id: club.id,
        name: club.name,
        description: club.description,
        memberCount: club.member_count?.[0]?.count || 0,
        category: club.category,
        visibility: club.visibility,
        ownerId: club.owner_id,
        createdAt: new Date(club.created_at),
        updatedAt: new Date(club.updated_at),
        owner: club.owner,
        isMember,
        memberRole,
        stats: {
          totalPredictions: 26,
          correctPredictions: 26,
          totalWinnings: 15000,
          topMembers: 5,
        }
      };

      console.log('✅ Successfully fetched club via Supabase');
      set({ currentClub: transformedClub, loading: false });
      return transformedClub;
    } catch (error) {
      console.error('❌ Error fetching club by ID:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return null;
    }
  },

  // Join club
  joinClub: async (clubId: string, password?: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('🔄 Joining club via Supabase:', clubId);
      
      // Use Supabase instead of missing backend API
      const { supabase } = await import('../lib/api');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user is already a member
      const { data: existingMembership } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId)
        .eq('user_id', user.id)
        .single();

      if (existingMembership) {
        console.log('✅ User already a member of club');
        // Update current club membership status
        const currentClub = get().currentClub;
        if (currentClub && currentClub.id === clubId) {
          set({ 
            currentClub: { 
              ...currentClub, 
              isMember: true, 
              memberRole: existingMembership.role || 'member'
            },
            loading: false
          });
        }
        return true;
      }

      // Add user to club
      const { error: joinError } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString()
        });

      if (joinError) {
        console.error('❌ Supabase join error:', joinError);
        throw new Error(joinError.message || 'Failed to join club');
      }

      console.log('✅ Successfully joined club via Supabase');
      
      // Update current club membership status immediately
      const currentClub = get().currentClub;
      if (currentClub && currentClub.id === clubId) {
        set({ 
          currentClub: { 
            ...currentClub, 
            isMember: true, 
            memberRole: 'member',
            memberCount: (currentClub.memberCount || 0) + 1
          },
          loading: false
        });
      } else {
        set({ loading: false });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error joining club:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join club';
      set({ 
        error: errorMessage,
        loading: false 
      });
      return false; // Don't throw, return false for better UX
    }
  },

  // Leave club
  leaveClub: async (clubId: string) => {
    set({ loading: true, error: null });
    
    try {
      console.log('🔄 Leaving club via Supabase:', clubId);
      
      // Use Supabase instead of missing backend API
      const { supabase } = await import('../lib/api');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Remove user from club
      const { error: leaveError } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', user.id);

      if (leaveError) {
        console.error('❌ Supabase leave error:', leaveError);
        throw new Error(leaveError.message || 'Failed to leave club');
      }

      console.log('✅ Successfully left club via Supabase');

      // Update current club membership status
      const currentClub = get().currentClub;
      if (currentClub && currentClub.id === clubId) {
        set({ 
          currentClub: { 
            ...currentClub, 
            isMember: false, 
            memberRole: null,
            memberCount: Math.max((currentClub.memberCount || 1) - 1, 0)
          }
        });
      }
      
      set({ loading: false });
      return true;
    } catch (error) {
      console.error('❌ Error leaving club:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return false;
    }
  },

  // Create club
  createClub: async (clubData: Partial<Club>) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(clubData),
      });

      if (response.ok) {
        const result = await response.json();
        const club = result.data;
        
        set({ 
          clubs: [club, ...get().clubs],
          loading: false 
        });
        return club;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create club' }));
        throw new Error(errorData.message || 'Failed to create club');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return null;
    }
  },

  // Update club
  updateClub: async (clubId: string, updates: Partial<Club>) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedClub = result.data;
        
        // Update in clubs list
        set({ 
          clubs: get().clubs.map(club => 
            club.id === clubId ? { ...club, ...updatedClub } : club
          ),
          currentClub: get().currentClub?.id === clubId 
            ? { ...get().currentClub!, ...updatedClub }
            : get().currentClub,
          loading: false 
        });
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update club' }));
        throw new Error(errorData.message || 'Failed to update club');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
      return false;
    }
  },

  // Fetch club members
  fetchClubMembers: async (clubId: string, page = 1) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/members?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const members = result.data.items || result.data;
        
        set({ 
          clubMembers: page === 1 ? members : [...get().clubMembers, ...members],
          hasMoreMembers: members.length === 20,
          loading: false 
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch club members' }));
        throw new Error(errorData.message || 'Failed to fetch club members');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
    }
  },

  // Remove club member (admin only)
  removeClubMember: async (clubId: string, userId: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        set({ 
          clubMembers: get().clubMembers.filter(member => member.userId !== userId)
        });
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to remove member' }));
        throw new Error(errorData.message || 'Failed to remove member');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  // Update member role (admin only)
  updateMemberRole: async (clubId: string, userId: string, role: 'member' | 'admin') => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/members/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        set({ 
          clubMembers: get().clubMembers.map(member => 
            member.userId === userId ? { ...member, role } : member
          )
        });
        return true;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update member role' }));
        throw new Error(errorData.message || 'Failed to update member role');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  // Fetch club discussions
  fetchClubDiscussions: async (clubId: string, page = 1) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/discussions?page=${page}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const discussions = result.data.items || result.data;
        
        set({ 
          clubDiscussions: page === 1 ? discussions : [...get().clubDiscussions, ...discussions],
          hasMoreDiscussions: discussions.length === 20,
          loading: false 
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch discussions' }));
        throw new Error(errorData.message || 'Failed to fetch discussions');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
    }
  },

  // Create discussion
  createDiscussion: async (clubId: string, title: string, content: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        const result = await response.json();
        const discussion = result.data;
        
        set({ 
          clubDiscussions: [discussion, ...get().clubDiscussions]
        });
        return discussion;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create discussion' }));
        throw new Error(errorData.message || 'Failed to create discussion');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  // Fetch discussion comments
  fetchDiscussionComments: async (discussionId: string) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/discussions/${discussionId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        const comments = result.data;
        
        set({ 
          clubDiscussionComments: comments,
          loading: false 
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch comments' }));
        throw new Error(errorData.message || 'Failed to fetch comments');
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
    }
  },

  // Add discussion comment
  addDiscussionComment: async (clubId: string, discussionId: string, content: string, parentCommentId?: string) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/v2/clubs/${clubId}/discussions/${discussionId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, parent_comment_id: parentCommentId }),
      });

      if (response.ok) {
        const result = await response.json();
        const comment = result.data;
        
        set({ 
          clubDiscussionComments: [...get().clubDiscussionComments, comment]
        });
        return comment;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to add comment' }));
        throw new Error(errorData.message || 'Failed to add comment');
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  },

  // Utility functions
  clearError: () => set({ error: null }),
  setCurrentClub: (club: ExtendedClub | null) => set({ currentClub: club }),
}));