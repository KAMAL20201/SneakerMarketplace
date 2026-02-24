import { Instagram } from "lucide-react";

const InstagramBanner = () => {
  return (
    <section className="px-4 py-4">
      <a
        href="https://instagram.com/the.plugmarket"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-4 rounded-2xl border border-purple-100 bg-purple-50 hover:border-purple-300 hover:bg-purple-100 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100">
            <Instagram className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-800 leading-tight">
              Follow us on Instagram
            </p>
            <p className="text-xs text-gray-500">
              @the.plugmarket · Latest drops & restocks
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 px-4 py-1.5 rounded-full border border-purple-300 bg-white text-purple-600 text-sm font-semibold hover:bg-purple-600 hover:text-white transition-colors duration-200">
          Follow
        </div>
      </a>
    </section>
  );
};

export default InstagramBanner;
