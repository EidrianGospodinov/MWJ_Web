import React from "react";
import type { ImageBlockType } from "../../types/Blocks";
import MediaUploader from "./MediaUploader";

type Props = {
    block: ImageBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function ImageBlock({ block, setBlocks }: Props) {
    return (
        <MediaUploader
            block={block}
            setBlocks={setBlocks}
            mediaType="image"
        />
    );
}