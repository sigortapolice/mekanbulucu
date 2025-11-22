import React from 'react';
import type { SearchHistoryItem } from '../types';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
  onClear: () => void;
}

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.033-2.124H8.033c-1.12 0-2.033.944-2.033 2.124v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const ClockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onClear }) => {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Geçmiş Aramalar</h3>
        <button
          onClick={onClear}
          className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 transition-colors"
          aria-label="Arama geçmişini temizle"
        >
          <TrashIcon className="w-4 h-4 mr-1.5" />
          Geçmişi Temizle
        </button>
      </div>
      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item)}
            className="p-4 border border-gray-200 dark:border-zinc-700 rounded-md hover:bg-indigo-50 dark:hover:bg-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-colors"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {item.subCategoryLabel}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.provinceLabel} &gt; {item.districtLabel} &gt; {item.neighborhoodLabel}
                </p>
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-500 mt-2 sm:mt-0">
                <ClockIcon className="w-4 h-4 mr-1.5"/>
                {new Date(item.timestamp).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;