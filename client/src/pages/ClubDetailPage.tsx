import React from 'react';
import { ArrowLeft, Users, MessageCircle, Calendar, Trophy, Crown } from 'lucide-react';
import { useLocation } from 'wouter';

export const ClubDetailPage: React.FC = () => {
  const [, navigate] = useLocation();
  
  // Mock club data
  const club = {
    id: '1',
    name: 'Arsenal FC Fans',
    description: 'The biggest Arsenal community for match predictions, discussions, and exclusive insights. Join fellow Gunners and make your predictions count!',
    members: 2847,
    activePredictions: 12,
    coverImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=200&fit=crop',
    avatar: null,
    isVerified: true,
    isPrivate: false,
    userRole: 'member', // 'member', 'admin', 'owner', or null if not joined
    recentActivity: '2 min ago',
    weeklyGrowth: 12.5,
    stats: {
      totalPredictions: 156,
      correctPredictions: 98,
      totalWinnings: 450000,
      topMembers: 25
    }
  };

  const recentPredictions = [
    {
      id: '1',
      title: 'Will Arsenal beat Tottenham in the North London Derby?',
      creator: 'ArsenalFan2024',
      participants: 89,
      pool: 25400,
      timeLeft: '3d 12h'
    },
    {
      id: '2', 
      title: 'Will Saka score in the next match?',
      creator: 'GunnersPride',
      participants: 67,
      pool: 18900,
      timeLeft: '1d 8h'
    }
  ];

  const topMembers = [
    { name: 'ArsenalLegend', wins: 23, avatar: null },
    { name: 'GunnerForLife', wins: 19, avatar: null },
    { name: 'RedArmy', wins: 17, avatar: null }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-subtle border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/clubs')}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-body-md font-semibold text-foreground">Club Details</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="pb-6">
        {/* Cover Photo & Profile */}
        <div className="relative">
          <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative">
            {club.coverImage && (
              <img 
                src={club.coverImage} 
                alt={club.name}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Growth Indicator */}
            {club.weeklyGrowth > 0 && (
              <div className="absolute top-4 right-4 bg-success/90 text-white px-3 py-1 rounded-full text-caption font-medium flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                +{club.weeklyGrowth}% this week
              </div>
            )}
          </div>
          
          {/* Club Avatar */}
          <div className="absolute -bottom-8 left-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full border-4 border-background flex items-center justify-center">
              {club.avatar ? (
                <img src={club.avatar} alt={club.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white font-bold text-lg">{club.name[0]}</span>
              )}
            </div>
          </div>
        </div>

        {/* Club Info */}
        <div className="px-4 pt-12 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h1 className="text-display-md font-bold text-foreground">{club.name}</h1>
              {club.isVerified && (
                <Crown className="w-5 h-5 text-warning fill-current" />
              )}
              {club.isPrivate && (
                <div className="px-2 py-1 bg-info/10 text-info rounded-md text-caption font-medium">
                  Private
                </div>
              )}
            </div>
            <p className="text-body-md text-muted-foreground leading-relaxed">
              {club.description}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-display-sm font-bold text-foreground">{formatNumber(club.members)}</div>
              <div className="text-caption text-muted-foreground">Members</div>
            </div>
            <div className="text-center">
              <div className="text-display-sm font-bold text-primary">{club.activePredictions}</div>
              <div className="text-caption text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-display-sm font-bold text-success">{club.stats.correctPredictions}</div>
              <div className="text-caption text-muted-foreground">Wins</div>
            </div>
          </div>

          {/* Join/Leave Button */}
          <div className="pt-2">
            {club.userRole ? (
              <div className="flex gap-3">
                <button className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-semibold hover:bg-primary/20 transition-colors">
                  {club.userRole === 'admin' ? 'Manage Club' : 'Member'}
                </button>
                <button className="flex-1 bg-muted text-foreground py-3 rounded-xl font-semibold hover:bg-muted/80 transition-colors">
                  Leave Club
                </button>
              </div>
            ) : (
              <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
                Join Club
              </button>
            )}
          </div>
        </div>

        {/* Club Stats Detail */}
        <div className="px-4 pt-6">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4">
            <h3 className="text-body-md font-semibold text-foreground mb-3">Club Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-display-sm font-bold text-foreground">{club.stats.totalPredictions}</div>
                <div className="text-caption text-muted-foreground">Total Predictions</div>
              </div>
              <div>
                <div className="text-display-sm font-bold text-success">{formatCurrency(club.stats.totalWinnings)}</div>
                <div className="text-caption text-muted-foreground">Total Winnings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Predictions */}
        <div className="px-4 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body-lg font-semibold text-foreground">Recent Predictions</h2>
            <button className="text-primary text-body-sm font-medium">View All</button>
          </div>
          
          <div className="space-y-3">
            {recentPredictions.map((prediction) => (
              <div key={prediction.id} className="bg-card rounded-xl border border-border p-4">
                <h3 className="text-body-sm font-medium text-foreground mb-2 line-clamp-2">
                  {prediction.title}
                </h3>
                <div className="flex items-center justify-between text-caption text-muted-foreground">
                  <span>by {prediction.creator}</span>
                  <span>{prediction.timeLeft} left</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="text-caption">{prediction.participants}</span>
                    </div>
                    <div className="text-caption font-semibold text-foreground">
                      {formatCurrency(prediction.pool)}
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-primary/10 text-primary rounded-md text-caption font-medium hover:bg-primary/20 transition-colors">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Members */}
        <div className="px-4 pt-6 space-y-4">
          <h2 className="text-body-lg font-semibold text-foreground">Top Members</h2>
          
          <div className="space-y-3">
            {topMembers.map((member, index) => (
              <div key={member.name} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-warning' : index === 1 ? 'bg-muted-foreground' : 'bg-warning/60'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{member.name[0]}</span>
                  </div>
                  <span className="text-body-sm font-medium text-foreground">{member.name}</span>
                </div>
                <div className="text-body-sm font-semibold text-foreground">
                  {member.wins} wins
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Club Actions */}
        <div className="px-4 pt-6 space-y-3">
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="text-body-sm font-medium text-foreground">Club Discussions</span>
          </button>
          <button className="w-full flex items-center justify-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-body-sm font-medium text-foreground">Upcoming Events</span>
          </button>
        </div>
      </div>
    </div>
  );
};
