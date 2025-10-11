
import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import axios from 'axios'

const API_URL = '/api'

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup'
      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password
      }, { withCredentials: true })

      if (response.data.success) {
        onSuccess(response.data.email)
        onClose()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="At least 6 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Sign Up')}
          </button>

          <p className="text-center text-sm text-gray-600">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {mode === 'login' ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
