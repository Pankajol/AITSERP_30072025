// components/reports/SupplierLedger.jsx
import { useState, useEffect } from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, Button, Paper, Typography, Box, Pagination, CircularProgress
} from "@mui/material";

export default function SupplierLedger({ supplierId, data: externalData, onRefresh }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState(externalData || null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchLedger = async () => {
    if (!supplierId) return;
    setLoading(true);
    const params = new URLSearchParams({
      supplierId,
      startDate,
      endDate,
      page: page.toString(),
      limit: limit.toString(),
    });
    try {
      // Get token from localStorage (same as in parent page)
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/purchaseInvoice/reports/supplier-ledger?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch ledger");
      setData(json);
      if (onRefresh) onRefresh(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // If externalData changes (e.g., from parent), use it
  useEffect(() => {
    if (externalData) {
      setData(externalData);
    }
  }, [externalData]);

  useEffect(() => {
    if (!externalData) {
      fetchLedger();
    }
  }, [supplierId, page, startDate, endDate, externalData]);

  if (!supplierId) return <Typography>Select a supplier to view ledger</Typography>;
  if (loading && !data) return <CircularProgress />;
  if (!data) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5">Supplier Ledger: {data.supplier.name}</Typography>
      <Box display="flex" gap={2} my={2} flexWrap="wrap">
        <TextField
          label="From Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={fetchLedger}>Refresh</Button>
      </Box>
      <Box display="flex" justifyContent="space-between" mb={2} flexWrap="wrap">
        <Typography>Opening Balance: <strong>₹{data.openingBalance.toFixed(2)}</strong></Typography>
        <Typography>Closing Balance: <strong>₹{data.closingBalance.toFixed(2)}</strong></Typography>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Invoice No</TableCell>
            <TableCell>Grand Total</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Remaining</TableCell>
            <TableCell>Running Balance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.transactions.map((tx) => (
            <TableRow key={tx.invoiceNo}>
              <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
              <TableCell>{tx.invoiceNo}</TableCell>
              <TableCell>₹{tx.grandTotal}</TableCell>
              <TableCell>₹{tx.paidAmount}</TableCell>
              <TableCell>₹{tx.remainingAmount}</TableCell>
              <TableCell>₹{tx.runningBalance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        count={data.pagination.pages}
        page={page}
        onChange={(_, val) => setPage(val)}
        sx={{ mt: 2 }}
      />
    </Paper>
  );
}