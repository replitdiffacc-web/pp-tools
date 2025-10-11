
import { useState, useEffect } from 'react'
import axios from 'axios'
import { ClockIcon, TrashIcon, XMarkIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const API_URL = '/api'

export default function DownloadHistory({ isOpen, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewItem, setPreviewItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    if (isOpen) {
      loadHistory()
    }
  }, [isOpen])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/history`, { withCredentials: true })
      setHistory(response.data.history || [])
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/history/${id}`, { withCredentials: true })
      setHistory(history.filter(item => item.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting item')
    }
  }

  const filteredHistory = history.filter(item => {
    const query = searchQuery.toLowerCase()
    return (
      item.original_filename?.toLowerCase().includes(query) ||
      item.output_filename?.toLowerCase().includes(query) ||
      item.conversion_type?.toLowerCase().includes(query)
    )
  })

  const renderPreview = (item) => {
    if (!item.file_url) return <div className="text-gray-500">No preview available</div>

    const ext = item.output_filename?.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return <img src={item.file_url} alt="Preview" className="max-w-full max-h-96 mx-auto rounded-lg" />
    } else if (ext === 'pdf') {
      return <iframe src={item.file_url} className="w-full h-96 rounded-lg" />
    } else if (['txt', 'md', 'csv'].includes(ext)) {
      return (
        <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-auto">
          <iframe src={item.file_url} className="w-full h-80" />
        </div>
      )
    } else if (ext === 'zip') {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">ZIP Archive</p>
          <p className="text-sm text-gray-500">Contains multiple converted files</p>
        </div>
      )
    } else {
      return <div className="text-gray-500">Preview not available for this file type</div>
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ClockIcon className="h-6 w-6" />
              Download History
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 border-b">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename or conversion type..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No matching conversions found' : 'No download history yet. Start converting files to see them here!'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.original_filename}</p>
                      <p className="text-sm text-gray-600">→ {item.output_filename}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {item.file_url && (
                        <>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            Preview
                          </button>
                          <a
                            href={item.file_url}
                            download={item.output_filename}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">{previewItem.output_filename}</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {renderPreview(previewItem)}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <a
                href={previewItem.file_url}
                download={previewItem.output_filename}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-medium">{deleteConfirm.output_filename}</span> from your history?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
