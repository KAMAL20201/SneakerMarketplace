import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export interface SellerFormData {
  title: string;
  brand: string;
  model: string;
  size: string;
  condition: string;
  price: string;
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

const DEFAULT_SELLER_FORM_DATA = {
  title: "",
  brand: "",
  model: "",
  size: "",
  condition: "new",
  price: "",
  description: "",
  category: "sneakers",
  paymentMethodId: "",
  shippingCharges: "0",
  deliveryDays: "3-5",
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
    setFormData(DEFAULT_SELLER_FORM_DATA);
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
