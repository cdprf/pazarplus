import React, { useState } from "react";
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
} from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { X } from "lucide-react";

const CancelOrderDialog = ({
  children,
  orderId,
  orderNumber,
  onConfirm,
  loading = false,
}) => {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm(orderId, reason);
    setOpen(false);
    setReason(""); // Reset reason
  };

  const handleCancel = () => {
    setOpen(false);
    setReason(""); // Reset reason
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-500" />
            Siparişi İptal Et
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{orderNumber}</span> numaralı siparişi
            iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="cancel-reason">İptal Sebebi (İsteğe bağlı)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="İptal sebebini yazın..."
              className="mt-2"
              rows={3}
            />
            <p className="text-sm text-gray-500 mt-1">
              Bu sebep müşteriye bildirilecek ve sipariş geçmişinde
              saklanacaktır.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            Vazgeç
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "İptal Ediliyor..." : "Siparişi İptal Et"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelOrderDialog;
