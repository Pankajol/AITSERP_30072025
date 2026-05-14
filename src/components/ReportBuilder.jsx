// components/ReportBuilder.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Box, Paper, Typography, Button, TextField, Select, MenuItem,
  Grid, Chip, IconButton, Divider, Alert, CircularProgress,
  FormControl, InputLabel, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, ListItemText, OutlinedInput
} from "@mui/material";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";

// Available fields from PurchaseInvoice schema + lookups
const AVAILABLE_FIELDS = [
  { id: "documentNumberPurchaseInvoice", label: "Invoice Number", type: "string" },
  { id: "documentDate", label: "Invoice Date", type: "date" },
  { id: "supplierName", label: "Supplier Name", type: "string" },
  { id: "supplierCode", label: "Supplier Code", type: "string" },
  { id: "grandTotal", label: "Grand Total", type: "number" },
  { id: "paidAmount", label: "Paid Amount", type: "number" },
  { id: "remainingAmount", label: "Remaining Amount", type: "number" },
  { id: "paymentStatus", label: "Payment Status", type: "string" },
  { id: "stockStatus", label: "Stock Status", type: "string" },
  { id: "status", label: "Status", type: "string" },
  { id: "remarks", label: "Remarks", type: "string" },
  { id: "createdAt", label: "Created At", type: "date" },
];

const OPERATORS = {
  string: ["eq", "ne", "contains", "startsWith", "endsWith"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte"],
  date: ["eq", "gt", "gte", "lt", "lte"],
};

export default function ReportBuilder() {
  const [selectedColumns, setSelectedColumns] = useState([
    "documentNumberPurchaseInvoice",
    "documentDate",
    "supplierName",
    "grandTotal",
    "paymentStatus"
  ]);
  const [filters, setFilters] = useState([]);
  const [groupBy, setGroupBy] = useState([]);
  const [aggregations, setAggregations] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortModel, setSortModel] = useState([]);

  // Load saved config from localStorage (optional)
  useEffect(() => {
    const saved = localStorage.getItem("reportBuilderConfig");
    if (saved) {
      const config = JSON.parse(saved);
      setSelectedColumns(config.selectedColumns || selectedColumns);
      setFilters(config.filters || []);
      setGroupBy(config.groupBy || []);
      setAggregations(config.aggregations || []);
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem("reportBuilderConfig", JSON.stringify({
      selectedColumns, filters, groupBy, aggregations
    }));
  };

  // Drag & drop handlers
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === "available" && destination.droppableId === "selected") {
      const fieldId = source.droppableId === "available" 
        ? AVAILABLE_FIELDS[source.index].id 
        : selectedColumns[source.index];
      if (!selectedColumns.includes(fieldId)) {
        const newSelected = [...selectedColumns];
        newSelected.splice(destination.index, 0, fieldId);
        setSelectedColumns(newSelected);
      }
    } else if (source.droppableId === "selected" && destination.droppableId === "selected") {
      const reordered = [...selectedColumns];
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);
      setSelectedColumns(reordered);
    } else if (source.droppableId === "selected" && destination.droppableId === "available") {
      const newSelected = selectedColumns.filter((_, idx) => idx !== source.index);
      setSelectedColumns(newSelected);
    }
  };

  // Filter management
  const addFilter = () => {
    setFilters([...filters, { field: "grandTotal", operator: "gte", value: "" }]);
  };
  const updateFilter = (idx, key, val) => {
    const updated = [...filters];
    updated[idx][key] = val;
    setFilters(updated);
  };
  const removeFilter = (idx) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  // Aggregations
  const addAggregation = () => {
    setAggregations([...aggregations, { field: "grandTotal", operator: "sum", alias: "total" }]);
  };
  const updateAggregation = (idx, key, val) => {
    const updated = [...aggregations];
    updated[idx][key] = val;
    setAggregations(updated);
  };
  const removeAggregation = (idx) => {
    setAggregations(aggregations.filter((_, i) => i !== idx));
  };

  // Run report
  const runReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const sort = sortModel.reduce((acc, s) => {
        acc[s.field] = s.sort === "asc" ? 1 : -1;
        return acc;
      }, {});
      const body = {
        fields: selectedColumns,
        filters: filters.filter(f => f.value !== ""),
        groupBy: groupBy.length ? groupBy : undefined,
        aggregations: aggregations.length ? aggregations : undefined,
        sort,
        skip: 0,
        limit: 500,
      };
      const res = await fetch("/api/reports/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate report");
      setReportData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // DataGrid columns from selectedColumns
  const gridColumns = selectedColumns.map((fieldId) => {
    const fieldMeta = AVAILABLE_FIELDS.find(f => f.id === fieldId) || { label: fieldId, type: "string" };
    return {
      field: fieldId,
      headerName: fieldMeta.label,
      width: 150,
      type: fieldMeta.type === "number" ? "number" : "string",
    };
  });

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>Report Builder</Typography>
      
      <Grid container spacing={2}>
        {/* Left: Available Fields */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6">Available Fields</Typography>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="available">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {AVAILABLE_FIELDS.map((field, idx) => (
                      <Draggable key={field.id} draggableId={field.id} index={idx}>
                        {(provided) => (
                          <Paper
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ p: 1, m: 1, display: "flex", alignItems: "center", cursor: "grab" }}
                          >
                            <DragIndicatorIcon fontSize="small" sx={{ mr: 1 }} />
                            <Typography>{field.label}</Typography>
                          </Paper>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </Paper>
        </Grid>

        {/* Right: Selected Columns */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Selected Columns (drag to reorder or drop to remove)</Typography>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="selected" direction="horizontal">
                {(provided) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, minHeight: 60, p: 1 }}
                  >
                    {selectedColumns.map((fieldId, idx) => {
                      const field = AVAILABLE_FIELDS.find(f => f.id === fieldId);
                      return (
                        <Draggable key={fieldId} draggableId={fieldId} index={idx}>
                          {(provided) => (
                            <Chip
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              label={field?.label || fieldId}
                              onDelete={() => {
                                setSelectedColumns(selectedColumns.filter((_, i) => i !== idx));
                              }}
                              sx={{ cursor: "grab" }}
                            />
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>
          </Paper>
        </Grid>

        {/* Filters */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Filters</Typography>
            {filters.map((filter, idx) => {
              const fieldMeta = AVAILABLE_FIELDS.find(f => f.id === filter.field);
              const ops = OPERATORS[fieldMeta?.type] || OPERATORS.string;
              return (
                <Box key={idx} sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Field</InputLabel>
                    <Select
                      value={filter.field}
                      onChange={(e) => updateFilter(idx, "field", e.target.value)}
                      label="Field"
                    >
                      {AVAILABLE_FIELDS.map(f => (
                        <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Operator</InputLabel>
                    <Select
                      value={filter.operator}
                      onChange={(e) => updateFilter(idx, "operator", e.target.value)}
                      label="Operator"
                    >
                      {ops.map(op => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    size="small"
                    label="Value"
                    value={filter.value}
                    onChange={(e) => updateFilter(idx, "value", e.target.value)}
                  />
                  <IconButton onClick={() => removeFilter(idx)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              );
            })}
            <Button startIcon={<AddIcon />} onClick={addFilter} size="small">Add Filter</Button>
          </Paper>
        </Grid>

        {/* Group By & Aggregations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Group By</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Group By Fields</InputLabel>
              <Select
                multiple
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                input={<OutlinedInput label="Group By Fields" />}
                renderValue={(selected) => selected.map(s => AVAILABLE_FIELDS.find(f => f.id === s)?.label).join(", ")}
              >
                {AVAILABLE_FIELDS.map(f => (
                  <MenuItem key={f.id} value={f.id}>
                    <Checkbox checked={groupBy.indexOf(f.id) > -1} />
                    <ListItemText primary={f.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Aggregations (when Group By used)</Typography>
            {aggregations.map((agg, idx) => (
              <Box key={idx} sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Field</InputLabel>
                  <Select
                    value={agg.field}
                    onChange={(e) => updateAggregation(idx, "field", e.target.value)}
                    label="Field"
                  >
                    {AVAILABLE_FIELDS.filter(f => f.type === "number").map(f => (
                      <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={agg.operator}
                    onChange={(e) => updateAggregation(idx, "operator", e.target.value)}
                    label="Operator"
                  >
                    <MenuItem value="sum">Sum</MenuItem>
                    <MenuItem value="count">Count</MenuItem>
                    <MenuItem value="avg">Avg</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Alias"
                  value={agg.alias}
                  onChange={(e) => updateAggregation(idx, "alias", e.target.value)}
                />
                <IconButton onClick={() => removeAggregation(idx)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button startIcon={<AddIcon />} onClick={addAggregation} size="small">Add Aggregation</Button>
          </Paper>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={runReport} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Run Report"}
            </Button>
            <Button variant="outlined" onClick={saveConfig}>Save Configuration</Button>
          </Box>
        </Grid>

        {/* Error */}
        {error && <Grid item xs={12}><Alert severity="error">{error}</Alert></Grid>}

        {/* Results Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 500 }}>
            <Typography variant="h6">Report Results</Typography>
            <DataGrid
              rows={reportData.map((row, idx) => ({ ...row, id: idx }))}
              columns={gridColumns}
              sortingMode="server"
              onSortModelChange={(model) => setSortModel(model)}
              loading={loading}
              disableSelectionOnClick
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}