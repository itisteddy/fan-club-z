import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, MessageCircle, Calendar, Trophy, Crown, Plus, Settings, LogOut, Shield, X } from 'lucide-react';
import { useClubStore } from '../store/clubStore';
import { useAuthStore } from '../store/authStore';
import DiscussionDetailPage from './DiscussionDetailPage';
import CreateDiscussionPage from './CreateDiscussionPage';
import { scrollToTop } from '../utils/scroll';

interface ClubDetailPageProps {
  onBack?: () => void; // Add onBack prop for navigation
  hideHeader?: boolean; // Add prop to hide header when used within other components
}

export const ClubDetailPage: React.FC<ClubDetailPageProps> = ({ onBack, hideHeader = false }) => {
  const [currentView, setCurrentView] = useState<'main' | 'discussion' | 'create-discussion'>('main');
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'predictions' | 'discussions' | 'members'>('predictions');
  const [isJoining, setIsJoining] = useState(false);
  
  const { user } = useAuthStore();
  const {
    currentClub,
    clubMembers,
    loading,
    error,
    fetchClubById,
    joinClub,
    leaveClub,
    fetchClubMembers,
    removeClubMember,
    updateMemberRole,
    clearError
  } = useClubStore();

  // Scroll to top when component mounts (consistent with other pages)
  useEffect(() => {
    scrollToTop({ behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (currentView === 'members' && currentClub) {
      fetchClubMembers(currentClub.id);
    }
  }, [currentClub, currentView, fetchClubMembers]);

  const handleJoinClub = async () => {
    if (!currentClub?.id || isJoining) return;
    
    console.log('Attempting to join club via API:', currentClub.id);
    setIsJoining(true);
    
    try {
      const success = await joinClub(currentClub.id);
      console.log('Join club result:', success);
      if (success && currentClub) {
        // Refresh club data to get updated membership status
        await fetchClubById(currentClub.id);
      }
    } catch (error) {
      console.error('Failed to join club:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveClub = async () => {
    if (!currentClub?.id) return;
    
    const success = await leaveClub(currentClub.id);
    if (success && currentClub) {
      setShowLeaveConfirm(false);
      // Refresh club data
      await fetchClubById(currentClub.id);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentClub?.id) return;
    
    const success = await removeClubMember(currentClub.id, userId);
    if (success) {
      // Refresh members list
      await fetchClubMembers(currentClub.id);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: 'member' | 'admin') => {
    if (!currentClub?.id) return;
    
    const success = await updateMemberRole(currentClub.id, userId, role);
    if (success) {
      // Members list is updated in store automatically
    }
  };

  // Handle back navigation
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      // Fallback - try to go back in browser history
      window.history.back();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const handleBackFromDiscussion = () => {
    setCurrentView('main');
    setSelectedDiscussionId(null);
  };

  if (!currentClub) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Club Not Found</h2>
          <p className="text-muted-foreground mb-4">Please go back and try again.</p>
          <button 
            onClick={handleBackClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading && !currentClub) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Club</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => {
                clearError();
                if (currentClub?.id) fetchClubById(currentClub.id);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              Try Again
            </button>
            <button 
              onClick={handleBackClick}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-lg"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'discussion' && selectedDiscussionId) {
    return (
      <DiscussionDetailPage
        discussionId={selectedDiscussionId}
        onBack={handleBackFromDiscussion}
      />
    );
  }

  if (currentView === 'create-discussion' && currentClub) {
    return (
      <CreateDiscussionPage
        clubId={currentClub.id}
        clubName={currentClub.name}
        onNavigateBack={() => setCurrentView('main')}
      />
    );
  }

  // Mock data for demonstration - in real app this would come from the store
  const recentPredictions = [
    {
      id: '1',
      title: 'Will Arsenal beat Tottenham in the North London Derby?',
      creator: 'ArsenalFan2024',
      participants: 89,
      pool: 25400,
      timeLeft: '3d 12h'
    },
    {
      id: '2', 
      title: 'Will Saka score in the next match?',
      creator: 'GunnersPride',
      participants: 67,
      pool: 18900,
      timeLeft: '1d 8h'
    }
  ];

  const topMembers = [
    { name: 'ArsenalLegend', wins: 23, avatar: null },
    { name: 'GunnerForLife', wins: 19, avatar: null },
    { name: 'RedArmy', wins: 17, avatar: null }
  ];

  // Check if user can manage the club
  const canManageClub = currentClub.ownerId === user?.id || currentClub.memberRole === 'admin';
  const isOwner = currentClub.ownerId === user?.id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header - Always visible */}
      {!hideHeader && (
        <header className="flex-shrink-0 bg-white shadow-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBackClick}
              className="p-2 rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h1 className="text-body-md font-semibold text-foreground truncate">{currentClub.name}</h1>
            <div className="w-10" />
          </div>
        </header>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Cover Photo & Profile */}
        <div className="relative">
          <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Growth Indicator */}
            <div className="absolute top-4 right-4 bg-success/90 text-white px-3 py-1 rounded-full text-caption font-medium flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Hot 🔥
            </div>
          </div>
          
          {/* Club Avatar */}
          <div className="absolute -bottom-8 left-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full border-4 border-background flex items-center justify-center">
              <span className="text-white font-bold text-lg">{currentClub.name[0]}</span>
            </div>
          </div>
        </div>

        {/* Club Info */}
        <div className="px-4 pt-16 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-display-md font-bold text-foreground">{currentClub.name}</h1>
              <Crown className="w-5 h-5 text-warning fill-current" />
              {currentClub.visibility === 'private' && (
                <div className="px-2 py-1 bg-info/10 text-info rounded-md text-caption font-medium">
                  Private
                </div>
              )}
            </div>
            <p className="text-body-md text-muted-foreground leading-relaxed">
              {currentClub.description}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-display-sm font-bold text-foreground">{formatNumber(currentClub.memberCount || 0)}</div>
              <div className="text-caption text-muted-foreground">Members</div>
            </div>
            <div className="text-center">
              <div className="text-display-sm font-bold text-primary">{currentClub.activePredictions || 0}</div>
              <div className="text-caption text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-display-sm font-bold text-success">{currentClub.stats?.correctPredictions || 0}</div>
              <div className="text-caption text-muted-foreground">Wins</div>
            </div>
          </div>

          {/* Join/Leave Button */}
          <div className="pt-2">
            {currentClub.isMember ? (
              <div className="flex gap-3">
                {canManageClub ? (
                  <button 
                    onClick={() => {/* TODO: Navigate to club settings */}}
                    className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Manage Club
                  </button>
                ) : (
                  <button className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {currentClub.memberRole === 'admin' ? 'Admin' : 'Member'}
                    </div>
                  </button>
                )}
                
                {!isOwner && (
                  <button 
                    onClick={() => setShowLeaveConfirm(true)}
                    className="flex-1 bg-destructive/10 text-destructive py-3 rounded-xl font-semibold hover:bg-destructive/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Leave Club
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={handleJoinClub}
                disabled={isJoining}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isJoining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Joining...
                  </>
                ) : (
                  'Join Club'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex-1 pb-3 px-1 text-center font-medium transition-colors ${
                activeTab === 'predictions'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Predictions
            </button>
            <button
              onClick={() => setActiveTab('discussions')}
              className={`flex-1 pb-3 px-1 text-center font-medium transition-colors ${
                activeTab === 'discussions'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Discussions
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 pb-3 px-1 text-center font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Members
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 pt-6">
          {activeTab === 'predictions' && (
            <div className="space-y-4">
              {currentClub.isMember ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-body-lg font-semibold text-foreground">Recent Predictions</h2>
                    <button className="text-primary text-body-sm font-medium">View All</button>
                  </div>
                  
                  <div className="space-y-3">
                    {recentPredictions.map((prediction) => (
                      <div key={prediction.id} className="bg-card rounded-xl border border-border p-4">
                        <h3 className="text-body-sm font-medium text-foreground mb-2 line-clamp-2">
                          {prediction.title}
                        </h3>
                        <div className="flex items-center justify-between text-caption text-muted-foreground">
                          <span>by {prediction.creator}</span>
                          <span>{prediction.timeLeft} left</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span className="text-caption">{prediction.participants}</span>
                            </div>
                            <div className="text-caption font-semibold text-foreground">
                              {formatCurrency(prediction.pool)}
                            </div>
                          </div>
                          <button className="px-3 py-1 bg-primary/10 text-primary rounded-md text-caption font-medium hover:bg-primary/20 transition-colors">
                            Join
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-body-md font-medium text-foreground mb-2">Member Only Content</h3>
                  <p className="text-body-sm text-muted-foreground mb-4">
                    Join this club to view and participate in predictions
                  </p>
                  <button 
                    onClick={handleJoinClub}
                    disabled={isJoining}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isJoining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                        Joining...
                      </>
                    ) : (
                      'Join Club'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'discussions' && (
            <div className="space-y-4">
              {currentClub.isMember ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-body-lg font-semibold text-foreground">Club Chat</h2>
                    <button 
                      onClick={() => setSelectedDiscussionId('1')}
                      className="text-primary text-body-sm font-medium hover:text-primary/80 transition-colors"
                    >
                      View All
                    </button>
                  </div>
                  
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <MessageCircle className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="text-body-sm font-medium text-foreground">General Discussion</h3>
                        <p className="text-caption text-muted-foreground">Main club conversation thread</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-center py-6">
                        <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-body-sm text-muted-foreground mb-3">
                          Start chatting with your club members
                        </p>
                        <button 
                          onClick={() => setSelectedDiscussionId('1')}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Join Chat
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-body-md font-medium text-foreground mb-2">Member Only Content</h3>
                  <p className="text-body-sm text-muted-foreground mb-4">
                    Join this club to view and participate in discussions
                  </p>
                  <button 
                    onClick={handleJoinClub}
                    disabled={isJoining}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isJoining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                        Joining...
                      </>
                    ) : (
                      'Join Club'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-body-lg font-semibold text-foreground">Members ({currentClub.memberCount || 0})</h2>
                {canManageClub && (
                  <button className="text-primary text-body-sm font-medium">
                    Invite Members
                  </button>
                )}
              </div>
              
              {/* Owner */}
              {currentClub.owner && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">
                        {currentClub.owner.username?.[0] || 'O'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-foreground">
                          {currentClub.owner.username || 'Owner'}
                        </span>
                        <Crown className="w-4 h-4 text-warning" />
                      </div>
                      <span className="text-caption text-muted-foreground">Owner</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Members List */}
              <div className="space-y-3">
                {clubMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-body-md font-medium text-foreground mb-2">Loading members...</h3>
                    <p className="text-body-sm text-muted-foreground">
                      Fetching club member list
                    </p>
                  </div>
                ) : (
                  clubMembers.map((member) => (
                    <div key={member.userId} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {member.user?.username?.[0] || 'M'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-body-sm font-medium text-foreground">
                              {member.user?.username || 'Member'}
                            </span>
                            {member.role === 'admin' && (
                              <Shield className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <span className="text-caption text-muted-foreground capitalize">
                            {member.role}
                          </span>
                        </div>
                        
                        {canManageClub && member.userId !== user?.id && (
                          <div className="flex items-center gap-2">
                            {member.role === 'member' ? (
                              <button
                                onClick={() => handleUpdateMemberRole(member.userId, 'admin')}
                                className="px-3 py-1 bg-primary/10 text-primary rounded-md text-caption font-medium hover:bg-primary/20 transition-colors"
                              >
                                Make Admin
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateMemberRole(member.userId, 'member')}
                                className="px-3 py-1 bg-muted text-foreground rounded-md text-caption font-medium hover:bg-muted/80 transition-colors"
                              >
                                Remove Admin
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="px-3 py-1 bg-destructive/10 text-destructive rounded-md text-caption font-medium hover:bg-destructive/20 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Club Actions */}
        {currentClub.isMember && (
          <div className="px-4 pt-6 space-y-3">
            <button 
              onClick={() => {
                // Navigate to create prediction page
                if (onBack) {
                  onBack();
                  // Small delay to ensure navigation completes
                  setTimeout(() => {
                    window.location.href = '/create-prediction';
                  }, 100);
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span className="text-body-sm font-semibold">Create Prediction</span>
            </button>
            
            <button className="w-full flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-body-sm font-medium text-foreground">Upcoming Events</span>
            </button>
          </div>
        )}

        {/* Leave Club Confirmation Modal */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 w-full max-w-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LogOut className="w-6 h-6 text-destructive" />
                </div>
                
                <h3 className="text-body-lg font-semibold text-foreground mb-2">
                  Leave Club
                </h3>
                
                <p className="text-body-sm text-muted-foreground mb-6">
                  Are you sure you want to leave "{currentClub.name}"? You'll need to request to join again.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeaveClub}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Leaving...' : 'Leave'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};