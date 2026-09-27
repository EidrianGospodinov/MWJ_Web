import React from 'react';
import {uploadData, getUrl} from 'aws-amplify/storage';

type Props = {
    mediaKey?: string | null;
    mediaType?: string | null;
    onChange: (key: string | null, type: 'image' | 'video' | null) => void;
};

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 100;

export default function MediaPicker({mediaKey, mediaType, onChange}: Props) {
    const [localPreview, setLocalPreview] = React.useState<string | null>(null);
    const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null);
    const [uploading, setUploading] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        let active = true;
        if (mediaKey && !localPreview) {
            getUrl({path: mediaKey})
                .then(({url}) => { if (active) setResolvedUrl(url.toString()); })
                .catch(() => { if (active) setResolvedUrl(null); });
        }
        if (!mediaKey) setResolvedUrl(null);
        return () => { active = false; };
    }, [mediaKey, localPreview]);

    React.useEffect(() => () => {
        if (localPreview) URL.revokeObjectURL(localPreview);
    }, [localPreview]);

    const handleFile = async (file?: File) => {
        if (!file) return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) {
            setError('Please choose an image or a video file.');
            return;
        }
        const limitMb = isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB;
        if (file.size > limitMb * 1024 * 1024) {
            setError(`${isImage ? 'Image' : 'Video'} must be under ${limitMb} MB.`);
            return;
        }
        setError(null);
        setLocalPreview(URL.createObjectURL(file));

        const ext = file.name.split('.').pop()?.toLowerCase() ?? (isImage ? 'jpg' : 'mp4');
        const folder = isImage ? 'images' : 'videos';
        const key = `${folder}/${crypto.randomUUID()}.${ext}`;
        setUploading(true);
        setProgress(0);
        try {
            await uploadData({
                path: key,
                data: file,
                options: {
                    contentType: file.type,
                    onProgress: ({transferredBytes, totalBytes}) => {
                        if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100));
                    },
                },
            }).result;
            onChange(key, isImage ? 'image' : 'video');
        } catch (e) {
            console.error('Media upload failed', e);
            setError('Upload failed. Try again.');
            setLocalPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setLocalPreview(null);
        setResolvedUrl(null);
        onChange(null, null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const preview = localPreview ?? resolvedUrl;
    const isVideoPreview = mediaType === 'video' || (localPreview !== null && mediaType === 'video');

    return (
        <div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div
                className="mp-drop"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            >
                {preview ? (
                    isVideoPreview ? (
                        <video src={preview} className="mp-media" controls />
                    ) : (
                        <img src={preview} alt="Selected media" className="mp-media" />
                    )
                ) : (
                    <span className="mp-placeholder">
                        Click or drag a photo or video
                    </span>
                )}

                {uploading && (
                    <div className="mp-overlay">Uploading… {progress}%</div>
                )}
            </div>

            {preview && !uploading && (
                <button type="button" className="mp-remove" onClick={handleRemove}>
                    Remove {isVideoPreview ? 'video' : 'photo'}
                </button>
            )}

            {error && <p className="mp-error">{error}</p>}
        </div>
    );
}
