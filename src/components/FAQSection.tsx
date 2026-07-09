import { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Globe,
  Clock,
  Truck,
  Package,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Video,
  RotateCcw,
  Ruler,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router";
import { ROUTE_NAMES } from "@/constants/enums";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
  category: "delivery" | "authenticity" | "payment" | "issues" | "sizing" | "support";
}

const FAQ_DATA: FAQItem[] = [
  {
    category: "delivery",
    icon: <Globe className="h-4 w-4 text-blue-500" />,
    question: "Where are your products sourced from?",
    answer: (
      <p>
        All products are sourced directly from <strong>international markets</strong> — the US, Europe, Japan, and
        South-East Asia. This is why you get authentic, hard-to-find sneakers and streetwear that aren't
        available through regular Indian retail.
      </p>
    ),
  },
  {
    category: "delivery",
    icon: <Clock className="h-4 w-4 text-purple-500" />,
    question: "How long does delivery take?",
    answer: (
      <div className="space-y-2">
        <p>
          Delivery takes <strong>3–4 weeks</strong> from your order date. Here's the breakdown:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li><strong>Week 1–3:</strong> We source &amp; procure your product internationally.</li>
          <li><strong>Week 3:</strong> Product is authenticated and shipped from our end.</li>
          <li><strong>Week 3–4:</strong> Delivered to your doorstep. 🔥</li>
        </ul>
      </div>
    ),
  },
  {
    category: "delivery",
    icon: <Truck className="h-4 w-4 text-green-500" />,
    question: "When will my order be shipped?",
    answer: (
      <p>
        Orders are shipped <strong>approximately 3 weeks after placement</strong>. We procure fresh from
        international sources, authenticate, then dispatch. You'll get a tracking link via WhatsApp/email
        the moment it ships.
      </p>
    ),
  },
  {
    category: "delivery",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    question: "Are there any customs or import fees?",
    answer: (
      <p>
        <strong>None whatsoever.</strong> Our team handles all customs clearance. The price you see is the
        final price — no hidden import duties or surprise fees at delivery.
      </p>
    ),
  },
  {
    category: "authenticity",
    icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />,
    question: "Are all products 100% authentic?",
    answer: (
      <div className="space-y-2">
        <p>
          <strong>100%, always.</strong> Every product goes through our verification process:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li>Sourced from verified international suppliers &amp; retail channels only.</li>
          <li>Physically inspected — tags, stitching, sole, box all checked.</li>
          <li>Cross-referenced with official brand documentation.</li>
        </ul>
        <p className="text-sm text-gray-400">If it doesn't pass, it doesn't get listed.</p>
      </div>
    ),
  },
  {
    category: "payment",
    icon: <CreditCard className="h-4 w-4 text-violet-500" />,
    question: "What payment methods are accepted?",
    answer: (
      <div className="space-y-2">
        <p>
          We currently accept <strong>UPI only</strong>:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li>Google Pay, PhonePe, Paytm, or any UPI app</li>
        </ul>
        <p className="text-sm text-gray-400">
          Cards &amp; EMI options coming soon. COD is not available as products are sourced on-demand.
        </p>
      </div>
    ),
  },
  {
    category: "issues",
    icon: <Video className="h-4 w-4 text-red-500" />,
    question: "What if I receive the wrong product or size?",
    answer: (
      <div className="space-y-2">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="font-bold text-red-700 text-sm">⚠️ Always record your unboxing video!</p>
          <p className="text-red-600 text-sm mt-1">
            Start recording <strong>before</strong> you open the package — from sealed box to product reveal.
            This video is <strong>mandatory</strong> to process any wrong product / size claim.
          </p>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li>Record the full unboxing (sealed package → product).</li>
          <li>Photograph the product, size tag, box label &amp; your order confirmation.</li>
          <li>Contact us on WhatsApp or email within <strong>24 hours</strong> of delivery.</li>
          <li>We'll arrange a replacement or refund after review.</li>
        </ol>
        <p className="text-xs text-gray-400 italic">Claims without an unboxing video cannot be processed.</p>
      </div>
    ),
  },
  {
    category: "issues",
    icon: <RotateCcw className="h-4 w-4 text-blue-500" />,
    question: "What's your return & exchange policy?",
    answer: (
      <p>
        Returns and exchanges are accepted <strong>only</strong> for wrong item / wrong size — with a valid
        unboxing video. Change-of-mind returns aren't possible as products are procured specifically for your
        order. See our{" "}
        <Link to={ROUTE_NAMES.RETURNS} className="text-purple-600 font-semibold hover:underline">
          Returns &amp; Exchanges Policy
        </Link>
        {" "}for full details.
      </p>
    ),
  },
  {
    category: "issues",
    icon: <Package className="h-4 w-4 text-orange-500" />,
    question: "Can I cancel my order?",
    answer: (
      <div className="space-y-2">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="font-bold text-amber-700 text-sm">⚠️ Orders cannot be cancelled once confirmed.</p>
          <p className="text-amber-600 text-sm mt-1">
            Since every order is procured fresh from international sources specifically for you, we begin
            procurement immediately after payment confirmation. <strong>All sales are final.</strong>
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Please double-check your size, address, and product details before placing your order. If you
          have concerns before ordering, reach out to us on WhatsApp — we're happy to help.
        </p>
      </div>
    ),
  },
  {
    category: "sizing",
    icon: <Ruler className="h-4 w-4 text-pink-500" />,
    question: "How do I pick the right size?",
    answer: (
      <div className="space-y-2">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="font-bold text-blue-700 text-sm">📏 Check the size chart on the product page!</p>
          <p className="text-blue-600 text-sm mt-1">
            Every product listing has a <strong>Size Chart</strong> tab — always refer to it before ordering
            to ensure you pick the right fit.
          </p>
        </div>
        <p>Most sneakers are listed in <strong>UK sizes</strong>. Quick reference:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li>UK = US Men's − 1 &nbsp;&nbsp;(e.g. UK 9 ≈ US 10)</li>
          <li>UK = EU − 33/34 &nbsp;&nbsp;(e.g. UK 9 ≈ EU 43)</li>
        </ul>
        <p className="text-sm text-gray-400">
          If you're between sizes, go half a size up. Still unsure? DM us on WhatsApp before ordering!
        </p>
      </div>
    ),
  },
  {
    category: "support",
    icon: <MessageCircle className="h-4 w-4 text-green-500" />,
    question: "How do I track my order or get support?",
    answer: (
      <div className="space-y-2">
        <p>Once shipped you'll get a tracking link via WhatsApp/email. For anything else:</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-500 ml-1">
          <li><strong>WhatsApp</strong> — fastest, we reply within hours</li>
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:support@theplugmarket.in" className="text-purple-600 hover:underline">
              support@theplugmarket.in
            </a>
          </li>
          <li>
            <strong>Instagram:</strong>{" "}
            <a href="https://instagram.com/the.plugmarket" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">
              @the.plugmarket
            </a>
          </li>
        </ul>
      </div>
    ),
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  delivery: "Delivery",
  authenticity: "Authenticity",
  payment: "Payment",
  issues: "Order Issues",
  sizing: "Sizing",
  support: "Support",
};

interface FAQSectionProps {
  /** Limit which categories are shown. Defaults to all. */
  categories?: Array<FAQItem["category"]>;
  /** Max number of questions to show (useful on product page for a compact view) */
  limit?: number;
  /** Section heading override */
  heading?: string;
  /** Show the category filter chips */
  showFilter?: boolean;
}

function FAQAccordion({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isOpen
          ? "border-purple-300 bg-white shadow-lg shadow-purple-100/60"
          : "border-gray-200 bg-white/80 hover:border-purple-200 hover:shadow-md"
      }`}
    >
      <button
        id={`faq-q-${index}`}
        aria-expanded={isOpen}
        aria-controls={`faq-a-${index}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-2xl"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="shrink-0 p-2 rounded-xl bg-gray-50">{item.icon}</span>
          <span className="font-semibold text-gray-900 text-sm leading-snug">
            {item.question}
          </span>
        </div>
        <span
          className={`shrink-0 p-1.5 rounded-full transition-colors ${
            isOpen ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* CSS grid trick for smooth height animation */}
      <div
        id={`faq-a-${index}`}
        role="region"
        aria-labelledby={`faq-q-${index}`}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 text-gray-600 text-sm leading-relaxed border-t border-gray-100">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

const INITIAL_VISIBLE = 3;

export default function FAQSection({
  categories,
  heading = "Frequently Asked Questions",
  showFilter = true,
}: Omit<FAQSectionProps, "limit">) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const baseItems = categories
    ? FAQ_DATA.filter((f) => categories.includes(f.category))
    : FAQ_DATA;

  const filtered =
    activeFilter === "all"
      ? baseItems
      : baseItems.filter((f) => f.category === activeFilter);

  const hasMore = filtered.length > INITIAL_VISIBLE;
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);

  // Build filter options from what's actually in baseItems
  const availableCategories = ["all", ...Array.from(new Set(baseItems.map((f) => f.category)))];

  const toggle = (idx: number) => setOpenIndex(openIndex === idx ? null : idx);

  const handleFilterChange = (cat: string) => {
    setActiveFilter(cat);
    setOpenIndex(null);
    setShowAll(false);
  };

  return (
    <section className="px-4 py-10 lg:px-8">
        {/* Heading */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{heading}</h2>
        </div>

        {/* Category filter chips */}
        {showFilter && availableCategories.length > 2 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                  activeFilter === cat
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white border-transparent shadow"
                    : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
                }`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        )}

        {/* Accordion list */}
        <div className="space-y-2.5">
          {visible.map((item, idx) => (
            <FAQAccordion
              key={idx}
              index={idx}
              item={item}
              isOpen={openIndex === idx}
              onToggle={() => toggle(idx)}
            />
          ))}
        </div>

        {/* View more / View less */}
        {hasMore && (
          <button
            id="faq-toggle-view"
            onClick={() => {
              setShowAll((prev) => !prev);
              if (showAll) setOpenIndex(null);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                View less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View {filtered.length - INITIAL_VISIBLE} more question{filtered.length - INITIAL_VISIBLE !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}

        {/* "Still have questions?" footer CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-purple-500 shrink-0" />
            <div>
              <p className="font-bold text-gray-900 text-sm">Still have questions?</p>
              <p className="text-xs text-gray-500">We typically reply within a few hours.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href="https://wa.me/919XXXXXXXXX"
              target="_blank"
              rel="noopener noreferrer"
              id="faq-whatsapp-support"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Us
            </a>
            <a
              href="mailto:support@theplugmarket.in"
              id="faq-email-support"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-purple-200 text-purple-700 text-sm font-semibold hover:bg-purple-50 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
    </section>
  );
}
