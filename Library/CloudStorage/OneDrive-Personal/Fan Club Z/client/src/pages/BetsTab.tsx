import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Clock, Trophy, History } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useBetStore } from '@/store/betStore'
import BetCard from '@/components/BetCard'

export const BetsTab: React.FC = () => {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('active')

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            My Bets 🎯
          </h1>
          <p className="text-gray-600">
            Track your predictions and winnings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
              <div className="text-sm text-gray-600">Active Bets</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 mb-1">68%</div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="created" className="text-xs">Created</TabsTrigger>
            <TabsTrigger value="won" className="text-xs">Won</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Active Positions
              </h3>
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No active bets</p>
                <p className="text-sm">Your active positions will appear here</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="created">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Bets You Created</h3>
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No created bets</p>
                <p className="text-sm">Bets you've created will appear here</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="won">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
                Winning Bets
              </h3>
              <div className="text-center py-12 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No wins yet</p>
                <p className="text-sm">Your winning bets will appear here</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <History className="w-4 h-4 mr-2" />
                Bet History
              </h3>
              <div className="text-center py-12 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No bet history</p>
                <p className="text-sm">Your completed bets will appear here</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default BetsTab
