import React from 'react';
import { uploadData, getUrl } from 'aws-amplify/storage';

type Props = {
    thumbnailKey?: string | null;
    onChange: (key: string | null) => void;
};

export default function ThumbnailUploader({ thumbnailKey, onChange }: Props) {
    const [localPreview, setLocalPreview] = React.useState<string | null>(null);
    const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);
    const [isUploading, setIsUploading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Resolve an already-saved key (e.g. when editing an existing module) to a
    // fresh, displayable URL. Skipped while a local preview is active.
    React.useEffect(() => {
        let active = true;
        if (thumbnailKey && !localPreview) {
            getUrl({ path: thumbnailKey })
                .then(({ url }) => { if (active) setResolvedUrl(url.toString()); })
                .catch(() => { if (active) setResolvedUrl(null); });
        }
        if (!thumbnailKey) setResolvedUrl(null);
        return () => { active = false; };
    }, [thumbnailKey, localPreview]);

    // Revoke object URLs to avoid memory leaks.
    React.useEffect(() => () => {
        if (localPreview) URL.revokeObjectURL(localPreview);
    }, [localPreview]);

    const handleFile = async (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
        if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
        setError(null);
        setLocalPreview(URL.createObjectURL(file)); // instant preview

        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
        const key = `images/thumbnails/${crypto.randomUUID()}.${ext}`;
        setIsUploading(true);
        setProgress(0);
        try {
            await uploadData({
                path: key,
                data: file,
                options: {
                    contentType: file.type,
                    onProgress: ({ transferredBytes, totalBytes }) => {
                        if (totalBytes) {
                            setProgress(Math.round((transferredBytes / totalBytes) * 100));
                        }
                    },
                },
            }).result;
            onChange(key); // persist the key upstream
        } catch (e) {
            console.error('Thumbnail upload failed', e);
            setError('Upload failed. Try again.');
            setLocalPreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLocalPreview(null);
        setResolvedUrl(null);
        onChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const preview = localPreview ?? resolvedUrl;

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                style={{
                    position: 'relative',
                    cursor: 'pointer',
                    aspectRatio: '16 / 9',
                    width: '100%',
                    border: '2px dashed #ccd',
                    borderRadius: '8px',
                    background: '#fafbff',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                }}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="Module thumbnail"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ color: '#889', fontSize: '0.9rem', textAlign: 'center', padding: '0 1rem' }}>
                        Click or drag an image · 16:9 recommended
                    </span>
                )}

                {isUploading && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,255,255,0.75)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        color: '#334',
                    }}>
                        Uploading… {progress}%
                    </div>
                )}
            </div>

            {preview && !isUploading && (
                <button
                    type="button"
                    onClick={handleRemove}
                    style={{
                        marginTop: '0.5rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                    }}
                >
                    Remove thumbnail
                </button>
            )}

            {error && (
                <p style={{ color: '#c00', fontSize: '0.85rem', margin: '0.4rem 0 0' }}>{error}</p>
            )}
        </div>
    );
}
