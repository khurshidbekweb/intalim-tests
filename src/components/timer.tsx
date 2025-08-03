import { useEffect } from "react";
import type { TimerProps } from "../types";

export const Timer = ({ showResult, setTimeLeft, setShowTimeWarning, warningAudioRef, finishTest }: TimerProps) => {
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (!showResult) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev === 61 && warningAudioRef.current) warningAudioRef.current.play();
                    if (prev === 60) setShowTimeWarning(true);
                    if (prev <= 1) {
                        clearInterval(timer);
                        finishTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [finishTest, setShowTimeWarning, setTimeLeft, showResult, warningAudioRef]);

    return null;
};
