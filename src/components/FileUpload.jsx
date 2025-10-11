import { useState, useRef, useEffect } from 'react'
import { CloudArrowUpIcon, DocumentIcon, PhotoIcon } from '@heroicons/react/24/outline'

export default function FileUpload({ 
  onFileSelect, 
  accept = '*', 
  multiple = false,
  file = null,
  files = null,
  label = 'Choose File',
  allowPaste = true
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [showPasteHint, setShowPasteHint] = useState(false)
  const fileInputRef = useRef(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    if (!allowPaste) return

    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const pastedFile = item.getAsFile()
          if (pastedFile) {
            if (multiple) {
              onFileSelect([pastedFile])
            } else {
              onFileSelect(pastedFile)
            }
            setShowPasteHint(true)
            setTimeout(() => setShowPasteHint(false), 2000)
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [allowPaste, multiple, onFileSelect])

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault()
      dragCounter.current++
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDraggingOver(true)
      }
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDraggingOver(false)
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
    }

    const handleDrop = (e) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDraggingOver(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) {
        if (multiple) {
          onFileSelect(droppedFiles)
        } else {
          onFileSelect(droppedFiles[0])
        }
      }
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [multiple, onFileSelect])

  const handleFileInputChange = (e) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      if (multiple) {
        onFileSelect(Array.from(selectedFiles))
      } else {
        onFileSelect(selectedFiles[0])
      }
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const isImage = (fileName) => {
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName)
  }

  return (
    <>
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary-50/95 backdrop-blur-sm">
          <CloudArrowUpIcon className="h-24 w-24 text-primary-600 mb-4" />
          <p className="text-2xl font-bold text-primary-700 mb-2">Drop files anywhere</p>
          <p className="text-lg text-primary-600">Release to upload</p>
        </div>
      )}

      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700">{label}</label>
        )}
        
        <div
          className="relative border-2 border-dashed rounded-lg transition-all border-gray-300 hover:border-gray-400"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onClick={handleClick}
            className="px-6 py-8 text-center cursor-pointer"
          >
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">
              {file || (files && files.length > 0) 
                ? 'Change file' 
                : multiple 
                  ? 'Click to upload or drag and drop multiple files'
                  : 'Click to upload or drag and drop'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {allowPaste && `You can also paste images (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + V)`}
            </p>
          </div>
        </div>

        {file && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            {isImage(file.name) ? (
              <PhotoIcon className="h-5 w-5 text-primary-600 flex-shrink-0" />
            ) : (
              <DocumentIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
            )}
            <span className="text-sm text-gray-700 truncate">{file.name}</span>
            <span className="text-xs text-gray-500 ml-auto flex-shrink-0">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        )}

        {files && files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Selected Files ({files.length})</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {files.map((f, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  {isImage(f.name) ? (
                    <PhotoIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                  ) : (
                    <DocumentIcon className="h-4 w-4 text-gray-600 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPasteHint && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <CheckIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-700">File pasted successfully!</span>
          </div>
        )}
      </div>
    </>
  )
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
