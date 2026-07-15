/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, ArrowRight, HelpCircle, RefreshCw, Sparkles, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlossaryItem, QuizQuestion, QuizState, QuizType } from '../types';
import { getHangulConsonants, disassembleHangul } from '../utils/searchUtils';
import { logQuizAttempt } from '../services/sheetsService';

interface QuizSectionProps {
  glossaryList: GlossaryItem[];
  onSelectTerm: (item: GlossaryItem) => void;
}

export default function QuizSection({ glossaryList, onSelectTerm }: QuizSectionProps) {
  const [quizTypeSelection, setQuizTypeSelection] = useState<QuizType | 'mix'>('multiple_choice');
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [consonantInput, setConsonantInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentIsCorrect, setCurrentIsCorrect] = useState(false);

  const hasMinimumTerms = glossaryList.length >= 4;

  /**
   * Initialize a new randomized quiz of 5 questions
   */
  const startNewQuiz = () => {
    if (glossaryList.length < 4) return;

    // Shuffle and pick 5 unique items (or less if glossary is small, cap at 5)
    const shuffledList = [...glossaryList].sort(() => 0.5 - Math.random());
    const quizItems = shuffledList.slice(0, Math.min(5, glossaryList.length));

    const generatedQuestions: QuizQuestion[] = quizItems.map((item) => {
      // Choose question type
      let qType: QuizType = 'multiple_choice';
      if (quizTypeSelection === 'consonant') qType = 'consonant';
      else if (quizTypeSelection === 'mix') qType = Math.random() > 0.5 ? 'multiple_choice' : 'consonant';

      // Pick standard prompt
      const promptStyle = Math.random() > 0.5;
      let questionText = '';
      if (qType === 'multiple_choice') {
        if (promptStyle && item.abbreviation) {
          questionText = `'${item.abbreviation}'가 뜻하는 올바른 한국어 명칭은 무엇인가요?`;
        } else {
          questionText = `다음 설명이 지칭하는 사내 용어는 무엇인가요?\n\n"${item.definition}"`;
        }

        // Generate multiple choice options (Correct + 3 random distractors)
        const distractors = glossaryList
          .filter(g => g.id !== item.id)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map(g => g.term);

        const options = [item.term, ...distractors].sort(() => 0.5 - Math.random());

        return {
          item,
          type: qType,
          questionText,
          options,
          correctAnswer: item.term
        };
      } else {
        // Consonant Quiz
        questionText = `다음 설명을 보고 초성에 알맞은 사내 용어를 맞춰보세요.\n\n"${item.definition}"`;
        const consonants = getHangulConsonants(item.term);

        return {
          item,
          type: qType,
          questionText,
          correctAnswer: item.term,
          consonants
        };
      }
    });

    setQuizState({
      questions: generatedQuestions,
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      isCompleted: false
    });

    // Reset current question UI
    setSelectedAnswer(null);
    setConsonantInput('');
    setHasSubmitted(false);
  };

  /**
   * Submit answer for active question
   */
  const handleAnswerSubmit = (answer: string) => {
    if (hasSubmitted || !quizState) return;

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    let isCorrect = false;

    if (currentQuestion.type === 'multiple_choice') {
      isCorrect = answer === currentQuestion.correctAnswer;
      setSelectedAnswer(answer);
    } else {
      // Consonant / input: strip spacing and lowercase for high tolerance
      const cleanInput = answer.replace(/\s+/g, '').toLowerCase();
      const cleanCorrect = currentQuestion.correctAnswer.replace(/\s+/g, '').toLowerCase();
      isCorrect = cleanInput === cleanCorrect;
      setConsonantInput(answer);
    }

    setCurrentIsCorrect(isCorrect);
    setHasSubmitted(true);

    const updatedAnswers = [
      ...quizState.answers,
      {
        questionIndex: quizState.currentQuestionIndex,
        userAnswer: answer,
        isCorrect
      }
    ];

    setQuizState({
      ...quizState,
      score: isCorrect ? quizState.score + 1 : quizState.score,
      answers: updatedAnswers
    });
  };

  /**
   * Proceed to next question or complete quiz
   */
  const handleNextQuestion = async () => {
    if (!quizState) return;

    const nextIndex = quizState.currentQuestionIndex + 1;
    if (nextIndex < quizState.questions.length) {
      setQuizState({
        ...quizState,
        currentQuestionIndex: nextIndex
      });
      setSelectedAnswer(null);
      setConsonantInput('');
      setHasSubmitted(false);
    } else {
      // Quiz complete: save details to sheets
      const finalScore = quizState.score;
      const totalQ = quizState.questions.length;
      const correctDetails = quizState.answers
        .map((ans, idx) => `Q${idx + 1}:${ans.isCorrect ? 'O' : 'X'}`)
        .join(', ');

      setQuizState({
        ...quizState,
        isCompleted: true
      });

      // Save log in background
      await logQuizAttempt(finalScore, totalQ, correctDetails);
    }
  };

  // Feedback message mapping
  const getScoreFeedback = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage === 100) return { title: '사내 백과사전 마스터!', desc: '사내 주요 용어를 완벽하게 파악하고 계시네요! 최고입니다 🌟' };
    if (percentage >= 80) return { title: '대단한 적응력!', desc: '업무 소통에 막힘이 없을 실력이시군요! 적극적인 지식 활용을 기대합니다 👍' };
    if (percentage >= 50) return { title: '조금만 더!', desc: '사내 용어와 제법 친숙해지셨네요. 틀린 부분을 사전에서 찾아 복습해 보세요! 📖' };
    return { title: '화이팅!', desc: '용어가 아직은 조금 낯설 수 있습니다. 사내 백과사전 찾기 탭에서 연관 용어들을 훑어보세요! 😊' };
  };

  return (
    <div className="max-w-3xl mx-auto" id="quiz-root-section">
      
      {/* 1. QUIZ INTRODUCTION SCREEN */}
      {!quizState && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm text-center space-y-8"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">사내 용어·약어 핵심 퀴즈</h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              현재 구글 스프레드시트에 실시간으로 등록된 사내 용어들을 기반으로 5문항의 맞춤형 퀴즈가 즉석에서 생성됩니다.
            </p>
          </div>

          {hasMinimumTerms ? (
            <div className="space-y-6 max-w-sm mx-auto">
              {/* Mode Select */}
              <div className="text-left space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  퀴즈 유형 선택
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setQuizTypeSelection('multiple_choice')}
                    className={`px-3 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      quizTypeSelection === 'multiple_choice'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    객관식 4지선다
                  </button>
                  <button
                    onClick={() => setQuizTypeSelection('consonant')}
                    className={`px-3 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      quizTypeSelection === 'consonant'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    주관식 초성 퀴즈
                  </button>
                  <button
                    onClick={() => setQuizTypeSelection('mix')}
                    className={`px-3 py-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      quizTypeSelection === 'mix'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    두 유형 랜덤 믹스
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={startNewQuiz}
                className="w-full bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold text-sm py-4 rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                id="btn-quiz-start"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>퀴즈 풀기 시작</span>
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-6 text-sm max-w-md mx-auto space-y-2">
              <p className="font-semibold">⚠️ 퀴즈를 생성할 데이터가 부족합니다.</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                퀴즈는 등록된 용어를 기반으로 생성됩니다. 원활한 퀴즈 운영을 위해 최소 4개 이상의 사내 용어를 먼저 사전 찾기 탭에서 등록해 주세요.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. ACTIVE QUIZ PLAY SCREEN */}
      {quizState && !quizState.isCompleted && (() => {
        const currentQ = quizState.questions[quizState.currentQuestionIndex];
        const progressPercent = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;

        return (
          <div className="space-y-6" id="quiz-playground">
            {/* Progress Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                문제 {quizState.currentQuestionIndex + 1} / {quizState.questions.length}
              </span>
              <div className="w-1/2 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-600">현재 맞춘 개수: {quizState.score}</span>
            </div>

            {/* Question Card */}
            <motion.div
              key={quizState.currentQuestionIndex}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-6"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{currentQ.type === 'multiple_choice' ? '객관식 4지선다' : '주관식 초성'}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {currentQ.questionText}
                </h3>
              </div>

              {/* MULTIPLE CHOICE TYPE */}
              {currentQ.type === 'multiple_choice' && currentQ.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {currentQ.options.map((option) => {
                    const isPicked = selectedAnswer === option;
                    const isCorrect = option === currentQ.correctAnswer;
                    
                    let btnStyle = 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 bg-white';
                    if (hasSubmitted) {
                      if (isCorrect) {
                        btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold';
                      } else if (isPicked) {
                        btnStyle = 'border-red-400 bg-red-50 text-red-800 font-bold';
                      } else {
                        btnStyle = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
                      }
                    }

                    return (
                      <button
                        key={option}
                        disabled={hasSubmitted}
                        onClick={() => handleAnswerSubmit(option)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all flex items-center justify-between ${btnStyle} cursor-pointer`}
                      >
                        <span>{option}</span>
                        {hasSubmitted && isCorrect && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />}
                        {hasSubmitted && isPicked && !isCorrect && <XCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* CONSONANT FILL-IN TYPE */}
              {currentQ.type === 'consonant' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-center space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">초성 힌트</span>
                    <p className="text-2xl font-bold text-slate-800 tracking-widest font-mono">
                      {currentQ.consonants}
                    </p>
                  </div>

                  {!hasSubmitted ? (
                    <div className="flex gap-2.5">
                      <input
                        type="text"
                        placeholder="정답인 용어명을 띄어쓰기 없이 입력해 주세요..."
                        value={consonantInput}
                        onChange={(e) => setConsonantInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && consonantInput.trim()) {
                            handleAnswerSubmit(consonantInput.trim());
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-emerald-200"
                      />
                      <button
                        onClick={() => handleAnswerSubmit(consonantInput.trim())}
                        disabled={!consonantInput.trim()}
                        className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold px-5 rounded-xl cursor-pointer"
                      >
                        제출
                      </button>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                      currentIsCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      {currentIsCorrect ? (
                        <>
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                          <span>정답입니다!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4.5 h-4.5 text-red-500" />
                          <span>오답입니다! (제출 답안: '{consonantInput}' | 정답: '{currentQ.correctAnswer}')</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* REVEAL DEFINITION DETAILS AFTER SUBMITTING */}
              <AnimatePresence>
                {hasSubmitted && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-slate-100 pt-5 space-y-3 overflow-hidden text-left"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">용어 정의 및 원어</span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">
                        {currentQ.item.term}
                        {currentQ.item.abbreviation && (
                          <span className="text-xs font-normal text-slate-500 ml-1.5">({currentQ.item.abbreviation})</span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {currentQ.item.definition}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectTerm(currentQ.item)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>백과사전 상세 카드 보기</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* NEXT / NEXT QUESTION BUTTON */}
              {hasSubmitted && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-3 rounded-xl flex items-center gap-1 transition shadow hover:shadow-md cursor-pointer"
                  >
                    <span>
                      {quizState.currentQuestionIndex + 1 === quizState.questions.length ? '결과 보기' : '다음 문제'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        );
      })()}

      {/* 3. QUIZ COMPLETED RESULT SUMMARY SCREEN */}
      {quizState && quizState.isCompleted && (() => {
        const feedback = getScoreFeedback(quizState.score, quizState.questions.length);

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm space-y-8 text-center"
          >
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-inner">
                <Award className="w-10 h-10 stroke-[2]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900">{feedback.title}</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">{feedback.desc}</p>
              </div>

              {/* Score Display */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 max-w-xs mx-auto flex items-center justify-around">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">나의 점수</span>
                  <span className="text-3xl font-extrabold text-slate-800">
                    {quizState.score * 20}<span className="text-sm font-semibold text-slate-400">점</span>
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">정답 문항</span>
                  <span className="text-3xl font-extrabold text-slate-800">
                    {quizState.score}<span className="text-sm font-semibold text-slate-400"> / {quizState.questions.length}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Answers breakdown */}
            <div className="text-left space-y-3 max-w-lg mx-auto">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">상세 오답 정리</span>
              <div className="space-y-2.5">
                {quizState.questions.map((q, idx) => {
                  const ans = quizState.answers.find(a => a.questionIndex === idx);
                  const isCorrect = ans ? ans.isCorrect : false;

                  return (
                    <div
                      key={q.item.id}
                      className="p-3.5 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition flex items-start gap-3 justify-between"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {isCorrect ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4.5 h-4.5 text-red-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">{q.item.term}</span>
                            {q.item.abbreviation && (
                              <span className="text-[10px] text-slate-400 font-semibold">({q.item.abbreviation})</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{q.item.definition}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectTerm(q.item)}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 flex-shrink-0 cursor-pointer"
                      >
                        사전 이동
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 max-w-sm mx-auto flex gap-3">
              <button
                onClick={() => setQuizState(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold py-3.5 rounded-xl transition cursor-pointer"
              >
                메인으로
              </button>
              <button
                onClick={startNewQuiz}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-3.5 rounded-xl transition shadow shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span>다시 도전하기</span>
              </button>
            </div>
          </motion.div>
        );
      })()}

    </div>
  );
}
