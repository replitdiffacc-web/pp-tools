import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { QrCodeIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import FileUpload from './FileUpload'

const API_URL = '/api'

export default function QRTools() {
  const [mode, setMode] = useState('generate')
  const [qrData, setQrData] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qrImage, setQrImage] = useState(null)
  const [decodedData, setDecodedData] = useState(null)

  const handleGenerate = async () => {
    if (!qrData) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    try {
      const url = new URL(qrData.startsWith('http') ? qrData : `https://${qrData}`)
      if (!url.hostname.includes('.')) {
        throw new Error('Invalid URL')
      }
    } catch (error) {
      toast.error('Please enter a valid website URL (e.g., https://example.com)')
      return
    }

    setLoading(true)
    setQrImage(null)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    try {
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

      const response = await axios.post(
        `${API_URL}/qr/generate`,
        { data: qrData, task_id: taskId },
        { responseType: 'blob' }
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      setQrImage(url)

      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'qrcode.png')
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      toast.success('QR code generated successfully!')
      eventSource?.close()
    } catch (error) {
      eventSource?.close()
      toast.error('Error generating QR code: ' + error.message)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  const handleDecode = async () => {
    if (!file) {
      toast.error('Please select an image file')
      return
    }

    setLoading(true)
    setDecodedData(null)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    const formData = new FormData()
    formData.append('file', file)
    formData.append('task_id', taskId)

    try {
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

      const response = await axios.post(`${API_URL}/qr/decode`, formData)
      setDecodedData(response.data)
      toast.success('QR/Barcode decoded successfully!')
      eventSource?.close()
    } catch (error) {
      eventSource?.close()
      toast.error('Error decoding: ' + error.message)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">QR Code Tools</h2>
        <p className="text-gray-600">Generate and decode QR codes & barcodes</p>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={() => setMode('generate')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mode === 'generate'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <QrCodeIcon className="h-5 w-5 inline mr-2" />
          Generate QR Code
        </button>
        <button
          onClick={() => setMode('decode')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mode === 'decode'
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MagnifyingGlassIcon className="h-5 w-5 inline mr-2" />
          Decode QR/Barcode
        </button>
      </div>

      {mode === 'generate' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter Website URL</label>
            <textarea
              value={qrData}
              onChange={(e) => setQrData(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows="4"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!qrData || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Generating...
              </>
            ) : (
              <>
                <QrCodeIcon className="h-5 w-5" />
                Generate QR Code
              </>
            )}
          </button>

          {qrImage && (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <img src={qrImage} alt="QR Code" className="mx-auto max-w-xs border-2 border-gray-200 rounded" />
              <a
                href={qrImage}
                download="qrcode.png"
                className="btn-secondary inline-flex items-center gap-2 mt-4"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Download Again
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FileUpload
            onFileSelect={setFile}
            file={file}
            accept="image/*"
            label="Click to upload or drag and drop image"
            allowPaste={true}
          />

          <button
            onClick={handleDecode}
            disabled={!file || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Decoding...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-5 w-5" />
                Decode Image
              </>
            )}
          </button>

          {decodedData && (
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Decoded Results:</h3>
              {decodedData.codes && decodedData.codes.length > 0 ? (
                <div className="space-y-3">
                  {decodedData.codes.map((code, index) => {
                    const isUrl = code.data.startsWith('http://') || code.data.startsWith('https://') || code.data.startsWith('www.')
                    const url = code.data.startsWith('www.') ? `https://${code.data}` : code.data

                    return (
                      <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                        {isUrl ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 underline font-medium break-all"
                          >
                            {code.data}
                          </a>
                        ) : (
                          <p className="font-mono text-gray-800 break-all">{code.data}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-600">No QR code or barcode detected in the image.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}