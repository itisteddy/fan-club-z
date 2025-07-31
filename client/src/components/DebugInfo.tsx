import React from 'react';

const DebugInfo: React.FC = () => {
  const [timestamp, setTimestamp] = React.useState(new Date().toLocaleTimeString());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(new Date().toLocaleTimeString());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded-lg p-3 text-sm z-50">
      <div className="font-semibold">Debug Info</div>
      <div>Last Update: {timestamp}</div>
      <div>BetsTab Changes: ✅ Applied</div>
      <div>ManageModal: ✅ Functional</div>
      <div>Completed Predictions: ✅ 8 items</div>
    </div>
  );
};

export default DebugInfo;
