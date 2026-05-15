import React from "react";
import type {
    QuestionnaireBlockType,
} from "../../types/Blocks";


type Props = {
    block: QuestionnaireBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function QuestionnaireBlock({block, setBlocks,}: Props) {

    const addQuestion = () => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {

                if (
                    currentBlock.id !== block.id
                ) {
                    return currentBlock;
                }

                return {
                    ...currentBlock,

                    content: {
                        ...currentBlock.content,

                        questions: [
                            ...currentBlock.content.questions,

                            {
                                id: crypto.randomUUID(),

                                questionText: "",

                                answers: [],
                            },
                        ],
                    },
                };
            })
        );
    };
    const updateQuestionText= (questionId: string, newQuestionText: string) =>
    {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                
                    if (currentBlock.id !== block.id) {
                        return currentBlock;
                    }
                    return{
                        ...currentBlock,
                        
                        content: {
                            
                            ...currentBlock.content,
                            questions:
                            currentBlock.content.questions.map(
                                (question: any) => {
                                    if(question.id !== questionId){
                                        return question;
                                    }
                                    console.log("question update to: " + newQuestionText);
                                    return{
                                        ...question,
                                        questionText: newQuestionText,
                                    };
                                }
                            )
                            
                        }
                    }
                    
                }
            ));
    }

    return (
        <div>

            <button onClick={addQuestion}>
                Add Question
            </button>

            {block.content.questions.map(
                (question: any) => (
                    <textarea
                        key={question.id}

                        value={question.questionText}
                        onChange={(e) => updateQuestionText(question.id, e.target.value)}
                        placeholder="Write Question..."
                    />
                )
            )}

        </div>
    );
}
