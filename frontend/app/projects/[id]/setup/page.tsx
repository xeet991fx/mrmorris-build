"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    CheckCircleIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";

interface Question {
    id: string;
    question: string;
    type: string;
    options: { value: string; label: string }[];
}

interface Answers {
    [key: string]: string;
}

export default function SetupPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Answers>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingUp, setIsSettingUp] = useState(false);
    const [setupComplete, setSetupComplete] = useState(false);
    const [setupResult, setSetupResult] = useState<string | null>(null);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const response = await axios.get("/workspaces/setup-questions");
            if (response.data.success) {
                setQuestions(response.data.data.questions);
            }
        } catch (err) {
            console.error("Failed to fetch questions:", err);
            toast.error("Failed to load setup questions");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = (value: string) => {
        const currentQuestion = questions[currentStep];
        setAnswers((prev) => ({
            ...prev,
            [currentQuestion.id]: value,
        }));
    };

    const nextStep = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    };

    const runSetup = async () => {
        setIsSettingUp(true);
        try {
            const response = await axios.post(`/workspaces/${workspaceId}/ai-setup`, {
                answers,
            });

            if (response.data.success) {
                setSetupComplete(true);
                setSetupResult(response.data.data.agentResponse);
                toast.success("CRM setup complete!");
            } else {
                toast.error(response.data.error || "Setup failed");
            }
        } catch (err: any) {
            console.error("Setup error:", err);
            toast.error(err.response?.data?.error || "Setup failed");
        } finally {
            setIsSettingUp(false);
        }
    };

    const goToDashboard = () => {
        router.push(`/projects/${workspaceId}`);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="w-10 h-10 border-2 border-[#9ACD32] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const currentQuestion = questions[currentStep];
    const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;
    const progress = ((currentStep + 1) / questions.length) * 100;
    const isLastQuestion = currentStep === questions.length - 1;
    const allAnswered = questions.every((q) => answers[q.id]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#9ACD32]/20 text-[#9ACD32] mb-4">
                        <SparklesIcon className="w-5 h-5" />
                        <span className="font-medium">AI-Powered Setup</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">
                        {setupComplete ? "Your CRM is Ready!" : "Let's set up your CRM"}
                    </h1>
                    <p className="text-muted-foreground">
                        {setupComplete
                            ? "We've created everything you need to get started"
                            : "Answer a few questions and AI will configure everything for you"}
                    </p>
                </div>

                {/* Setup Complete */}
                {setupComplete ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-2xl p-8"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Setup Complete!
                            </h2>
                        </div>

                        {setupResult && (
                            <div className="p-4 rounded-lg bg-muted/50 border border-border mb-6 max-h-80 overflow-y-auto prose prose-sm prose-invert max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h3: ({ children }) => (
                                            <h3 className="text-lg font-semibold text-foreground mt-4 mb-2 flex items-center gap-2">
                                                {children}
                                            </h3>
                                        ),
                                        strong: ({ children }) => (
                                            <strong className="text-[#9ACD32] font-semibold">{children}</strong>
                                        ),
                                        li: ({ children }) => (
                                            <li className="text-foreground text-sm ml-4">{children}</li>
                                        ),
                                        p: ({ children }) => (
                                            <p className="text-muted-foreground text-sm mb-2">{children}</p>
                                        ),
                                        hr: () => (
                                            <hr className="border-border my-4" />
                                        ),
                                    }}
                                >
                                    {setupResult}
                                </ReactMarkdown>
                            </div>
                        )}

                        <button
                            onClick={goToDashboard}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#9ACD32] text-black rounded-lg font-semibold hover:bg-[#8BC428] transition-colors"
                        >
                            <RocketLaunchIcon className="w-5 h-5" />
                            Go to Dashboard
                        </button>
                    </motion.div>
                ) : isSettingUp ? (
                    /* Setting Up State */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card border border-border rounded-2xl p-8"
                    >
                        <div className="text-center">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                                <div className="absolute inset-0 rounded-full border-4 border-[#9ACD32] border-t-transparent animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <SparklesIcon className="w-8 h-8 text-[#9ACD32]" />
                                </div>
                            </div>
                            <h2 className="text-xl font-semibold text-foreground mb-2">
                                Setting up your CRM...
                            </h2>
                            <p className="text-muted-foreground text-sm">
                                AI is creating your pipelines, sequences, and workflows
                            </p>
                            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                                <p className="animate-pulse">🔄 Analyzing your business needs...</p>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    /* Questionnaire */
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-card border border-border rounded-2xl overflow-hidden"
                    >
                        {/* Progress Bar */}
                        <div className="h-1 bg-muted">
                            <motion.div
                                className="h-full bg-[#9ACD32]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {/* Question */}
                        <div className="p-8">
                            <div className="text-sm text-muted-foreground mb-2">
                                Question {currentStep + 1} of {questions.length}
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <h2 className="text-xl font-semibold text-foreground mb-6">
                                        {currentQuestion?.question}
                                    </h2>

                                    <div className="space-y-3">
                                        {currentQuestion?.options.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => handleAnswer(option.value)}
                                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${currentAnswer === option.value
                                                    ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                                    : "border-border hover:border-muted-foreground"
                                                    }`}
                                            >
                                                <span className="font-medium text-foreground">
                                                    {option.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between p-6 border-t border-border">
                            <button
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                className="flex items-center gap-2 px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ArrowLeftIcon className="w-4 h-4" />
                                Back
                            </button>

                            {isLastQuestion ? (
                                <button
                                    onClick={runSetup}
                                    disabled={!allAnswered}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#9ACD32] text-black rounded-lg font-medium hover:bg-[#8BC428] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    Set Up My CRM
                                </button>
                            ) : (
                                <button
                                    onClick={nextStep}
                                    disabled={!currentAnswer}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#9ACD32] text-black rounded-lg font-medium hover:bg-[#8BC428] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                    <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Skip Option */}
                {!setupComplete && !isSettingUp && (
                    <div className="text-center mt-6">
                        <button
                            onClick={goToDashboard}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Skip for now
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
