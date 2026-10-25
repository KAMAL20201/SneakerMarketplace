import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ui/ProductCard";
import { ROUTE_HELPERS, ROUTE_NAMES } from "@/constants/enums";
import { supabase } from "@/lib/supabase";
import { fetchBrandPreviews, fetchBrandProducts, getHomeBrandConfig, PRODUCT_PAGE_SIZE, SECTION_PAGE_SIZE } from "@/lib/homeBrandSections";
import type { BrandSectionPreview, BrandListing } from "@/lib/homeBrandSections";

interface PaginationProps {
  page: number;
  pages: number;
  loading: boolean;
  label: string;
  onChange: (page: number) => void;
}

export function BrandPagination({ page, pages, loading, label, onChange }: PaginationProps) {
  if (pages <= 1) return null;
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-center gap-3 px-4 py-4">
      <Button className="min-h-11" variant="outline" disabled={loading || page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="text-sm" aria-live="polite">Page {page} of {pages}</span>
      <Button className="min-h-11" variant="outline" disabled={loading || page === pages} onClick={() => onChange(page + 1)}>Next</Button>
    </nav>
  );
}

function BrandSection({ section }: { section: BrandSectionPreview }) {
  const [products, setProducts] = useState({ listings: section.listings, productCount: section.productCount });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<number, { listings: BrandListing[]; productCount: number }>([[1, products]]));
  const rowRef = useRef<HTMLDivElement>(null);
  const config = getHomeBrandConfig(section.brand);
  const viewAllUrl = config ? ROUTE_HELPERS.BRAND_PAGE(config.slug)
    : `${ROUTE_NAMES.BROWSE}?${new URLSearchParams({ brand: section.brand })}`;

  async function changePage(nextPage: number) {
    setLoading(true);
    try {
      const result = cache.current.get(nextPage) ?? await fetchBrandProducts(supabase, section.brand, nextPage);
      cache.current.set(nextPage, result);
      setProducts(result);
      setPage(nextPage);
      rowRef.current?.scrollTo({ left: 0 });
    } catch {
      toast.error(`Could not load ${section.brand} products. Please try again.`);
    } finally {
      setLoading(false);
    }
  }

  if (!products.listings.length) return null;
  return (
    <section aria-labelledby={`brand-${section.id}`} aria-busy={loading} className="px-4 py-6">
      <div className="relative mb-6 flex items-center justify-between gap-3 text-left sm:flex-col sm:px-24 sm:text-center">
        <div className="min-w-0">
          <h2 id={`brand-${section.id}`} className="break-words text-3xl font-bold text-gray-800 sm:text-4xl">{section.title || section.brand}</h2>
          {config && <p className="text-xs font-medium text-purple-600">{config.tagline}</p>}
        </div>
        <Button asChild variant="ghost" className="min-h-11 shrink-0 font-semibold text-purple-600 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
          <Link to={viewAllUrl} aria-label={`View all ${section.brand} products`}>View All</Link>
        </Button>
      </div>
      <div ref={rowRef} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {products.listings.map((listing) => <div key={listing.id} className="w-48 shrink-0 sm:w-64"><ProductCard product={listing} variant="vertical" /></div>)}
      </div>
      <BrandPagination page={page} pages={Math.ceil(products.productCount / PRODUCT_PAGE_SIZE)} loading={loading} label={`${section.brand} products`} onChange={changePage} />
    </section>
  );
}

export default function HomeBrandSections({ initialData }: { initialData: Awaited<ReturnType<typeof fetchBrandPreviews>> }) {
  const [result, setResult] = useState(initialData);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map([[1, initialData]]));

  async function changePage(nextPage: number) {
    setLoading(true);
    try {
      const next = cache.current.get(nextPage) ?? await fetchBrandPreviews(supabase, nextPage);
      cache.current.set(nextPage, next);
      setResult(next);
      setPage(nextPage);
    } catch {
      toast.error("Could not load brand sections. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div aria-busy={loading}>
      {result.sections.map((section) => <BrandSection key={section.id} section={section} />)}
      <BrandPagination page={page} pages={Math.ceil(result.count / SECTION_PAGE_SIZE)} loading={loading} label="Home brand sections" onChange={changePage} />
    </div>
  );
}
