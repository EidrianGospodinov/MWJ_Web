import React from "react";
import {uploadData} from 'aws-amplify/storage';
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

    const folderName = mediaType === "image" ? "images" : "videos";
    const acceptType = mediaType === "image" ? "image/*" : "video/*";
    const buttonLabel = mediaType === "image" ? "Image" : "Video";

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
                {/*Show the percentage on the button while uploading */}
                {isUploading ? `Uploading... ${uploadProgress}%` : `Upload ${buttonLabel}`}
            </button>

            {/*The visual progress bar */}
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
        </div>
    );
}