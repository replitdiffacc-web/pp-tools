import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { PlusIcon, XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline'
import FileUpload from './FileUpload'

const API_URL = '/api'

export default function MergeTools() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [draggedIndex, setDraggedIndex] = useState(null)

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    
    if (draggedIndex === null || draggedIndex === index) return
    
    const newFiles = [...files]
    const draggedFile = newFiles[draggedIndex]
    newFiles.splice(draggedIndex, 1)
    newFiles.splice(index, 0, draggedFile)
    
    setFiles(newFiles)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleMerge = async () => {
    if (files.length < 2) {
      alert('Please select at least 2 PDF files to merge')
      return
    }

    setLoading(true)
    setProgress(0)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('task_id', taskId)

    try {
      // Start listening to progress updates
      eventSource = new EventSource(`${API_URL}/progress/${taskId}`)
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.progress !== undefined) {
            setProgress(data.progress)
          }
          if (data.status === 'complete' || data.status === 'error') {
            eventSource?.close()
          }
        } catch (e) {
          console.error('Error parsing progress:', e)
        }
      }

      eventSource.onerror = () => {
        eventSource?.close()
      }

      const response = await axios.post(`${API_URL}/pdf/merge`, formData, {
        responseType: 'blob'
      })

      setProgress(100)

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'merged.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success('PDFs merged successfully!')
    } catch (error) {
      eventSource?.close()
      toast.error('Error merging PDFs: ' + error.message)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Merge PDF Files</h2>
        <p className="text-gray-600">Combine multiple PDF files into one document</p>
      </div>

      <FileUpload
        onFileSelect={setFiles}
        files={files}
        accept=".pdf"
        multiple={true}
        label="Select PDF Files (multiple)"
      />

      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Order of Files ({files.length})</h3>
            <button
              onClick={() => setFiles([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between bg-gray-50 p-3 rounded-lg cursor-move transition-all ${
                  draggedIndex === index ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  <Bars3Icon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{index + 1}. {file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Merging PDFs...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <button
        onClick={handleMerge}
        disabled={files.length < 2 || loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            Merging...
          </>
        ) : (
          <>
            <PlusIcon className="h-5 w-5" />
            Merge {files.length} PDFs
          </>
        )}
      </button>
    </div>
  )
}
