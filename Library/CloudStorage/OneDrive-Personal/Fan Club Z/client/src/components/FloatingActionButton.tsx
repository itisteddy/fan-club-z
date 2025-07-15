import React from 'react'
import { Plus } from 'lucide-react'
import { useLocation } from 'wouter'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  className?: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ className }) => {
  const [, navigate] = useLocation()
  const { isAuthenticated } = useAuthStore()
  const { toast } = useToast()

  const handleCreateBet = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a bet"
      })
      navigate('/auth/login')
      return
    }

    // Navigate to create bet page (we'll create this as a modal or separate page)
    navigate('/create-bet')
  }

  return (
    <button
      onClick={handleCreateBet}
      className={cn(
        "fixed bottom-24 right-4 z-30",
        "w-14 h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
        "rounded-full shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-200 active:scale-95",
        "text-white",
        className
      )}
      data-testid="floating-create-bet"
      aria-label="Create New Bet"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}

export default FloatingActionButton
