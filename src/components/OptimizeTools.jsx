import { useState } from 'react'
import axios from 'axios'
import { SparklesIcon, InformationCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import FileUpload from './FileUpload'
import CustomDropdown from './CustomDropdown'

const API_URL = '/api'

export default function OptimizeTools() {
  const [file, setFile] = useState(null)
  const [tool, setTool] = useState('compress-pdf')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [lang, setLang] = useState('eng')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [convertedBlob, setConvertedBlob] = useState(null)
  const [outputFilename, setOutputFilename] = useState('')

  const tools = [
    { id: 'compress-pdf', label: 'Compress PDF', accept: '.pdf' },
    { id: 'compress-png', label: 'Compress PNG', accept: '.png' },
    { id: 'compress-jpg', label: 'Compress JPG', accept: '.jpg,.jpeg' },
    { id: 'pdf-ocr', label: 'PDF to Text', info: 'OCR - Optical Character Recognition', accept: '.pdf' },
    { id: 'image-ocr', label: 'Image to Text', info: 'OCR - Optical Character Recognition', accept: 'image/*' }
  ]

  const toolOptions = tools.map(t => ({
    value: t.id,
    label: t.label
  }))

  const [showSaveModal, setShowSaveModal] = useState(false)

  const handleDownload = () => {
    if (!downloadUrl || !convertedBlob) return
    setShowSaveModal(true)
  }

  const confirmDownload = async (saveToHistory) => {
    if (saveToHistory) {
      try {
        const formData = new FormData()
        formData.append('original_filename', file.name)
        formData.append('output_filename', outputFilename)
        formData.append('conversion_type', tool)
        formData.append('file', convertedBlob, outputFilename)

        await axios.post(`${API_URL}/history/save`, formData, { withCredentials: true })
      } catch (error) {
        console.error('Error saving to history:', error)
      }
    }

    const link = document.createElement('a')
    link.href = downloadUrl
    link.setAttribute('download', outputFilename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    setShowSaveModal(false)
  }

  const handleProcess = async () => {
    if (!file) return

    setLoading(true)
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    const formData = new FormData()
    formData.append('file', file)
    if (tool.includes('ocr')) {
      formData.append('lang', lang)
    }

    try {
      let endpoint = ''
      if (tool.includes('ocr')) {
        endpoint = tool.includes('pdf') ? '/ocr/pdf' : '/ocr/image'
      } else {
        endpoint = `/optimize/${tool}`
      }

      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        responseType: tool.includes('ocr') ? 'json' : 'blob'
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (tool.includes('ocr')) {
        const text = response.data.text || 'No text detected'
        const blob = new Blob([text], { type: 'text/plain' })
        setConvertedBlob(blob)
        setOutputFilename('extracted_text.txt')
        setDownloadUrl(window.URL.createObjectURL(blob))
      } else {
        setConvertedBlob(response.data)
        const ext = file.name.split('.').pop()
        setOutputFilename(`compressed.${ext}`)
        setDownloadUrl(window.URL.createObjectURL(new Blob([response.data])))
      }
    } catch (error) {
      clearInterval(progressInterval)
      alert('Error processing file: ' + error.message)
      setDownloadUrl(null)
      setConvertedBlob(null)
      setOutputFilename('')
    } finally {
      setLoading(false)
    }
  }

  const currentTool = tools.find(t => t.id === tool)

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Optimize & Extract Tools</h2>
        <p className="text-gray-600">Compress files and extract text from documents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <CustomDropdown
            value={tool}
            onChange={(value) => {
              setTool(value)
              setFile(null)
              setDownloadUrl(null)
              setConvertedBlob(null)
              setOutputFilename('')
            }}
            options={toolOptions}
            label="Select Tool"
          />
          {currentTool?.info && (
            <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
              <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{currentTool.info}</span>
            </div>
          )}
          {tool.includes('ocr') && (
            <div className="mt-4">
              <CustomDropdown
                value={lang}
                onChange={setLang}
                options={[
                  { value: 'eng', label: 'English' },
                  { value: 'spa', label: 'Spanish' },
                  { value: 'fra', label: 'French' },
                  { value: 'deu', label: 'German' },
                ]}
                label="OCR Language"
              />
            </div>
          )}
        </div>

        <FileUpload
          onFileSelect={setFile}
          file={file}
          accept={currentTool?.accept}
          label="Click to upload or drag and drop"
        />
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Processing...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleProcess}
          disabled={!file || loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Processing...
            </>
          ) : (
            <>
              Process File
            </>
          )}
        </button>

        {downloadUrl && (
          <button
            onClick={handleDownload}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download
          </button>
        )}
      </div>

      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Save to History?</h3>
            <p className="text-gray-600 mb-6">
              Would you like to save this conversion to your download history?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => confirmDownload(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                No, Just Download
              </button>
              <button
                onClick={() => confirmDownload(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Yes, Save & Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}