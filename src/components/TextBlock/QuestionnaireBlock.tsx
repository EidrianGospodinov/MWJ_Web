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
    const editAnswerText = (questionId: string, answerId: string, newAnswerText: string) => {
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
                                                console.log("answer update to: " + newAnswerText);
                                                return {
                                                    ...answer,
                                                    answerText: newAnswerText,
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
                (question: any) => (
                    <div key={question.id}>
                        <textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestionText(question.id, e.target.value)}
                            placeholder="Write Question..."
                        />
                        <button onClick={() => addAnswer(question.id)}>
                            Add Answer
                        </button>

                        {question.answers.map((answer: any) => (

                            <textarea
                                key={answer.id}

                                value={answer.answerText}
                                onChange={(e) => editAnswerText(question.id, answer.id, e.target.value)}
                                placeholder="Write Answer..."
                            />

                        ))}

                    </div>

                )
            )}

        </div>
    );
}
