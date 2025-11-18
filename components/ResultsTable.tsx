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
      <div className="p-4 border-b border-gray-200 bg-gray-50/50 sm:rounded-t-lg">
          <h3 className="text-md font-semibold text-gray-800">
              Arama Sonuçları ({businesses.length} işletme bulundu)
          </h3>
      </div>
      <div className="overflow-x-auto">
        <div className="align-middle inline-block min-w-full">
          <div className="shadow-sm overflow-hidden border-b border-gray-200 sm:rounded-b-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşletme Adı</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {businesses.map((business, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{business.businessName}</div>
                      <a href={business.googleMapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-900">Google Haritalar'da Görüntüle</a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.mainCategory}</div>
                      <div className="text-xs text-gray-500">{business.subCategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{business.phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{business.neighborhood}, {business.district}</div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">{business.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {business.googleRating ? (
                          <div className="flex items-center">
                              <StarIcon className="w-4 h-4 text-yellow-400 mr-1" />
                              {business.googleRating.toFixed(1)}
                          </div>
                      ) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;
