import React from "react";
import { uploadData } from 'aws-amplify/storage';
import '@aws-amplify/ui-react/styles.css';

type Props = {
    block: any; 
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
    mediaType: "image" | "video"; 
};

export default function MediaUploader({ block, setBlocks, mediaType }: Props) {
    const [file, setFile] = React.useState<File | undefined>();
    const [isUploading, setIsUploading] = React.useState(false);

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
                {isUploading ? "Uploading..." : `Upload ${buttonLabel}`}
            </button>

            {block.content?.fileName && (
                <p style={{ color: "green", fontSize: "0.9rem", margin: 0 }}>
                    Successfully attached: {block.content.fileName}
                </p>
            )}
        </div>
    );//todo: add a video upload indicator
}