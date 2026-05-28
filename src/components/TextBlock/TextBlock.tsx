import React from "react";
import type { TextBlockType } from "../../types/Blocks";

type Props = {
    block: TextBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function TextBlock({ block, setBlocks }: Props) {
    const updateText = (newText: string) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                if (currentBlock.id !== block.id) {
                    return currentBlock;
                }

                return {
                    ...currentBlock,
                    content: {
                        ...currentBlock.content,
                        text: newText,
                    },
                };
            })
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '6px', 
            backgroundColor: '#fff'
        }}>
            <textarea
                value={block.content.text}
                onChange={(e) => updateText(e.target.value)}
                placeholder="Write text..."
                style={{
                    width: '100%',
                    minHeight: '120px', 
                    padding: '0.75rem',
                    fontSize: '1rem', 
                    fontFamily: 'inherit', 
                    lineHeight: '1.5', 
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                }}
            />
        </div>
    );
}