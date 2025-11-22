import React, { useState, useEffect, useMemo } from 'react';
import type { Business, Option, SearchHistoryItem } from './types';
import { PROVINCES, DISTRICTS, MAIN_CATEGORIES, SUB_CATEGORIES, NEIGHBORHOODS } from './constants';
import { findBusinessesStream } from './services/geminiService';
import SelectDropdown from './components/SelectDropdown';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ResultsTable from './components/ResultsTable';
import SearchHistory from './components/SearchHistory';
import ThemeSwitcher from './components/ThemeSwitcher';

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
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);


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
    const savedHistory = localStorage.getItem('businessSearchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
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

  const handleSaveSearch = () => {
    const provinceLabel = PROVINCES.find(p => p.value === province)?.label || '';
    const districtLabel = DISTRICTS[province]?.find(d => d.value === district)?.label || '';
    const neighborhoodLabel = NEIGHBORHOODS[province]?.[district]?.find(n => n.value === neighborhood)?.label || 'Tümü';
    const mainCategoryLabel = MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label || 'Tümü';
    const subCategoryLabel = SUB_CATEGORIES[mainCategory]?.find(s => s.value === subCategory)?.label || 'Tümü';

    const newSearchItem: SearchHistoryItem = {
      id: new Date().toISOString(),
      timestamp: Date.now(),
      province, district, neighborhood, mainCategory, subCategory,
      provinceLabel, districtLabel, neighborhoodLabel, mainCategoryLabel, subCategoryLabel
    };

    const updatedHistory = [newSearchItem, ...searchHistory.filter(item => 
        !(item.province === province && item.district === district && item.neighborhood === neighborhood && item.mainCategory === mainCategory && item.subCategory === subCategory)
    )].slice(0, 10);

    setSearchHistory(updatedHistory);
    localStorage.setItem('businessSearchHistory', JSON.stringify(updatedHistory));
  };
  
  const handleSelectHistoryItem = (item: SearchHistoryItem) => {
      setProvince(item.province);
      setDistrict(item.district);
      setNeighborhood(item.neighborhood);
      setMainCategory(item.mainCategory);
      setSubCategory(item.subCategory);
      setResults([]);
      setSearchHasRun(false);
      setError(null);
  };

  const handleClearHistory = () => {
      setSearchHistory([]);
      localStorage.removeItem('businessSearchHistory');
  };

  const playCompletionSound = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API is not supported by this browser.");
      return;
    }
    const audioContext = new AudioContext();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note, a pleasant beep
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Set volume to avoid being too loud
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15); // Beep for 150ms

    oscillator.onended = () => {
      audioContext.close().catch(e => console.error("Error closing AudioContext", e));
    };
  };

  const handleSearch = async () => {
    if (!province || !district) {
      setError("Arama yapmak için en azından İl ve İlçe seçmelisiniz.");
      return;
    }
    if (!apiKey) {
      setError("Lütfen geçerli bir API Anahtarı girin.");
      return;
    }
    
    handleSaveSearch();
    setLoading(true);
    setResults([]);
    setSearchHasRun(true);
    setError(null);
    setSearchProgress(null);

    const provinceLabel = PROVINCES.find(p => p.value === province)?.label || '';
    const districtLabel = DISTRICTS[province]?.find(d => d.value === district)?.label || '';
    
    // Determine neighborhoods to search
    const allNeighborhoodsForDistrict = NEIGHBORHOODS[province]?.[district];
    let neighborhoodsToSearch: Option[];
    if (neighborhood && allNeighborhoodsForDistrict) {
        const selectedNeighborhoodObject = allNeighborhoodsForDistrict.find(n => n.value === neighborhood);
        neighborhoodsToSearch = selectedNeighborhoodObject ? [selectedNeighborhoodObject] : [];
    } else if (allNeighborhoodsForDistrict) {
        neighborhoodsToSearch = allNeighborhoodsForDistrict;
    } else {
        neighborhoodsToSearch = [{ value: district, label: '' }];
    }

    // Determine category search tasks
    const mainCategoryLabel = MAIN_CATEGORIES.find(c => c.value === mainCategory)?.label || '';
    const allSubCategoriesForMain = mainCategory ? SUB_CATEGORIES[mainCategory] || [] : [];
    const subCategoryLabel = allSubCategoriesForMain.find(s => s.value === subCategory)?.label || '';

    let categorySearchTasks: { main: string; sub: string }[] = [];

    if (mainCategory && !subCategory) {
        // Specific Main Category, "All" Sub-Categories: Create a search task for each sub-category.
        categorySearchTasks = allSubCategoriesForMain.map(sc => ({
            main: mainCategoryLabel,
            sub: sc.label
        }));
    } else {
        // All other cases (All/All or Specific/Specific): Create a single search task.
        categorySearchTasks = [{
            main: mainCategoryLabel,
            sub: subCategoryLabel
        }];
    }
    
    const totalSearches = neighborhoodsToSearch.length * categorySearchTasks.length;
    if (totalSearches === 0 && neighborhoodsToSearch.length > 0) {
        setLoading(false);
        setError("Seçilen ana kategori için alt kategori bulunamadı.");
        return;
    }

    const uniqueResults = new Map<string, Business>();
    let searchesCompleted = 0;

    for (const currentNeighborhood of neighborhoodsToSearch) {
        for (const categoryTask of categorySearchTasks) {
            searchesCompleted++;
            const progressNeighborhoodLabel = currentNeighborhood.label || districtLabel;

            const progressText = categoryTask.sub 
                ? `${progressNeighborhoodLabel}: ${categoryTask.sub}` 
                : progressNeighborhoodLabel;
            
            setSearchProgress({ current: searchesCompleted, total: totalSearches, neighborhood: progressText });

            try {
                await findBusinessesStream({
                    apiKey,
                    province: provinceLabel,
                    district: districtLabel,
                    neighborhood: currentNeighborhood.label,
                    mainCategory: categoryTask.main,
                    subCategory: categoryTask.sub,
                    onData: (business) => {
                        const key = business.googleMapsLink || `${business.businessName}|${business.address}`;
                        if (!uniqueResults.has(key)) {
                            uniqueResults.set(key, business);
                            setResults(Array.from(uniqueResults.values()));
                        }
                    },
                    onComplete: () => {},
                    onError: (e: Error) => {
                        console.error(`Error searching ${progressText}:`, e);
                    }
                });
            } catch (e: any) {
                 console.error(`Fatal error during search for ${progressText}:`, e);
                 setError(`Arama sırasında bir hata oluştu (${progressText}): ${e.message}`);
            }
        }
    }
    
    setLoading(false);
    setSearchProgress(null);
    playCompletionSound();
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
      'googleMapsLink'
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
        ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(dataForSheet);

    for (let i = 0; i < results.length; i++) {
      const cellAddress = `H${i + 2}`;
      const cell = worksheet[cellAddress];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '0.0';
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "İşletmeler", true);
    
    worksheet['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 12 }, { wch: 40 }
    ];

    XLSX.writeFile(workbook, "isletme_bulucu_sonuclari.xlsx");
  };

  const handleCopyToClipboard = async () => {
    if (results.length === 0) {
      alert("Kopyalanacak veri bulunmamaktadır.");
      return;
    }

    const headers = [
      'businessName', 'mainCategory', 'subCategory', 'phone', 'district',
      'neighborhood', 'address', 'googleRating', 'googleMapsLink'
    ];
    
    const dataToCopy = results.map(business => [
        business.businessName, business.mainCategory, business.subCategory,
        business.phone || '', business.district, business.neighborhood,
        business.address, business.googleRating ?? '', business.googleMapsLink,
    ]);

    const tsvContent = [headers, ...dataToCopy]
      .map(row => row.join('\t'))
      .join('\n');
    
    try {
      await navigator.clipboard.writeText(tsvContent);
      alert('Sonuçlar panoya kopyalandı! Excel\'e yapıştırabilirsiniz.');
    } catch (err) {
      console.error('Panoya kopyalama başarısız oldu:', err);
      alert('Panoya kopyalama başarısız oldu. Lütfen konsolu kontrol edin.');
    }
  };
  
  const isSearchDisabled = !province || !district || !apiKey;
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

  const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2-2Z" />
    </svg>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Query Screen */}
        <div className="lg:col-span-1 space-y-8 lg:sticky lg:top-8 self-start">
          <div className="bg-[#F9F9FA] dark:bg-zinc-900 p-6 rounded-lg shadow">
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-zinc-700">
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Google AI Studio API Anahtarı
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                        type="password"
                        id="apiKey"
                        value={tempApiKey}
                        onChange={handleApiKeyChange}
                        placeholder="API Anahtarınızı buraya yapıştırın"
                        className="flex-grow block w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-200"
                    />
                    <Button onClick={handleSaveApiKey} disabled={!tempApiKey}>
                        Anahtarı Kaydet
                    </Button>
                </div>
                 <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    API anahtarınız tarayıcınızın yerel depolama alanına kaydedilecektir. 
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                        Buradan bir API anahtarı alabilirsiniz.
                    </a>
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <SelectDropdown id="province" label="İl" value={province} onChange={(e) => setProvince(e.target.value)} options={PROVINCES} placeholder="İl Seçin" disabled={!apiKey || loading}/>
              <SelectDropdown id="district" label="İlçe" value={district} onChange={(e) => setDistrict(e.target.value)} options={districtOptions} placeholder="İlçe Seçin" disabled={!province || !apiKey || loading} />
              <div className="sm:col-span-2">
                <SelectDropdown id="neighborhood" label="Mahalle" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} options={neighborhoodOptions} placeholder="Mahalle Seçin (Tümü)" disabled={!district || !apiKey || loading} />
              </div>
              <SelectDropdown id="mainCategory" label="Ana Kategori" value={mainCategory} onChange={(e) => setMainCategory(e.target.value)} options={[{ value: '', label: 'Tümü' }, ...MAIN_CATEGORIES]} placeholder="Ana Kategori Seçin" disabled={!apiKey || loading} />
              <SelectDropdown id="subCategory" label="Alt Kategori" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} options={[{ value: '', label: 'Tümü' }, ...subCategoryOptions]} placeholder="Alt Kategori Seçin" disabled={!mainCategory || !apiKey || loading} />
            </div>
            {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md text-center">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                    {error.includes("kota") && (
                        <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                            Bu durum genellikle ücretsiz kullanım katmanındaki istek limitlerinden kaynaklanır. 
                            <a href="https://ai.google.dev/gemini-api/docs/rate-limits" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900 dark:hover:text-red-200"> Oran limitleri</a> hakkında daha fazla bilgi alabilir 
                            veya <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-red-900 dark:hover:text-red-200">kullanımınızı buradan</a> izleyebilirsiniz.
                        </p>
                    )}
                </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Button onClick={handleSearch} disabled={isSearchDisabled || loading} Icon={SearchIcon} className="w-full">
                {loading ? 'Aranıyor...' : 'Bul'}
              </Button>
              <Button onClick={handleCopyToClipboard} disabled={isExportDisabled} variant="secondary" Icon={ClipboardIcon} className="w-full">
                Kopyala
              </Button>
              <Button onClick={handleExport} disabled={isExportDisabled} variant="secondary" Icon={DownloadIcon} className="w-full">
                XLSX İndir
              </Button>
              <ThemeSwitcher className="w-full" />
            </div>
          </div>

          {!loading && <SearchHistory history={searchHistory} onSelect={handleSelectHistoryItem} onClear={handleClearHistory} />}
        </div>
        
        {/* Right Column: Results Screen */}
        <div className="lg:col-span-2">
          <div className="bg-[#F9F9FA] dark:bg-zinc-900 rounded-lg shadow h-full">
            {loading && <LoadingSpinner progressText={searchProgress ? `Aranıyor: ${searchProgress.neighborhood} (${searchProgress.current}/${searchProgress.total})` : undefined} />}
            
            {(searchHasRun || results.length > 0) && !loading && <ResultsTable businesses={results} />}

            {!loading && !searchHasRun && (
              <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="text-center py-10 px-4">
                   <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{apiKey ? "Aramaya Hazır" : "Başlamak için API Anahtarınızı Girin"}</h3>
                   <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {apiKey ? "Sonuçları görmek için yukarıdaki filtreleri kullanarak bir arama yapın." : "Lütfen arama yapabilmek için yukarıdaki alana Google AI Studio API anahtarınızı girip kaydedin."}
                   </p>
                </div>
              </div>
            )}
            
            {!loading && searchHasRun && results.length === 0 && (
                <div className="flex items-center justify-center h-full min-h-[300px]">
                  <div className="text-center py-10 px-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Sonuç Bulunamadı</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Aramanızla eşleşen işletme bulunamadı veya arama sırasında bir hata oluştu. Lütfen filtrelerinizi kontrol edip tekrar deneyin.</p>
                  </div>
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;