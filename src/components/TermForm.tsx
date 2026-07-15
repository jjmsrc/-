/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { GlossaryItem } from '../types';

interface TermFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<GlossaryItem, 'id'> & { id?: number }) => Promise<void>;
  editingItem?: GlossaryItem | null;
  glossaryList: GlossaryItem[];
  currentUserDisplayName: string;
}

const DEPARTMENTS_LIST = [
  '기획', '개발', '디자인', 'QA', '마케팅', '영업', '인사', '재무', '법무', 'CS/CX', '경영지원'
];

export default function TermForm({
  isOpen,
  onClose,
  onSubmit,
  editingItem,
  glossaryList,
  currentUserDisplayName
}: TermFormProps) {
  const [term, setTerm] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [definition, setDefinition] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [relatedIds, setRelatedIds] = useState<number[]>([]);
  const [updatedBy, setUpdatedBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // State for search in related terms list
  const [relatedSearch, setRelatedSearch] = useState('');

  // Sync state with editingItem or defaults
  useEffect(() => {
    if (editingItem) {
      setTerm(editingItem.term);
      setAbbreviation(editingItem.abbreviation);
      setDefinition(editingItem.definition);
      setSelectedDepts(editingItem.departments);
      setRelatedIds(editingItem.relatedTerms);
      setUpdatedBy(editingItem.updatedBy || currentUserDisplayName);
    } else {
      setTerm('');
      setAbbreviation('');
      setDefinition('');
      setSelectedDepts([]);
      setRelatedIds([]);
      setUpdatedBy(currentUserDisplayName);
    }
    setErrors({});
    setRelatedSearch('');
  }, [editingItem, isOpen, currentUserDisplayName]);

  if (!isOpen) return null;

  const toggleDept = (dept: string) => {
    if (selectedDepts.includes(dept)) {
      setSelectedDepts(selectedDepts.filter(d => d !== dept));
    } else {
      setSelectedDepts([...selectedDepts, dept]);
    }
  };

  const toggleRelated = (id: number) => {
    if (relatedIds.includes(id)) {
      setRelatedIds(relatedIds.filter(rid => rid !== id));
    } else {
      setRelatedIds([...relatedIds, id]);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!term.trim()) newErrors.term = '용어/약어명(국문)을 입력해 주세요.';
    if (!definition.trim()) newErrors.definition = '용어 설명을 입력해 주세요.';
    if (!updatedBy.trim()) newErrors.updatedBy = '작성자 이름을 입력해 주세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const now = new Date();
      const lastUpdated = now.toISOString().replace('T', ' ').substring(0, 19);

      const payload: Omit<GlossaryItem, 'id'> & { id?: number } = {
        term: term.trim(),
        abbreviation: abbreviation.trim(),
        definition: definition.trim(),
        departments: selectedDepts,
        relatedTerms: relatedIds,
        lastUpdated,
        updatedBy: updatedBy.trim(),
      };

      if (editingItem) {
        payload.id = editingItem.id;
      }

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      alert(`저장 중 오류가 발생했습니다: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter possible related terms (exclude the term being edited)
  const availableTermsToRelate = glossaryList.filter(
    item => (!editingItem || item.id !== editingItem.id) &&
    (item.term.toLowerCase().includes(relatedSearch.toLowerCase()) ||
     item.abbreviation.toLowerCase().includes(relatedSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="term-form-overlay">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {editingItem ? '사내 용어 수정' : '신규 사내 용어 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Term Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              용어/약어명 (국문) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="예: 제품 요구사항 정의서"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border ${
                errors.term ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-500'
              } focus:outline-none focus:ring-3 transition`}
            />
            {errors.term && <p className="text-xs text-red-500 mt-1">{errors.term}</p>}
          </div>

          {/* Abbreviation & English spelling */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              영문 표기 / 약어 원어 <span className="text-slate-400">(선택)</span>
            </label>
            <input
              type="text"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              placeholder="예: PRD (Product Requirement Document)"
              className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-3 focus:ring-emerald-200 focus:border-emerald-500 transition"
            />
          </div>

          {/* Definition */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              용어 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="제품을 개발하기 위해 어떤 제품을 만들 것인지, 필요한 기능적 요구사항을 상세히 정리한 기획서입니다..."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border ${
                errors.definition ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-500'
              } focus:outline-none focus:ring-3 transition resize-none`}
            />
            {errors.definition && <p className="text-xs text-red-500 mt-1">{errors.definition}</p>}
          </div>

          {/* Related Departments */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              관련 부서 <span className="text-slate-400">(다중 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS_LIST.map((dept) => {
                const isSelected = selectedDepts.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDept(dept)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    <span>{dept}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Related Terms */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              연관 용어 연결 <span className="text-slate-400">(선택, 다중 연결 가능)</span>
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              {/* Search mini-bar */}
              <div className="relative border-b border-slate-200 bg-white">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="연관 용어 검색..."
                  value={relatedSearch}
                  onChange={(e) => setRelatedSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs focus:outline-none bg-transparent"
                />
              </div>

              {/* Terms List */}
              <div className="max-h-36 overflow-y-auto p-2 space-y-1 bg-white">
                {availableTermsToRelate.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">검색 결과나 연결할 용어가 없습니다.</p>
                ) : (
                  availableTermsToRelate.map((item) => {
                    const isSelected = relatedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleRelated(item.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                          isSelected ? 'bg-slate-50 font-semibold text-slate-800' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="truncate pr-4">
                          <span className="text-slate-800 font-medium">{item.term}</span>
                          {item.abbreviation && (
                            <span className="text-[10px] text-slate-400 ml-1.5">({item.abbreviation})</span>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            {relatedIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {relatedIds.map(rid => {
                  const rTerm = glossaryList.find(item => item.id === rid);
                  if (!rTerm) return null;
                  return (
                    <span key={rid} className="inline-flex items-center gap-1 bg-slate-100 text-[10px] font-semibold text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                      <span>{rTerm.term}</span>
                      <button type="button" onClick={() => toggleRelated(rid)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              수정자/작성자 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={updatedBy}
              onChange={(e) => setUpdatedBy(e.target.value)}
              placeholder="작성자 성명을 입력하세요."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border ${
                errors.updatedBy ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200 focus:border-emerald-500'
              } focus:outline-none focus:ring-3 transition`}
            />
            {errors.updatedBy && <p className="text-xs text-red-500 mt-1">{errors.updatedBy}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>저장 중...</span>
              </>
            ) : (
              <span>용어 저장</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
