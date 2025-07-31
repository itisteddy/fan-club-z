import React from 'react';
import './index.css'; // Now using full Tailwind CSS

console.log('Step 2: Testing Tailwind CSS...');

function App() {
  console.log('Step 2 App rendering...');
  
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Step 2: Tailwind CSS Test
          </h1>
          
          <div className="space-y-3">
            <div className="bg-green-100 text-green-800 p-3 rounded-lg">
              ✅ React is working
            </div>
            <div className="bg-blue-100 text-blue-800 p-3 rounded-lg">
              ✅ Tailwind CSS classes applied
            </div>
            <div className="bg-purple-100 text-purple-800 p-3 rounded-lg">
              ✅ Complex styling working
            </div>
          </div>

          <button 
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            onClick={() => {
              console.log('Tailwind button clicked!');
              alert('Tailwind styling works!');
            }}
          >
            Test Tailwind Button
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold mb-3 text-gray-900">Tailwind Test</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-3 rounded-lg text-center">
              Gradient
            </div>
            <div className="bg-red-500 text-white p-3 rounded-lg text-center hover:bg-red-600 transition-colors">
              Hover Effect
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>✅ If you see colorful boxes above, Tailwind is working</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
