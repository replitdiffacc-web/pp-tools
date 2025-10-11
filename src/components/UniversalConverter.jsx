import { useState, useEffect } from 'react'
import axios from 'axios'
import { ArrowDownTrayIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import FileUpload from './FileUpload'
import CustomDropdown from './CustomDropdown'

const API_URL = '/api'

const formatCategories = {
  archive: ['7z', 'ace', 'alz', 'arc', 'arj', 'bz', 'bz2', 'cab', 'cpio', 'deb', 'dmg', 'gz', 'img', 'iso', 'jar', 'lha', 'lz', 'lzma', 'lzo', 'rar', 'rpm', 'rz', 'tar', 'tar.7z', 'tar.bz', 'tar.bz2', 'tar.gz', 'tar.lzo', 'tar.xz', 'tar.z', 'tbz', 'tbz2', 'tgz', 'tz', 'tzo', 'xz', 'z', 'zip'],
  audio: ['aac', 'ac3', 'aif', 'aifc', 'aiff', 'amr', 'au', 'caf', 'dss', 'flac', 'm4a', 'm4b', 'mp3', 'oga', 'voc', 'wav', 'weba', 'wma'],
  cad: ['dwg', 'dxf'],
  document: ['abw', 'djvu', 'doc', 'docm', 'docx', 'dot', 'dotx', 'html', 'hwp', 'lwp', 'md', 'odt', 'pages', 'pdf', 'rst', 'rtf', 'tex', 'txt', 'wpd', 'wps', 'zabw'],
  ebook: ['azw', 'azw3', 'azw4', 'cbc', 'cbr', 'cbz', 'chm', 'epub', 'fb2', 'htm', 'htmlz', 'lit', 'lrf', 'mobi', 'pdb', 'pml', 'prc', 'rb', 'snb', 'tcr', 'txtz'],
  font: ['eot', 'otf', 'ttf', 'woff', 'woff2'],
  image: ['3fr', 'arw', 'avif', 'bmp', 'cr2', 'cr3', 'crw', 'dcr', 'dng', 'eps', 'erf', 'gif', 'heic', 'heif', 'icns', 'ico', 'jfif', 'jpeg', 'jpg', 'mos', 'mrw', 'nef', 'odd', 'odg', 'orf', 'pef', 'png', 'ppm', 'ps', 'psd', 'pub', 'raf', 'raw', 'rw2', 'tif', 'tiff', 'webp', 'x3f', 'xcf', 'xps'],
  'image-tools': ['invert', 'text-to-image'],
  presentation: ['dps', 'key', 'odp', 'pot', 'potx', 'pps', 'ppsx', 'ppt', 'pptm', 'pptx'],
  spreadsheet: ['csv', 'et', 'numbers', 'ods', 'xls', 'xlsm', 'xlsx'],
  vector: ['ai', 'cdr', 'cgm', 'emf', 'sk', 'sk1', 'svg', 'svgz', 'vsd', 'wmf'],
  video: ['3g2', '3gp', '3gpp', 'avi', 'cavs', 'dv', 'dvr', 'flv', 'm2ts', 'm4v', 'mkv', 'mod', 'mov', 'mp4', 'mpeg', 'mpg', 'mts', 'mxf', 'ogg', 'rm', 'rmvb', 'swf', 'ts', 'vob', 'webm', 'wmv', 'wtv']
}

export default function UniversalConverter() {
  const [file, setFile] = useState(null)
  const [files, setFiles] = useState([])
  const [category, setCategory] = useState('image')
  const [outputFormat, setOutputFormat] = useState('png')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [convertedBlob, setConvertedBlob] = useState(null)
  const [outputFilename, setOutputFilename] = useState('')
  const [copied, setCopied] = useState(false)
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [textInput, setTextInput] = useState('')
  const [fontSize, setFontSize] = useState('24')

  useEffect(() => {
    setOutputFormat(formatCategories[category][0])
  }, [category])

  const handleConvert = async () => {
    if (category === 'image-tools' && outputFormat === 'text-to-image' && !textInput) {
      alert('Please enter text to convert to image')
      return
    }
    if (category !== 'image-tools' && !file && files.length === 0) return
    
    setLoading(true)
    setProgress(0)
    setDownloadUrl(null)
    setConvertedBlob(null)

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      let endpoint = ''
      let response
      
      if (category === 'image-tools') {
        if (outputFormat === 'invert') {
          const formData = new FormData()
          formData.append('file', file)
          response = await axios.post(`${API_URL}/image/invert`, formData, {
            responseType: 'blob'
          })
        } else if (outputFormat === 'text-to-image') {
          response = await axios.post(`${API_URL}/text/to-image`, {
            text: textInput,
            width: width || 800,
            height: height || 600,
            font_size: parseInt(fontSize) || 24
          }, {
            responseType: 'blob'
          })
        }
      } else {
        const formData = new FormData()
        
        // Handle multiple files
        if (files.length > 0) {
          files.forEach(f => {
            formData.append('files', f)
          })
        } else if (file) {
          formData.append('file', file)
        }
        
        formData.append('format', outputFormat)
        if (width) formData.append('width', width)
        if (height) formData.append('height', height)

        if (category === 'image') {
          endpoint = '/image/convert'
        } else if (category === 'audio') {
          endpoint = '/audio/convert'
        } else if (category === 'video') {
          endpoint = '/video/convert'
        } else if (category === 'document') {
          endpoint = '/office/to-pdf'
        } else if (category === 'archive') {
          endpoint = '/archive/extract'
        } else {
          endpoint = '/image/convert'
        }

        response = await axios.post(`${API_URL}${endpoint}`, formData, {
          responseType: 'blob'
        })
      }
      
      clearInterval(progressInterval)
      setProgress(100)
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      setDownloadUrl(url)
      setConvertedBlob(blob)
      
      if (category === 'image-tools' && outputFormat === 'text-to-image') {
        setOutputFilename('text_image.png')
      } else if (category === 'image-tools' && outputFormat === 'invert') {
        const baseName = file.name.split('.').slice(0, -1).join('.')
        setOutputFilename(`${baseName}_inverted.png`)
      } else if (files.length > 1) {
        setOutputFilename(`converted_images_${outputFormat}.zip`)
      } else {
        const fileName = file?.name || files[0]?.name
        const baseName = fileName.split('.').slice(0, -1).join('.')
        setOutputFilename(`${baseName}.${outputFormat}`)
      }
    } catch (error) {
      clearInterval(progressInterval)
      alert('Error converting file: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const [showSaveModal, setShowSaveModal] = useState(false)

  const handleDownload = () => {
    if (!downloadUrl || !convertedBlob) return
    setShowSaveModal(true)
  }

  const confirmDownload = async (saveToHistory) => {
    if (saveToHistory) {
      try {
        const formData = new FormData()
        
        // Handle multiple files or single file
        const origFilename = files.length > 1 
          ? files.map(f => f.name).join(', ')
          : (file?.name || files[0]?.name)
        
        formData.append('original_filename', origFilename)
        formData.append('output_filename', outputFilename)
        formData.append('conversion_type', `${category}_to_${outputFormat}`)
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

  const copyToClipboard = () => {
    if (downloadUrl) {
      navigator.clipboard.writeText(downloadUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getCategoryLabel = (cat) => {
    if (cat === 'image-tools') return 'Image Tools'
    return cat.charAt(0).toUpperCase() + cat.slice(1)
  }

  const categoryOptions = Object.keys(formatCategories).map(cat => ({
    value: cat,
    label: getCategoryLabel(cat)
  }))
  
  const formatOptions = formatCategories[category].map(format => ({
    value: format,
    label: format.toUpperCase()
  }))

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Universal File Converter</h2>
        <p className="text-gray-600">Convert between hundreds of file formats instantly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <CustomDropdown
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            label="Select File Category"
          />

          {category === 'image-tools' && outputFormat === 'text-to-image' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Text</label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your text here..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows="6"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="800"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="600"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                  <input
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    placeholder="24"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <FileUpload
                onFileSelect={(selected) => {
                  if (Array.isArray(selected)) {
                    setFiles(selected)
                    setFile(null)
                  } else {
                    setFile(selected)
                    setFiles([])
                  }
                }}
                file={file}
                files={files}
                multiple={true}
                label={files.length > 0 ? `Choose Files (${files.length} selected)` : "Choose Files"}
                allowPaste={category === 'image' || category === 'image-tools'}
              />

              {(category === 'image' || (category === 'image-tools' && outputFormat === 'invert')) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Width (optional)</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="Auto"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (optional)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="Auto"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <CustomDropdown
            value={outputFormat}
            onChange={setOutputFormat}
            options={formatOptions}
            label="Output Format"
            searchable={true}
          />

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Supported Formats ({formatCategories[category].length})</h4>
            <div className="flex flex-wrap gap-1">
              {formatCategories[category].slice(0, 20).map(format => (
                <span key={format} className="text-xs px-2 py-1 bg-white rounded border border-gray-200 text-gray-600">
                  {format.toUpperCase()}
                </span>
              ))}
              {formatCategories[category].length > 20 && (
                <span className="text-xs px-2 py-1 text-gray-500">
                  +{formatCategories[category].length - 20} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Converting...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleConvert}
          disabled={(!file && files.length === 0) || loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Converting...
            </>
          ) : (
            <>
              Convert {files.length > 0 ? `${files.length} Files` : 'File'}
            </>
          )}
        </button>

        {downloadUrl && (
          <>
            <button
              onClick={handleDownload}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download
            </button>
            <button
              onClick={copyToClipboard}
              className="btn-secondary flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-5 w-5 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-5 w-5" />
                  Copy Link
                </>
              )}
            </button>
          </>
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
