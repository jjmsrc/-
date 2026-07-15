/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Calendar, User, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { GlossaryItem } from '../types';
import { matchGlossary, disassembleHangul } from '../utils/searchUtils';

interface GlossaryListProps {
  items: GlossaryItem[];
  onSelectTerm: (item: GlossaryItem) => void;
  onAddClick: () => void;
  selectedDeptFilter: string;
  setSelectedDeptFilter: (dept: string) => void;
}

const DEPARTMENTS = ['전체', '기획', '개발', '디자인', 'QA', '마케팅', '영업', '인사', '재무', '법무', 'CS/CX', '경영지원'];

const INDEX_CHARS = ['전체', 'ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'A-Z'];

export default function GlossaryList({
  items,
  onSelectTerm,
  onAddClick,
  selectedDeptFilter,
  setSelectedDeptFilter
}: GlossaryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'alpha' | 'recent'>('alpha');
  const [selectedIndexChar, setSelectedIndexChar] = useState('전체');

  // Filter and Sort glossary items
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Keyword search (with Eng-Kor keyboard conversion support)
    if (searchQuery.trim()) {
      result = result.filter(item => matchGlossary(item, searchQuery));
    }

    // 2. Department filter
    if (selectedDeptFilter && selectedDeptFilter !== '전체') {
      result = result.filter(item => item.departments.includes(selectedDeptFilter));
    }

    // 3. Alphabet/Consonant index filter
    if (selectedIndexChar && selectedIndexChar !== '전체') {
      if (selectedIndexChar === 'A-Z') {
        // Matches items starting with English letters
        result = result.filter(item => {
          const firstChar = (item.abbreviation || item.term).trim().charAt(0).toUpperCase();
          return firstChar >= 'A' && firstChar <= 'Z';
        });
      } else {
        // Matches items starting with the selected Korean consonant
        result = result.filter(item => {
          const disassembled = disassembleHangul(item.term.trim());
          return disassembled.charAt(0) === selectedIndexChar;
        });
      }
    }

    // 4. Sort
    if (sortOrder === 'alpha') {
      result.sort((a, b) => a.term.localeCompare(b.term, 'ko'));
    } else {
      // Recent first (descending ID or parsing lastUpdated dates)
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [items, searchQuery, selectedDeptFilter, selectedIndexChar, sortOrder]);

  return (
    <div className="space-y-6" id="glossary-list-section">
      
      {/* Top Search Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Real-time keyboard-translating search bar */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="용어, 약어(영어/국문), 설명, 부서명 통합 검색... (영어 자판 오입력 보정)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-emerald-200/50 transition-all"
              id="glossary-search-input"
            />
          </div>
          
          {/* Add Term Button */}
          <button
            onClick={onAddClick}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            id="add-term-fab-button"
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>용어 등록</span>
          </button>
        </div>

        {/* Index filter bar (ㄱ-ㅎ, A-Z) */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">초성/색인 필터</span>
          <div className="flex flex-wrap gap-1">
            {INDEX_CHARS.map((char) => {
              const isSelected = selectedIndexChar === char;
              return (
                <button
                  key={char}
                  onClick={() => setSelectedIndexChar(char)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800 border-slate-800 text-white'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting and quick toggles */}
        <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Department tags slider */}
          <div className="w-full sm:max-w-[70%]">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>부서별 모아보기</span>
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
              {DEPARTMENTS.map((dept) => {
                const isSelected = selectedDeptFilter === dept;
                return (
                  <button
                    key={dept}
                    onClick={() => setSelectedDeptFilter(dept)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort order selection */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <div className="bg-slate-100 p-0.5 rounded-lg flex">
              <button
                onClick={() => setSortOrder('alpha')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  sortOrder === 'alpha' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                가나다순
              </button>
              <button
                onClick={() => setSortOrder('recent')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  sortOrder === 'recent' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                최신등록순
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid List of Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {processedItems.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-100 py-16 text-center shadow-xs">
            <SlidersHorizontal className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-800 font-semibold text-sm">일치하는 사내 용어가 존재하지 않습니다.</p>
            <p className="text-slate-400 text-xs mt-1">다른 키워드를 입력하거나 필터를 재설정해 보세요.</p>
          </div>
        ) : (
          processedItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectTerm(item)}
              className="group bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 p-5 shadow-xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
              id={`term-card-${item.id}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 text-base transition-colors truncate">
                    {item.term}
                  </h3>
                  <span className="text-[10px] font-semibold font-mono text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md flex-shrink-0">
                    ID {item.id}
                  </span>
                </div>

                {item.abbreviation && (
                  <p className="text-xs font-semibold text-slate-500 font-mono tracking-tight truncate mb-3">
                    {item.abbreviation}
                  </p>
                )}

                <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 mb-4">
                  {item.definition}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-50 mt-auto">
                {/* Departments */}
                <div className="flex flex-wrap gap-1">
                  {item.departments.slice(0, 3).map((dept) => (
                    <span
                      key={dept}
                      className="px-2 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded text-[10px] font-semibold"
                    >
                      {dept}
                    </span>
                  ))}
                  {item.departments.length > 3 && (
                    <span className="text-[10px] text-slate-400 font-bold pl-0.5">
                      +{item.departments.length - 3}
                    </span>
                  )}
                </div>

                {/* Meta info */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                  <div className="flex items-center gap-0.5">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[50px]">{item.updatedBy || '익명'}</span>
                  </div>
                  <div className="flex items-center gap-0.5 border-l border-slate-100 pl-2">
                    <Calendar className="w-3 h-3" />
                    <span>{item.lastUpdated ? item.lastUpdated.split(' ')[0] : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
