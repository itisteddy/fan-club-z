import { useAuthStore } from '@/store/authStore'

export interface SocialUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  profileImage?: string
  provider: 'apple' | 'google'
}

export interface SocialAuthResponse {
  success: boolean
  user?: SocialUser
  error?: string
}

class SocialAuthService {
  private authStore = useAuthStore.getState()

  /**
   * Handle Apple Sign-In
   */
  async signInWithApple(): Promise<SocialAuthResponse> {
    try {
      // Check if Apple Sign-In is available
      if (!window.AppleID) {
        return {
          success: false,
          error: 'Apple Sign-In is not available on this device'
        }
      }

      // Initialize Apple Sign-In
      const appleId = new window.AppleID({
        clientId: process.env.VITE_APPLE_CLIENT_ID || 'com.fanclubz.app',
        scope: 'name email',
        redirectURI: `${window.location.origin}/auth/callback`,
        state: 'origin:web'
      })

      // Sign in with Apple
      const response = await appleId.signIn()
      
      if (response.authorization) {
        const user: SocialUser = {
          id: response.user || `apple_${Date.now()}`,
          email: response.email || '',
          firstName: response.name?.firstName || '',
          lastName: response.name?.lastName || '',
          provider: 'apple'
        }

        // Send to backend for verification and user creation
        const backendResponse = await this.authenticateWithBackend(user, response.authorization.id_token)
        
        if (backendResponse.success) {
          return { success: true, user: backendResponse.user }
        } else {
          return { success: false, error: backendResponse.error }
        }
      }

      return { success: false, error: 'Apple Sign-In was cancelled' }
    } catch (error: any) {
      console.error('Apple Sign-In error:', error)
      return {
        success: false,
        error: error.message || 'Apple Sign-In failed'
      }
    }
  }

  /**
   * Handle Google Sign-In
   */
  async signInWithGoogle(): Promise<SocialAuthResponse> {
    try {
      // Load Google Identity Services
      await this.loadGoogleScript()
      
      return new Promise((resolve) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: process.env.VITE_GOOGLE_CLIENT_ID || '',
          scope: 'openid email profile',
          callback: async (response: any) => {
            if (response.access_token) {
              try {
                // Get user info from Google
                const userInfo = await this.getGoogleUserInfo(response.access_token)
                
                const user: SocialUser = {
                  id: userInfo.id,
                  email: userInfo.email,
                  firstName: userInfo.given_name,
                  lastName: userInfo.family_name,
                  profileImage: userInfo.picture,
                  provider: 'google'
                }

                // Send to backend for verification and user creation
                const backendResponse = await this.authenticateWithBackend(user, response.access_token)
                resolve(backendResponse)
              } catch (error: any) {
                resolve({
                  success: false,
                  error: error.message || 'Google authentication failed'
                })
              }
            } else {
              resolve({ success: false, error: 'Google Sign-In was cancelled' })
            }
          }
        })

        client.requestAccessToken()
      })
    } catch (error: any) {
      console.error('Google Sign-In error:', error)
      return {
        success: false,
        error: error.message || 'Google Sign-In failed'
      }
    }
  }

  /**
   * Load Google Identity Services script
   */
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
      document.head.appendChild(script)
    })
  }

  /**
   * Get user info from Google using access token
   */
  private async getGoogleUserInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to get user info from Google')
    }
    
    return response.json()
  }

  /**
   * Send social auth data to backend for verification and user creation
   */
  private async authenticateWithBackend(user: SocialUser, token: string): Promise<SocialAuthResponse> {
    try {
      const response = await fetch('/api/auth/social', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user,
          token,
          provider: user.provider
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update auth store with user data
        this.authStore.setUser(data.user)
        this.authStore.setToken(data.token)
        return { success: true, user: data.user }
      } else {
        return { success: false, error: data.error || 'Authentication failed' }
      }
    } catch (error: any) {
      console.error('Backend authentication error:', error)
      return {
        success: false,
        error: 'Failed to authenticate with server'
      }
    }
  }
}

// Create singleton instance
export const socialAuthService = new SocialAuthService()

// TypeScript declarations for Apple Sign-In
declare global {
  interface Window {
    AppleID?: any
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
        }
      }
    }
  }
} 