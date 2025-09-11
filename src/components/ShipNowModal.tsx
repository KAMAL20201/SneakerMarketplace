import { useEffect, useMemo, useState } from "react";
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
import {
  fetchServiceability,
  type CourierCompany,
  createShiprocketOrder,
} from "@/lib/shiprocket";
import { toast } from "sonner";
import { Truck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ShipNowModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupPincode: string;
  deliveryPincode: string;
  // Seller's Shiprocket pickup address nickname (e.g., "Home", "Kamal Arora")
  pickupLocationName?: string;
  order?: {
    id: string;
    amount: number;
    shipping_address?: {
      full_name: string;
      phone: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
    };
    product_listings?: { title?: string };
    buyer_id?: string;
  };
  onCourierSelected?: (
    courier: CourierCompany,
    pkg: {
      weightKg: number;
      lengthCm: number;
      breadthCm: number;
      widthCm: number;
    }
  ) => void;
};

export default function ShipNowModal({
  open,
  onOpenChange,
  pickupPincode,
  deliveryPincode,
  pickupLocationName,
  order,
  onCourierSelected,
}: ShipNowModalProps) {
  const [weightKg, setWeightKg] = useState<string>("");
  const [lengthCm, setLengthCm] = useState<string>("");
  const [breadthCm, setBreadthCm] = useState<string>("");
  const [widthCm, setWidthCm] = useState<string>("");
  const [step, setStep] = useState<1 | 2>(1);
  const { user } = useAuth();

  // Step 2
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couriers, setCouriers] = useState<CourierCompany[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierCompany | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const sortedCouriers = useMemo(() => {
    return [...couriers].sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  }, [couriers]);
  const formatPrice = (n: number) =>
    new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
      Math.round(n)
    );

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (!selectedCourier) return;
      // Build Shiprocket order payload and create via edge function
      const pkg = {
        weightKg: Number(weightKg || 0),
        lengthCm: Number(lengthCm || 0),
        breadthCm: Number(breadthCm || 0),
        widthCm: Number(widthCm || 0),
      };
      const addr = order?.shipping_address;
      if (!addr) {
        toast.error("Missing shipping address on order");
        return;
      }
      const payload = {
        order_id: order?.id,
        order_date: new Date().toISOString(),
        // Shiprocket requires the pickup_location to match the saved pickup address nickname
        pickup_location: pickupLocationName || "Primary",
        billing_customer_name: addr.full_name || "",
        billing_last_name: "",
        billing_address: addr.address_line1 || "",
        billing_address_2: addr.address_line2 || "",
        billing_city: addr.city,
        billing_pincode: addr.pincode,
        billing_state: addr.state,
        billing_country: addr.country || "India",
        billing_email: user?.email || "",
        billing_phone: addr.phone,
        shipping_is_billing: 1,
        order_items: [
          {
            name: order?.product_listings?.title || "Item",
            sku: order?.id || "SKU",
            units: 1,
            selling_price: order?.amount || 0,
          },
        ],
        payment_method: "Prepaid",
        sub_total: order?.amount || 0,
        length: pkg.lengthCm,
        breadth: pkg.breadthCm,
        height: pkg.widthCm,
        weight: pkg.weightKg,
      };
      setSubmitting(true);
      createShiprocketOrder(payload)
        .then((res) => {
          if (res?.success) {
            toast.success("Shiprocket order created");
            if (onCourierSelected) onCourierSelected(selectedCourier, pkg);
            onOpenChange(false);
          } else {
            toast.error("Failed to create Shiprocket order");
          }
        })
        .catch((e) => {
          console.error("Shiprocket order create error:", e);
          toast.error("Error creating Shiprocket order");
        })
        .finally(() => setSubmitting(false));
    }
  };

  const isNextDisabled =
    step === 1
      ? !weightKg ||
        !lengthCm ||
        !breadthCm ||
        !widthCm ||
        Number(weightKg) <= 0 ||
        Number(lengthCm) <= 0 ||
        Number(breadthCm) <= 0 ||
        Number(widthCm) <= 0
      : submitting || !selectedCourier;

  // Fetch courier options when entering step 2
  const query = useMemo(
    () => ({
      pickup_postcode: pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: Number(weightKg || 0),
    }),
    [pickupPincode, deliveryPincode, weightKg]
  );

  useEffect(() => {
    if (!open) return;
    if (step !== 2) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setCouriers([]);
      try {
        const resp = await fetchServiceability(query);
        if (cancelled) return;
        const list = resp?.data?.available_courier_companies || [];
        setCouriers(list);
        if (!list.length)
          setError(resp?.message || "No courier services available");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to fetch couriers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, step, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setStep(1);
        onOpenChange(o);
      }}
    >
      <DialogContent className="border-0 rounded-3xl p-0 overflow-hidden w-[calc(100%-1rem)] sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[85vh]">
        <div className="flex h-full flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Create Shipment
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {step === 1
                  ? "Step 1 of 3 — Enter package weight and dimensions"
                  : "Step 2 of 3 — Select a courier service"}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 mb-6 flex items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full ${
                  step >= 1
                    ? "bg-gradient-to-r from-purple-500 to-pink-500"
                    : "bg-gray-200"
                }`}
              />
              <div
                className={`h-2 flex-1 rounded-full ${
                  step >= 2
                    ? "bg-gradient-to-r from-purple-500 to-pink-500"
                    : "bg-gray-200"
                }`}
              />
              <div className="h-2 flex-1 rounded-full bg-gray-200" />
            </div>

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="weightKg" className="text-gray-800">
                    Weight
                  </Label>
                  <div className="mt-2 relative">
                    <Input
                      id="weightKg"
                      type="number"
                      placeholder="e.g. 1.2"
                      min={0}
                      step={0.1}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="pr-14"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                      kg
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter actual or volumetric weight in kilograms.
                  </p>
                </div>

                <div>
                  <Label className="text-gray-800">Dimensions</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                      <Input
                        id="lengthCm"
                        type="number"
                        placeholder="Length"
                        min={0}
                        step={0.1}
                        value={lengthCm}
                        onChange={(e) => setLengthCm(e.target.value)}
                        className="pr-12"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                        cm
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="breadthCm"
                        type="number"
                        placeholder="Breadth"
                        min={0}
                        step={0.1}
                        value={breadthCm}
                        onChange={(e) => setBreadthCm(e.target.value)}
                        className="pr-12"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                        cm
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        id="widthCm"
                        type="number"
                        placeholder="Width"
                        min={0}
                        step={0.1}
                        value={widthCm}
                        onChange={(e) => setWidthCm(e.target.value)}
                        className="pr-12"
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500">
                        cm
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Provide outer package dimensions in centimeters.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {loading && (
                  <div className="text-center text-gray-600">
                    Loading courier options...
                  </div>
                )}
                {error && !loading && (
                  <div className="text-center text-red-600 text-sm">
                    {error}
                  </div>
                )}
                {!loading && !error && sortedCouriers.length > 0 && (
                  <ul className="space-y-3 overflow-y-auto h-full">
                    {sortedCouriers.map((c) => (
                      <li
                        key={`${c.courier_company_id}-${c.courier_name}`}
                        className={`glass-card  p-4 border-0 cursor-pointer ${
                          selectedCourier?.courier_company_id ===
                          c.courier_company_id
                            ? "ring-2 ring-purple-500"
                            : ""
                        }`}
                        onClick={() => setSelectedCourier(c)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {c.courier_name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {c.etd ||
                                  (c.estimated_delivery_days
                                    ? `${c.estimated_delivery_days} days`
                                    : "ETA N/A")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ">
                            <div className="text-xl font-bold text-gray-900">
                              ₹{formatPrice(c.rate)}
                            </div>

                            <div
                              className={`mt-2 text-xs px-2 py-1 rounded-full ${
                                selectedCourier?.courier_company_id ===
                                c.courier_company_id
                                  ? "bg-purple-600 text-white"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {selectedCourier?.courier_company_id ===
                              c.courier_company_id
                                ? "Selected"
                                : "Select"}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 bg-gray-50/90 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 sticky bottom-0 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button
                variant="ghost"
                className="rounded-xl"
                onClick={() => setStep((s) => (s === 2 ? 1 : s))}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={isNextDisabled}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
            >
              {step === 1
                ? "Next"
                : submitting
                ? "Creating Order..."
                : "Create Order"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
