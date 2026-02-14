import { Search, CreditCard, Truck, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "Browse & Discover",
      description:
        "Explore our curated collection of authentic sneakers, streetwear, and collectibles",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: CreditCard,
      title: "Secure Payment",
      description:
        "Pay safely with Razorpay - UPI, cards, net banking, and more supported",
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      icon: Truck,
      title: "Fast Delivery",
      description: "We ship your order quickly with tracking across India",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      icon: CheckCircle,
      title: "Enjoy Your Purchase",
      description:
        "Receive authentic, quality-verified products at your doorstep",
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <section className="px-4 py-8 bg-gradient-to-br from-blue-50 to-purple-50 mx-4 rounded-3xl mb-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">How It Works</h2>
        <p className="text-gray-600">
          Shop authentic sneakers and streetwear in just a few steps
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="bg-white/60 p-6 rounded-2xl backdrop-blur-sm text-center hover:scale-105 transition-all duration-300"
          >
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${step.color} mb-4`}
            >
              <step.icon className={`h-6 w-6 ${step.iconColor}`} />
            </div>
            <h3 className="font-bold text-gray-800 mb-2 text-lg">
              {step.title}
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
