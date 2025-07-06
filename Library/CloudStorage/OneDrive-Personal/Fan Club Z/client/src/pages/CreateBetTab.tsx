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
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Create Bet</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center mb-6">
            <Plus className="w-5 h-5 mr-2 text-blue-500" />
            <h2 className="text-title-2 font-semibold text-gray-900">New Bet Details</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bet Type */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-3 block">
                Bet Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setBetType('binary')}
                  className={`p-3 rounded-[10px] text-body-sm font-medium transition-colors ${
                    betType === 'binary'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Yes/No
                </button>
                <button
                  type="button"
                  onClick={() => setBetType('multi')}
                  className={`p-3 rounded-[10px] text-body-sm font-medium transition-colors ${
                    betType === 'multi'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  onClick={() => setBetType('pool')}
                  className={`p-3 rounded-[10px] text-body-sm font-medium transition-colors ${
                    betType === 'pool'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Pool
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
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
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about your bet..."
                className="w-full p-4 bg-gray-100 rounded-[10px] text-body focus:bg-gray-200 transition-colors resize-none"
                rows={3}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-3 block">
                Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-4 rounded-[10px] text-left transition-colors ${
                      category === cat.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="text-body font-medium">{cat.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-body-sm font-medium text-gray-600 mb-2 block">
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
                <label className="text-body-sm font-medium text-gray-600 mb-2 block">
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
                <label className="text-body-sm font-medium text-gray-600 mb-2 block">
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
            <Button type="submit" className="w-full" variant="apple">
              Create Bet
            </Button>
          </form>
        </div>

        {/* Tips */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-title-3 font-semibold text-gray-900 mb-4">💡 Tips for Great Bets</h3>
          <ul className="space-y-3 text-body-sm text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Make your question clear and specific
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Set a reasonable deadline for entries
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Choose appropriate stake limits
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Provide enough context in the description
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Pick the right category for better discovery
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default CreateBetTab
