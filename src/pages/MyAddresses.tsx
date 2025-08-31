import { useState } from "react";
import { MapPin, Edit, Trash2, Star, Plus, MapPinOff } from "lucide-react";
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
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              My Addresses
            </h1>
            <p className="text-gray-600">Manage your shipping addresses</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Add New Address
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

        {/* Addresses List */}
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
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Address
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
                        <Star className="h-4 w-4 mr-2" />
                        Set as Default
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
