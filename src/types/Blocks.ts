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

    points: number;
};

export type QuestionnaireBlockType = BaseBlock & {
    type: "questionnaire";

    content: {
        questions: Question[];
        gamify?: boolean;
    };
};

export type ImageBlockType = BaseBlock & {
    type: "image";
    content: {
        dataUrl?: string;
        fileName?: string;
        alt?: string;
    };
};

export type VideoBlockType = BaseBlock & {
    type: "video";
    content: {
        dataUrl?: string;
        fileName?: string;
        title?: string;
    };
};

export type Block =
    | TextBlockType
    | QuestionnaireBlockType
    | ImageBlockType
    | VideoBlockType;