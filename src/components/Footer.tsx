import { Link } from "react-router";
import { Mail, Phone, Instagram } from "lucide-react";
import { ROUTE_NAMES } from "@/constants/enums";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        {/* Brand Section */}
        <div className="space-y-3 mb-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl shadow-lg">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-white"
                fill="currentColor"
              >
                <path d="M16.5 3c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v4c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V3zM11 3c0-.83-.67-1.5-1.5-1.5S8 2.17 8 3v4c0 .83.67 1.5 1.5 1.5S11 7.83 11 7V3zM6 8.5C6 7.12 7.12 6 8.5 6h7C16.88 6 18 7.12 18 8.5v2c0 .28-.22.5-.5.5h-1v2c0 2.21-1.79 4-4 4s-4-1.79-4-4v-2h-1c-.28 0-.5-.22-.5-.5v-2zm6 10.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-1.5-.67-1.5-1.5-.67-1.5-1.5-1.5S12 18.17 12 19z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold gradient-text">
                The Plug Market
              </h3>
              <p className="text-xs md:text-sm text-gray-300">Your Connect</p>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base">
            The ultimate marketplace connecting collectors and sellers across
            India. Buy, sell, and discover hyped sneakers, streetwear,
            collectibles & more from trusted community members.
          </p>
          <div className="flex space-x-3 md:space-x-4">
            <a
              href="#"
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              <Instagram className="h-4 w-4 md:h-5 md:w-5" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
          {/* Trust & Safety */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-bold text-white">
              Trust & Safety
            </h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  to={ROUTE_NAMES.BUYER_PROTECTION}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Buyer Protection
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTE_NAMES.SECURE_PAYMENTS}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Secure Payments
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTE_NAMES.REVIEW_PROCESS}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Review Process
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-bold text-white">
              Support
            </h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  to={ROUTE_NAMES.HELP}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Help Center
                </Link>
              </li>

              <li>
                <Link
                  to={ROUTE_NAMES.FAQ}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  FAQs
                </Link>
              </li>

              <li>
                <Link
                  to={ROUTE_NAMES.RETURNS}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Returns & Exchanges
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-bold text-white">Legal</h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  to={ROUTE_NAMES.ABOUT}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTE_NAMES.TERMS}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTE_NAMES.PRIVACY}
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-t border-white/20 pt-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Email</p>
                <p className="text-white font-semibold">
                  support@theplugmarket.in
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Phone</p>
                <p className="text-white font-semibold">1-800-PLUG-IN</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm mb-4 md:mb-0 text-center md:text-left">
            © 2025 The Plug Market. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
