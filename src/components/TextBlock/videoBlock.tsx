import React from "react";
import { uploadData } from 'aws-amplify/storage';
import type {
    VideoBlockType,
} from "../../types/Blocks";

import '@aws-amplify/ui-react/styles.css';
type Props = {
    block: VideoBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function VideoBlock({ block, setBlocks }: Props) {
    const [file, setFile] = React.useState<File | undefined>();
    const [isUploading, setIsUploading] = React.useState(false);
    const handleVideoChange = (event: any) => {
        setFile(event.target.files?.[0]);
    }
    const handleVideoClick = async () => {
        if(!file){
            return;
        }
        const videoPath = `videos/${file.name}`;
        setIsUploading(true);
        try {
            // Start the upload process
            const task = uploadData({
                path: videoPath,
                data: file,
            });
            
            await task.result;
            //await if the video made it to s3 storage before saving it to the block
            
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
                            dataUrl: videoPath, // Storing the S3 path 
                        },
                    };
                })
            );
        } catch (error) {
            console.error("Error uploading file: ", error);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', border: '1px solid #ddd'}}>
            <input type="file" accept="video/*" onChange={handleVideoChange}/>
            <button
                onClick={handleVideoClick}
                disabled={!file || isUploading}
            >1
                {isUploading ? "Uploading..." : "Upload Video"}
            </button>

            {/* confirmation if the video path has been updated successfully */}
            {block.content?.fileName && (
                <p style={{ color: "green", fontSize: "0.9rem", margin: 0 }}>
                    Successfully attached: {block.content.fileName}
                </p>
            )}
        </div>
    );
}