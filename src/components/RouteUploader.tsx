import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'
import { FileUp, Upload } from 'lucide-react'

type RouteUploaderProps = {
  disabled?: boolean
  onFilesSelected: (files: File[]) => void
}

export default function RouteUploader({ disabled, onFilesSelected }: RouteUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      onFilesSelected(files)
    }
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)

    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.gpx'),
    )

    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  return (
    <label
      className={`upload-target${isDragging ? ' upload-target--dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".gpx,application/gpx+xml,application/xml,text/xml"
        multiple
        disabled={disabled}
        onChange={handleInputChange}
      />
      <span className="upload-target__icon">
        <FileUp size={22} aria-hidden="true" />
      </span>
      <span className="upload-target__title">Import GPX</span>
      <button
        className="button button--primary"
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={16} aria-hidden="true" />
        Choose file
      </button>
    </label>
  )
}
