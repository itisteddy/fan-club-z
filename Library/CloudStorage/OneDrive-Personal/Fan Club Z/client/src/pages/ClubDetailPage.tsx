import React, { useState, useEffect } from 'react'
import { useParams, useLocation } from 'wouter'
import { 
  ArrowLeft, 
  Users, 
  TrendingUp, 
  MessageCircle, 
  Settings, 
  Plus,
  Minus,
  Crown,
  Lock,
  Globe,
  Calendar,
  Trophy,
  BarChart3
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback } from '../components/ui/avatar'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../hooks/use-toast'
import { formatRelativeTime } from '../lib/utils'
import BottomNavigation from '../components/BottomNavigation'
import ClubBetModal from '../components/clubs/ClubBetModal'
import ClubChat from '../components/clubs/ClubChat'
import type { Club, User } from '@shared/schema'

// Enhanced tab system with better styling and accessibility
const TabButton = ({ isActive, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 relative border-b-2 min-h-[48px] touch-manipulation ${
      isActive 
        ? 'text-blue-600 bg-blue-50 border-blue-500' 
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100 border-transparent'
    }`}
  >
    <span className="flex items-center justify-center">{children}</span>
  </button>
)

interface ClubMember {
  id: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  user: {
    id: string
    username: string
    firstName: string
    lastName: string
    email: string
    phone: string
    bio: string
    profileImage: string | null
    walletAddress: string
    kycLevel: 'pending' | 'verified' | 'rejected'
    walletBalance: number
    createdAt: string
    updatedAt: string
  }
  stats: {
    totalBets: number
    winRate: number
  }
  joinedAt: string
}

const ClubDetailPage: React.FC<{ clubId?: string }> = ({ clubId: propClubId }) => {
  const { clubId: paramClubId } = useParams<{ clubId: string }>()
  const clubId = propClubId || paramClubId
  const [, setLocation] = useLocation()
  const { user } = useAuthStore()
  const { success } = useToast()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [showBetModal, setShowBetModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [club, setClub] = useState<Club | null>(null)
  const [members, setMembers] = useState<ClubMember[]>([])
  const [isMember, setIsMember] = useState(false)
  const [isJoinLeaveLoading, setIsJoinLeaveLoading] = useState(false)
  
  // Parse URL parameters for initial tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const action = urlParams.get('action')
    
    if (tab && ['overview', 'bets', 'chat', 'members'].includes(tab)) {
      setActiveTab(tab)
    }
    
    if (action === 'create' && tab === 'bets') {
      setShowBetModal(true)
    }
  }, [])
  
  useEffect(() => {
    // Simple data loading with mock data
    setTimeout(() => {
      setClub({
        id: clubId!,
        name: 'Premier League Predictors',
        description: 'The ultimate destination for Premier League betting and predictions',
        category: 'sports',
        creatorId: 'demo-user-id',
        memberCount: 1247,
        activeBets: 8,
        isPrivate: false,
        createdAt: new Date('2025-06-15T10:00:00Z').toISOString(),
        updatedAt: new Date('2025-07-04T15:45:00Z').toISOString()
      })
      
      setMembers([
        {
          id: 'member-1',
          userId: 'demo-user-id',
          role: 'owner',
          user: {
            id: 'demo-user-id',
            username: 'demo_user',
            firstName: 'Demo',
            lastName: 'User',
            email: 'demo@fanclubz.app',
            phone: '+1 (555) 123-4567',
            bio: 'Demo account',
            profileImage: null,
            walletAddress: '0xDemo',
            kycLevel: 'verified',
            walletBalance: 2500,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          stats: { totalBets: 15, winRate: 68.5 },
          joinedAt: new Date('2025-06-15T10:00:00Z').toISOString()
        },
        {
          id: 'member-2',
          userId: 'user-1',
          role: 'admin',
          user: {
            id: 'user-1',
            username: 'alexj',
            firstName: 'Alex',
            lastName: 'Johnson',
            email: 'alex@example.com',
            phone: '+1 (555) 987-6543',
            bio: 'Sports enthusiast',
            profileImage: null,
            walletAddress: '0xAlex',
            kycLevel: 'verified',
            walletBalance: 1200,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          stats: { totalBets: 23, winRate: 71.2 },
          joinedAt: new Date('2025-06-16T14:30:00Z').toISOString()
        }
      ])
      
      setIsMember(!!user)
      setLoading(false)
    }, 500)
  }, [clubId, user])
  
  // Club membership management functions
  const handleJoinLeaveClub = async () => {
    if (!user) {
      // Better UX for unauthenticated users
      success('Please sign in to join clubs');
      
      // Redirect to login page with return URL
      setTimeout(() => {
        setLocation('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      }, 2000);
      return;
    }

    // Show confirmation for leaving
    if (isMember) {
      const clubName = club?.name || 'this club'
      if (!window.confirm(`Are you sure you want to leave ${clubName}? You will no longer have access to club-exclusive content.`)) {
        return;
      }
    }

    setIsJoinLeaveLoading(true);
    
    try {
      if (isMember) {
        // Leave club - call real API
        const response = await fetch(`/api/clubs/${club!.id}/leave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData.success) {
          setIsMember(false);
          // Update member count
          setClub(prev => prev ? { ...prev, memberCount: prev.memberCount - 1 } : null);
          // Remove user from members list
          setMembers(prev => prev.filter(member => member.userId !== user.id));
          success(`Successfully left ${club?.name}!`);
          
          // Navigate back to clubs page after leaving
          setTimeout(() => {
            setLocation('/clubs');
          }, 1500);
        } else {
          throw new Error(responseData.error || 'Failed to leave club');
        }
      } else {
        // Join club - call real API
        const response = await fetch(`/api/clubs/${club!.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });
        
        const responseData = await response.json();
        
        if (response.ok && responseData.success) {
          setIsMember(true);
          // Update member count
          setClub(prev => prev ? { ...prev, memberCount: prev.memberCount + 1 } : null);
          // Add user to members list
          const newMember: ClubMember = {
            id: `member-${Date.now()}`,
            userId: user.id,
            role: 'member',
            user: user,
            stats: { totalBets: 0, winRate: 0 },
            joinedAt: new Date().toISOString()
          };
          setMembers(prev => [...prev, newMember]);
          success(`Welcome to ${club?.name}!`);
        } else {
          throw new Error(responseData.error || 'Failed to join club');
        }
      }
    } catch (err: any) {
      success(err.message || `Failed to ${isMember ? 'leave' : 'join'} club`);
    } finally {
      setIsJoinLeaveLoading(false);
    }
  };


  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading club...</p>
        </div>
      </div>
    )
  }
  
  if (!club) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Club not found</h2>
          <Button onClick={() => setLocation('/clubs')}>Back to Clubs</Button>
        </div>
      </div>
    )
  }
  
  const handleBetCreated = (bet: any) => {
    console.log('Bet created:', bet)
    success('Bet created successfully!')
    // Refresh club data if needed
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center px-4 pt-12 pb-4">
          <button
            onClick={() => setLocation('/clubs')}
            className="mr-3 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{club.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-lg">⚽</span>
              <Badge variant={club.isPrivate ? "secondary" : "default"}>
                {club.isPrivate ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Private
                  </>
                ) : (
                  <>
                    <Globe className="w-3 h-3 mr-1" />
                    Public
                  </>
                )}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {club.memberCount} members
              </Badge>
            </div>
          </div>
          <Button 
            variant={isMember ? "outline" : "default"}
            size="sm" 
            onClick={handleJoinLeaveClub}
            disabled={isJoinLeaveLoading}
            className={`transition-all duration-200 min-w-[80px] ${
              isMember 
                ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isJoinLeaveLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isMember ? (
                  <>
                    <Minus className="w-4 h-4 mr-1" />
                    Leave
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Join
                  </>
                )}
              </>
            )}
          </Button>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex">
          <TabButton isActive={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            Overview
          </TabButton>
          <TabButton isActive={activeTab === 'bets'} onClick={() => setActiveTab('bets')}>
            Bets
          </TabButton>
          <TabButton isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')}>
            Chat
          </TabButton>
          <TabButton isActive={activeTab === 'members'} onClick={() => {
            setActiveTab('members')
          }}>
            Members
          </TabButton>
        </div>
      </div>
      
      {/* Content */}
      <div className={`p-4 ${activeTab === 'chat' ? 'pb-4' : 'pb-24'}`}>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-600 mb-4">{club.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>Created {formatRelativeTime(club.createdAt)}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>{club.memberCount} members</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{club.activeBets}</div>
                  <div className="text-sm text-gray-500">Active Bets</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">69%</div>
                  <div className="text-sm text-gray-500">Avg Win Rate</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === 'bets' && (
          <div className="space-y-6">
            {isMember && (
              <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold mb-1">Create a Club Bet</h3>
                      <p className="text-sm text-blue-100">Start a prediction for club members</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setShowBetModal(true)}
                      className="bg-white text-blue-600 hover:bg-blue-50 border-white hover:border-blue-100 transition-all duration-200 shadow-sm font-semibold min-h-[36px]"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create Bet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No bets yet</h3>
                <p className="text-gray-500 mb-4">
                  {isMember ? 'Be the first to create a club bet!' : 'Join the club to see bets'}
                </p>
                {isMember && (
                  <Button 
                    onClick={() => setShowBetModal(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 min-h-[44px] font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Bet
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        
        {activeTab === 'chat' && (
          <div>
            {!user ? (
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Sign in to chat</h3>
                <p className="text-gray-500">Join the conversation with club members</p>
              </div>
            ) : !isMember ? (
              <div className="text-center py-8">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">Join the club to chat</h3>
                <p className="text-gray-500 mb-4">Connect with members and discuss bets</p>
                <Button onClick={() => success('Joined club!')}>Join Club</Button>
              </div>
            ) : (
              <ClubChat 
                clubId={club.id}
                clubName={club.name}
                members={members}
                isFullScreen={false}
              />
            )}
          </div>
        )}
        
        {activeTab === 'members' && (
          <div className="space-y-4">
            {members.map(member => (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>{member.user.firstName[0]}{member.user.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{member.user.username}</h4>
                        {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
                        {member.role === 'admin' && <Settings className="w-4 h-4 text-blue-500" />}
                      </div>
                      <p className="text-sm text-gray-500">
                        {member.stats.totalBets} bets • {member.stats.winRate.toFixed(0)}% win rate
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined {formatRelativeTime(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Use the consistent ClubBetModal */}
      {club && (
        <ClubBetModal 
          club={club}
          isOpen={showBetModal} 
          onClose={() => setShowBetModal(false)} 
          onBetCreated={handleBetCreated}
        />
      )}
      
      {activeTab !== 'chat' && <BottomNavigation />}
    </div>
  )
}

export default ClubDetailPage