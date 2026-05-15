import React from "react";
import type {
    TextBlockType,
} from "../../types/Blocks";

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
        <div><textarea
            value={block.content.text}
            onChange={(e) => updateText(e.target.value)}
            placeholder="Write text..."
        /></div>
    );
}