import React from "react";
import type {
    QuestionnaireBlockType,
} from "../../types/Blocks";


type Props = {
    block: QuestionnaireBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function QuestionnaireBlock({ block, setBlocks }: Props) {
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
        <textarea
            value={block.content.text}
            onChange={(e) => updateText(e.target.value)}
            placeholder="Write Question..."
        />
    );
}