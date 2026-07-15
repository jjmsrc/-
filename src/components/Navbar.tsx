/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Award, FileSpreadsheet, LogOut, User } from 'lucide-react';

interface NavbarProps {
  activeTab: 'glossary' | 'quiz';
  setActiveTab: (tab: 'glossary' | 'quiz') => void;
  spreadsheetId: string | null;
  onLogout: () => void;
  userInfo: { name: string; email: string; photoUrl?: string } | null;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  spreadsheetId,
  onLogout,
  userInfo
}: NavbarProps) {
  const sheetUrl = spreadsheetId 
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
    : '#';

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm" id="global-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('glossary')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/10">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight hidden sm:inline">
              사내 용어·약어 사전
            </span>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl" id="nav-tabs">
            <button
              onClick={() => setActiveTab('glossary')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'glossary'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="tab-btn-glossary"
            >
              <BookOpen className="w-4 h-4" />
              <span>사전 찾기</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              id="tab-btn-quiz"
            >
              <Award className="w-4 h-4" />
              <span>용어 퀴즈</span>
            </button>
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {spreadsheetId && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg font-medium transition border border-emerald-100"
                title="원본 구글 스프레드시트 열기"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>시트 바로가기</span>
              </a>
            )}

            {userInfo && (
              <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
                <div className="flex items-center gap-2">
                  {userInfo.photoUrl ? (
                    <img
                      src={userInfo.photoUrl}
                      alt={userInfo.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full border border-slate-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-600">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 leading-tight">{userInfo.name}</span>
                    <span className="text-[10px] text-slate-400 leading-none">{userInfo.email}</span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile quick-sheet link */}
        {spreadsheetId && (
          <div className="md:hidden border-t border-slate-50 py-1.5 flex justify-end">
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-1 rounded"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>스프레드시트 원본 보기</span>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
