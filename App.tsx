
import React, { useState, useEffect, useMemo } from 'react';
import type { Business, Option } from './types';
import { PROVINCES, DISTRICTS, MAIN_CATEGORIES, SUB_CATEGORIES, NEIGHBORHOODS } from './constants';
import { findBusinessesStream } from './services/geminiService';
import SelectDropdown from './components/SelectDropdown';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsTable from './components/ResultsTable';

declare const XLSX: any;

const App: React.FC = () => {
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');

  const [results, setResults] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHasRun, setSearchHasRun] = useState(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number; neighborhood: string } | null>(null);


  const districtOptions = useMemo(() => province ? DISTRICTS[province] || [] : [], [province]);
  const neighborhoodOptions = useMemo(() => {
    if (province && district) {
        const options = NEIGHBORHOODS[province]?.[district] || [];
        return [{ value: '', label: 'Tümü' }, ...options];
    }
    return [];
  }, [province, district]);
  const subCategoryOptions = useMemo(() => mainCategory ? SUB_CATEGORIES[mainCategory] || [] : [], [mainCategory]);

  useEffect(() => {
    const savedApiKey = localStorage.getItem('geminiApiKey');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setTempApiKey(savedApiKey);
    }
  }, []);
  
  useEffect(() => {
    setDistrict('');
    setNeighborhood('');
  }, [province]);

  useEffect(() => {
    setNeighborhood('');
  }, [district]);

  useEffect(() => {
    setSubCategory('');
  }, [mainCategory]);
  
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempApiKey(e.target.value);
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('geminiApiKey', tempApiKey);
    setApiKey(tempApiKey);
    alert('API Anahtarı kaydedildi!');
  };

  const handleSearch = async () => {
    if (!province || !district || !mainCategory || !subCategory) {
      setError("Lütfen İl, İlçe, Ana Kategori ve Alt Kategori alanlarını doldurun.");
      return;
    }
    if (!apiKey) {
      setError("Lütfen geçerli bir API Anahtarı girin.");
      return;
    }
    
    setLoading(true);
    setResults([]);
    setSearchHasRun(true);
    setError(null);
    setSearchProgress(null);

    const provinceLabel = PROVINCES.find(p => p.value === province)?.label || '';
    const districtLabel = DISTRICTS[province]?.find(d => d.value === district)?.label || '';
    
    const allNeighborhoodsForDistrict = NEIGHBORHOODS[province]?.[district];
    let neighborhoodsToSearch: Option[];

    if (neighborhood && allNeighborhoodsForDistrict) {
        // A specific neighborhood is selected
        const selectedNeighborhoodObject = allNeighborhoodsForDistrict.find(n => n.value === neighborhood);
        neighborhoodsToSearch = selectedNeighborhoodObject ? [selectedNeighborhoodObject] : [];
    } else if (allNeighborhoodsForDistrict) {
        // "All" is selected, use all neighborhoods
        neighborhoodsToSearch = allNeighborhoodsForDistrict;
    } else {
        // Fallback for districts without a defined neighborhood list
        neighborhoodsToSearch = [{ value: district, label: '' }];
    }

    const totalSearches = neighborhoodsToSearch.length;
    const uniqueResults = new Map<string, Business>();

    for (let i = 0; i < totalSearches; i++) {
        const currentNeighborhood = neighborhoodsToSearch[i];
        const progressNeighborhoodLabel = currentNeighborhood.label || districtLabel;

        setSearchProgress({ current: i + 1, total: totalSearches, neighborhood: progressNeighborhoodLabel });

        try {
            await findBusinessesStream({
                apiKey,
                province: provinceLabel,
                district: districtLabel,
                neighborhood: currentNeighborhood.label,
                mainCategory,
                subCategory,
                onData: (business) => {
                    const key = business.googlePlaceId || `${business.businessName}|${business.address}`;
                    if (!uniqueResults.has(key)) {
                        uniqueResults.set(key, business);
                        setResults(Array.from(uniqueResults.values()));
                    }
                },
                onComplete: () => {},
                onError: (e: Error) => {
                    console.error(`Error searching ${currentNeighborhood.label}:`, e);
                }
            });
        } catch (e: any) {
             console.error(`Fatal error during search for ${currentNeighborhood.label}:`, e);
             setError(`Arama sırasında bir hata oluştu (${currentNeighborhood.label}): ${e.message}`);
        }
    }
    
    setLoading(false);
    setSearchProgress(null);
  };

  const handleExport = () => {
    if (results.length === 0) {
      alert("Dışa aktarılacak veri bulunmamaktadır.");
      return;
    }
    
    const headers = [
      'businessName',
      'mainCategory',
      'subCategory',
      'phone',
      'district',
      'neighborhood',
      'address',
      'googleRating',
      'googleMapsLink',
      'googlePlaceId',
      'coordinates'
    ];
    
    const dataForSheet = [
        headers,
        ...results.map(business => [
            business.businessName,
            business.mainCategory,
            business.subCategory,
            business.phone || '',
            business.district,
            business.neighborhood,
            business.address,
            business.googleRating,
            business.googleMapsLink,
            business.googlePlaceId || '',
            business.coordinates || ''
        ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "İşletmeler", true);
    
    worksheet['!cols'] = [
      { wch: 30 }, // businessName
      { wch: 20 }, // mainCategory
      { wch: 20 }, // subCategory
      { wch: 15 }, // phone
      { wch: 15 }, // district
      { wch: 20 }, // neighborhood
      { wch: 40 }, // address
      { wch: 12 }, // googleRating
      { wch: 40 }, // googleMapsLink
      { wch: 30 }, // googlePlaceId
      { wch: 25 }, // coordinates
    ];

    XLSX.writeFile(workbook, "isletme_bulucu_sonuclari.xlsx");
  };
  
  const isSearchDisabled = !province || !district || !mainCategory || !subCategory || !apiKey;
  const isExportDisabled = results.length === 0 || loading;

  const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );

  const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="">
        <main>
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <div className="mb-6 pb-6 border-b border-gray-200">
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                    Google AI Studio API Anahtarı
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                        type="password"
                        id="apiKey"
                        value={tempApiKey}
                        onChange={handleApiKeyChange}
                        placeholder="API Anahtarınızı buraya yapıştırın"
                        className="flex-grow block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    />
                    <Button onClick={handleSaveApiKey} disabled={!tempApiKey}>
                        Anahtarı Kaydet
                    </Button>
                </div>
                 <p className="mt-2 text-xs text-gray-500">
                    API anahtarınız tarayıcınızın yerel depolama alanına kaydedilecektir. 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline ml-1">
                        Buradan bir API anahtarı alabilirsiniz.
                    </a>
                </p>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <SelectDropdown id="province" label="İl" value={province} onChange={(e) => setProvince(e.target.value)} options={PROVINCES} placeholder="İl Seçin" disabled={!apiKey || loading}/>
              <SelectDropdown id="district" label="İlçe" value={district} onChange={(e) => setDistrict(e.target.value)} options={districtOptions} placeholder="İlçe Seçin" disabled={!province || !apiKey || loading} />
              <SelectDropdown id="neighborhood" label="Mahalle" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} options={neighborhoodOptions} placeholder="Mahalle Seçin (Tümü)" disabled={!district || !apiKey || loading} />
              <SelectDropdown id="mainCategory" label="Ana Kategori" value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} options={MAIN_CATEGORIES} placeholder="Ana Kategori Seçin" disabled={!apiKey || loading} />
              <SelectDropdown id="subCategory" label="Alt Kategori" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} options={subCategoryOptions} placeholder="Alt Kategori Seçin" disabled={!mainCategory || !apiKey || loading} />
            </div>
            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-center">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                    {error.includes("kota") && (
                        <p className="mt-2 text-xs text-red-700">
                            Bu durum genellikle ücretsiz kullanım katmanındaki istek limitlerinden kaynaklanır. 
                            <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900"> Oran limitleri</a> hakkında daha fazla bilgi alabilir 
                            veya <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900">kullanımınızı buradan</a> izleyebilirsiniz.
                        </p>
                    )}
                </div>
            )}
            <div className="mt-6 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Button onClick={handleSearch} disabled={isSearchDisabled || loading} Icon={SearchIcon}>
                {loading ? 'Aranıyor...' : 'Bul'}
              </Button>
              <Button onClick={handleExport} disabled={isExportDisabled} variant="secondary" Icon={DownloadIcon}>
                XLSX İndir
              </Button>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg">
            {loading && <LoadingSpinner progressText={searchProgress ? `Aranıyor: ${searchProgress.neighborhood} (${searchProgress.current}/${searchProgress.total})` : undefined} />}
            
            {(searchHasRun || results.length > 0) && !loading && <ResultsTable businesses={results} />}

            {!loading && !searchHasRun && (
              <div className="text-center py-10 px-4">
                 <h3 className="text-lg font-medium text-gray-900">{apiKey ? "Aramaya Hazır" : "Başlamak için API Anahtarınızı Girin"}</h3>
                 <p className="mt-1 text-sm text-gray-500">
                    {apiKey ? "Sonuçları görmek için yukarıdaki filtreleri kullanarak bir arama yapın." : "Lütfen arama yapabilmek için yukarıdaki alana Google AI Studio API anahtarınızı girip kaydedin."}
                 </p>
              </div>
            )}
            
            {!loading && searchHasRun && results.length === 0 && (
                <div className="text-center py-10 px-4">
                    <h3 className="text-lg font-medium text-gray-900">Sonuç Bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">Aramanızla eşleşen işletme bulunamadı veya arama sırasında bir hata oluştu. Lütfen filtrelerinizi kontrol edip tekrar deneyin.</p>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
