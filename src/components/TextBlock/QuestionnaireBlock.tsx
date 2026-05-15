import React from "react";
import type {
    Answer,
    Question,
    QuestionnaireBlockType,
} from "../../types/Blocks";


type Props = {
    block: QuestionnaireBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function QuestionnaireBlock({block, setBlocks,}: Props) {
    const maxAnswers = 4;
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
    const updateQuestionText = (questionId: string, newQuestionText: string) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {

                    if (currentBlock.id !== block.id) {
                        return currentBlock;
                    }
                    return {
                        ...currentBlock,

                        content: {

                            ...currentBlock.content,
                            questions:
                                currentBlock.content.questions.map(
                                    (question: Question) => {
                                        if (question.id !== questionId) {
                                            return question;
                                        }
                                        console.log("question update to: " + newQuestionText);
                                        return {
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
    const addAnswer = (questionId: string) =>
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                    if (currentBlock.id !== block.id) {
                        return currentBlock;
                    }
                    return {
                        ...currentBlock,

                        content: {
                            ...currentBlock.content,
                            questions: currentBlock.content.questions.map((question: Question) => {
                                    if (question.id !== questionId) {
                                        return question;
                                    }
                                    if (question.answers.length >= maxAnswers) {
                                        return question;
                                    }
                                    return {
                                        ...question,
                                        answers: [
                                            ...question.answers,
                                            {
                                                id: crypto.randomUUID(),
                                                answerText: "",
                                                isCorrect: false,

                                            }
                                        ]
                                    }
                                }
                            )

                        },
                    };
                }
            )
        )
    const updateAnswer = (questionId: string, answerId: string, changes: Partial<Answer>) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                    if (currentBlock.id !== block.id) {
                        return currentBlock;
                    }
                    return {
                        ...currentBlock,
                        content: {
                            ...currentBlock.content,
                            questions:
                                currentBlock.content.questions.map((question: Question) => {
                                        if (question.id !== questionId) {
                                            return question;
                                        }
                                        return{
                                            ...question,
                                            answers: 
                                            question.answers.map((answer: Answer) => {
                                                if(answer.id !== answerId){
                                                    return answer;
                                                }
                                                
                                                return {
                                                    ...answer,
                                                    ...changes
                                                }
                                                }
                                            )
                                            
                                        }
                                    }
                                )

                        }

                    }
                }
            )
        )

    }

    return (
        <div>

            <button onClick={addQuestion}>
                Add Question
            </button>

            {block.content.questions.map(
                (question: Question) => (
                    <div key={question.id}>
                        <textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestionText(question.id, e.target.value)}
                            placeholder="Write Question..."
                        />
                        <button onClick={() => addAnswer(question.id)}>
                            Add Answer
                        </button>

                        {question.answers.map((answer: Answer) => (

                            <span><textarea
                                key={answer.id}

                                value={answer.answerText}
                                onChange={(e) => updateAnswer(question.id, answer.id, 
                                    {answerText: e.target.value})}//Doing this to partially change the Answer(only text)
                                placeholder="Write Answer..."
                            />
                            <input type="checkbox" checked={answer.isCorrect} onChange={(e)=> 
                                updateAnswer(question.id, answer.id,
                                    {isCorrect: e.target.checked})}/>
                            </span>

                        ))}

                    </div>

                )
            )}

        </div>
    );
}
