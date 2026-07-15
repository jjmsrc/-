/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GlossaryItem {
  id: number; // Unique numerical identifier
  term: string; // Korean name of the term
  abbreviation: string; // English acronym / original full name (e.g. PRD / Product Requirement Document)
  definition: string; // Detail description/definition
  departments: string[]; // List of related departments
  relatedTerms: number[]; // List of related glossary item IDs
  lastUpdated: string; // Date-time string (ISO format or YYYY-MM-DD HH:mm:ss)
  updatedBy: string; // Name or email of the updater
}

export type QuizType = 'multiple_choice' | 'consonant';

export interface QuizQuestion {
  item: GlossaryItem;
  type: QuizType;
  questionText: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  consonants?: string; // For consonant quiz (e.g. 'ㅈㅍ ㅇㄱㅅㅎ ㄷㅇㅅ')
}

export interface QuizState {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  score: number;
  answers: { questionIndex: number; userAnswer: string; isCorrect: boolean }[];
  isCompleted: boolean;
}
