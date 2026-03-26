"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import type { AdvisoryQuestion, QuestionCompletion } from "@/types/domain";
import { Pill, PrimaryButton, ProgressBar, SectionCard } from "@/components/ui/primitives";

interface Props {
  questions: AdvisoryQuestion[];
  answers: Record<string, string>;
  completion: QuestionCompletion;
  dynamicTags: string[];
  onAnswer: (questionId: string, value: string) => void;
  onContinue: () => void;
}

export function AssessmentStage({ questions, answers, completion, dynamicTags, onAnswer, onContinue }: Props) {
  return (
    <SectionCard className="fade-up-delay">
      <div className="relative z-10 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Pill>Stage 2</Pill>
              <Pill className="border-amber-200 bg-amber-50 text-amber-800">Dynamic questionnaire</Pill>
            </div>
            <h2 className="text-3xl text-stone-900">Risk &amp; Goals Assessment</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              The backbone questions stay consistent for every client, while follow-ups adapt to the profile signals detected in Stage 1. Answer at least 70% to unlock the analysis pipeline.
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => {
              const answer = answers[question.id] || "";
              return (
                <div key={question.id} className="rounded-[26px] border border-stone-200 bg-white/75 p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{question.category}</p>
                      <h3 className="mt-2 text-lg text-stone-900">{question.prompt}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">{question.helperText}</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">Q{index + 1}</span>
                  </div>

                  <div className="mt-4">
                    {question.type === "choice" && question.options ? (
                      <div className="flex flex-wrap gap-3">
                        {question.options.map((option) => {
                          const active = answer === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => onAnswer(question.id, option.value)}
                              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                active ? "bg-teal-700 text-white" : "border border-stone-300 bg-white text-stone-700 hover:border-teal-500"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        value={answer}
                        onChange={(event) => onAnswer(question.id, event.target.value)}
                        rows={3}
                        placeholder="Capture the advisor's answer here"
                        className="w-full rounded-[18px] border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">Coverage meter</p>
                <p className="text-sm text-stone-600">The analysis stage opens once at least 70% of displayed questions are answered.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-stone-900">{completion.percent}%</p>
                <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{completion.answered}/{completion.total} answered</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <ProgressBar value={completion.percent} />
              <div className="flex items-center gap-2 text-sm text-stone-600">
                {completion.thresholdMet ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ArrowRight className="h-4 w-4 text-amber-600" />}
                <span>{completion.thresholdMet ? "Coverage threshold reached." : "Keep going to unlock Stage 3."}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/75 p-5">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-lg text-stone-900">Adaptive prompts currently active</h3>
                <p className="text-sm text-stone-600">These tags determine which follow-up questions appear.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {dynamicTags.length ? dynamicTags.map((tag) => <Pill key={tag}>{tag}</Pill>) : <Pill>No special triggers yet</Pill>}
            </div>
          </div>

          <div className="rounded-[28px] border border-teal-100 bg-teal-50/80 p-5 text-sm leading-6 text-teal-900">
            Because the question routing is rule-based, the app stays predictable and testable. The LLM is saved for deeper portfolio analysis and recommendation synthesis later in the workflow.
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex justify-end border-t border-stone-200/70 pt-6">
        <PrimaryButton onClick={onContinue} disabled={!completion.thresholdMet}>
          Continue to Analysis
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

