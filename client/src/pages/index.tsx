import React from 'react';

export const PredictionsPage: React.FC = () => {
  return (
    <div className="p-4" style={{ minHeight: '100vh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-2xl font-bold text-foreground mb-6">My Predictions</h1>
      
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No predictions yet</h2>
        <p className="text-muted-foreground mb-6">
          Start making predictions to see them here
        </p>
        <a
          href="/discover"
          className="inline-block bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Explore Predictions
        </a>
      </div>
    </div>
  );
};

export const CreatePredictionPage: React.FC = () => {
  return (
    <div className="p-4" style={{ minHeight: '100vh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Create Prediction</h1>
      
      <div className="text-center py-12">
        <div className="text-6xl mb-4">➕</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground">
          Prediction creation will be available soon
        </p>
      </div>
    </div>
  );
};


export const WalletPage: React.FC = () => {
  return (
    <div className="p-4" style={{ minHeight: '100vh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Wallet</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Balance</h2>
        <div className="text-3xl font-bold text-primary">$0.00</div>
        <p className="text-muted-foreground text-sm mt-1">Nigerian Naira</p>
      </div>
      
      <div className="space-y-3">
        <button className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Deposit Funds
        </button>
        <button className="w-full border border-border text-foreground py-3 px-4 rounded-lg font-semibold hover:bg-muted transition-colors">
          Withdraw
        </button>
      </div>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  return (
    <div className="p-4" style={{ minHeight: '100vh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Profile</h1>
      
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-3xl font-bold">U</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Demo User</h2>
        <p className="text-muted-foreground">
          Profile customization coming soon
        </p>
      </div>
    </div>
  );
};

export const PredictionDetailPage: React.FC = () => {
  return (
    <div className="p-4" style={{ minHeight: '100vh', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
      <h1 className="text-2xl font-bold text-foreground mb-6">Prediction Details</h1>
      <p className="text-muted-foreground">Prediction details coming soon</p>
    </div>
  );
};

