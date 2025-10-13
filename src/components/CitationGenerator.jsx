
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import axios from 'axios'
import { 
  ClipboardDocumentIcon, 
  CheckIcon, 
  PlusIcon, 
  TrashIcon,
  BookmarkIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  PencilSquareIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import CustomDropdown from './CustomDropdown'

const API_URL = '/api'

export default function CitationGenerator() {
  const [sourceType, setSourceType] = useState('website')
  const [citationStyle, setCitationStyle] = useState('apa')
  const [formData, setFormData] = useState({})
  const [citations, setCitations] = useState([])
  const [savedCitations, setSavedCitations] = useState([])
  const [copied, setCopied] = useState(null)
  const [isFetching, setIsFetching] = useState(false)
  const [user, setUser] = useState(null)
  const [selectedCitations, setSelectedCitations] = useState([])
  const [editingCitation, setEditingCitation] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, { withCredentials: true })
      setUser(response.data.email)
      if (response.data.email) {
        loadSavedCitations()
      }
    } catch (error) {
      setUser(null)
    }
  }

  const loadSavedCitations = async () => {
    try {
      const response = await axios.get(`${API_URL}/citations`, { withCredentials: true })
      setSavedCitations(response.data.citations)
    } catch (error) {
      console.error('Error loading citations:', error)
    }
  }

  const sourceTypes = {
    website: {
      label: 'Website',
      fields: ['author', 'title', 'url', 'accessDate', 'publishDate']
    },
    book: {
      label: 'Book',
      fields: ['author', 'title', 'publisher', 'year', 'city', 'edition', 'isbn']
    },
    journal: {
      label: 'Journal Article',
      fields: ['author', 'title', 'journal', 'volume', 'issue', 'pages', 'year', 'doi']
    },
    newspaper: {
      label: 'Newspaper Article',
      fields: ['author', 'title', 'newspaper', 'publishDate', 'url', 'pages']
    },
    magazine: {
      label: 'Magazine Article',
      fields: ['author', 'title', 'magazine', 'publishDate', 'pages', 'volume']
    },
    video: {
      label: 'Video',
      fields: ['author', 'title', 'platform', 'url', 'publishDate', 'duration']
    },
    podcast: {
      label: 'Podcast',
      fields: ['host', 'title', 'series', 'publisher', 'publishDate', 'url', 'episode']
    },
    report: {
      label: 'Report/Document',
      fields: ['author', 'title', 'organization', 'year', 'url', 'reportNumber']
    },
    thesis: {
      label: 'Thesis/Dissertation',
      fields: ['author', 'title', 'year', 'institution', 'degreeType', 'url']
    },
    conference: {
      label: 'Conference Paper',
      fields: ['author', 'title', 'conference', 'location', 'year', 'pages', 'doi']
    }
  }

  const fieldLabels = {
    author: 'Author(s)',
    title: 'Title',
    url: 'URL',
    accessDate: 'Access Date',
    publishDate: 'Publication Date',
    publisher: 'Publisher',
    year: 'Year',
    city: 'City',
    journal: 'Journal Name',
    volume: 'Volume',
    issue: 'Issue',
    pages: 'Pages',
    doi: 'DOI',
    newspaper: 'Newspaper Name',
    magazine: 'Magazine Name',
    platform: 'Platform',
    host: 'Host',
    series: 'Series',
    organization: 'Organization',
    edition: 'Edition',
    isbn: 'ISBN',
    duration: 'Duration',
    episode: 'Episode Number',
    reportNumber: 'Report Number',
    institution: 'Institution',
    degreeType: 'Degree Type',
    conference: 'Conference Name',
    location: 'Location'
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const autoFetchMetadata = async () => {
    const url = formData.url
    if (!url) {
      toast.error('Please enter a URL first')
      return
    }

    setIsFetching(true)
    try {
      const response = await axios.post(`${API_URL}/citations/fetch-metadata`, { url })
      const metadata = response.data

      setFormData(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        author: metadata.author || prev.author,
        publishDate: metadata.publishDate || prev.publishDate,
        accessDate: metadata.accessDate || prev.accessDate
      }))

      toast.success('Metadata fetched successfully!')
    } catch (error) {
      toast.error('Failed to fetch metadata: ' + (error.response?.data?.error || error.message))
    } finally {
      setIsFetching(false)
    }
  }

  const generateCitation = (data = formData, style = citationStyle, type = sourceType) => {
    const { author, title, url, accessDate, publishDate, publisher, year, city, journal, volume, issue, pages, doi, newspaper, magazine, platform, host, series, organization, edition, isbn, duration, episode, reportNumber, institution, degreeType, conference, location } = data

    // Check if all key fields are missing
    const hasAuthor = author && author.trim()
    const hasTitle = title && title.trim()
    const hasUrl = url && url.trim()
    const hasYear = year || publishDate
    
    if (!hasAuthor && !hasTitle && !hasUrl && !hasYear) {
      return '[Unknown source]'
    }

    // Helper to get current date in various formats
    const getCurrentDate = (format = 'en-US') => {
      const date = new Date()
      if (format === 'en-GB') {
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      }
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }

    // Helper to format author name (alphabetical sorting handled by user)
    const formatAuthor = () => {
      if (hasAuthor) return author.trim()
      if (organization) return organization.trim()
      if (hasTitle) return null // Start with title if no author
      return null
    }

    // Helper to get year from various date fields
    const getYear = () => {
      if (year) return year
      if (publishDate) {
        try {
          return new Date(publishDate).getFullYear()
        } catch {
          return publishDate
        }
      }
      return 'n.d.'
    }

    // Helper to get title or fallback
    const getTitle = () => {
      if (hasTitle) return title.trim()
      if (platform) return platform.trim()
      if (journal) return journal.trim()
      return '[Untitled]'
    }

    // Prefer DOI over URL
    const getIdentifier = () => {
      if (doi) return `https://doi.org/${doi}`
      if (hasUrl) return url.trim()
      return null
    }

    let generatedCitation = ''

    try {
      const authorName = formatAuthor()
      const titleText = getTitle()
      const yearText = getYear()
      const identifier = getIdentifier()

      switch (style) {
        case 'apa':
          switch (type) {
            case 'website':
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}.`
              } else {
                generatedCitation = `${titleText}. (${yearText}).`
              }
              if (identifier) {
                const needsAccessDate = !doi && hasUrl
                if (needsAccessDate) {
                  const accessDateText = accessDate || getCurrentDate()
                  generatedCitation += ` Retrieved ${accessDateText}, from ${identifier}`
                } else {
                  generatedCitation += ` ${identifier}`
                }
              }
              break
              
            case 'book':
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}`
              } else {
                generatedCitation = `${titleText}. (${yearText})`
              }
              if (edition) generatedCitation += ` (${edition} ed.)`
              generatedCitation += '.'
              if (publisher) generatedCitation += ` ${publisher}.`
              if (doi) generatedCitation += ` https://doi.org/${doi}`
              else if (isbn) generatedCitation += ` ISBN: ${isbn}`
              break
              
            case 'journal':
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}.`
              } else {
                generatedCitation = `${titleText}. (${yearText}).`
              }
              if (journal) generatedCitation += ` ${journal}`
              const volIssue = []
              if (volume) volIssue.push(volume)
              if (issue) volIssue.push(`(${issue})`)
              if (volIssue.length > 0) generatedCitation += `, ${volIssue.join('')}`
              if (pages) generatedCitation += `, ${pages}`
              generatedCitation += '.'
              if (identifier) generatedCitation += ` ${identifier}`
              break
              
            case 'thesis':
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}`
              } else {
                generatedCitation = `${titleText}. (${yearText})`
              }
              if (degreeType) generatedCitation += ` [${degreeType}]`
              generatedCitation += '.'
              if (institution) generatedCitation += ` ${institution}.`
              if (identifier) generatedCitation += ` ${identifier}`
              break
              
            case 'conference':
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}.`
              } else {
                generatedCitation = `${titleText}. (${yearText}).`
              }
              if (conference) generatedCitation += ` In ${conference}`
              if (pages) generatedCitation += ` (pp. ${pages})`
              generatedCitation += '.'
              if (location) generatedCitation += ` ${location}.`
              if (identifier) generatedCitation += ` ${identifier}`
              break
              
            default:
              if (authorName) {
                generatedCitation = `${authorName}. (${yearText}). ${titleText}.`
              } else {
                generatedCitation = `${titleText}. (${yearText}).`
              }
              if (identifier) generatedCitation += ` ${identifier}`
          }
          break

        case 'mla':
          switch (type) {
            case 'website':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}."`
              if (platform) generatedCitation += ` ${platform},`
              generatedCitation += ` ${yearText}.`
              if (identifier) {
                generatedCitation += ` ${identifier}.`
                if (!doi && hasUrl) {
                  const accessDateText = accessDate || getCurrentDate()
                  generatedCitation += ` Accessed ${accessDateText}.`
                }
              }
              break
              
            case 'book':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `${titleText}.`
              if (edition) generatedCitation += ` ${edition} ed.,`
              if (publisher) generatedCitation += ` ${publisher},`
              generatedCitation += ` ${yearText}.`
              if (doi) generatedCitation += ` https://doi.org/${doi}.`
              break
              
            case 'journal':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}."`
              if (journal) generatedCitation += ` ${journal},`
              if (volume) generatedCitation += ` vol. ${volume},`
              if (issue) generatedCitation += ` no. ${issue},`
              generatedCitation += ` ${yearText},`
              if (pages) generatedCitation += ` pp. ${pages}.`
              else generatedCitation = generatedCitation.slice(0, -1) + '.'
              if (identifier) generatedCitation += ` ${identifier}.`
              break
              
            default:
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}." ${yearText}.`
              if (identifier) generatedCitation += ` ${identifier}.`
          }
          break

        case 'chicago':
          switch (type) {
            case 'website':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}."`
              if (platform) generatedCitation += ` ${platform}.`
              if (!doi && hasUrl) {
                const accessDateText = accessDate || getCurrentDate()
                generatedCitation += ` Accessed ${accessDateText}.`
              }
              if (identifier) generatedCitation += ` ${identifier}.`
              break
              
            case 'book':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `${titleText}.`
              if (edition) generatedCitation += ` ${edition} ed.`
              if (publisher) {
                if (city) generatedCitation += ` ${city}: ${publisher},`
                else generatedCitation += ` ${publisher},`
              }
              generatedCitation += ` ${yearText}.`
              if (doi) generatedCitation += ` https://doi.org/${doi}.`
              break
              
            case 'journal':
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}."`
              if (journal) generatedCitation += ` ${journal}`
              if (volume) generatedCitation += ` ${volume}`
              if (issue) generatedCitation += `, no. ${issue}`
              generatedCitation += ` (${yearText})`
              if (pages) generatedCitation += `: ${pages}`
              generatedCitation += '.'
              if (identifier) generatedCitation += ` ${identifier}.`
              break
              
            default:
              if (authorName) {
                generatedCitation = `${authorName}. `
              }
              generatedCitation += `"${titleText}." ${yearText}.`
              if (identifier) generatedCitation += ` ${identifier}.`
          }
          break

        case 'harvard':
          switch (type) {
            case 'website':
              if (authorName) {
                generatedCitation = `${authorName} (${yearText}) `
              } else {
                generatedCitation = `${titleText} (${yearText}) `
              }
              if (authorName) generatedCitation += `${titleText}.`
              if (identifier) {
                generatedCitation += ` Available at: ${identifier}`
                if (!doi && hasUrl) {
                  const accessDateText = accessDate || getCurrentDate('en-GB')
                  generatedCitation += ` (Accessed: ${accessDateText})`
                }
                generatedCitation += '.'
              }
              break
              
            case 'book':
              if (authorName) {
                generatedCitation = `${authorName} (${yearText}) ${titleText}`
              } else {
                generatedCitation = `${titleText} (${yearText})`
              }
              if (edition) generatedCitation += `, ${edition} edn`
              generatedCitation += '.'
              if (publisher) {
                if (city) generatedCitation += ` ${city}: ${publisher}.`
                else generatedCitation += ` ${publisher}.`
              }
              break
              
            case 'journal':
              if (authorName) {
                generatedCitation = `${authorName} (${yearText}) '${titleText}'`
              } else {
                generatedCitation = `${titleText} (${yearText})`
              }
              if (journal) generatedCitation += `, ${journal}`
              if (volume) generatedCitation += `, ${volume}`
              if (issue) generatedCitation += `(${issue})`
              if (pages) generatedCitation += `, pp. ${pages}`
              generatedCitation += '.'
              if (doi) generatedCitation += ` doi: ${doi}.`
              else if (hasUrl) generatedCitation += ` Available at: ${url}.`
              break
              
            default:
              if (authorName) {
                generatedCitation = `${authorName} (${yearText}) ${titleText}.`
              } else {
                generatedCitation = `${titleText} (${yearText}).`
              }
              if (identifier) generatedCitation += ` Available at: ${identifier}.`
          }
          break
      }

      return generatedCitation.trim()
    } catch (error) {
      console.error(error)
      return '[Citation generation error]'
    }
  }

  const addCitation = async () => {
    const citation = generateCitation()
    
    if (!citation) {
      toast.error('Please fill in the required fields')
      return
    }

    if (editingCitation) {
      // Check if editing a saved citation (from backend)
      const isSavedCitation = savedCitations.some(c => c.id === editingCitation)
      
      if (isSavedCitation) {
        try {
          await axios.put(`${API_URL}/citations/${editingCitation}`, {
            source_type: sourceType,
            citation_style: citationStyle,
            metadata: formData,
            formatted_citation: citation
          }, { withCredentials: true })

          toast.success('Citation updated!')
          setFormData({})
          setEditingCitation(null)
          loadSavedCitations()
        } catch (error) {
          toast.error('Failed to update citation: ' + (error.response?.data?.error || error.message))
        }
      } else {
        // Editing a current (unsaved) citation
        const updatedCitations = citations.map(c => 
          c.id === editingCitation 
            ? { ...c, sourceType, citationStyle, formData: { ...formData }, formatted: citation }
            : c
        )
        setCitations(updatedCitations)
        setFormData({})
        setEditingCitation(null)
        toast.success('Citation updated!')
      }
    } else {
      const newCitation = {
        id: Date.now(),
        sourceType,
        citationStyle,
        formData: { ...formData },
        formatted: citation
      }

      setCitations([...citations, newCitation])
      setFormData({})
      
      // Auto-save to account if user is logged in
      if (user) {
        try {
          await axios.post(`${API_URL}/citations`, {
            source_type: sourceType,
            citation_style: citationStyle,
            metadata: formData,
            formatted_citation: citation
          }, { withCredentials: true })
          
          toast.success('Citation added and saved to your account!')
          loadSavedCitations()
        } catch (error) {
          toast.success('Citation added (save failed: ' + (error.response?.data?.error || error.message) + ')')
        }
      } else {
        toast.success('Citation added! (Login to auto-save)')
      }
    }
  }

  const saveCitation = async (citation) => {
    if (!user) {
      toast.error('Please login to save citations')
      return
    }

    try {
      await axios.post(`${API_URL}/citations`, {
        source_type: citation.sourceType,
        citation_style: citation.citationStyle,
        metadata: citation.formData,
        formatted_citation: citation.formatted
      }, { withCredentials: true })

      toast.success('Citation saved to your account!')
      loadSavedCitations()
    } catch (error) {
      toast.error('Failed to save citation: ' + (error.response?.data?.error || error.message))
    }
  }

  const deleteSavedCitation = async (citationId) => {
    try {
      await axios.delete(`${API_URL}/citations/${citationId}`, { withCredentials: true })
      toast.success('Citation deleted!')
      loadSavedCitations()
    } catch (error) {
      toast.error('Failed to delete citation')
    }
  }

  const copyCitation = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    toast.success('Citation copied to clipboard!')
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAllCitations = () => {
    const allText = citations.map(c => c.formatted).join('\n\n')
    navigator.clipboard.writeText(allText)
    toast.success('All citations copied!')
  }

  const exportCitations = async () => {
    if (!user || selectedCitations.length === 0) {
      toast.error('Please login and select citations to export')
      return
    }

    try {
      const response = await axios.post(`${API_URL}/citations/export`, {
        citation_ids: selectedCitations,
        format: 'txt'
      }, { 
        withCredentials: true,
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'citations.txt')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Citations exported!')
    } catch (error) {
      toast.error('Failed to export citations')
    }
  }

  const handleSourceTypeChange = (newType) => {
    setSourceType(newType)
    setFormData({})
  }

  const toggleCitationSelection = (citationId) => {
    setSelectedCitations(prev => 
      prev.includes(citationId) 
        ? prev.filter(id => id !== citationId)
        : [...prev, citationId]
    )
  }

  const loadSavedCitation = (citation) => {
    setSourceType(citation.source_type)
    setCitationStyle(citation.citation_style)
    setFormData(citation.metadata)
    setEditingCitation(null)
  }

  const editSavedCitation = (citation) => {
    setSourceType(citation.source_type)
    setCitationStyle(citation.citation_style)
    setFormData(citation.metadata)
    setEditingCitation(citation.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast.info('Citation loaded for editing')
  }

  const cancelEdit = () => {
    setEditingCitation(null)
    setFormData({})
    toast.info('Editing cancelled')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Advanced Citation Generator</h2>
        <p className="text-gray-600">Generate, save, and manage citations with auto-fetch metadata</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CustomDropdown
          value={citationStyle}
          onChange={setCitationStyle}
          options={[
            { value: 'apa', label: 'APA 7th Edition' },
            { value: 'mla', label: 'MLA 9th Edition' },
            { value: 'chicago', label: 'Chicago' },
            { value: 'harvard', label: 'Harvard' }
          ]}
          label="Citation Style"
        />

        <CustomDropdown
          value={sourceType}
          onChange={handleSourceTypeChange}
          options={Object.entries(sourceTypes).map(([key, { label }]) => ({
            value: key,
            label: label
          }))}
          label="Source Type"
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-800">Enter Source Information</h3>
            {editingCitation && (
              <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full">Editing Mode</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingCitation && (
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
                Cancel
              </button>
            )}
            {sourceType === 'website' && formData.url && (
              <button
                onClick={autoFetchMetadata}
                disabled={isFetching}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {isFetching ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4" />
                    Auto-Fetch Metadata
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sourceTypes[sourceType].fields.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fieldLabels[field]}
              </label>
              <input
                type={field.includes('Date') ? 'date' : 'text'}
                value={formData[field] || ''}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={`Enter ${fieldLabels[field].toLowerCase()}`}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={addCitation}
        className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2"
      >
        {editingCitation ? (
          <>
            <PencilSquareIcon className="h-5 w-5" />
            Update Citation
          </>
        ) : (
          <>
            <PlusIcon className="h-5 w-5" />
            Add to Citation List
          </>
        )}
      </button>

      {citations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Current Citations ({citations.length})</h3>
            <button
              onClick={copyAllCitations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Copy All
            </button>
          </div>

          {citations.map((citation) => (
            <div key={citation.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      {citation.citationStyle.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-600">
                      {sourceTypes[citation.sourceType].label}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{citation.formatted}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSourceType(citation.sourceType)
                      setCitationStyle(citation.citationStyle)
                      setFormData(citation.formData)
                      setEditingCitation(citation.id)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                      toast.info('Citation loaded for editing')
                    }}
                    className="p-2 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                    title="Edit citation"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  {user && (
                    <button
                      onClick={() => saveCitation(citation)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Save to account"
                    >
                      <BookmarkIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => copyCitation(citation.formatted, citation.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    {copied === citation.id ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => setCitations(citations.filter(c => c.id !== citation.id))}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {user && savedCitations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Saved Citations ({savedCitations.length})</h3>
            {selectedCitations.length > 0 && (
              <button
                onClick={exportCitations}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Export Selected ({selectedCitations.length})
              </button>
            )}
          </div>

          {savedCitations.map((citation) => (
            <div key={citation.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedCitations.includes(citation.id)}
                    onChange={() => toggleCitationSelection(citation.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded">
                        {citation.citation_style.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-600">
                        {sourceTypes[citation.source_type]?.label || citation.source_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(citation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{citation.formatted_citation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => editSavedCitation(citation)}
                    className="p-2 text-orange-600 hover:bg-orange-100 rounded transition-colors"
                    title="Edit citation"
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => loadSavedCitation(citation)}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                    title="Load to create new"
                  >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => copyCitation(citation.formatted_citation, `saved-${citation.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  >
                    {copied === `saved-${citation.id}` ? (
                      <CheckIcon className="h-5 w-5" />
                    ) : (
                      <ClipboardDocumentIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteSavedCitation(citation.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Features:</strong> Auto-fetch metadata from URLs • Save citations to your account • Export multiple citations • Multiple source types • 4 citation styles
        </p>
        <p className="text-sm text-yellow-800 mt-2">
          <strong>Note:</strong> Always verify citations against official style guides for your institution.
        </p>
      </div>
    </div>
  )
}
