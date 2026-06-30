import React from "react";
import {uploadData, getUrl} from 'aws-amplify/storage';
import '@aws-amplify/ui-react/styles.css';

type Props = {
    block: any;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
    mediaType: "image" | "video";
};

export default function MediaUploader({block, setBlocks, mediaType}: Props) {
    const [file, setFile] = React.useState<File | undefined>();
    const [isUploading, setIsUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState<number>(0);
    const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
    const [playbackFailed, setPlaybackFailed] = React.useState(false);

    const folderName = mediaType === "image" ? "images" : "videos";
    const acceptType = mediaType === "image" ? "image/*" : "video/*";
    const buttonLabel = mediaType === "image" ? "Image" : "Video";


    const storedKey: string | undefined = block.content?.dataUrl;

    React.useEffect(() => {
        let active = true;
        setPlaybackFailed(false);
        if (!storedKey) {
            setMediaUrl(null);
            return;
        }
        getUrl({path: storedKey})
            .then(({url}) => { if (active) setMediaUrl(url.toString()); })
            .catch(() => { if (active) setMediaUrl(null); });
        return () => { active = false; };
    }, [storedKey]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFile(event.target.files?.[0]);
    }

    const handleUpload = async () => {
        if (!file) return;

        const filePath = `${folderName}/${file.name}`;
        setIsUploading(true);

        try {
            const task = uploadData({
                path: filePath,
                data: file,
                options: {
                    onProgress: ({transferredBytes, totalBytes}) => {
                        if (totalBytes) {
                            const percentage = Math.round(
                                (transferredBytes / totalBytes) * 100
                            );
                            setUploadProgress(percentage);
                        }
                    },
                }
            });

            await task.result;

            setBlocks((oldBlocks) =>
                oldBlocks.map((currentBlock) => {
                    if (currentBlock.id !== block.id) {
                        return currentBlock;
                    }

                    return {
                        ...currentBlock,
                        content: {
                            ...currentBlock.content,
                            fileName: file.name,
                            dataUrl: filePath,
                        },
                    };
                })
            );
        } catch (error) {
            console.error(`Error uploading ${mediaType}: `, error);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid #ddd'}}>
            <input type="file" accept={acceptType} onChange={handleChange}/>

            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
            >

                {isUploading ? `Uploading... ${uploadProgress}%` : `Upload ${buttonLabel}`}
            </button>


            {isUploading && (
                <div style={{width: '100%', backgroundColor: '#f0f0f0', borderRadius: '4px', overflow: 'hidden'}}>
                    <div
                        style={{
                            height: '8px',
                            backgroundColor: '#007bff',
                            width: `${uploadProgress}%`,
                            transition: 'width 0.2s ease-in-out' // Smooth animation
                        }}
                    />
                </div>
            )}

            {block.content?.fileName && !isUploading && (
                <p style={{color: "green", fontSize: "0.9rem", margin: 0}}>
                    Successfully attached: {block.content.fileName}
                </p>
            )}


            {storedKey && !isUploading && (
                mediaUrl ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        {mediaType === "video" ? (
                            !playbackFailed ? (
                                <video
                                    src={mediaUrl}
                                    controls
                                    onError={() => setPlaybackFailed(true)}
                                    style={{width: '100%', maxHeight: '360px', borderRadius: '4px', background: '#000'}}
                                />
                            ) : (
                                <p style={{color: '#a15', fontSize: '0.85rem', margin: 0}}>
                                    This video format can’t play in the browser
                                    (e.g. .MOV / QuickTime). Use the link below, or
                                    re-upload as .mp4 for in-page playback.
                                </p>
                            )
                        ) : (
                            <img
                                src={mediaUrl}
                                alt={block.content?.alt ?? block.content?.fileName ?? 'Attached image'}
                                onError={() => setPlaybackFailed(true)}
                                style={{width: '100%', maxHeight: '360px', objectFit: 'contain', borderRadius: '4px'}}
                            />
                        )}
                        <a
                            href={mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{fontSize: '0.85rem'}}
                        >
                            Open {mediaType} in new tab ↗
                        </a>
                    </div>
                ) : (
                    <p style={{color: '#889', fontSize: '0.85rem', margin: 0}}>Loading preview…</p>
                )
            )}
        </div>
    );
}