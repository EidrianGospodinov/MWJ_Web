import React from "react";
import type {Answer, Question, QuestionnaireBlockType} from "../../types/Blocks";

type Props = {
    block: QuestionnaireBlockType;
    setBlocks: React.Dispatch<React.SetStateAction<any[]>>;
};

export default function QuestionnaireBlock({block, setBlocks}: Props) {
    const maxAnswers = 4;

    const addQuestion = () => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                if (currentBlock.id !== block.id) return currentBlock;
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
                if (currentBlock.id !== block.id) return currentBlock;
                return {
                    ...currentBlock,
                    content: {
                        ...currentBlock.content,
                        questions: currentBlock.content.questions.map((question: Question) => {
                            if (question.id !== questionId) return question;

                            return {
                                ...question,
                                questionText: newQuestionText,
                            };
                        }),
                    },
                };
            })
        );
    };

    const addAnswer = (questionId: string) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                if (currentBlock.id !== block.id) return currentBlock;
                return {
                    ...currentBlock,
                    content: {
                        ...currentBlock.content,
                        questions: currentBlock.content.questions.map((question: Question) => {
                            if (question.id !== questionId) return question;
                            if (question.answers.length >= maxAnswers) return question;

                            return {
                                ...question,
                                answers: [
                                    ...question.answers,
                                    {
                                        id: crypto.randomUUID(),
                                        answerText: "",
                                        isCorrect: false,
                                    },
                                ],
                            };
                        }),
                    },
                };
            })
        );
    };

    const updateAnswer = (questionId: string, answerId: string, changes: Partial<Answer>) => {
        setBlocks((oldBlocks) =>
            oldBlocks.map((currentBlock) => {
                if (currentBlock.id !== block.id) return currentBlock;
                return {
                    ...currentBlock,
                    content: {
                        ...currentBlock.content,
                        questions: currentBlock.content.questions.map((question: Question) => {
                            if (question.id !== questionId) return question;

                            return {
                                ...question,
                                answers: question.answers.map((answer: Answer) => {
                                    if (answer.id !== answerId) return answer;

                                    return {
                                        ...answer,
                                        ...changes,
                                    };
                                }),
                            };
                        }),
                    },
                };
            })
        );
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '6px',
            backgroundColor: '#fff'
        }}>

            {/* Render all questions */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {block.content.questions.map((question: Question, index: number) => (
                    <div key={question.id} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: '#fafafa', 
                        border: '1px solid #eee',
                        borderRadius: '4px'
                    }}>
                        <h4 style={{margin: 0, color: '#333'}}>Question {index + 1}</h4>

                        {/* Question text area */}
                        <textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestionText(question.id, e.target.value)}
                            placeholder="Write your question here..."
                            style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '0.75rem',
                                fontSize: '1rem',
                                fontFamily: 'inherit',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />

                        {/* Answers List */}
                        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem'}}>
                            {question.answers.map((answer: Answer) => (
                                <div key={answer.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem'
                                }}>
                                    {/* Checkbox */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        color: '#555'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={answer.isCorrect}
                                            onChange={(e) => updateAnswer(question.id, answer.id, {isCorrect: e.target.checked})}
                                            style={{width: '16px', height: '16px', cursor: 'pointer'}}
                                        />
                                        Correct
                                    </label>

                                    {/* Answer text area */}
                                    <textarea
                                        value={answer.answerText}
                                        onChange={(e) => updateAnswer(question.id, answer.id, {answerText: e.target.value})}
                                        placeholder="Write answer option..."
                                        style={{
                                            flexGrow: 1, 
                                            minHeight: '40px',
                                            padding: '0.5rem',
                                            fontFamily: 'inherit',
                                            border: '1px solid #ccc',
                                            borderRadius: '4px',
                                            resize: 'vertical',
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Add answer button. Disabled if max limit reached */}
                        <div>
                            <button
                                onClick={() => addAnswer(question.id)}
                                disabled={question.answers.length >= maxAnswers}
                                style={{
                                    padding: '0.5rem 1rem',
                                    cursor: question.answers.length >= maxAnswers ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {question.answers.length >= maxAnswers ? `Max ${maxAnswers} Answers Reached` : "+ Add Answer"}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add question button at the bottom */}
            <button
                onClick={addQuestion}
                style={{
                    alignSelf: 'flex-start',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#eef',
                    border: '1px solid #ccd',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                + Add New Question
            </button>
        </div>
    );
}