/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Search, Award, Edit3, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthOverlayProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export default function AuthOverlay({ onLogin, isLoggingIn }: AuthOverlayProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-8"
        id="auth-container-card"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 mb-4">
            <BookOpen className="w-8 h-8" id="auth-logo-icon" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">사내 용어·약어 사전</h2>
          <p className="mt-2 text-sm text-slate-500">
            신규 입사자 가이드 및 사내 소통 강화를 위한 개방형 Wiki 용어 사전
          </p>
        </div>

        <div className="space-y-4 py-2 border-y border-slate-100">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">오타 보정 한영 변환 통합 검색</h4>
              <p className="text-xs text-slate-500">영어 키보드로 잘못 입력해도(예: voalfl ➔ 패밀리) 똑똑하게 알아듣고 매칭합니다.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">누구나 편집 가능한 Wiki 스타일</h4>
              <p className="text-xs text-slate-500">구글 스프레드시트가 백엔드 역할을 하여, 클릭 한 번으로 간편하게 추가, 수정, 삭제가 가능합니다.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600 mt-0.5">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">가벼운 학습을 돕는 초성·객관식 퀴즈</h4>
              <p className="text-xs text-slate-500">지루한 공부 대신, 자투리 시간에 가볍게 맞추며 사내 핵심 용어들을 빠르게 인지해 보세요.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-2">
          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="w-full relative flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl px-6 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm hover:shadow focus:outline-none disabled:opacity-75 disabled:cursor-wait"
            id="google-signin-button"
          >
            {isLoggingIn ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>인증 연동 중...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Google 계정으로 계속하기</span>
              </>
            )}
          </button>
          
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 w-full">
            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            <span>이 앱은 사내 스프레드시트와 실시간 동기화됩니다.</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
