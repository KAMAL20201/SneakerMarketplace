"use client";

import { Link } from "react-router";
import { Mail, Phone, Instagram } from "lucide-react";

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
                <path d="M2 18h20l-2-4H10l-1-2H7l-1 2H4l-2 4zm20-6c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v1h14v-1zm-8-4c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1zm4 0c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1 1-.45 1-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold gradient-text">
                SneakHub
              </h3>
              <p className="text-xs md:text-sm text-gray-300">
                Premium Marketplace
              </p>
            </div>
          </div>
          <p className="text-gray-300 leading-relaxed text-sm md:text-base">
            The world's most trusted marketplace for authentic sneakers. Buy,
            sell, and discover rare kicks with confidence.
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

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-8">
          {/* Support */}
          <div className="space-y-3 md:space-y-4">
            <h4 className="text-base md:text-lg font-bold text-white">
              Support
            </h4>
            <ul className="space-y-2 md:space-y-3">
              <li>
                <Link
                  to="/help"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link
                  to="/shipping"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
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
                  to="/about"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/seller-agreement"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Seller Agreement
                </Link>
              </li>
              <li>
                <Link
                  to="/buyer-protection"
                  className="text-gray-300 hover:text-white transition-colors text-sm md:text-base"
                >
                  Buyer Protection
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact Info */}
        <div className="border-t border-white/20 pt-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Email</p>
                <p className="text-white font-semibold">support@sneakhub.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-xl">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Phone</p>
                <p className="text-white font-semibold">1-800-SNEAKS</p>
              </div>
            </div>
         
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm mb-4 md:mb-0 text-center md:text-left">
            © 2025 SneakHub. All rights reserved. Authentic sneakers guaranteed.
          </p>
         
        </div>
      </div>
    </footer>
  );
}
