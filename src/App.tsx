import { useState } from 'react';
import { FileText, Image as ImageIcon, Eye, EyeOff, Lock, Zap, Calculator, Printer, CreditCard, Sparkles, FileImage, BookOpen, Image } from 'lucide-react';
import DualSideCardGenerator from './components/DualSideCardGenerator';
import BookWrapper from './components/BookWrapper';
import BookPrint from './components/BookPrint';
import OCRProcessor from './components/OCRProcessor';
import IntelligenceCollage from './components/IntelligenceCollage';
import PageRangeCalculator from './components/PageRangeCalculator';
import CardSheetGenerator from './components/CardSheetGenerator';
import PdfManipulation from './components/PdfManipulation';
import ImageTools from './components/ImageTools';

type MainMode = 'card-sheet' | 'pdf-manipulation' | 'book-print' | 'image-tools' | 'dual-side-cards' | 'book-wrapper' | 'ocr' | 'intelligence-collage' | 'page-range-calculator' | 'book-cover-maker' | 'print-job-distributor';

const SECRET_KEY = '9578078500';

function App() {
  const [mainMode, setMainMode] = useState<MainMode>('card-sheet');
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

  // If not authenticated, show the login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 flex items-center justify-center py-8 px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
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
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
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
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
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
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application (only shown when authenticated)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
              Ultimate PDF Tool
            </h1>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              title="Logout"
            >
              <Lock className="w-5 h-5" />
            </button>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate card sheets from images, manipulate existing PDFs, split images into multiple parts, or create dual-side ID cards with professional-grade tools.
          </p>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Mode Selection */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Operation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'card-sheet' 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="card-sheet"
                  checked={mainMode === 'card-sheet'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <FileImage className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Image to Card Sheet PDF</span>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'pdf-manipulation' 
                  ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="pdf-manipulation"
                  checked={mainMode === 'pdf-manipulation'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">PDF Manipulation</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'book-print' 
                  ? 'border-violet-500 bg-violet-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="book-print"
                  checked={mainMode === 'book-print'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-violet-600" />
                  <span className="text-sm font-medium text-gray-700">Book Print</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'image-tools'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="image-tools"
                  checked={mainMode === 'image-tools'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Image className="w-6 h-6 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">Image Tools</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'dual-side-cards' 
                  ? 'border-purple-500 bg-purple-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="dual-side-cards"
                  checked={mainMode === 'dual-side-cards'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">Dual-Side ID Cards</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'book-wrapper' 
                  ? 'border-orange-500 bg-orange-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="book-wrapper"
                  checked={mainMode === 'book-wrapper'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">Book Wrapper</span>
                </div>
              </label>
              
              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'ocr' 
                  ? 'border-teal-500 bg-teal-50 shadow-md' 
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="ocr"
                  checked={mainMode === 'ocr'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-teal-600" />
                  <span className="text-sm font-medium text-gray-700">OCR Text Extraction</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'intelligence-collage'
                  ? 'border-pink-500 bg-pink-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="intelligence-collage"
                  checked={mainMode === 'intelligence-collage'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-pink-600" />
                  <span className="text-sm font-medium text-gray-700">Intelligence Collage</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'page-range-calculator'
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="page-range-calculator"
                  checked={mainMode === 'page-range-calculator'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Calculator className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Color - Mono Pages Splitter</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'book-cover-maker'
                  ? 'border-cyan-500 bg-cyan-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="book-cover-maker"
                  checked={mainMode === 'book-cover-maker'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-cyan-600" />
                  <span className="text-sm font-medium text-gray-700">Book Cover Maker</span>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                mainMode === 'print-job-distributor'
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="main-mode"
                  value="print-job-distributor"
                  checked={mainMode === 'print-job-distributor'}
                  onChange={(e) => setMainMode(e.target.value as MainMode)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <Printer className="w-6 h-6 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">Print Job Distributor</span>
                </div>
              </label>
            </div>
          </div>

          {/* Content Area */}
          <div className={mainMode === 'book-cover-maker' || mainMode === 'print-job-distributor' ? 'p-0' : 'p-8'}>
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
              <div style={{ height: 'calc(100vh - 200px)', minHeight: '700px' }}>
                <iframe
                  src="https://book-cover-generator-fnws.bolt.host/"
                  className="w-full h-full"
                  title="Book Cover Maker"
                  style={{ border: 'none', display: 'block' }}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            )}
            {mainMode === 'print-job-distributor' && (
              <div style={{ height: 'calc(100vh - 200px)', minHeight: '700px' }}>
                <iframe
                  src="https://distributed-print-ma-fbx9.bolt.host/"
                  className="w-full h-full"
                  title="Print Job Distributor"
                  style={{ border: 'none', display: 'block' }}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Professional PDF and image processing tools for creators and professionals.</p>
        </div>
      </div>
    </div>
  );
}

export default App;