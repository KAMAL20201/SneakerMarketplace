import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DELIVERY_COMPANIES = [
  "BlueDart",
  "Delhivery",
  "Tirupathi Courier",
  "DTDC",
  "Ekart",
  "India Post",
  "Other",
];

type ShipNowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: {
    id: string;
    product_listings?: { title?: string };
  };
  onShipConfirmed?: (deliveryCompany: string, awb: string) => void;
};

export default function ShipNowModal({
  open,
  onOpenChange,
  onShipConfirmed,
}: ShipNowModalProps) {
  const [deliveryCompany, setDeliveryCompany] = useState<string>("");
  const [awb, setAwb] = useState<string>("");
  const [confirming, setConfirming] = useState(false);

  const isDisabled = confirming || !deliveryCompany || !awb.trim();

  const handleConfirm = () => {
    if (isDisabled) return;
    setConfirming(true);
    try {
      if (onShipConfirmed) onShipConfirmed(deliveryCompany, awb.trim());
      onOpenChange(false);
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setDeliveryCompany("");
      setAwb("");
      setConfirming(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-0 rounded-3xl p-0 overflow-hidden w-[calc(100%-1rem)] sm:max-w-md">
        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Ship Order
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Enter shipping details to notify the buyer.
            </DialogDescription>
          </DialogHeader>

          {/* Delivery Company */}
          <div>
            <Label htmlFor="deliveryCompany" className="text-gray-800">
              Delivery Company
            </Label>
            <div className="mt-2">
              <select
                id="deliveryCompany"
                value={deliveryCompany}
                onChange={(e) => setDeliveryCompany(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="" disabled>
                  Select courier company
                </option>
                {DELIVERY_COMPANIES.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select the courier company you are shipping with.
            </p>
          </div>

          {/* AWB / Tracking Number */}
          <div>
            <Label htmlFor="awb" className="text-gray-800">
              AWB / Tracking Number
            </Label>
            <div className="mt-2">
              <Input
                id="awb"
                type="text"
                placeholder="e.g. 1234567890"
                value={awb}
                onChange={(e) => setAwb(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the airway bill or tracking number provided by the courier.
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end">
            <Button
              onClick={handleConfirm}
              disabled={isDisabled}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 w-full"
            >
              {confirming ? "Confirming..." : "Confirm & Notify Buyer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
