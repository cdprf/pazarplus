import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui";
import { Button, Label, Textarea } from "../ui";
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
    <>
      {/* Trigger element */}
      <div onClick={() => setOpen(true)}>{children}</div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              Siparişi İptal Et
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{orderNumber}</span> numaralı
              siparişi iptal etmek istediğinizden emin misiniz? Bu işlem geri
              alınamaz.
            </DialogDescription>
          </DialogHeader>

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

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "İptal Ediliyor..." : "Siparişi İptal Et"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CancelOrderDialog;
