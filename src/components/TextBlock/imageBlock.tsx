import React from "react";
import { uploadData } from 'aws-amplify/storage';
import type {
    ImageBlockType,
} from "../../types/Blocks";

import '@aws-amplify/ui-react/styles.css';
type Props = {
    block: ImageBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function ImageBlock({ block, setBlocks }: Props) {
    const [file, setFile] = React.useState<File | undefined>();
    const [isUploading, setIsUploading] = React.useState(false);
    const handleImageChange = (event: any) => {
        setFile(event.target.files?.[0]);
    }
    const handleImageClick = async () => {
        if(!file){
            return;
        }
        const imagePath = `images/${file.name}`;
        setIsUploading(true);
        try {
            // Start the upload process
            const task = uploadData({
                path: imagePath,
                data: file,
            });
            
            await task.result;
            //await if the image made it to s3 storage before saving it to the block
            
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
                            dataUrl: imagePath, // Storing the S3 path 
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
            <input type="file" accept="image/*" onChange={handleImageChange}/>
            <button
                onClick={handleImageClick}
                disabled={!file || isUploading}
            >1
                {isUploading ? "Uploading..." : "Upload Image"}
            </button>

            {/* confirmation if the image path has been updated successfully */}
            {block.content?.fileName && (
                <p style={{ color: "green", fontSize: "0.9rem", margin: 0 }}>
                    Successfully attached: {block.content.fileName}
                </p>
            )}
        </div>
    );
}