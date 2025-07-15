import React, { useState } from 'react'
import { 
  Search, 
  Crown, 
  Settings, 
  MessageCircle, 
  UserPlus,
  MoreVertical,
  Ban,
  Shield
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ScrollArea } from '../ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu'
import { cn } from '../../lib/utils'

interface Member {
  id: string
  userId: string
  clubId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  user: {
    id: string
    username: string
    firstName: string
    lastName: string
    profileImage?: string
  }
}

interface MembersListProps {
  members: Member[]
  onlineMembers: string[]
  currentUserId?: string
  onMemberClick?: (member: Member) => void
  onPromoteMember?: (memberId: string, newRole: 'admin' | 'member') => void
  onRemoveMember?: (memberId: string) => void
  onBanMember?: (memberId: string) => void
  showActions?: boolean
}

const MembersList: React.FC<MembersListProps> = ({
  members,
  onlineMembers,
  currentUserId,
  onMemberClick,
  onPromoteMember,
  onRemoveMember,
  onBanMember,
  showActions = true
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter members based on search
  const filteredMembers = members.filter(member =>
    member.user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort members: online first, then by role, then alphabetically
  const sortedMembers = filteredMembers.sort((a, b) => {
    // Online status
    const aOnline = onlineMembers.includes(a.userId)
    const bOnline = onlineMembers.includes(b.userId)
    if (aOnline !== bOnline) {
      return bOnline ? 1 : -1
    }

    // Role hierarchy
    const roleOrder = { owner: 0, admin: 1, member: 2 }
    const roleComparison = roleOrder[a.role] - roleOrder[b.role]
    if (roleComparison !== 0) {
      return roleComparison
    }

    // Alphabetical by first name
    return a.user.firstName.localeCompare(b.user.firstName)
  })

  const currentMember = members.find(m => m.userId === currentUserId)
  const canModerate = currentMember?.role === 'owner' || currentMember?.role === 'admin'

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />
      case 'admin':
        return <Settings className="w-3 h-3 text-blue-500" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'admin':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const handleMemberAction = (action: string, memberId: string, currentRole: string) => {
    switch (action) {
      case 'promote':
        onPromoteMember?.(memberId, 'admin')
        break
      case 'demote':
        onPromoteMember?.(memberId, 'member')
        break
      case 'remove':
        onRemoveMember?.(memberId)
        break
      case 'ban':
        onBanMember?.(memberId)
        break
    }
  }

  const canPerformAction = (targetMember: Member, action: string) => {
    if (!canModerate || targetMember.userId === currentUserId) return false
    
    const currentRole = currentMember?.role
    const targetRole = targetMember.role

    // Owners can do anything to non-owners
    if (currentRole === 'owner' && targetRole !== 'owner') return true
    
    // Admins can only moderate regular members
    if (currentRole === 'admin' && targetRole === 'member') {
      return action === 'remove' || action === 'ban'
    }

    return false
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Members ({members.length})
          </h3>
          {onlineMembers.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {onlineMembers.length} online
            </Badge>
          )}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {sortedMembers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No members found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedMembers.map((member) => {
                const isOnline = onlineMembers.includes(member.userId)
                const isCurrentUser = member.userId === currentUserId

                return (
                  <div
                    key={member.id}
                    className={cn(
                      "group flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                      "hover:bg-gray-50",
                      isCurrentUser && "bg-blue-50 border border-blue-200"
                    )}
                    onClick={() => onMemberClick?.(member)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {/* Avatar with online indicator */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.user.profileImage} />
                          <AvatarFallback className="text-xs">
                            {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Member info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {member.user.firstName} {member.user.lastName}
                            {isCurrentUser && (
                              <span className="text-xs text-gray-500 ml-1">(You)</span>
                            )}
                          </p>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-xs text-gray-500 truncate">
                            @{member.user.username}
                          </p>
                          {member.role !== 'member' && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-1 py-0", getRoleColor(member.role))}
                            >
                              {member.role}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {showActions && !isCurrentUser && canModerate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Direct Message
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          {/* Role management */}
                          {canPerformAction(member, 'promote') && member.role === 'member' && (
                            <DropdownMenuItem
                              onClick={() => handleMemberAction('promote', member.id, member.role)}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Promote to Admin
                            </DropdownMenuItem>
                          )}
                          
                          {canPerformAction(member, 'demote') && member.role === 'admin' && (
                            <DropdownMenuItem
                              onClick={() => handleMemberAction('demote', member.id, member.role)}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              Remove Admin
                            </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuSeparator />
                          
                          {/* Moderation actions */}
                          {canPerformAction(member, 'remove') && (
                            <DropdownMenuItem
                              onClick={() => handleMemberAction('remove', member.id, member.role)}
                              className="text-orange-600"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Remove from Club
                            </DropdownMenuItem>
                          )}
                          
                          {canPerformAction(member, 'ban') && (
                            <DropdownMenuItem
                              onClick={() => handleMemberAction('ban', member.id, member.role)}
                              className="text-red-600"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Ban Member
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default MembersList