import { Instagram } from "lucide-react";

const InstagramBanner = () => {
  return (
    <section className="px-4 py-4">
      <a
        href="https://instagram.com/the.plugmarket"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-3xl overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-5 hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl">
              <Instagram className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">
                Follow us on Instagram
              </p>
              <p className="text-white/80 text-sm">
                @the.plugmarket · Latest drops & restocks
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-full">
            Follow
          </div>
        </div>
      </a>
    </section>
  );
};

export default InstagramBanner;
