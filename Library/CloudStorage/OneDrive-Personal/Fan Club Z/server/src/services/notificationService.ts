import { WebSocket, WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

interface NotificationMessage {
  type: 'bet_update' | 'club_invite' | 'wallet_transaction' | 'system'
  title: string
  message: string
  data?: any
  timestamp: string
}

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string
  isAuthenticated?: boolean
}

class NotificationService {
  private wss: WebSocketServer | null = null
  private clients: Map<string, AuthenticatedWebSocket[]> = new Map()

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/notifications'
    })

    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      console.log('🔌 New WebSocket connection attempt')
      
      // Extract token from query string or headers
      const url = new URL(request.url!, `http://${request.headers.host}`)
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        console.log('❌ No token provided for WebSocket connection')
        ws.close(1008, 'Authentication required')
        return
      }

      try {
        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string }
        ws.userId = decoded.userId
        ws.isAuthenticated = true
        
        console.log(`✅ WebSocket authenticated for user: ${decoded.userId}`)
        
        // Add to clients map
        if (!this.clients.has(decoded.userId)) {
          this.clients.set(decoded.userId, [])
        }
        this.clients.get(decoded.userId)!.push(ws)

        // Send welcome message
        this.sendToUser(decoded.userId, {
          type: 'system',
          title: 'Connected',
          message: 'Real-time notifications enabled',
          timestamp: new Date().toISOString()
        })

        // Handle client disconnect
        ws.on('close', () => {
          console.log(`🔌 WebSocket disconnected for user: ${decoded.userId}`)
          const userClients = this.clients.get(decoded.userId)
          if (userClients) {
            const index = userClients.indexOf(ws)
            if (index > -1) {
              userClients.splice(index, 1)
            }
            if (userClients.length === 0) {
              this.clients.delete(decoded.userId)
            }
          }
        })

        // Handle ping/pong for keep-alive
        ws.on('ping', () => {
          ws.pong()
        })

      } catch (error) {
        console.log('❌ Invalid token for WebSocket connection:', error)
        ws.close(1008, 'Invalid token')
      }
    })

    console.log('🔌 WebSocket notification service initialized')
  }

  sendToUser(userId: string, notification: NotificationMessage) {
    const userClients = this.clients.get(userId)
    if (userClients && userClients.length > 0) {
      const message = JSON.stringify(notification)
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
      console.log(`📨 Sent notification to user ${userId}: ${notification.title}`)
    }
  }

  sendToAll(notification: NotificationMessage) {
    const message = JSON.stringify(notification)
    this.clients.forEach((userClients, userId) => {
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    })
    console.log(`📨 Sent broadcast notification: ${notification.title}`)
  }

  // Convenience methods for different notification types
  sendBetUpdate(userId: string, betId: string, message: string, data?: any) {
    this.sendToUser(userId, {
      type: 'bet_update',
      title: 'Bet Update',
      message,
      data: { betId, ...data },
      timestamp: new Date().toISOString()
    })
  }

  sendClubInvite(userId: string, clubId: string, clubName: string, inviterName: string) {
    this.sendToUser(userId, {
      type: 'club_invite',
      title: 'Club Invitation',
      message: `${inviterName} invited you to join ${clubName}`,
      data: { clubId, clubName, inviterName },
      timestamp: new Date().toISOString()
    })
  }

  sendWalletTransaction(userId: string, amount: number, type: 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won', description: string) {
    this.sendToUser(userId, {
      type: 'wallet_transaction',
      title: 'Wallet Update',
      message: description,
      data: { amount, type, description },
      timestamp: new Date().toISOString()
    })
  }

  sendSystemNotification(userId: string, title: string, message: string) {
    this.sendToUser(userId, {
      type: 'system',
      title,
      message,
      timestamp: new Date().toISOString()
    })
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys())
  }

  getConnectionCount(): number {
    let count = 0
    this.clients.forEach(userClients => {
      count += userClients.length
    })
    return count
  }
}

export const notificationService = new NotificationService() 