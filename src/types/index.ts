export type Question = {
    id: number;
    lang_id: number;
    body: { order: number; type: number; value: string }[];
    comment: string | null;
    static_order_answers: number;
    answers: {
        id: number;
        newtest_question_id: number;
        body: { order: number; type: number; value: string }[];
        check: number;
    }[];
    answer_description: string | null;
    answer_video: string | null;
};

export type TestStat = {
    correct: number;
    attempted: number;
    timesTaken: number;
};

export type StatChartData = {
    name: string;
    value: number;
};

export type TimerProps = {
    quizData: Question[];
    showResult: boolean;
    setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
    setShowTimeWarning: React.Dispatch<React.SetStateAction<boolean>>;
    showTimeWarning: boolean;
    warningAudioRef: React.RefObject<HTMLAudioElement>;
    finishTest: () => void;
};

export type AnswerOptionsProps = {
    question: Question;
    selectedAnswer: number | null;
    handleAnswerClick: (index: number) => void;
    isAnswered: boolean;
};

export type ExplanationProps = {
    isAnswered: boolean;
    answer_description: string | null;
    expandedExplanation: boolean;
    setExpandedExplanation: React.Dispatch<React.SetStateAction<boolean>>;
};

export type ProgressBarProps = {
    progressPercentage: number;
};

export type StatsChartProps = {
    groupedQuestions: Question[][];
    groupStats: Record<number, TestStat>;
    startGroupQuiz: (index: number) => void;
};