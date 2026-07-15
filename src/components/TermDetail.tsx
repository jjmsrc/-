/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Edit, Trash2, Calendar, User, Link as LinkIcon, Building2 } from 'lucide-react';
import { GlossaryItem } from '../types';

interface TermDetailProps {
  item: GlossaryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: GlossaryItem) => void;
  onDelete: (id: number) => Promise<void>;
  onSelectTerm: (item: GlossaryItem) => void;
  allTerms: GlossaryItem[];
  onDeptClick?: (dept: string) => void;
}

export default function TermDetail({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onSelectTerm,
  allTerms,
  onDeptClick
}: TermDetailProps) {
  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `정말로 '${item.term}' 용어를 삭제하시겠습니까?\n이 작업은 구글 스프레드시트 원본에서도 행이 즉시 삭제되며, 되돌릴 수 없습니다.`
    );
    if (!confirmed) return;

    try {
      await onDelete(item.id);
      onClose();
    } catch (err: any) {
      alert(`삭제 중 에러가 발생했습니다: ${err.message || err}`);
    }
  };

  /**
   * Helper to render description and automatically hyper-link any other registered terms mentioned in the text.
   */
  const renderDefinitionWithLinks = (definition: string) => {
    const otherItems = allTerms.filter(t => t.id !== item.id && t.term.length > 1);
    if (otherItems.length === 0) return <span>{definition}</span>;

    // Sort by term length descending to prevent matching substring of a longer word first
    const sortedOthers = [...otherItems].sort((a, b) => b.term.length - a.term.length);
    const escapedTerms = sortedOthers.map(t => t.term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTerms.join('|')})`, 'g');

    const parts = definition.split(regex);
    return parts.map((part, index) => {
      const match = sortedOthers.find(t => t.term === part);
      if (match) {
        return (
          <button
            key={index}
            onClick={() => onSelectTerm(match)}
            className="inline-block text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-1 py-0.5 rounded font-semibold underline decoration-dashed decoration-emerald-400 transition cursor-pointer text-sm"
          >
            {part}
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Find explicit related terms mapped by ID
  const explicitRelatedItems = item.relatedTerms
    .map(id => allTerms.find(t => t.id === id))
    .filter((t): t is GlossaryItem => !!t);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-end" id="term-detail-drawer">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Side Drawer Content */}
      <div className="relative bg-white w-full max-w-lg h-screen shadow-2xl flex flex-col z-10 border-l border-slate-100">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider">
              ID {item.id}
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">{item.term}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Abbreviation & English spelling */}
          {item.abbreviation && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                원어 표기 및 약어
              </span>
              <p className="text-sm font-semibold text-slate-800 font-sans">
                {item.abbreviation}
              </p>
            </div>
          )}

          {/* Explanation with Inline Auto-links */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              용어 상세 설명
            </span>
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
              {renderDefinitionWithLinks(item.definition)}
            </div>
          </div>

          {/* Related Departments */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>관련 부서</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {item.departments.length > 0 ? (
                item.departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      if (onDeptClick) {
                        onDeptClick(dept);
                        onClose();
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 hover:border-emerald-200 transition"
                  >
                    {dept}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">지정된 부서가 없습니다.</span>
              )}
            </div>
          </div>

          {/* Explicitly Connected Related Terms */}
          <div className="space-y-2 border-t border-slate-100 pt-5">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>연관 용어 링크</span>
            </span>
            <div className="grid grid-cols-1 gap-2">
              {explicitRelatedItems.length > 0 ? (
                explicitRelatedItems.map((rItem) => (
                  <button
                    key={rItem.id}
                    onClick={() => onSelectTerm(rItem)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 text-slate-700 hover:text-emerald-800 transition flex items-center justify-between group"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-slate-800">{rItem.term}</span>
                      {rItem.abbreviation && (
                        <span className="text-[10px] text-slate-400 ml-1.5">({rItem.abbreviation})</span>
                      )}
                    </div>
                    <span className="text-slate-400 group-hover:text-emerald-600 transition text-[10px] font-semibold">이동 ➔</span>
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">등록된 연관 용어가 없습니다.</span>
              )}
            </div>
          </div>

          {/* Logs & Contributors */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>최종 수정자: </span>
                <span className="text-slate-600 font-semibold">{item.updatedBy || '익명 임직원'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>수정 일시: </span>
                <span className="text-slate-600 font-semibold">{item.lastUpdated || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>삭제하기</span>
          </button>
          
          <button
            onClick={() => onEdit(item)}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 active:bg-slate-950 shadow-sm transition flex items-center gap-1.5"
          >
            <Edit className="w-4 h-4" />
            <span>수정하기</span>
          </button>
        </div>

      </div>
    </div>
  );
}
