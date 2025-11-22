import React from 'react';
import type { Business } from '../types';

interface ResultsTableProps {
  businesses: Business[];
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.868 2.884c.321-.662 1.215-.662 1.536 0l1.822 3.754 4.143.602c.73.106 1.02.998.494 1.503l-2.998 2.922.708 4.127c.125.728-.638 1.283-1.29.948L10 15.11l-3.71 1.95c-.652.335-1.415-.22-1.29-.948l.708-4.127-2.998-2.922c-.525-.505-.236-1.397.494-1.503l4.143-.602 1.822-3.754z" clipRule="evenodd" />
    </svg>
);


const ResultsTable: React.FC<ResultsTableProps> = ({ businesses }) => {
  return (
    <div>
      <div className="p-4 border-b border-gray-200 dark:border-zinc-700 bg-[#F9F9FA]/50 dark:bg-zinc-800/20 sm:rounded-t-lg">
          <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
              Arama Sonuçları ({businesses.length} işletme bulundu)
          </h3>
      </div>
      <div className="shadow-sm overflow-hidden border-b border-gray-200 dark:border-zinc-700 sm:rounded-b-lg">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-zinc-700">
          <thead className="bg-[#F9F9FA] dark:bg-zinc-800">
            <tr>
              <th scope="col" className="w-[25%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşletme Adı / Place ID</th>
              <th scope="col" className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
              <th scope="col" className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefon</th>
              <th scope="col" className="w-[30%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adres</th>
              <th scope="col" className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Puan / Yorum</th>
            </tr>
          </thead>
          <tbody className="bg-[#F9F9FA] dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-700">
            {businesses.map((business, index) => (
              <tr key={business.placeId || index} className="hover:bg-gray-50 dark:hover:bg-zinc-800">
                <td className="px-6 py-4 align-top">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{business.businessName}</div>
                  <a href={business.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Haritalar'da Görüntüle</a>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono break-all">{business.placeId}</div>
                </td>
                <td className="px-6 py-4 align-top">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{business.mainCategory}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{business.subCategory}</div>
                </td>
                <td className="px-6 py-4 align-top text-sm text-gray-500 dark:text-gray-400">{business.phone || 'N/A'}</td>
                <td className="px-6 py-4 align-top">
                  <div className="text-sm text-gray-900 dark:text-gray-100 break-words">{business.neighborhood}, {business.district}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 break-words">{business.address}</div>
                </td>
                <td className="px-6 py-4 align-top text-sm text-gray-500 dark:text-gray-400">
                  {business.googleRating != null ? (
                      <div className="flex flex-col">
                          <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-yellow-400 mr-1 flex-shrink-0" />
                              <span className="font-semibold">{business.googleRating.toFixed(1)}</span>
                          </div>
                          {business.reviewCount != null && (
                            <div className="text-xs mt-1">({business.reviewCount} yorum)</div>
                          )}
                      </div>
                  ) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;