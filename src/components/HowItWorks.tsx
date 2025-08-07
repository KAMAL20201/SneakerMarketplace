import { Shield, Clock, CheckCircle, CreditCard } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: CreditCard,
      title: "Secure Payment",
      description:
        "Buyer pays and we hold the money securely until you're satisfied",
      color: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: Shield,
      title: "Money Protected",
      description:
        "Your payment is safe with us - no risk of losing your money",
      color: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      icon: Clock,
      title: "1 Day to Approve",
      description: "You have 24 hours to inspect and approve your purchase",
      color: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      icon: CheckCircle,
      title: "Money Released",
      description:
        "Once approved, seller gets paid. If not satisfied, full refund",
      color: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <section className="px-4 py-8 bg-gradient-to-br from-blue-50 to-purple-50 mx-4 rounded-3xl mb-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">How It Works</h2>
        <p className="text-gray-600">
          Your money is safe with our secure escrow system
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

      {/* Additional Info */}
      <div className="mt-8 bg-white/40 p-6 rounded-2xl backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-full flex-shrink-0">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 mb-2">
              Complete Buyer Protection
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              We hold your payment securely until you receive and approve your
              item. You have 24 hours to inspect your purchase. If you're not
              satisfied, we'll process a full refund. No questions asked.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
