import {
  createContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface VariantSizeEntry {
  size_value: string;
  price: string; // string for input binding, parsed to number on submit
}

export interface ProductVariant {
  tempId: string;        // client-side key only, not persisted
  color_name: string;    // "University Blue", "Chase Edition", etc.
  color_hex: string;     // "#4169E1" — empty string when not set
  price: string;         // used for no-size categories (electronics, collectibles)
  sizes: VariantSizeEntry[]; // used for size-having categories (sneakers, apparels)
  imageIndex: number | null; // index into the uploaded images[] array for this variant's photo
}

export interface SellerFormData {
  title: string;
  brand: string;
  model: string;
  variants: ProductVariant[]; // replaces the old size / sizes flat fields
  condition: string;
  retailPrice: string; // optional retail / MRP price in INR
  description: string;
  category: string;
  paymentMethodId: string;
  shippingCharges: string;
  deliveryDays: string;
  customDeliveryDays: string;
}

export interface SellerFormContextType {
  formData: SellerFormData;
  setFormData: Dispatch<SetStateAction<SellerFormData>>;
  images: string[];
  setImages: Dispatch<SetStateAction<string[]>>;
  files: File[];
  setFiles: Dispatch<SetStateAction<File[]>>;
  currentStep: number;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  clearFormData: () => void;
}

const makeDefaultVariant = (): ProductVariant => ({
  tempId: crypto.randomUUID(),
  color_name: "",
  color_hex: "",
  price: "",
  sizes: [],
  imageIndex: null,
});

const DEFAULT_SELLER_FORM_DATA: SellerFormData = {
  title: "",
  brand: "",
  model: "",
  variants: [makeDefaultVariant()],
  condition: "new",
  retailPrice: "",
  description: "",
  category: "sneakers",
  paymentMethodId: "",
  shippingCharges: "0",
  deliveryDays: "21-28",
  customDeliveryDays: "",
};

export const SellerFormContext = createContext<SellerFormContextType>({
  formData: DEFAULT_SELLER_FORM_DATA,
  setFormData: () => {},
  clearFormData: () => {},
  images: [],
  setImages: () => {},
  files: [],
  setFiles: () => {},
  currentStep: 1,
  setCurrentStep: () => {},
});

export const SellerFormProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [formData, setFormData] = useState<SellerFormData>(
    DEFAULT_SELLER_FORM_DATA
  );
  const [images, setImages] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const clearFormData = () => {
    setFormData({
      ...DEFAULT_SELLER_FORM_DATA,
      variants: [makeDefaultVariant()],
    });
  };

  const value = {
    formData,
    setFormData,
    clearFormData,
    images,
    setImages,
    files,
    setFiles,
    currentStep,
    setCurrentStep,
  };

  return (
    <SellerFormContext.Provider value={value}>
      {children}
    </SellerFormContext.Provider>
  );
};
