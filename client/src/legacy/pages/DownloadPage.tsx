import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Shield, CheckCircle2, FileText } from 'lucide-react';
import AppHeader from '../../components/layout/AppHeader';
import { VERSION as APP_VERSION } from '@fanclubz/shared';

interface ChecksumData {
  'app-latest.apk': {
    sha256: string;
    size: number;
    version: string;
    updated: string;
  };
}

const DownloadPage: React.FC = () => {
  const [checksumData, setChecksumData] = useState<ChecksumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load checksum data
    fetch('/downloads/checksums.json')
      .then((res) => res.json())
      .then((data) => {
        setChecksumData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <AppHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-teal-600 rounded-2xl mb-6 shadow-lg">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Download Fan Club Z
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get the native Android app for the best experience. Install directly on your device.
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Android APK
              </h2>
              <p className="text-gray-600 mb-4">
                Version {checksumData?.['app-latest.apk']?.version || APP_VERSION}
                {checksumData?.['app-latest.apk']?.updated && (
                  <span className="text-gray-400 ml-2">
                    • Updated {formatDate(checksumData['app-latest.apk'].updated)}
                  </span>
                )}
              </p>
              
              {checksumData?.['app-latest.apk'] && (
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {formatFileSize(checksumData['app-latest.apk'].size)}
                  </span>
                </div>
              )}
            </div>
            
            <a
              href="/downloads/app-latest.apk"
              download
              className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-6 h-6" />
              Download APK
            </a>
          </div>
        </div>

        {/* Security & Verification */}
        <div className="bg-blue-50 rounded-2xl p-6 mb-8 border border-blue-100">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Security & Verification</h3>
              <p className="text-gray-700 text-sm mb-4">
                Verify the integrity of your download using the SHA-256 checksum below.
              </p>
              {checksumData?.['app-latest.apk']?.sha256 && (
                <div className="bg-white rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">SHA-256 Checksum:</p>
                  <code className="text-sm text-gray-900 break-all font-mono">
                    {checksumData['app-latest.apk'].sha256}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900">Installation Instructions</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                1
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Enable Unknown Sources</h4>
                <p className="text-gray-600 text-sm">
                  Go to Settings → Security → Enable "Install from Unknown Sources" or "Allow from this source" when prompted.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Download the APK</h4>
                <p className="text-gray-600 text-sm">
                  Tap the "Download APK" button above. The file will download to your device.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                3
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Install the App</h4>
                <p className="text-gray-600 text-sm">
                  Open the downloaded file from your notifications or Downloads folder. Tap "Install" when prompted.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                4
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Launch & Enjoy</h4>
                <p className="text-gray-600 text-sm">
                  Once installed, open Fan Club Z from your app drawer. Sign in and start making predictions!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Native Performance</h4>
            <p className="text-gray-600 text-sm">
              Optimized Android app with faster loading and smoother animations.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Offline Support</h4>
            <p className="text-gray-600 text-sm">
              Access cached content even when you're offline.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <CheckCircle2 className="w-8 h-8 text-green-500 mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">Push Notifications</h4>
            <p className="text-gray-600 text-sm">
              Get notified about prediction updates and activity.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading download information...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default DownloadPage;

