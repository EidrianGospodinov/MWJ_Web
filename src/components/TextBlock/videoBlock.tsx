import React from "react";
import type {
    VideoBlockType,
} from "../../types/Blocks";

import '@aws-amplify/ui-react/styles.css';
import MediaUploader from "./MediaUploader.tsx";

type Props = {
    block: VideoBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function VideoBlock({block, setBlocks}: Props) {
    return (
        <MediaUploader
            block={block}
            setBlocks={setBlocks}
            mediaType="video"
        />
    );
}