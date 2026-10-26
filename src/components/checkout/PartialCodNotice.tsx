import { Wallet } from "lucide-react";

export function PartialCodNotice() {
  return (
    <aside aria-label="Partial COD available" className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-purple-700" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-purple-900">Partial COD now available</p>
          <p className="mt-1 text-sm font-medium text-gray-900">Pay 70% now · 30% on delivery</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">Choose partial COD or full prepaid at checkout.</p>
        </div>
      </div>
    </aside>
  );
}
