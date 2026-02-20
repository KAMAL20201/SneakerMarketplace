import { ShieldCheck, Truck, MessageCircle, RefreshCw } from "lucide-react";

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "100% Authentic",
    description: "Every product is verified before listing",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-100",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Orders dispatched quickly across India",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Support",
    description: "Chat with us anytime for help",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    description: "Hassle-free return process",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-100",
  },
];

const WhyBuyFromUs = () => {
  return (
    <section className="px-4 py-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Why Buy From Us</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TRUST_POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <div
              key={point.title}
              className={`flex flex-col items-center text-center p-4 rounded-2xl border ${point.bg} ${point.border}`}
            >
              <div className={`mb-3 p-2 rounded-xl ${point.bg}`}>
                <Icon className={`h-6 w-6 ${point.color}`} />
              </div>
              <h3 className="font-bold text-sm text-gray-800 mb-1">{point.title}</h3>
              <p className="text-xs text-gray-500 leading-tight">{point.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default WhyBuyFromUs;
