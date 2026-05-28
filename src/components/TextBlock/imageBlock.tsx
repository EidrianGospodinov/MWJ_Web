import React from "react";
import type {
    ImageBlockType,
} from "../../types/Blocks";

import { FileUploader } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
type Props = {
    block: ImageBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function ImageBlock({ block, setBlocks }: Props) {
    

    return (
        <div> <FileUploader
            acceptedFileTypes={['image/*']}
            path="public/"
            maxFileCount={1}
            isResumable
        /></div>
    );
}