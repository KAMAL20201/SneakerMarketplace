import { useNavigate } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

const SPOTLIGHT_BRANDS = [
  { label: "Nike", value: "nike" },
  { label: "Jordan", value: "jordan" },
  { label: "Adidas", value: "adidas" },
  { label: "Supreme", value: "supreme" },
  { label: "Off-White", value: "off-white" },
  { label: "New Balance", value: "new balance" },
  { label: "Converse", value: "converse" },
  { label: "Puma", value: "puma" },
  { label: "Kith", value: "kith" },
  { label: "Fear of God", value: "fear of god" },
  { label: "Stone Island", value: "stone island" },
  { label: "Essentials", value: "essentials" },
];

const BrandSpotlight = () => {
  const navigate = useNavigate();

  const handleBrandClick = (brand: string) => {
    navigate(`${ROUTE_NAMES.BROWSE}?brand=${encodeURIComponent(brand)}`);
  };

  return (
    <section className="px-4 py-4">
      <h2 className="text-lg font-bold mb-3 text-gray-800">Shop by Brand</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {SPOTLIGHT_BRANDS.map((brand) => (
          <button
            key={brand.value}
            onClick={() => handleBrandClick(brand.value)}
            className="flex-shrink-0 px-4 py-2 rounded-full border border-gray-200 bg-white hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 text-sm font-medium text-gray-700 transition-all duration-200 whitespace-nowrap"
          >
            {brand.label}
          </button>
        ))}
      </div>
    </section>
  );
};

export default BrandSpotlight;
