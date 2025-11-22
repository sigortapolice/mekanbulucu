
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