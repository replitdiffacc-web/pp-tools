import { Tab } from '@headlessui/react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import UniversalConverter from './components/UniversalConverter'
import OptimizeTools from './components/OptimizeTools'
import MergeTools from './components/MergeTools'
import CaptureTools from './components/CaptureTools'
import QRTools from './components/QRTools'
import AuthModal from './components/AuthModal'
import DownloadHistory from './components/DownloadHistory'
import {
  ArrowPathIcon,
  SparklesIcon,
  DocumentPlusIcon,
  CameraIcon,
  QrCodeIcon,
  UserCircleIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

const API_URL = '/api'

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

function App() {
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, { withCredentials: true })
      setUser(response.data.email)
    } catch (error) {
      setUser(null)
    }
  }

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const tabs = [
    { name: 'Convert Files', icon: ArrowPathIcon, component: UniversalConverter },
    { name: 'Optimize & OCR', icon: SparklesIcon, component: OptimizeTools },
    { name: 'Merge PDFs', icon: DocumentPlusIcon, component: MergeTools },
    { name: 'Capture Website', icon: CameraIcon, component: CaptureTools },
    { name: 'QR Code Tools', icon: QrCodeIcon, component: QRTools },
  ]

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={setUser}
      />
      <DownloadHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-3">
              Universal File Converter
            </h1>
            <p className="text-gray-600 text-lg">Convert between 200+ file formats instantly</p>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ClockIcon className="h-5 w-5" />
                  History
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <UserCircleIcon className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{user}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <UserCircleIcon className="h-5 w-5" />
                Login / Sign Up
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <Tab.Group>
            <Tab.List className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl mb-6">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    classNames(
                      'flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                      selected
                        ? 'bg-white text-primary-700 shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    )
                  }
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-2">
              {tabs.map((tab, idx) => (
                <Tab.Panel
                  key={idx}
                  className="focus:outline-none"
                >
                  <tab.component />
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Supports Archive • Audio • CAD • Documents • Ebooks • Fonts • Images • Presentations • Spreadsheets • Vectors • Videos • QR Codes
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
