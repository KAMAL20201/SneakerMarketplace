import React from "react";
import type { ShippingAddress } from "../../types/shipping";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { MapPin, Star, Edit, Trash2 } from "lucide-react";

interface AddressCardProps {
  address: ShippingAddress;
  isDefault: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  isDefault,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
}) => {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-purple-500 bg-purple-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      {/* Header with default badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-900">{address.full_name}</span>
          {isDefault && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 text-xs"
            >
              <Star className="h-3 w-3 mr-1" />
              Default
            </Badge>
          )}
        </div>

        {/* Action buttons */}
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Address details */}
      <div className="space-y-1 text-sm text-gray-600">
        <p>{address.address_line1}</p>
        {address.address_line2 && <p>{address.address_line2}</p>}
        <p>
          {address.city}, {address.state} - {address.pincode}
        </p>
        {address.landmark && <p>Near: {address.landmark}</p>}
        <p className="text-gray-500">{address.phone}</p>
      </div>

      {/* Action buttons */}
      <div
        className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {!isDefault && onSetDefault && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSetDefault}
            className="text-xs h-7 px-2"
          >
            Set as Default
          </Button>
        )}

        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          onClick={onSelect}
          className={`text-xs h-7 px-3 ${
            isSelected
              ? "bg-purple-500 hover:bg-purple-600 text-white"
              : "hover:bg-purple-50 hover:border-purple-200"
          }`}
        >
          {isSelected ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
};
