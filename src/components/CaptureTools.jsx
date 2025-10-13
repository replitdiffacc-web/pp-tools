import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { CameraIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline'
import CustomDropdown from './CustomDropdown'
import FileUpload from './FileUpload';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const API_URL = '/api'

export default function CaptureTools() {
  const [url, setUrl] = useState('')
  const [tool, setTool] = useState('pdf')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [copied, setCopied] = useState(false)
  const [pdfFiles, setPdfFiles] = useState([]);

  const tools = [
    { id: 'pdf', label: 'Save as PDF', ext: 'pdf' },
    { id: 'png', label: 'PNG Screenshot', ext: 'png' },
    { id: 'jpg', label: 'JPG Screenshot', ext: 'jpg' }
  ]

  const mergeTool = { id: 'merge-pdf', label: 'Merge PDFs', ext: 'pdf' };

  const allTools = [...tools, mergeTool];

  const toolOptions = allTools.map(t => ({
    value: t.id,
    label: t.label
  }))

  const handleCapture = async () => {
    if (!url) {
      alert('Please enter a valid URL')
      return
    }

    setLoading(true)
    setProgress(0)
    setDownloadUrl(null)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

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

      const response = await axios.post(
        `${API_URL}/capture/${tool}`,
        { url, task_id: taskId },
        { responseType: 'blob' }
      )

      setProgress(100)

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]))
      setDownloadUrl(blobUrl)

      const link = document.createElement('a')
      link.href = blobUrl
      const ext = allTools.find(t => t.id === tool)?.ext
      link.setAttribute('download', `website.${ext}`)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success('Website captured successfully!')
    } catch (error) {
      eventSource?.close()
      toast.error('Error capturing website: ' + error.message)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  const handleMergePdf = async () => {
    if (pdfFiles.length < 2) {
      alert('Please upload at least two PDF files to merge.')
      return;
    }

    setLoading(true);
    setProgress(0);
    setDownloadUrl(null);

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    const formData = new FormData();
    pdfFiles.forEach(file => formData.append('files', file));
    formData.append('task_id', taskId);

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
      });

      setProgress(100);

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(blobUrl);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'merged.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDFs merged successfully!');
    } catch (error) {
      eventSource?.close()
      toast.error('Error merging PDFs: ' + error.message);
    } finally {
      eventSource?.close()
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (downloadUrl) {
      navigator.clipboard.writeText(downloadUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: ({current: {delta: {x, y}}}) => ({x, y}),
    })
  );

  const handleDragEnd = (event) => {
    const {active, over} = event;

    if (active.id !== over.id) {
      setPdfFiles(prevFiles => {
        const oldIndex = prevFiles.findIndex(file => file.id === active.id);
        const newIndex = prevFiles.findIndex(file => file.id === over.id);
        return arrayMove(prevFiles, oldIndex, newIndex);
      });
    }
  };

  const handleFileUpload = (acceptedFiles) => {
    setPdfFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.map(file => Object.assign(file, { id: crypto.randomUUID() }))
    ]);
  };

  const removeFile = (fileId) => {
    setPdfFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  };


  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Capture and Convert</h2>
        <p className="text-gray-600">Capture websites as images or PDFs, or merge existing PDFs.</p>
      </div>

      {tool === 'merge-pdf' ? (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-gray-800 text-center">Merge PDFs</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={pdfFiles.map(file => file.id)}
              strategy={verticalListSortingStrategy}
            >
              <FileUpload
                onFileSelect={handleFileUpload}
                files={pdfFiles}
                accept=".pdf"
                label="Click to upload or drag and drop PDF files"
                removeFile={removeFile}
                isMultiple={true}
                sortable={true}
              />
            </SortableContext>
          </DndContext>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Processing PDFs...</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}

          <button
            onClick={handleMergePdf}
            disabled={pdfFiles.length < 2 || loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Merging...
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-5 w-5" />
                Merge PDFs
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <CustomDropdown
            value={tool}
            onChange={setTool}
            options={toolOptions}
            label="Tool"
          />
        </div>
      )}

      {!loading && downloadUrl && (
        <div className="flex gap-4 justify-center">
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
        </div>
      )}

      {tool !== 'merge-pdf' && loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Capturing website...</span>
            <span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {tool !== 'merge-pdf' && (
        <div className="flex gap-4">
          <button
            onClick={handleCapture}
            disabled={!url || loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                Capturing...
              </>
            ) : (
              <>
                <CameraIcon className="h-5 w-5" />
                Capture Website
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}