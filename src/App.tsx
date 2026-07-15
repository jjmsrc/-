/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  loadGlossary, 
  addGlossaryItem, 
  updateGlossaryItem, 
  deleteGlossaryItem, 
  getOrCreateSpreadsheet,
  getAccessToken
} from './services/sheetsService';
import { GlossaryItem } from './types';
import Navbar from './components/Navbar';
import AuthOverlay from './components/AuthOverlay';
import GlossaryList from './components/GlossaryList';
import TermDetail from './components/TermDetail';
import TermForm from './components/TermForm';
import QuizSection from './components/QuizSection';
import { BookOpen, Sparkles, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'glossary' | 'quiz'>('glossary');
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  // Glossary states
  const [glossaryList, setGlossaryList] = useState<GlossaryItem[]>([]);
  const [isLoadingGlossary, setIsLoadingGlossary] = useState<boolean>(false);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  // Filter state (shared so tag clicks trigger filtering)
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('전체');

  // Modal / Drawer state
  const [selectedTerm, setSelectedTerm] = useState<GlossaryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTerm, setEditingTerm] = useState<GlossaryItem | null>(null);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authUser, token) => {
        setUser(authUser);
        setNeedsAuth(false);
        setIsLoggingIn(false);
        
        // Find or create sheet and fetch items
        await handleLoadData(token);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setIsLoggingIn(false);
        setGlossaryList([]);
        setSpreadsheetId(null);
      }
    );

    return () => unsubscribe();
  }, []);

  /**
   * Main routine to fetch sheet ID and load data
   */
  const handleLoadData = async (token: string) => {
    setIsLoadingGlossary(true);
    setGlossaryError(null);
    try {
      const sheetId = await getOrCreateSpreadsheet(token);
      setSpreadsheetId(sheetId);

      const items = await loadGlossary();
      setGlossaryList(items);
    } catch (err: any) {
      console.error('데이터 로딩 오류:', err);
      setGlossaryError(err.message || '데이터를 로딩하는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingGlossary(false);
    }
  };

  /**
   * Reload data from Sheet manually
   */
  const handleManualRefresh = async () => {
    const token = await getAccessToken();
    if (token) {
      await handleLoadData(token);
    }
  };

  /**
   * Handle Google login
   */
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        await handleLoadData(result.accessToken);
      }
    } catch (err) {
      console.error('로그인 에러:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Handle Logout
   */
  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      await logout();
    }
  };

  /**
   * Create or update a terminology
   */
  const handleFormSubmit = async (payload: Omit<GlossaryItem, 'id'> & { id?: number }) => {
    if (payload.id) {
      // Update
      const updated = await updateGlossaryItem(payload as GlossaryItem);
      // Update local state immediately
      setGlossaryList(prev => prev.map(item => item.id === updated.id ? updated : item));
      if (selectedTerm && selectedTerm.id === updated.id) {
        setSelectedTerm(updated);
      }
    } else {
      // Create
      const created = await addGlossaryItem(payload);
      // Append to local state
      setGlossaryList(prev => [...prev, created]);
    }
    setIsFormOpen(false);
    setEditingTerm(null);
  };

  /**
   * Delete a terminology
   */
  const handleDeleteTerm = async (id: number) => {
    await deleteGlossaryItem(id);
    setGlossaryList(prev => prev.filter(item => item.id !== id));
    if (selectedTerm && selectedTerm.id === id) {
      setSelectedTerm(null);
      setIsDetailOpen(false);
    }
  };

  /**
   * Open the edit form modal with active item filled in
   */
  const handleTriggerEdit = (item: GlossaryItem) => {
    setEditingTerm(item);
    setIsFormOpen(true);
  };

  /**
   * Select a term to view detail drawer (handles relational jumps)
   */
  const handleSelectTerm = (item: GlossaryItem) => {
    setSelectedTerm(item);
    setIsDetailOpen(true);
  };

  // Render Auth screen if not logged in
  if (needsAuth) {
    return <AuthOverlay onLogin={handleLogin} isLoggingIn={isLoggingIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased" id="main-app-container">
      
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        spreadsheetId={spreadsheetId}
        onLogout={handleLogout}
        userInfo={
          user
            ? {
                name: user.displayName || '임직원',
                email: user.email || '',
                photoUrl: user.photoURL || undefined
              }
            : null
        }
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading overlay for whole applet */}
        {isLoadingGlossary && glossaryList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-pulse">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="absolute inset-0 border-2 border-emerald-500 border-t-transparent rounded-2xl animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-slate-800">사내 구글 스프레드시트 연동 중...</h3>
              <p className="text-xs text-slate-400 mt-1">스프레드시트에서 최신 용어 데이터를 가져오고 있습니다.</p>
            </div>
          </div>
        ) : glossaryError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl max-w-md mx-auto space-y-4 shadow-sm">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">연동 오류가 발생했습니다</h4>
                <p className="text-xs text-red-600 leading-relaxed mt-1">{glossaryError}</p>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              className="w-full py-2 bg-white hover:bg-slate-50 border border-red-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>다시 시도하기</span>
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === 'glossary' ? (
                <div className="space-y-6">
                  {/* Dashboard header for glossary */}
                  <div className="flex justify-between items-center flex-wrap gap-3">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>사내 백과사전</span>
                        <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-2xs font-mono">
                          총 {glossaryList.length}개 용어
                        </span>
                      </h1>
                      <p className="text-xs text-slate-500 mt-1">
                        소통의 오해를 허물고 가치를 더하는 공용 지식 공간입니다. 누구나 편집하고 기여할 수 있습니다.
                      </p>
                    </div>

                    <button
                      onClick={handleManualRefresh}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl shadow-2xs transition cursor-pointer"
                      title="스프레드시트 실시간 새로고침"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGlossary ? 'animate-spin text-emerald-500' : ''}`} />
                      <span>동기화</span>
                    </button>
                  </div>

                  {/* Browser Lists */}
                  <GlossaryList
                    items={glossaryList}
                    onSelectTerm={handleSelectTerm}
                    onAddClick={() => {
                      setEditingTerm(null);
                      setIsFormOpen(true);
                    }}
                    selectedDeptFilter={selectedDeptFilter}
                    setSelectedDeptFilter={setSelectedDeptFilter}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Dashboard header for quiz */}
                  <div className="text-center max-w-xl mx-auto space-y-2 mb-4">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>배움에 즐거움을 더하는 퀴즈</span>
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      사내의 약어들과 핵심 프로세스를 가볍고 흥미로운 방식으로 암기하고 학습할 수 있는 공간입니다.
                    </p>
                  </div>

                  <QuizSection
                    glossaryList={glossaryList}
                    onSelectTerm={handleSelectTerm}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            <span>사내 용어·약어 풀이 도우미 Wiki v1.0.0</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Powered by Google Sheets API & Firebase Authentication
          </p>
        </div>
      </footer>

      {/* TERM DETAILS DRAWER */}
      <TermDetail
        item={selectedTerm}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTerm(null);
        }}
        onEdit={(item) => {
          setIsDetailOpen(false);
          handleTriggerEdit(item);
        }}
        onDelete={handleDeleteTerm}
        onSelectTerm={handleSelectTerm}
        allTerms={glossaryList}
        onDeptClick={(dept) => {
          setActiveTab('glossary');
          setSelectedDeptFilter(dept);
        }}
      />

      {/* ADD / EDIT TERM MODAL */}
      <TermForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTerm(null);
        }}
        onSubmit={handleFormSubmit}
        editingItem={editingTerm}
        glossaryList={glossaryList}
        currentUserDisplayName={user?.displayName || '임직원'}
      />

    </div>
  );
}
