
export interface Business {
  businessName: string;
  mainCategory: string;
  subCategory: string;
  phone: string | null;
  district: string;
  neighborhood: string;
  address: string;
  googleRating: number | null;
  googleMapsLink: string;
}

export interface Option {
  value: string;
  label: string;
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  province: string;
  district: string;
  neighborhood: string;
  mainCategory: string;
  subCategory: string;
  provinceLabel: string;
  districtLabel: string;
  neighborhoodLabel: string;
  mainCategoryLabel: string;
  subCategoryLabel: string;
}
