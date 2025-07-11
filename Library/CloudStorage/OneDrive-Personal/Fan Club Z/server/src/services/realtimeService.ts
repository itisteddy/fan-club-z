import { WebSocket } from 'ws'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { databaseStorage } from './databaseStorage.js'
import { notificationService } from './notificationService.js'

interface RealtimeConnection {
  userId: string
  ws: WebSocket
  subscriptions: Set<string>
  lastPing: number
}

interface BetUpdate {
  betId: string
  type: 'odds_change' | 'new_entry' | 'pool_update' | 'status_change' | 'result'
  data: any
  timestamp: number
}

interface ChatMessage {
  id: string
  clubId: string
  userId: string
  message: string
  timestamp: number
}

interface ActivityEvent {
  userId: string
  type: 'bet_placed' | 'bet_won' | 'club_joined' | 'profile_updated'
  data: any
  timestamp: number
}

export class RealtimeService {
  private connections: Map<string, RealtimeConnection> = new Map()
  private betSubscribers: Map<string, Set<string>> = new Map() // betId -> Set of userIds
  private clubSubscribers: Map<string, Set<string>> = new Map() // clubId -> Set of userIds
  private activitySubscribers: Set<string> = new Set()

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupConnections(), 30000) // Every 30 seconds
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws: WebSocket, token: string): void {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string }
      const userId = decoded.userId

      // Create connection object
      const connection: RealtimeConnection = {
        userId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      }

      this.connections.set(userId, connection)

      // Send welcome message
      this.sendToUser(userId, {
        type: 'connection_established',
        data: { userId, timestamp: Date.now() }
      })

      // Set up ping/pong
      ws.on('pong', () => {
        const conn = this.connections.get(userId)
        if (conn) {
          conn.lastPing = Date.now()
        }
      })

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data)
          this.handleMessage(userId, message)
        } catch (error) {
          console.error('Error parsing message:', error)
        }
      })

      // Handle connection close
      ws.on('close', () => {
        this.removeConnection(userId)
      })

      console.log(`Realtime connection established for user: ${userId}`)
    } catch (error) {
      console.error('Invalid token for realtime connection:', error)
      ws.close(1008, 'Invalid token')
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(userId: string, message: any): void {
    switch (message.type) {
      case 'subscribe_bet':
        this.subscribeToBet(userId, message.betId)
        break
      case 'unsubscribe_bet':
        this.unsubscribeFromBet(userId, message.betId)
        break
      case 'subscribe_club':
        this.subscribeToClub(userId, message.clubId)
        break
      case 'unsubscribe_club':
        this.unsubscribeFromClub(userId, message.clubId)
        break
      case 'subscribe_activity':
        this.subscribeToActivity(userId)
        break
      case 'unsubscribe_activity':
        this.unsubscribeFromActivity(userId)
        break
      case 'send_chat_message':
        this.handleChatMessage(userId, message)
        break
      case 'ping':
        this.sendToUser(userId, { type: 'pong', timestamp: Date.now() })
        break
      default:
        console.log(`Unknown message type: ${message.type}`)
    }
  }

  /**
   * Subscribe user to bet updates
   */
  subscribeToBet(userId: string, betId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.add(`bet:${betId}`)
    
    if (!this.betSubscribers.has(betId)) {
      this.betSubscribers.set(betId, new Set())
    }
    this.betSubscribers.get(betId)!.add(userId)

    this.sendToUser(userId, {
      type: 'subscription_confirmed',
      data: { betId, subscription: 'bet' }
    })
  }

  /**
   * Unsubscribe user from bet updates
   */
  unsubscribeFromBet(userId: string, betId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.delete(`bet:${betId}`)
    
    const subscribers = this.betSubscribers.get(betId)
    if (subscribers) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        this.betSubscribers.delete(betId)
      }
    }

    this.sendToUser(userId, {
      type: 'unsubscription_confirmed',
      data: { betId, subscription: 'bet' }
    })
  }

  /**
   * Subscribe user to club updates
   */
  subscribeToClub(userId: string, clubId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.add(`club:${clubId}`)
    
    if (!this.clubSubscribers.has(clubId)) {
      this.clubSubscribers.set(clubId, new Set())
    }
    this.clubSubscribers.get(clubId)!.add(userId)

    this.sendToUser(userId, {
      type: 'subscription_confirmed',
      data: { clubId, subscription: 'club' }
    })
  }

  /**
   * Unsubscribe user from club updates
   */
  unsubscribeFromClub(userId: string, clubId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.delete(`club:${clubId}`)
    
    const subscribers = this.clubSubscribers.get(clubId)
    if (subscribers) {
      subscribers.delete(userId)
      if (subscribers.size === 0) {
        this.clubSubscribers.delete(clubId)
      }
    }

    this.sendToUser(userId, {
      type: 'unsubscription_confirmed',
      data: { clubId, subscription: 'club' }
    })
  }

  /**
   * Subscribe user to activity feed
   */
  subscribeToActivity(userId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.add('activity')
    this.activitySubscribers.add(userId)

    this.sendToUser(userId, {
      type: 'subscription_confirmed',
      data: { subscription: 'activity' }
    })
  }

  /**
   * Unsubscribe user from activity feed
   */
  unsubscribeFromActivity(userId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    connection.subscriptions.delete('activity')
    this.activitySubscribers.delete(userId)

    this.sendToUser(userId, {
      type: 'unsubscription_confirmed',
      data: { subscription: 'activity' }
    })
  }

  /**
   * Handle chat message
   */
  private async handleChatMessage(userId: string, message: any): Promise<void> {
    const { clubId, content } = message
    
    if (!clubId || !content) {
      this.sendToUser(userId, {
        type: 'error',
        data: { message: 'Missing clubId or content' }
      })
      return
    }

    // For demo user, just broadcast
    if (userId === 'demo-user-id') {
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        clubId,
        userId,
        message: content,
        timestamp: Date.now()
      }

      this.broadcastToClub(clubId, {
        type: 'chat_message',
        data: chatMessage
      })
      return
    }

    // For real users, save to database and broadcast
    try {
      // TODO: Save chat message to database
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        clubId,
        userId,
        message: content,
        timestamp: Date.now()
      }

      this.broadcastToClub(clubId, {
        type: 'chat_message',
        data: chatMessage
      })
    } catch (error) {
      console.error('Error handling chat message:', error)
      this.sendToUser(userId, {
        type: 'error',
        data: { message: 'Failed to send message' }
      })
    }
  }

  /**
   * Broadcast bet update to all subscribers
   */
  broadcastBetUpdate(betId: string, update: BetUpdate): void {
    const subscribers = this.betSubscribers.get(betId)
    if (!subscribers) return

    const message = {
      type: 'bet_update',
      data: update
    }

    subscribers.forEach(userId => {
      this.sendToUser(userId, message)
    })

    console.log(`Broadcasted bet update to ${subscribers.size} users for bet ${betId}`)
  }

  /**
   * Broadcast to all club members
   */
  broadcastToClub(clubId: string, message: any): void {
    const subscribers = this.clubSubscribers.get(clubId)
    if (!subscribers) return

    subscribers.forEach(userId => {
      this.sendToUser(userId, message)
    })

    console.log(`Broadcasted to ${subscribers.size} users in club ${clubId}`)
  }

  /**
   * Broadcast activity to all subscribers
   */
  broadcastActivity(activity: ActivityEvent): void {
    const message = {
      type: 'activity_update',
      data: activity
    }

    this.activitySubscribers.forEach(userId => {
      this.sendToUser(userId, message)
    })

    console.log(`Broadcasted activity to ${this.activitySubscribers.size} users`)
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId: string, message: any): void {
    const connection = this.connections.get(userId)
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return
    }

    try {
      connection.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error(`Error sending message to user ${userId}:`, error)
      this.removeConnection(userId)
    }
  }

  /**
   * Remove connection
   */
  private removeConnection(userId: string): void {
    const connection = this.connections.get(userId)
    if (!connection) return

    // Remove from all subscriptions
    connection.subscriptions.forEach(subscription => {
      if (subscription.startsWith('bet:')) {
        const betId = subscription.replace('bet:', '')
        this.unsubscribeFromBet(userId, betId)
      } else if (subscription.startsWith('club:')) {
        const clubId = subscription.replace('club:', '')
        this.unsubscribeFromClub(userId, clubId)
      } else if (subscription === 'activity') {
        this.unsubscribeFromActivity(userId)
      }
    })

    this.connections.delete(userId)
    console.log(`Removed connection for user: ${userId}`)
  }

  /**
   * Cleanup stale connections
   */
  private cleanupConnections(): void {
    const now = Date.now()
    const staleTimeout = 60000 // 1 minute

    for (const [userId, connection] of this.connections.entries()) {
      if (now - connection.lastPing > staleTimeout) {
        console.log(`Removing stale connection for user: ${userId}`)
        this.removeConnection(userId)
      }
    }
  }

  /**
   * Get connection stats
   */
  getStats(): any {
    return {
      totalConnections: this.connections.size,
      betSubscriptions: this.betSubscribers.size,
      clubSubscriptions: this.clubSubscribers.size,
      activitySubscribers: this.activitySubscribers.size,
      connectedUsers: Array.from(this.connections.keys())
    }
  }

  /**
   * Public methods for external use
   */
  notifyBetOddsChange(betId: string, newOdds: any): void {
    this.broadcastBetUpdate(betId, {
      betId,
      type: 'odds_change',
      data: { newOdds },
      timestamp: Date.now()
    })
  }

  notifyNewBetEntry(betId: string, entry: any): void {
    this.broadcastBetUpdate(betId, {
      betId,
      type: 'new_entry',
      data: { entry },
      timestamp: Date.now()
    })
  }

  notifyPoolUpdate(betId: string, poolTotal: number): void {
    this.broadcastBetUpdate(betId, {
      betId,
      type: 'pool_update',
      data: { poolTotal },
      timestamp: Date.now()
    })
  }

  notifyBetStatusChange(betId: string, newStatus: string): void {
    this.broadcastBetUpdate(betId, {
      betId,
      type: 'status_change',
      data: { newStatus },
      timestamp: Date.now()
    })
  }

  notifyBetResult(betId: string, result: any): void {
    this.broadcastBetUpdate(betId, {
      betId,
      type: 'result',
      data: { result },
      timestamp: Date.now()
    })
  }

  notifyUserActivity(userId: string, type: string, data: any): void {
    this.broadcastActivity({
      userId,
      type: type as any,
      data,
      timestamp: Date.now()
    })
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService() 