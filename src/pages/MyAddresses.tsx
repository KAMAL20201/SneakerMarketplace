import { useEffect, useState } from "react";
import { MapPin, Edit, Trash2, Star, Plus, MapPinOff, Package } from "lucide-react";
import { useAddressStorage } from "../hooks/useAddressStorage";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { ShippingAddressForm } from "../components/checkout/ShippingAddressForm";
import type { ShippingAddress } from "../types/shipping";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PickupAddressModal, { type PickupAddress } from "@/components/PickupAddressModal";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function MyAddresses() {
  const {
    addresses,
    loading,
    deleteAddress,
    setDefault,
    refreshAddresses,
    addAddress,
    updateAddress,
  } = useAddressStorage();
  const { user } = useAuth();
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  // Pickup (selling) address state
  const [pickupAddress, setPickupAddress] = useState<PickupAddress | null>(null);
  const [pickupLoading, setPickupLoading] = useState<boolean>(true);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);

  const loadPickupAddress = async () => {
    if (!user?.id) {
      setPickupAddress(null);
      setPickupLoading(false);
      return;
    }
    try {
      setPickupLoading(true);
      const { data, error } = await supabase
        .from("sellers")
        .select("pickup_address")
        .eq("id", user.id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      setPickupAddress((data as any)?.pickup_address || null);
    } catch (e) {
      console.error("Failed to load pickup address:", e);
      toast.error("Failed to load pickup address");
    } finally {
      setPickupLoading(false);
    }
  };

  useEffect(() => {
    loadPickupAddress();
  }, [user?.id]);

  const handleDelete = async (addressId: string) => {
    if (window.confirm("Are you sure you want to delete this address?")) {
      const success = await deleteAddress(addressId);
      if (success) {
        toast.success("Address deleted successfully");
        await refreshAddresses();
      } else {
        toast.error("Failed to delete address");
      }
    }
  };

  const handleSetDefault = async (addressId: string) => {
    const success = await setDefault(addressId);
    if (success) {
      toast.success("Default address updated");
      await refreshAddresses();
    } else {
      toast.error("Failed to update default address");
    }
  };

  const handleEdit = (address: ShippingAddress) => {
    setEditingAddress(address);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = async (addressData: ShippingAddress) => {
    if (!editingAddress?.id) return;

    const success = await updateAddress(editingAddress.id, addressData);
    if (success) {
      setIsEditDialogOpen(false);
      setEditingAddress(null);
      await refreshAddresses();
      toast.success("Address updated successfully");
    } else {
      toast.error("Failed to update address");
    }
  };

  const handleAddSuccess = async (addressData: ShippingAddress) => {
    const success = await addAddress(addressData);
    if (success) {
      setIsAddDialogOpen(false);
      await refreshAddresses();
      toast.success("Address added successfully");
    } else {
      toast.error("Failed to add address");
    }
  };

  // Pickup (selling) actions
  const handlePickupSave = async (addr: PickupAddress) => {
    if (!user?.id) return toast.error("Please login to save pickup address");
    try {
      const { error } = await supabase
        .from("sellers")
        .update({ pickup_address: addr })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Pickup address saved");
      setPickupModalOpen(false);
      await loadPickupAddress();
    } catch (e) {
      console.error("Failed to save pickup address:", e);
      toast.error("Failed to save pickup address");
    }
  };

  const handlePickupDelete = async () => {
    if (!user?.id) return;
    if (!window.confirm("Delete your pickup address?")) return;
    try {
      const { error } = await supabase
        .from("sellers")
        .update({ pickup_address: null })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Pickup address deleted");
      await loadPickupAddress();
    } catch (e) {
      console.error("Failed to delete pickup address:", e);
      toast.error("Failed to delete pickup address");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              My Addresses
            </h1>
            <p className="text-gray-600">Manage your buying and selling addresses</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="buy">Buying Address</TabsTrigger>
            <TabsTrigger value="sell">Selling Address</TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Shipping Addresses</h2>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Add New Address
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Address</DialogTitle>
                  </DialogHeader>
                  <ShippingAddressForm
                    onSuccess={handleAddSuccess}
                    onCancel={() => setIsAddDialogOpen(false)}
                    isEdit={false}
                  />
                </DialogContent>
              </Dialog>
            </div>

            {addresses.length === 0 ? (
              <div className="text-center py-16">
                <MapPinOff className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No addresses found
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't added any shipping addresses yet.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Address
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                {addresses.map((address) => (
                  <Card key={address.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-gray-500" />
                          <CardTitle className="text-lg">
                            {address.full_name}
                            {address.is_default && (
                              <Badge variant="secondary" className="ml-2">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 self-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(address)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(address.id!)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p className="font-medium text-gray-900">{address.phone}</p>
                        <p>{address.address_line1}</p>
                        {address.address_line2 && <p>{address.address_line2}</p>}
                        <p>
                          {address.city}, {address.state} {address.pincode}
                        </p>
                        {address.country && <p>{address.country}</p>}
                      </div>

                      {!address.is_default && (
                        <div className="mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(address.id!)}
                            className="w-full"
                          >
                            <Star className="h-4 w-4 mr-2" /> Set as Default
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sell">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Pickup Address</h2>
              {!pickupAddress && (
                <Button onClick={() => setPickupModalOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Pickup Address
                </Button>
              )}
            </div>

            {pickupLoading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : !pickupAddress ? (
              <div className="text-center py-16">
                <Package className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No pickup address
                </h3>
                <p className="text-gray-600 mb-6">
                  Add a pickup address to start selling and shipping orders.
                </p>
                <Button onClick={() => setPickupModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add Pickup Address
                </Button>
              </div>
            ) : (
              <Card className="relative">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <CardTitle className="text-lg">{pickupAddress.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 self-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPickupModalOpen(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePickupDelete}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">{pickupAddress.phone}</p>
                    <p>{pickupAddress.address}</p>
                    {pickupAddress.address_2 && <p>{pickupAddress.address_2}</p>}
                    <p>
                      {pickupAddress.city}, {pickupAddress.state} {pickupAddress.pin_code}
                    </p>
                    {pickupAddress.country && <p>{pickupAddress.country}</p>}
                    {pickupAddress.landmark && (
                      <p className="text-gray-500">Landmark: {pickupAddress.landmark}</p>
                    )}
                    <p className="text-gray-500">Email: {pickupAddress.email}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <PickupAddressModal
              open={pickupModalOpen}
              onOpenChange={setPickupModalOpen}
              onSave={handlePickupSave}
              initialAddress={pickupAddress || undefined}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Address Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Address</DialogTitle>
          </DialogHeader>
          {editingAddress && (
            <ShippingAddressForm
              address={editingAddress}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditDialogOpen(false)}
              isEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
