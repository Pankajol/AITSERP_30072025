import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Alert, CircularProgress
} from "@mui/material";

export default function PaymentModal({ open, onClose, invoiceId, onPaymentSuccess }) {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/purchaseInvoice/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceId,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          referenceNo,
          remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPaymentSuccess(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Record Payment</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus
          margin="dense"
          label="Amount"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <TextField
          margin="dense"
          label="Payment Date"
          type="date"
          fullWidth
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          margin="dense"
          label="Payment Method"
          select
          fullWidth
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
          <MenuItem value="Cheque">Cheque</MenuItem>
          <MenuItem value="UPI">UPI</MenuItem>
        </TextField>
        <TextField
          margin="dense"
          label="Reference No (Cheque/Transaction ID)"
          fullWidth
          value={referenceNo}
          onChange={(e) => setReferenceNo(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Remarks"
          fullWidth
          multiline
          rows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Record Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}