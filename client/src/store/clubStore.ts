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
    
    try {
      const queryParams = new URLSearchParams();
      if (params.category) queryParams.append('category', params.category);
      if (params.search) queryParams.append('search', params.search);
      if (params.page) queryParams.append('page', params.page.toString());
      queryParams.append('limit', '20');

      const token = localStorage.getItem('token');
      console.log('Fetching clubs with token:', token ? 'Present' : 'Missing');

      const response = await fetch(`/api/v2/clubs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Clubs fetch response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Clubs API response:', result);
        
        // Handle different response formats
        let clubs = [];
        if (result.data && Array.isArray(result.data)) {
          clubs = result.data;
        } else if (result.data && result.data.items && Array.isArray(result.data.items)) {
          clubs = result.data.items;
        } else if (Array.isArray(result)) {
          clubs = result;
        } else {
          console.warn('Unexpected clubs response format:', result);
          clubs = [];
        }
        
        set({ 
          clubs: params.page === 1 ? clubs : [...get().clubs, ...clubs],
          hasMoreClubs: clubs.length === 20,
          loading: false 
        });
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch clubs' }));
        throw new Error(errorData.message || 'Failed to fetch clubs');
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false 
      });
    }
  },

  // Fetch specific club
  fetchClubById: async (clubId: string) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching club by ID:', clubId, 'with token:', token ? 'Present' : 'Missing');

      const response = await fetch(`/api/v2/clubs/${clubId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Club by ID fetch response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        const club = result.data;
        
        set({ currentClub: club, loading: false });
        return club;
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch club' }));
        throw new Error(errorData.message || 'Failed to fetch club');
      }
    } catch (error) {
      console.error('Error fetching club by ID:', error);
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
      const token = localStorage.getItem('token');
      console.log('Joining club:', clubId, 'with token:', token ? 'Present' : 'Missing');
      
      const requestUrl = `/api/v2/clubs/${clubId}/join`;
      console.log('Join club request URL:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      console.log('Join club response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Join club success:', result);
        
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
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to join club' }));
        console.error('Join club error response:', errorData);
        throw new Error(errorData.message || 'Failed to join club');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join club';
      set({ 
        error: errorMessage,
        loading: false 
      });
      throw new Error(errorMessage); // Re-throw to allow component to handle
    }
  },

  // Leave club
  leaveClub: async (clubId: string) => {
    set({ loading: true, error: null });
    
    try {
      const token = localStorage.getItem('token');
      console.log('Leaving club:', clubId, 'with token:', token ? 'Present' : 'Missing');

      const response = await fetch(`/api/v2/clubs/${clubId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Leave club response:', response.status, response.statusText);

      if (response.ok) {
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
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to leave club' }));
        throw new Error(errorData.message || 'Failed to leave club');
      }
    } catch (error) {
      console.error('Error leaving club:', error);
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