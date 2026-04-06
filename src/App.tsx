import { useState } from 'react';
import { Eye, EyeOff, Lock, Zap, Calculator, Printer, CreditCard, Sparkles, FileImage, BookOpen, Image, FileText, LayoutDashboard } from 'lucide-react';
import DualSideCardGenerator from './components/DualSideCardGenerator';
import BookWrapper from './components/BookWrapper';
import BookPrint from './components/BookPrint';
import OCRProcessor from './components/OCRProcessor';
import IntelligenceCollage from './components/IntelligenceCollage';
import PageRangeCalculator from './components/PageRangeCalculator';
import CardSheetGenerator from './components/CardSheetGenerator';
import PdfManipulation from './components/PdfManipulation';
import ImageTools from './components/ImageTools';
import BulkIDGenerator from './components/BulkIDGenerator';

type MainMode = 'dashboard' | 'card-sheet' | 'pdf-manipulation' | 'book-print' | 'image-tools' | 'dual-side-cards' | 'book-wrapper' | 'ocr' | 'intelligence-collage' | 'page-range-calculator' | 'book-cover-maker' | 'print-job-distributor' | 'bulk-id';

const SECRET_KEY = '9578078500';

const NAV_ITEMS: { mode: MainMode; label: string; icon: React.ReactNode; color: string }[] = [
  { mode: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, color: 'text-blue-600' },
  { mode: 'card-sheet', label: 'Image to Card Sheet', icon: <FileImage className="w-4 h-4" />, color: 'text-blue-600' },
  { mode: 'pdf-manipulation', label: 'PDF Manipulation', icon: <FileText className="w-4 h-4" />, color: 'text-slate-600' },
  { mode: 'book-print', label: 'Book Print Tools', icon: <FileText className="w-4 h-4" />, color: 'text-slate-500' },
  { mode: 'book-wrapper', label: 'Book Wrapper', icon: <BookOpen className="w-4 h-4" />, color: 'text-amber-600' },
  { mode: 'image-tools', label: 'Image Tools', icon: <Image className="w-4 h-4" />, color: 'text-emerald-600' },
  { mode: 'dual-side-cards', label: 'Dual-Side ID Cards', icon: <CreditCard className="w-4 h-4" />, color: 'text-violet-600' },
  { mode: 'ocr', label: 'OCR Text Extraction', icon: <FileText className="w-4 h-4" />, color: 'text-teal-600' },
  { mode: 'intelligence-collage', label: 'Intelligence Collage', icon: <Sparkles className="w-4 h-4" />, color: 'text-pink-600' },
  { mode: 'page-range-calculator', label: 'Color-Mono Splitter', icon: <Calculator className="w-4 h-4" />, color: 'text-blue-500' },
  { mode: 'book-cover-maker', label: 'Book Cover Maker', icon: <BookOpen className="w-4 h-4" />, color: 'text-cyan-600' },
  { mode: 'print-job-distributor', label: 'Print Job Distributor', icon: <Printer className="w-4 h-4" />, color: 'text-red-600' },
  { mode: 'bulk-id', label: 'Bulk ID Card Generator', icon: <CreditCard className="w-4 h-4" />, color: 'text-amber-600' },
];

const DASHBOARD_TOOLS = NAV_ITEMS.filter(n => n.mode !== 'dashboard');

function App() {
  const [mainMode, setMainMode] = useState<MainMode>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSecretKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretKeyInput === SECRET_KEY) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid secret key. Please try again.');
      setSecretKeyInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-slate-900 flex items-center justify-center py-8 px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-slate-600 rounded-xl shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                Secure Access
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              Enter the secret key to access the Ultimate PDF Tool
            </p>
          </div>

          <form onSubmit={handleSecretKeySubmit} className="space-y-6">
            <div>
              <label htmlFor="secretKey" className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="secretKey"
                  value={secretKeyInput}
                  onChange={(e) => {
                    setSecretKeyInput(e.target.value);
                    setAuthError('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 pr-12"
                  placeholder="Enter secret key"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm font-medium">{authError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-slate-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-blue-600 hover:to-slate-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Access Application
              </span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">What you'll get access to:</h3>
              <ul className="text-sm text-blue-700 space-y-1 text-left">
                <li>• Image to Card Sheet PDF Generator</li>
                <li>• Advanced PDF Manipulation Tools</li>
                <li>• Professional Image Tools</li>
                <li>• Dual-Side ID Card Generator</li>
                <li>• Bulk ID Card Generator</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isFullScreen = ['book-cover-maker', 'print-job-distributor', 'bulk-id'].includes(mainMode);

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-slate-600 rounded-lg shadow">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800 leading-tight">PrintMaster Pro</div>
              <div className="text-xs text-gray-500 leading-tight">All-in-One Tools</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.mode}
              onClick={() => setMainMode(item.mode)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150 mb-0.5 ${
                mainMode === item.mode
                  ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              <span className={mainMode === item.mode ? 'text-blue-600' : item.color}>
                {item.icon}
              </span>
              <span className="leading-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={() => setIsAuthenticated(false)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150"
          >
            <Lock className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">
              {NAV_ITEMS.find(n => n.mode === mainMode)?.label ?? 'Dashboard'}
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">v2.0</span>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-auto ${isFullScreen ? '' : 'p-6'}`}>
          {mainMode === 'dashboard' && (
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome to PrintMaster Pro</h1>
                <p className="text-gray-500 text-sm">Select a tool to get started. All processing runs locally in your browser.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {DASHBOARD_TOOLS.map(tool => (
                  <button
                    key={tool.mode}
                    onClick={() => setMainMode(tool.mode)}
                    className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gray-50 group-hover:bg-blue-50 flex items-center justify-center mb-3 transition-colors ${tool.color}`}>
                      {tool.icon}
                    </div>
                    <div className="font-semibold text-gray-800 text-sm mb-1">{tool.label}</div>
                  </button>
                ))}
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">How it works</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> All processing runs locally — your files never leave your browser</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Supports JPG, PNG, PDF, and more input formats</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> High-quality output at 300 DPI for print-ready results</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Batch processing for multiple files at once</li>
                </ul>
              </div>
            </div>
          )}
          {mainMode === 'card-sheet' && <CardSheetGenerator />}
          {mainMode === 'pdf-manipulation' && <PdfManipulation />}
          {mainMode === 'book-print' && <BookPrint />}
          {mainMode === 'image-tools' && <ImageTools />}
          {mainMode === 'dual-side-cards' && <DualSideCardGenerator />}
          {mainMode === 'book-wrapper' && <BookWrapper />}
          {mainMode === 'ocr' && <OCRProcessor />}
          {mainMode === 'intelligence-collage' && <IntelligenceCollage />}
          {mainMode === 'page-range-calculator' && <PageRangeCalculator />}
          {mainMode === 'book-cover-maker' && (
            <div style={{ height: '100%', minHeight: '700px' }}>
              <iframe
                src="https://book-cover-generator-fnws.bolt.host/"
                className="w-full h-full"
                title="Book Cover Maker"
                style={{ border: 'none', display: 'block', height: 'calc(100vh - 57px)' }}
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
          {mainMode === 'print-job-distributor' && (
            <div style={{ height: '100%', minHeight: '700px' }}>
              <iframe
                src="https://distributed-print-ma-fbx9.bolt.host/"
                className="w-full h-full"
                title="Print Job Distributor"
                style={{ border: 'none', display: 'block', height: 'calc(100vh - 57px)' }}
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
          {mainMode === 'bulk-id' && <BulkIDGenerator />}
        </main>
      </div>
    </div>
  );
}

export default App;
