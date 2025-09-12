import { useEffect, useState } from "react";
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

export type PickupAddress = {
  name: string;
  email: string;
  phone: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string; // e.g., "India"
  pin_code: string; // 6-digit pincode
  landmark?: string;
};

type PickupAddressModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: PickupAddress) => Promise<void> | void;
  defaultCountry?: string;
  initialAddress?: PickupAddress;
};

export default function PickupAddressModal({
  open,
  onOpenChange,
  onSave,
  defaultCountry = "India",
  initialAddress,
}: PickupAddressModalProps) {
  const [form, setForm] = useState<PickupAddress>(
    initialAddress || {
      name: "",
      email: "",
      phone: "",
      address: "",
      address_2: "",
      city: "",
      state: "",
      country: defaultCountry,
      pin_code: "",
      landmark: "",
    }
  );
  const [saving, setSaving] = useState(false);

  // When opening or when initialAddress changes, reset the form.
  // Ensures editing pre-fills fields and closing then reopening resets state.
  useEffect(() => {
    if (open) {
      setForm(
        initialAddress || {
          name: "",
          email: "",
          phone: "",
          address: "",
          address_2: "",
          city: "",
          state: "",
          country: defaultCountry,
          pin_code: "",
          landmark: "",
        }
      );
    }
  }, [open, initialAddress, defaultCountry]);

  const update =
    (key: keyof PickupAddress) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const isValid = () => {
    return (
      form.name.trim() !== "" &&
      form.email.trim() !== "" &&
      form.phone.trim().length >= 10 &&
      form.address.trim() !== "" &&
      form.city.trim() !== "" &&
      form.state.trim() !== "" &&
      form.country.trim() !== "" &&
      /^[0-9]{6}$/.test(form.pin_code)
    );
  };

  const handleSave = async () => {
    if (!isValid()) return;
    try {
      setSaving(true);
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-0 rounded-3xl p-0 w-[calc(100%-1rem)] sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[85vh]">
        <div className="flex h-[90vh] flex-col">
          <div className="p-6 h-full">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {initialAddress ? "Edit Pickup Address" : "Pickup Address"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Add your pickup address to continue creating the shipment
              </DialogDescription>
            </DialogHeader>

            <div className="h-[76%] mt-4 grid grid-cols-1 gap-4 overflow-y-auto relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-gray-800">
                    Contact Name
                  </Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="Full Name"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-800">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={update("phone")}
                    inputMode="tel"
                    placeholder="10-digit phone"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email" className="text-gray-800">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="name@example.com"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="pin_code" className="text-gray-800">
                    Pincode
                  </Label>
                  <Input
                    id="pin_code"
                    value={form.pin_code}
                    onChange={update("pin_code")}
                    inputMode="numeric"
                    placeholder="6-digit"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-gray-800">
                  Address Line 1
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={update("address")}
                  placeholder="House no., street, area"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="address_2" className="text-gray-800">
                  Address Line 2 (Optional)
                </Label>
                <Input
                  id="address_2"
                  value={form.address_2}
                  onChange={update("address_2")}
                  placeholder="Apartment, suite, etc."
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city" className="text-gray-800">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={update("city")}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-gray-800">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={update("state")}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="country" className="text-gray-800">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={form.country}
                    readOnly
                    disabled
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="landmark" className="text-gray-800">
                  Landmark (Optional)
                </Label>
                <Input
                  id="landmark"
                  value={form.landmark}
                  onChange={update("landmark")}
                  placeholder="Nearby landmark"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gray-50/90 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 flex items-center justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={!isValid() || saving}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
