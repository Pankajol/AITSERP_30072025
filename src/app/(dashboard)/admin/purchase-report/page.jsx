"use client";
import React, { useState, useEffect } from "react";
import {
  Box, Paper, Grid, Typography, TextField, MenuItem, Button,
  Card, CardContent, CircularProgress, Alert
} from "@mui/material";
import dayjs from "dayjs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import * as XLSX from "xlsx";
import SupplierLedger from "@/components/reports/SupplierLedger";

const formatCurrency = (value) => `₹${value?.toFixed(2) || 0}`;

export default function PurchaseReportPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [startDate, setStartDate] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [error, setError] = useState("");

  // Fetch suppliers for dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setSuppliers(data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Handle refresh from SupplierLedger (gets updated data)
  const handleLedgerRefresh = (newData) => {
    setLedgerData(newData);
  };

  // Compute summary and chart data from ledger transactions
  const transactions = ledgerData?.transactions || [];
  const totalPurchase = transactions.reduce((sum, t) => sum + (t.grandTotal || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
  const totalPending = transactions.reduce((sum, t) => sum + (t.remainingAmount || 0), 0);
  const invoiceCount = transactions.length;

  // Group by month for chart
  const chartData = transactions.reduce((acc, tx) => {
    const month = dayjs(tx.date).format("YYYY-MM");
    const existing = acc.find(item => item.month === month);
    if (existing) {
      existing.amount += tx.grandTotal;
    } else {
      acc.push({ month, amount: tx.grandTotal });
    }
    return acc;
  }, []).sort((a, b) => a.month.localeCompare(b.month));

  // Export to Excel
  const exportToExcel = () => {
    const exportRows = transactions.map(tx => ({
      "Invoice No": tx.invoiceNo,
      "Date": dayjs(tx.date).format("DD/MM/YYYY"),
      "Grand Total": tx.grandTotal,
      "Paid": tx.paidAmount,
      "Pending": tx.remainingAmount,
      "Running Balance": tx.runningBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Ledger");
    XLSX.writeFile(wb, `purchase_report_${dayjs().format("YYYYMMDD")}.xlsx`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Purchase Report</Typography>

      {/* Filters: Supplier + Date Range */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Supplier"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              disabled={loadingSuppliers}
            >
              <MenuItem value="">-- Select Supplier --</MenuItem>
              {suppliers.map(sup => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              label="From Date"
              fullWidth
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              label="To Date"
              fullWidth
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button variant="contained" fullWidth onClick={() => {/* refresh is automatic via props change */}}>
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {selectedSupplier ? (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Purchase</Typography>
                  <Typography variant="h5">{formatCurrency(totalPurchase)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Paid</Typography>
                  <Typography variant="h5" color="green">{formatCurrency(totalPaid)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Total Pending</Typography>
                  <Typography variant="h5" color="error">{formatCurrency(totalPending)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>Invoice Count</Typography>
                  <Typography variant="h5">{invoiceCount}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Chart */}
          {chartData.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Purchase Trend (Monthly)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="amount" fill="#8884d8" name="Purchase Amount" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}

          {/* Export Button */}
          <Box display="flex" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={exportToExcel} disabled={transactions.length === 0}>
              Export to Excel
            </Button>
          </Box>

          {/* Supplier Ledger Component (receives date range) */}
          <SupplierLedger
            supplierId={selectedSupplier}
            startDate={startDate}
            endDate={endDate}
            onRefresh={handleLedgerRefresh}
          />
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography>Please select a supplier to view the report</Typography>
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </Box>
  );
}