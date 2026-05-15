export type BaseBlock = {
    id: string;
};

export type TextBlockType = BaseBlock & {
    type: "text";

    content: {
        text: string;
    };
};

export type Answer = {
    id: string;

    answerText: string;

    isCorrect: boolean;
};

export type Question = {
    id: string;

    questionText: string;

    answers: Answer[];
};

export type QuestionnaireBlockType = BaseBlock & {
    type: "questionnaire";

    content: {
        text: string;
        questions: Question[];
    };
};

export type Block =
    | TextBlockType
    | QuestionnaireBlockType;