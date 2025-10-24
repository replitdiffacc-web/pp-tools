import { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ArrowDownTrayIcon, MusicalNoteIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

const API_URL = '/api'

export default function YouTubeDownloader() {
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState('mp3')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState(null) // Added state for download URL
  const [videoInfo, setVideoInfo] = useState(null) // Added state for video info if needed

  const validateYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/
    return youtubeRegex.test(url)
  }

  const handleDownload = async () => {
    if (!url) {
      toast.error('Please enter a valid YouTube URL')
      return
    }

    setLoading(true)
    setProgress(0)
    setDownloadUrl(null)
    setVideoInfo(null)

    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    let eventSource = null

    try {
      // Start listening to progress updates
      eventSource = new EventSource(`${API_URL}/youtube/progress/${taskId}`)

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

      const payload = {
        url,
        format,
        task_id: taskId
      }

      const response = await axios.post(`${API_URL}/youtube/download`, payload, {
        responseType: 'blob'
      })

      setProgress(100)

      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      setDownloadUrl(downloadUrl)

      const contentDisposition = response.headers['content-disposition']
      let filename = `video.${format}`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()

      toast.success('Download complete!')
    } catch (error) {
      let errorMsg = error.response?.data?.error || error.message || 'Error downloading video'
      if (/sign in to confirm/i.test(errorMsg) || /please sign in/i.test(errorMsg)) {
        errorMsg = "YouTube asked for verification. Try again in a moment or with a different video."
      }
      toast.error(errorMsg)
    } finally {
      eventSource?.close()
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">YouTube Downloader</h2>
        <p className="text-gray-600">Download YouTube videos as MP3 or MP4</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Download Format
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setFormat('mp3')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                format === 'mp3'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <MusicalNoteIcon className="h-5 w-5" />
              MP3 (Audio)
            </button>
            <button
              onClick={() => setFormat('mp4')}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                format === 'mp4'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <VideoCameraIcon className="h-5 w-5" />
              MP4 (Video)
            </button>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
          We automatically retry the download using multiple YouTube client profiles to dodge the
          "confirm you&apos;re not a bot" prompt—no cookies required.
        </div>

        {loading && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              {progress < 100 ? 'Downloading...' : 'Preparing file...'}
            </p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              Downloading...
            </>
          ) : (
            <>
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download {format.toUpperCase()}
            </>
          )}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Paste a YouTube URL in the field above</li>
          <li>2. Choose your preferred format (MP3 for audio or MP4 for video)</li>
          <li>3. Click the Download button to save the file to your device</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Please respect copyright laws and only download content you have permission to use.
        </p>
      </div>
    </div>
  )
}