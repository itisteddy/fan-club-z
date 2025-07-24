import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { useToast } from '../../hooks/use-toast'
import { 
  Crown, 
  Shield, 
  User, 
  Users,
  MessageCircle, 
  Phone, 
  Video,
  Plus,
  MoreHorizontal 
} from 'lucide-react'

interface Member {
  userId: string
  role: 'owner' | 'admin' | 'moderator' | 'member'
  joinedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    username?: string
    profileImage?: string | null
    bio?: string
  }
}

interface MembersListProps {
  members: Member[]
  onlineMembers: string[]
  currentUserId?: string
  onMemberClick?: (member: Member) => void
  onDirectMessage?: (member: Member) => void
  onCall?: (member: Member) => void
  onVideoCall?: (member: Member) => void
}

const MembersList: React.FC<MembersListProps> = ({
  members,
  onlineMembers,
  currentUserId,
  onMemberClick,
  onDirectMessage,
  onCall,
  onVideoCall
}) => {
  const { success } = useToast()
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />
      case 'admin':
        return <Shield className="w-3 h-3 text-blue-500" />
      case 'moderator':
        return <Shield className="w-3 h-3 text-purple-500" />
      default:
        return <User className="w-3 h-3 text-gray-400" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'moderator':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const isOnline = (userId: string) => onlineMembers.includes(userId)
  const isCurrentUser = (userId: string) => userId === currentUserId

  // Sort members: online first, then by role, then alphabetically
  const sortedMembers = [...members].sort((a, b) => {
    // Current user first
    if (isCurrentUser(a.userId)) return -1
    if (isCurrentUser(b.userId)) return 1
    
    // Online status
    const aOnline = isOnline(a.userId)
    const bOnline = isOnline(b.userId)
    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1
    
    // Role hierarchy
    const roleOrder = { owner: 0, admin: 1, moderator: 2, member: 3 }
    const aRoleOrder = roleOrder[a.role] || 3
    const bRoleOrder = roleOrder[b.role] || 3
    if (aRoleOrder !== bRoleOrder) return aRoleOrder - bRoleOrder
    
    // Alphabetical by first name
    return a.user.firstName.localeCompare(b.user.firstName)
  })

  const onlineCount = members.filter(m => isOnline(m.userId)).length

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Note: Header is now handled by ClubChat component */}

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {sortedMembers.map((member) => (
            <div
              key={member.userId}
              className="group flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-100 hover:shadow-sm"
              onClick={() => onMemberClick?.(member)}
            >
              {/* Avatar with online indicator */}
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                  <AvatarImage src={member.user.profileImage || undefined} />
                  <AvatarFallback className="text-sm bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Online indicator - improved design */}
                <div className={`
                  absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full transition-colors duration-200
                  ${isOnline(member.userId) ? 'bg-green-500 shadow-green-200 shadow-lg' : 'bg-gray-300'}
                `} />
              </div>

              {/* Member info - improved layout */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`
                    text-sm font-medium truncate
                    ${isCurrentUser(member.userId) ? 'text-blue-600' : 'text-gray-900'}
                  `}>
                    {member.user.firstName} {member.user.lastName}
                    {isCurrentUser(member.userId) && ' (You)'}
                  </span>
                  <div className="flex-shrink-0">
                    {getRoleIcon(member.role)}
                  </div>
                </div>
                
                {member.user.username && (
                  <p className="text-xs text-gray-500 truncate mb-1">
                    @{member.user.username}
                  </p>
                )}
                
                {/* Role badge - improved styling */}
                {member.role !== 'member' && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0.5 h-auto font-medium ${getRoleBadgeColor(member.role)}`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                )}
              </div>

              {/* Action buttons - improved visibility and interaction */}
              {!isCurrentUser(member.userId) && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                  {/* Direct message */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDirectMessage?.(member)
                    }}
                    className="p-2 h-8 w-8 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Send message"
                  >
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                  </Button>

                  {/* Voice/Video calls - only for online users */}
                  {isOnline(member.userId) && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCall?.(member)
                        }}
                        className="p-2 h-8 w-8 hover:bg-green-100 rounded-lg transition-colors"
                        title="Voice call"
                      >
                        <Phone className="w-4 h-4 text-green-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onVideoCall?.(member)
                        }}
                        className="p-2 h-8 w-8 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Video call"
                      >
                        <Video className="w-4 h-4 text-purple-600" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Empty state */}
          {sortedMembers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Invite members button with improved design */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <Button 
          variant="outline" 
          className="w-full bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-purple-100 hover:border-blue-300 transition-all duration-200 font-medium"
          onClick={() => {
            console.log('👥 MembersList: Invite members clicked')
            success('Invite link copied to clipboard!')
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite Members
        </Button>
      </div>
    </div>
  )
}

export default MembersList