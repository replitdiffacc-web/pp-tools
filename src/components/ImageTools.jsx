import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import FileUpload from './FileUpload'

const API_URL = '/api'

export default function ImageTools() {
  const [tool, setTool] = useState('invert')
  const [file, setFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [width, setWidth] = useState('800')
  const [height, setHeight] = useState('600')
  const [fontSize, setFontSize] = useState('24')
  const [loading, setLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [outputFilename, setOutputFilename] = useState('')

  const handleProcess = async () => {
    if (tool === 'invert' && !file) {
      toast.error('Please select an image to invert')
      return
    }
    if (tool === 'text-to-image' && !textInput) {
      toast.error('Please enter text to convert to image')
      return
    }

    setLoading(true)
    setDownloadUrl(null)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    try {
      // Start listening to progress updates (though these operations are fast)
      eventSource = new EventSource(`${API_URL}/progress/${taskId}`)
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
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

      let response
      
      if (tool === 'invert') {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('task_id', taskId)
        response = await axios.post(`${API_URL}/image/invert`, formData, {
          responseType: 'blob'
        })
        const baseName = file.name.split('.').slice(0, -1).join('.')
        setOutputFilename(`${baseName}_inverted.png`)
      } else if (tool === 'text-to-image') {
        response = await axios.post(`${API_URL}/text/to-image`, {
          text: textInput,
          width: parseInt(width) || 800,
          height: parseInt(height) || 600,
          font_size: parseInt(fontSize) || 24,
          task_id: taskId
        }, {
          responseType: 'blob'
        })
        setOutputFilename('text_image.png')
      }

      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      
      toast.success('Image processed successfully!')
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Error processing image'
      toast.error(errorMsg)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!downloadUrl) return

    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', outputFilename)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTool('invert')}
          className={`p-4 rounded-lg border-2 transition-all ${
            tool === 'invert'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className="font-semibold text-lg mb-1">Invert Colors</h3>
          <p className="text-sm text-gray-600">Invert the colors of an image</p>
        </button>
        
        <button
          onClick={() => setTool('text-to-image')}
          className={`p-4 rounded-lg border-2 transition-all ${
            tool === 'text-to-image'
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <h3 className="font-semibold text-lg mb-1">Text to Image</h3>
          <p className="text-sm text-gray-600">Convert text to an image</p>
        </button>
      </div>

      {tool === 'invert' && (
        <div className="space-y-4">
          <FileUpload
            onFileSelect={setFile}
            file={file}
            label="Choose Image"
            allowPaste={true}
          />
        </div>
      )}

      {tool === 'text-to-image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Text
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={6}
              placeholder="Type your text here..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Width (px)
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Height (px)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="24"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleProcess}
          disabled={loading}
          className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Processing...' : 'Process Image'}
        </button>

        {downloadUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download
          </button>
        )}
      </div>

      {downloadUrl && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Preview:</p>
          <img src={downloadUrl} alt="Processed" className="max-w-full h-auto rounded-lg border border-gray-200" />
        </div>
      )}
    </div>
  )
}
