import { useState, useEffect } from "react";
import {
  Plus,
  CreditCard,
  Smartphone,
  Edit3,
  Trash2,
  Star,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { PaymentMethodsService } from "@/lib/paymentMethodsService";
import type {
  DecryptedPaymentMethod,
  UPIData,
  BankAccountData,
} from "@/lib/encryptionService";
import { toast } from "sonner";

const PaymentMethods = () => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<
    DecryptedPaymentMethod[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMethod, setEditingMethod] =
    useState<DecryptedPaymentMethod | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState<{
    [key: string]: boolean;
  }>({});

  // Form state for adding/editing payment methods
  const [formData, setFormData] = useState({
    methodType: "upi" as "upi" | "bank_account",
    // UPI fields
    upiId: "",
    holderName: "",
    // Bank account fields
    accountNumber: "",
    ifscCode: "",
    accountHolderName: "",
    bankName: "",
    accountType: "savings" as "savings" | "current",
  });
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await PaymentMethodsService.getDecryptedPaymentMethods(
        user!.id
      );
      setPaymentMethods(methods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (formData.methodType === "upi") {
      if (!formData.upiId.trim()) {
        errors.upiId = "UPI ID is required";
      } else if (!PaymentMethodsService.validateUPIId(formData.upiId)) {
        errors.upiId = "Invalid UPI ID format (e.g., user@paytm)";
      }

      if (!formData.holderName.trim()) {
        errors.holderName = "Account holder name is required";
      }
    } else {
      if (!formData.accountNumber.trim()) {
        errors.accountNumber = "Account number is required";
      } else if (
        !PaymentMethodsService.validateAccountNumber(formData.accountNumber)
      ) {
        errors.accountNumber = "Invalid account number (9-18 digits)";
      }

      if (!formData.ifscCode.trim()) {
        errors.ifscCode = "IFSC code is required";
      } else if (!PaymentMethodsService.validateIFSC(formData.ifscCode)) {
        errors.ifscCode = "Invalid IFSC code format";
      }

      if (!formData.accountHolderName.trim()) {
        errors.accountHolderName = "Account holder name is required";
      }

      if (!formData.bankName.trim()) {
        errors.bankName = "Bank name is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      methodType: "upi",
      upiId: "",
      holderName: "",
      accountNumber: "",
      ifscCode: "",
      accountHolderName: "",
      bankName: "",
      accountType: "savings",
    });
    setFormErrors({});
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const paymentData =
        formData.methodType === "upi"
          ? ({
              upiId: formData.upiId,
              holderName: formData.holderName,
            } as UPIData)
          : ({
              accountNumber: formData.accountNumber,
              ifscCode: formData.ifscCode.toUpperCase(),
              accountHolderName: formData.accountHolderName,
              bankName: formData.bankName,
              accountType: formData.accountType,
            } as BankAccountData);

      if (editingMethod) {
        await PaymentMethodsService.updatePaymentMethod(
          editingMethod.id,
          user!.id,
          {
            payment_data: paymentData,
          }
        );
        toast.success("Payment method updated successfully");
        setEditingMethod(null);
      } else {
        const isFirstMethod = paymentMethods.length === 0;
        await PaymentMethodsService.createPaymentMethod(
          user!.id,
          formData.methodType,
          paymentData,
          isFirstMethod // Set first method as default
        );
        toast.success("Payment method added successfully");
        setShowAddDialog(false);
      }

      resetForm();
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error saving payment method:", error);
      toast.error("Failed to save payment method");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await PaymentMethodsService.setDefaultPaymentMethod(methodId, user!.id);
      toast.success("Default payment method updated");
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error setting default payment method:", error);
      toast.error("Failed to set default payment method");
    }
  };

  const handleDelete = async (methodId: string) => {
    try {
      await PaymentMethodsService.deletePaymentMethod(methodId, user!.id);
      toast.success("Payment method deleted successfully");
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Failed to delete payment method");
    }
  };

  const handleEdit = (method: DecryptedPaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      methodType: method.method_type,
      upiId: method.method_type === "upi" ? (method.data as UPIData).upiId : "",
      holderName:
        method.method_type === "upi" ? (method.data as UPIData).holderName : "",
      accountNumber:
        method.method_type === "bank_account"
          ? (method.data as BankAccountData).accountNumber
          : "",
      ifscCode:
        method.method_type === "bank_account"
          ? (method.data as BankAccountData).ifscCode
          : "",
      accountHolderName:
        method.method_type === "bank_account"
          ? (method.data as BankAccountData).accountHolderName
          : "",
      bankName:
        method.method_type === "bank_account"
          ? (method.data as BankAccountData).bankName
          : "",
      accountType:
        method.method_type === "bank_account"
          ? (method.data as BankAccountData).accountType
          : "savings",
    });
  };

  const toggleShowSensitive = (methodId: string) => {
    setShowSensitiveData((prev) => ({
      ...prev,
      [methodId]: !prev[methodId],
    }));
  };

  const renderPaymentMethodCard = (method: DecryptedPaymentMethod) => {
    const isUPI = method.method_type === "upi";
    const data = method.data;
    const showSensitive = showSensitiveData[method.id];

    return (
      <Card key={method.id} className="relative">
        {method.is_default && (
          <Badge className="absolute -top-2 -right-2 bg-green-100 text-green-800">
            <Star className="w-3 h-3 mr-1" />
            Default
          </Badge>
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isUPI ? (
                <Smartphone className="w-5 h-5 text-blue-600" />
              ) : (
                <CreditCard className="w-5 h-5 text-green-600" />
              )}
              <div>
                <p className="text-sm text-gray-500">
                  {isUPI ? "UPI Payment" : "Bank Account"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleShowSensitive(method.id)}
              >
                {showSensitive ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(method)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this payment method? This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(method.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isUPI ? (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700">UPI ID</p>
                <p className="text-sm">
                  {showSensitive
                    ? (data as UPIData).upiId
                    : PaymentMethodsService.formatUPIId(
                        (data as UPIData).upiId
                      )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Account Holder
                </p>
                <p className="text-sm">{(data as UPIData).holderName}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Account Number
                </p>
                <p className="text-sm">
                  {showSensitive
                    ? (data as BankAccountData).accountNumber
                    : PaymentMethodsService.formatAccountNumber(
                        (data as BankAccountData).accountNumber
                      )}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">IFSC Code</p>
                  <p className="text-sm">
                    {(data as BankAccountData).ifscCode}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Bank Name</p>
                <p className="text-sm">{(data as BankAccountData).bankName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Account Holder
                </p>
                <p className="text-sm">
                  {(data as BankAccountData).accountHolderName}
                </p>
              </div>
            </div>
          )}

          {!method.is_default && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => handleSetDefault(method.id)}
            >
              <Check className="w-4 h-4 mr-2" />
              Set as Default
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="methodType">Payment Method Type</Label>
        <Select
          value={formData.methodType}
          onValueChange={(value: "upi" | "bank_account") => {
            setFormData((prev) => ({ ...prev, methodType: value }));
            setFormErrors({});
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment method type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upi">UPI Payment</SelectItem>
            <SelectItem value="bank_account">Bank Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.methodType === "upi" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              placeholder="yourname@paytm"
              value={formData.upiId}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, upiId: e.target.value }))
              }
              className={formErrors.upiId ? "border-red-500" : ""}
            />
            {formErrors.upiId && (
              <p className="text-sm text-red-600">{formErrors.upiId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="holderName">Account Holder Name</Label>
            <Input
              id="holderName"
              placeholder="Full name as per bank account"
              value={formData.holderName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, holderName: e.target.value }))
              }
              className={formErrors.holderName ? "border-red-500" : ""}
            />
            {formErrors.holderName && (
              <p className="text-sm text-red-600">{formErrors.holderName}</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              placeholder="Bank account number"
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accountNumber: e.target.value,
                }))
              }
              className={formErrors.accountNumber ? "border-red-500" : ""}
            />
            {formErrors.accountNumber && (
              <p className="text-sm text-red-600">{formErrors.accountNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              placeholder="e.g., SBIN0001234"
              value={formData.ifscCode}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  ifscCode: e.target.value.toUpperCase(),
                }))
              }
              className={formErrors.ifscCode ? "border-red-500" : ""}
            />
            {formErrors.ifscCode && (
              <p className="text-sm text-red-600">{formErrors.ifscCode}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              placeholder="Full name as per bank account"
              value={formData.accountHolderName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  accountHolderName: e.target.value,
                }))
              }
              className={formErrors.accountHolderName ? "border-red-500" : ""}
            />
            {formErrors.accountHolderName && (
              <p className="text-sm text-red-600">
                {formErrors.accountHolderName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              placeholder="e.g., State Bank of India"
              value={formData.bankName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bankName: e.target.value }))
              }
              className={formErrors.bankName ? "border-red-500" : ""}
            />
            {formErrors.bankName && (
              <p className="text-sm text-red-600">{formErrors.bankName}</p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Please sign in to manage payment methods.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <p className="mt-2 text-gray-600">
            Manage your payment methods to receive payments from sold items
            securely.
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Payment Methods</h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>
                  Add a new payment method to receive payments from your sales.
                </DialogDescription>
              </DialogHeader>
              {renderForm()}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Method"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : paymentMethods.length === 0 ? (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="font-medium text-amber-800">
                    No Payment Methods Added
                  </h3>
                  <p className="text-sm text-amber-700">
                    You need to add at least one payment method before you can
                    list items for sale.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map(renderPaymentMethodCard)}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog
          open={!!editingMethod}
          onOpenChange={() => setEditingMethod(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Payment Method</DialogTitle>
              <DialogDescription>
                Update your payment method details.
              </DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMethod(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Method"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PaymentMethods;
