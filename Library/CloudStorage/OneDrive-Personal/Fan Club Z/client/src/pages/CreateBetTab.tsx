import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Users, Calendar, Settings } from 'lucide-react'

export const CreateBetTab: React.FC = () => {
  const [betType, setBetType] = useState<'binary' | 'multi' | 'pool'>('binary')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('sports')
  const [deadline, setDeadline] = useState('')
  const [minStake, setMinStake] = useState('10')
  const [maxStake, setMaxStake] = useState('1000')

  const categories = [
    { id: 'sports', label: 'Sports', emoji: '⚽' },
    { id: 'pop', label: 'Pop Culture', emoji: '🎭' },
    { id: 'crypto', label: 'Crypto', emoji: '₿' },
    { id: 'politics', label: 'Politics', emoji: '🏛️' },
    { id: 'custom', label: 'Custom', emoji: '🎯' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement bet creation
    console.log('Creating bet:', { betType, title, description, category, deadline, minStake, maxStake })
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Create Bet ✨
          </h1>
          <p className="text-gray-600">
            Start a prediction and let others join the fun
          </p>
        </div>

        {/* Form Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              New Bet Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bet Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Bet Type
                </label>
                <Tabs value={betType} onValueChange={(value) => setBetType(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="binary">Yes/No</TabsTrigger>
                    <TabsTrigger value="multi">Multiple Choice</TabsTrigger>
                    <TabsTrigger value="pool">Pool</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Bet Title *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are people betting on?"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details about your bet..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        category === cat.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="font-medium">{cat.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Entry Deadline *
                </label>
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                />
              </div>

              {/* Stake Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Min Stake ($)
                  </label>
                  <Input
                    type="number"
                    value={minStake}
                    onChange={(e) => setMinStake(e.target.value)}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Max Stake ($)
                  </label>
                  <Input
                    type="number"
                    value={maxStake}
                    onChange={(e) => setMaxStake(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg">
                Create Bet
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 Tips for Great Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Make your question clear and specific</li>
              <li>• Set a reasonable deadline for entries</li>
              <li>• Choose appropriate stake limits</li>
              <li>• Provide enough context in the description</li>
              <li>• Pick the right category for better discovery</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateBetTab
