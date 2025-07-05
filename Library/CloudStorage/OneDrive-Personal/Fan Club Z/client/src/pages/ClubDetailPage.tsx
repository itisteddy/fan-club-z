import React, { useState } from 'react'
import { useLocation } from 'wouter'
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Plus,
  Settings,
  Crown,
  UserPlus,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import BetCard from '@/components/BetCard'
import { useAuthStore } from '@/store/authStore'
import { formatRelativeTime, cn } from '@/lib/utils'

interface ClubDetailPageProps {
  clubId: string
}

// Mock club data
const mockClub = {
  id: '1',
  name: 'Premier League Predictors',
  description: 'The ultimate destination for Premier League betting and predictions. Join thousands of football fans making predictions on matches, transfers, and season outcomes.',
  category: 'sports',
  creatorId: 'user1',
  creator: {
    id: 'user1',
    firstName: 'Alex',
    lastName: 'Johnson',
    username: 'alexj',
  },
  memberCount: 1247,
  imageUrl: '⚽',
  coverImage: '',
  isPrivate: false,
  rules: 'Be respectful, no spam, only Premier League related bets.',
  createdAt: '2025-06-15T10:00:00Z',
  updatedAt: '2025-07-04T15:45:00Z'
}

const mockDiscussions = [
  {
    id: '1',
    title: 'Who will win the Premier League this season?',
    content: 'With the season heating up, what are your predictions? City looking strong but Arsenal are close behind...',
    authorId: 'user2',
    author: {
      id: 'user2',
      firstName: 'Sarah',
      lastName: 'Chen',
      username: 'sarahc',
    },
    commentCount: 23,
    isPinned: true,
    isAnnouncement: false,
    createdAt: '2025-07-04T09:30:00Z',
  },
  {
    id: '2',
    title: 'January Transfer Window Predictions',
    content: 'Transfer window is open! What moves do you think we\'ll see?',
    authorId: 'user3',
    author: {
      id: 'user3',
      firstName: 'Mike',
      lastName: 'Thompson',
      username: 'miket',
    },
    commentCount: 15,
    isPinned: false,
    isAnnouncement: false,
    createdAt: '2025-07-03T16:20:00Z',
  },
]

const mockClubBets = [
  {
    id: 'club-bet-1',
    creatorId: 'user1',
    title: 'Arsenal vs Chelsea - Match Result',
    description: 'Big London derby this weekend. Who comes out on top?',
    type: 'multi' as const,
    category: 'sports' as const,
    options: [
      { id: 'arsenal', label: 'Arsenal Win', totalStaked: 2500 },
      { id: 'draw', label: 'Draw', totalStaked: 1200 },
      { id: 'chelsea', label: 'Chelsea Win', totalStaked: 1800 }
    ],
    status: 'open' as const,
    stakeMin: 5,
    stakeMax: 200,
    poolTotal: 5500,
    entryDeadline: '2025-07-06T14:00:00Z',
    settlementMethod: 'auto' as const,
    isPrivate: false,
    clubId: '1',
    likes: 45,
    comments: 12,
    shares: 8,
    createdAt: '2025-07-04T08:00:00Z',
    updatedAt: '2025-07-04T15:00:00Z'
  }
]

export const ClubDetailPage: React.FC<ClubDetailPageProps> = ({ clubId }) => {
  const [, setLocation] = useLocation()
  const { user } = useAuthStore()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [isJoined, setIsJoined] = useState(false)

  const club = mockClub // In real app, fetch by clubId
  const discussions = mockDiscussions
  const clubBets = mockClubBets

  const handleBack = () => {
    setLocation('/clubs')
  }

  const handleJoin = () => {
    setIsJoined(!isJoined)
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="font-semibold text-gray-900 flex-1 text-center truncate mx-4">
            {club.name}
          </h1>
          
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="pb-20">
        {/* Cover Photo */}
        <div className="h-32 bg-gradient-to-r from-primary to-primary-600 relative">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <div className="px-4">
          {/* Club Header */}
          <div className="relative -mt-16 mb-6">
            <div className="flex items-end space-x-4">
              {/* Club Icon */}
              <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-lg flex items-center justify-center text-4xl">
                {club.imageUrl}
              </div>

              {/* Club Info */}
              <div className="flex-1 pb-2">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {club.name}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {club.memberCount.toLocaleString()} members
                  </span>
                  <span className="capitalize">{club.category}</span>
                  {!club.isPrivate ? (
                    <span className="text-green-600">Public</span>
                  ) : (
                    <span className="text-orange-600">Private</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm line-clamp-2">
                  {club.description}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 mt-4">
              {user && (
                <Button
                  onClick={handleJoin}
                  className={cn(
                    "flex-1",
                    isJoined ? "bg-gray-200 text-gray-700 hover:bg-gray-300" : ""
                  )}
                >
                  {isJoined ? (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Joined
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Club
                    </>
                  )}
                </Button>
              )}
              
              {isJoined && (
                <Button variant="outline" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">8</div>
                <div className="text-xs text-gray-600">Active Bets</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">{discussions.length}</div>
                <div className="text-xs text-gray-600">Discussions</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">Gold</div>
                <div className="text-xs text-gray-600">Club Tier</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="bets">Bets</TabsTrigger>
              <TabsTrigger value="discussions">Chat</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-6">
                {/* About */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{club.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-900">{formatRelativeTime(club.createdAt)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Creator</span>
                        <span className="text-gray-900">@{club.creator.username}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Category</span>
                        <span className="text-gray-900 capitalize">{club.category}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Club Rules */}
                {club.rules && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Club Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{club.rules}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">New bet created: Arsenal vs Chelsea</span>
                        <span className="text-gray-400">2h ago</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">Discussion started: Transfer predictions</span>
                        <span className="text-gray-400">5h ago</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-600">12 new members joined</span>
                        <span className="text-gray-400">1d ago</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="bets">
              <div className="space-y-4">
                {/* Create Bet CTA */}
                {isJoined && (
                  <Card className="bg-gradient-to-r from-primary to-primary-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold mb-1">Create a Club Bet</h3>
                          <p className="text-sm text-primary-100">
                            Start a prediction for club members
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" className="bg-white text-primary hover:bg-gray-100">
                          <Plus className="w-4 h-4 mr-1" />
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Club Bets */}
                <div className="space-y-4">
                  {clubBets.map((bet) => (
                    <BetCard key={bet.id} bet={bet} />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="discussions">
              <div className="space-y-4">
                {/* Create Discussion CTA */}
                {isJoined && (
                  <Card>
                    <CardContent className="p-4">
                      <Button className="w-full">
                        <Plus className="w-4 h-4 mr-2" />
                        Start Discussion
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Discussions */}
                <div className="space-y-3">
                  {discussions.map((discussion) => (
                    <Card key={discussion.id} className="hover:shadow-md transition-shadow duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-medium">
                              {discussion.author.firstName[0]}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              {discussion.isPinned && (
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              )}
                              <h3 className="font-semibold text-gray-900 truncate">
                                {discussion.title}
                              </h3>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {discussion.content}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <span>by @{discussion.author.username}</span>
                                <span>{formatRelativeTime(discussion.createdAt)}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <MessageSquare className="w-3 h-3" />
                                <span>{discussion.commentCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Member list coming soon</p>
                    <p className="text-sm">View and manage club members</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default ClubDetailPage
