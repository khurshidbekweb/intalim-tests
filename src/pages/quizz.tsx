
import { Image } from "antd";
import { useEffect, useRef, useState } from "react";
import { FaRegHandPointDown } from "react-icons/fa";
import { PiRocketBold } from "react-icons/pi";
// Types
type Question = {
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

type TestStat = {
  correct: number;
  attempted: number;
  timesTaken: number;
};


function getRandomSubset<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const LOCAL_STATS_KEY = "quiz_stats";

export default function QuizApp() {
  // States
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [groupedQuestions, setGroupedQuestions] = useState<Question[][]>([]);
  const [groupStats, setGroupStats] = useState<Record<number, TestStat>>(() => {
    const stored = localStorage.getItem(LOCAL_STATS_KEY);
    return stored ? JSON.parse(stored) : {};
  });
  const [totalAttempts, setTotalAttempts] = useState(() => {
    const stored = localStorage.getItem("total_attempts");
    return stored ? Number(stored) : 0;
  });

  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [expandedExplanation, setExpandedExplanation] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);


  const audioRef = useRef<HTMLAudioElement>(null);
  const warningAudioRef = useRef<HTMLAudioElement>(null);

  // Timer effect
  useEffect(() => {
    if (quizData.length === 0 || showResult) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 60 && !showTimeWarning) {
          setShowTimeWarning(true);
          if (warningAudioRef.current) {
            warningAudioRef.current.play();
          }
        }

        if (prev <= 1) {
          clearInterval(interval);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizData, showResult, showTimeWarning]);

  // Load questions
  useEffect(() => {
    fetch("/data/intalim.json")
      .then((res) => res.json())
      .then((data) => {
        const questions: Question[] = data.data.data;
        setAllQuestions(questions);
        setGroupedQuestions(chunkArray(questions, 20));
      });
  }, []);

  // Persist stats to localStorage
  const persistStats = (newStats: Record<number, TestStat>, total: number) => {
    try {
      localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(newStats));
      localStorage.setItem("total_attempts", total.toString());
    } catch (error) {
      console.error("LocalStorage error:", error);
    }
  };

  // Start group quiz
  const startGroupQuiz = (index: number) => {
    const group = groupedQuestions[index];
    setSelectedGroupIndex(index);
    setQuizData(group);
    setSelectedAnswers(Array(group.length).fill(null));
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setTimeLeft(10 * 60);
    setExpandedExplanation(false);
    setShowTimeWarning(false);
  };

  // Start random quiz
  const startRandomQuiz = () => {
    const randomSet = getRandomSubset(allQuestions, 20);
    setSelectedGroupIndex(null);
    setQuizData(randomSet);
    setSelectedAnswers(Array(20).fill(null));
    setCurrentQuestion(0);
    setScore(0);
    setShowResult(false);
    setTimeLeft(10 * 60);
    setExpandedExplanation(false);
    setShowTimeWarning(false);
  };

  // Handle answer selection
  const handleAnswerClick = (idx: number) => {
    const question = quizData[currentQuestion];
    const isCorrect = question.answers[idx].check === 1;

    // If user already selected an answer, don't allow changes
    if (selectedAnswers[currentQuestion] !== null) return;

    setSelectedAnswers((prev) => {
      const updated = [...prev];
      updated[currentQuestion] = idx;
      return updated;
    });

    // Show feedback immediately

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  // Navigation functions
  const goToNext = () => {
    if (currentQuestion + 1 < quizData.length) {
      setCurrentQuestion((prev) => prev + 1);
      setExpandedExplanation(false);
    }
  };

  const goToPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      setExpandedExplanation(false);
    }
  };

  // Finish test and show results
  const finishTest = () => {
    if (showResult) return;

    // Check if all questions are answered
    const unansweredCount = selectedAnswers.filter(a => a === null).length;
    if (unansweredCount > 0) {
      alert(`Iltimos, barcha ${unansweredCount} ta savolga javob bering!`);
      return;
    }

    setShowResult(true);

    const attempted = selectedAnswers.filter((a) => a !== null).length;

    if (selectedGroupIndex !== null) {
      setGroupStats((prev) => {
        const stat = prev[selectedGroupIndex] || { correct: 0, attempted: 0, timesTaken: 0 };
        const updated = {
          ...prev,
          [selectedGroupIndex]: {
            correct: stat.correct + score,
            attempted: stat.attempted + attempted,
            timesTaken: stat.timesTaken + 1,
          },
        };
        persistStats(updated, totalAttempts + 1);
        return updated;
      });
    }

    setTotalAttempts((prev) => {
      const total = prev + 1;
      localStorage.setItem("total_attempts", total.toString());
      return total;
    });

    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  // Render results screen
  const renderResults = () => {
    const percentage = Math.round((score / quizData.length) * 100);
    const timeSpent = 10 * 60 - timeLeft;
    const minutesSpent = Math.floor(timeSpent / 60);
    const secondsSpent = timeSpent % 60;

    return (
      <div className="p-4 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Test natijalari</h2>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg">To'g'ri javoblar:</p>
              <p className="text-3xl font-bold text-green-600">
                {score} / {quizData.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg">Foiz:</p>
              <p className="text-3xl font-bold text-blue-600">
                {percentage}%
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-lg">Sarflangan vaqt:</p>
            <p className="text-2xl font-bold">
              {minutesSpent}:{secondsSpent.toString().padStart(2, '0')}
            </p>
          </div>

          {selectedGroupIndex !== null && (
            <div className="mt-4 p-3 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Statistika (bu to'plam bo'yicha):</h3>
              <p>
                Umumiy to'g'ri javoblar: {groupStats[selectedGroupIndex]?.correct || 0} / {groupStats[selectedGroupIndex]?.attempted || 0}
              </p>
              <p>
                O'rtacha foiz: {groupStats[selectedGroupIndex]?.attempted
                  ? Math.round((groupStats[selectedGroupIndex].correct / groupStats[selectedGroupIndex].attempted) * 100)
                  : 0}%
              </p>
              <p>
                Test topshirilgan: {groupStats[selectedGroupIndex]?.timesTaken || 0} marta
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            setQuizData([]);
            setShowResult(false);
          }}
          className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-lg"
        >
          Bosh menyuga qaytish
        </button>
      </div>
    );
  };

  // Main render
  if (showResult) {
    return renderResults();
  }

  if (quizData.length === 0) {


    return (
      <div className="p-4 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Test savollari soni: {allQuestions.length}</h2>
        <div className="overflow-x-auto h-[73vh] pb-4 mb-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {groupedQuestions.map((_, index) => {
              const stat = groupStats[index];


              return (
                <div
                  key={index}
                  onClick={() => startGroupQuiz(index)}
                  className="bg-gray-200 relative text-black py-2 px-4 flex flex-col space-y-3 rounded whitespace-nowrap"
                >
                  <span className="font-bold">Quiz-{index + 1}</span>
                  <div className="text-center">
                    {/* {index + 1}-to'plam ({group.length}) */}
                    {stat ? (
                      <div className="text-xl mt-1">
                        {stat.correct}/{stat.attempted} ({stat.timesTaken} marta)
                      </div>
                    ) :
                      <p className="text-xl text-amber-500">Yechilmagan</p>
                    }
                  </div>
                  <button
                    className="w-full bg-blue-500 text-white hover:bg-blue-600 transition-colors py-[6px] rounded-full text-xl flex gap-2 justify-center items-center"
                  >
                    <PiRocketBold /> Boshlash
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 justify-between">
          <p className="mt-2 text-md text-gray-500">Umumiy ishlangan testlar: {totalAttempts}</p>
          <button
            onClick={startRandomQuiz}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mb-6"
          >
            Tasodifiy 20 ta savol
          </button>
        </div>



        {/* Hidden audio elements */}
        <audio ref={audioRef} src="/timeout.mp3" preload="auto" />
        <audio ref={warningAudioRef} src="/warning.mp3" preload="auto" />
      </div>
    );
  }

  // Quiz in progress
  const question = quizData[currentQuestion];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const answeredCount = selectedAnswers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === quizData.length;
  const progressPercentage = ((currentQuestion + 1) / quizData.length) * 100;
  const selectedAnswer = selectedAnswers[currentQuestion];
  const isAnswered = selectedAnswer !== null;

  // Find correct answer index
  // const correctAnswerIndex = question.answers.findIndex(answer => answer.check === 1);

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* Hidden audio elements */}
      <audio ref={audioRef} src="/timeout.mp3" preload="auto" />
      <audio ref={warningAudioRef} src="/warning.mp3" preload="auto" />

      {/* Time warning */}
      {showTimeWarning && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p className="font-bold">Ogohlantirish!</p>
          <p>Vaqtingiz 1 daqiqadan kam qoldi!</p>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      {/* Quiz info */}
      <div className="flex justify-between mb-2 text-sm text-gray-600">
        <div>Savol {currentQuestion + 1} / {quizData.length}</div>
        <div>Javob belgilangan: {answeredCount} / {quizData.length}</div>
        <div className={timeLeft <= 60 ? "text-red-600 font-bold" : ""}>
          Vaqt: {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Question */}
      <div className="mb-4">
        {question.body.map((part, idx) =>
          part.type === 1 ? (
            <p key={idx} className="text-xl font-semibold mb-2">
              {part.value}
            </p>
          ) : (
            <Image
              key={idx}
              src={part.value}
              alt="Question"
              className="mb-2 w-full rounded"
            />
          )
        )}
      </div>

      {/* Answers */}
      <div className="space-y-3 mb-6">
        {question.answers.map((answer, idx) => {
          const isCorrect = answer.check === 1;
          const isSelected = selectedAnswer === idx;

          let bgClass = "bg-white";
          let borderClass = "border-gray-300";

          if (isAnswered) {
            if (isCorrect) {
              bgClass = "bg-green-100";
              borderClass = "border-green-500";
            } else if (isSelected) {
              bgClass = "bg-red-100";
              borderClass = "border-red-500";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswerClick(idx)}
              disabled={isAnswered}
              className={`w-full text-left p-3 rounded-lg border ${bgClass} ${borderClass} ${!isAnswered ? "hover:bg-gray-100 cursor-pointer" : "cursor-default"
                }`}
            >
              {answer.body[0].value}
              {isAnswered && isCorrect && (
                <span className="ml-2 text-green-600 font-bold">✓ To'g'ri javob</span>
              )}
              {isAnswered && isSelected && !isCorrect && (
                <span className="ml-2 text-red-600 font-bold">✗ Noto'g'ri</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {isAnswered && (
        <div className="mt-4 bg-yellow-100 rounded p-2">
          <div
            className="cursor-pointer font-semibold text-sm text-blue-700 flex items-center"
            onClick={() => setExpandedExplanation((prev) => !prev)}
          >
            {expandedExplanation ? "▼ Izohni yashirish" : "▶ Izohni ko'rish"}
          </div>
          {expandedExplanation && question?.answer_description && <p className="mt-2 text-sm mb-3">{question?.answer_description}</p>}
          {expandedExplanation && question?.body?.length > 0 && question?.answer_video && <p className="flex justify-start text-xl text-amber-600 items-center gap-x-2">Videoni ko'rish <FaRegHandPointDown /></p>}
          {expandedExplanation && question?.body?.length > 0 && question?.answer_video && <Image
            className="p-0"
            preview={{
              imageRender: () => (
                <video
                  muted
                  width="100%"
                  controls
                  src={question?.answer_video as string}
                />
              ),
              toolbarRender: () => null,
            }}
            src={question.body[1].value}
          />}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6 gap-2 flex-wrap">
        <button
          onClick={() => setQuizData([])}
          className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
        >
          Chiqish
        </button>
        <div className="flex gap-2">
          <button
            onClick={goToPrev}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50"
          >
            Oldingi
          </button>
          {currentQuestion === quizData.length - 1 ? (
            <button
              onClick={finishTest}
              disabled={!allAnswered}
              className={`px-4 py-2 ${allAnswered
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gray-400 cursor-not-allowed"
                } text-white rounded`}
            >
              Yakunlash
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Keyingi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}