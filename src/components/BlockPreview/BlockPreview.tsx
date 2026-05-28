import React from 'react';
import type { Block } from '../../types/Blocks';
import TextBlock from '../TextBlock/TextBlock';
import QuestionnaireBlock from '../TextBlock/QuestionnaireBlock';
import './BlockPreview.css';
import ImageBlock from "../TextBlock/imageBlock.tsx";
import VideoBlock from "../TextBlock/videoBlock.tsx";

type Props = {
    block: Block | null;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function BlockPreview({ block, setBlocks }: Props) {
    if (!block) {
        return (
            <p className="block-preview__empty">
                Select a block from the editor above to preview and edit it here.
            </p>
        );
    }

    return (
        <div className="block-preview">
            {block.type === 'text' && (
                <TextBlock block={block} setBlocks={setBlocks} />
            )}
            {block.type === 'questionnaire' && (
                <QuestionnaireBlock block={block} setBlocks={setBlocks} />
            )}
            {
                block.type === 'image' && (
                    <ImageBlock block={block} setBlocks={setBlocks} />
                )
            }
            {(block.type === 'video') && (
                <VideoBlock block={block} setBlocks={setBlocks} />
            )}
        </div>
    );
}
