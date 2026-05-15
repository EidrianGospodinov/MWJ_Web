import React from "react";

type Props = {
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function BlockTools({ setBlocks }: Props) {
    const addTextBlock = () => {
        setBlocks((oldBlocks) => [
            ...oldBlocks,
            {
                id: crypto.randomUUID(),
                type: "text",
                content: {
                    text: "",
                },
            },
        ]);
    };
    const addQuestionnaireBlock = () => {
        setBlocks((oldBlocks) => [
            ...oldBlocks,
            {
                id: crypto.randomUUID(),
                type: "questionnaire",
                content: {
                    text: "",
                },
            },
        ]);
    };

    return (

        <div>
            <button onClick={addTextBlock}>
                Add Text Block
            </button>
            <button onClick={addQuestionnaireBlock}>
                Add Text Questionnaire block
            </button>
        </div>
);
}