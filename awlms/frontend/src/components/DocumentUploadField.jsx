import { useEffect, useMemo, useRef, useState } from 'react';

const ACCEPT = '.pdf,.doc,.docx,.png,.jpg,.jpeg';

export default function DocumentUploadField({
  label,
  name,
  required,
  file,
  status,
  error,
  onFileChange,
  onRemove,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const description = useMemo(() => {
    if (file) {
      return `${file.name} • ${Math.round(file.size / 1024)} KB`;
    }
    return 'Drag and drop a file here, or click to browse.';
  }, [file]);

  function handleChange(event) {
    const nextFile = event.target.files?.[0] || null;
    onFileChange(nextFile);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    const nextFile = event.dataTransfer.files?.[0] || null;
    if (nextFile) {
      onFileChange(nextFile);
    }
  }

  return (
    <div className="document-upload-field">
      <div className="document-upload-header">
        <div>
          <span className="field-label">
            {label} {required ? <span className="required-dot">*</span> : null}
          </span>
          {status ? <span className={`document-upload-status document-upload-status--${status}`}>{status.replace('_', ' ')}</span> : null}
        </div>
        {file ? (
          <button type="button" className="document-upload-remove" onClick={() => onRemove()}>Remove</button>
        ) : null}
      </div>

      <label
        className={`document-upload-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        htmlFor={`file-input-${name}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          id={`file-input-${name}`}
          ref={inputRef}
          type="file"
          name={name}
          accept={ACCEPT}
          className="document-upload-input"
          onChange={handleChange}
        />

        <div className="document-upload-content">
          <p className="document-upload-description">{description}</p>
          <p className="document-upload-hint">Accepted: PDF, DOC, DOCX, PNG, JPG, JPEG. Max 10 MB.</p>
        </div>
        {previewUrl ? <img src={previewUrl} alt="Preview" className="document-upload-preview" /> : null}
      </label>
      {error ? <p className="document-upload-error">{error}</p> : null}
    </div>
  );
}
