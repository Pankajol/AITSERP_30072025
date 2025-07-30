"use client";

import React, { useState, useEffect } from "react";
import api from "@/utils/api"; // ← our centralized axios

const CustomerAddressSelector = ({
  customer,
  selectedBillingAddress,
  selectedShippingAddress,
  onBillingAddressSelect,
  onShippingAddressSelect,
}) => {
  const [billingAddresses, setBillingAddresses] = useState([]);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [showShippingDropdown, setShowShippingDropdown] = useState(false);

  useEffect(() => {
    if (customer?._id) {
      fetchCustomerAddresses(customer._id);
    } else {
      setBillingAddresses([]);
      setShippingAddresses([]);
    }
  }, [customer]);

  const fetchCustomerAddresses = async (customerId) => {
    try {
      console.log("Fetching addresses for customer:", customerId);
      const res = await api.get(`/customers/${customerId}`); 
      // api.get("/customers/:id") returns { success, data }
      const customerData = res.data.data;

      console.log("Customer data received:", {
        billing: customerData.billingAddresses?.length,
        shipping: customerData.shippingAddresses?.length,
      });

      setBillingAddresses(customerData.billingAddresses || []);
      setShippingAddresses(customerData.shippingAddresses || []);

      // Auto-select first if none chosen
      if (
        customerData.billingAddresses?.length > 0 &&
        !selectedBillingAddress
      ) {
        onBillingAddressSelect(customerData.billingAddresses[0]);
      }
      if (
        customerData.shippingAddresses?.length > 0 &&
        !selectedShippingAddress
      ) {
        onShippingAddressSelect(customerData.shippingAddresses[0]);
      }
    } catch (err) {
      // 401/403 will be auto-redirected by api interceptor
      console.error("Error fetching customer addresses:", err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return "";
    return [
      addr.address1,
      addr.address2,
      addr.city,
      addr.state,
      addr.zip,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
  };

  if (!customer?._id) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Billing */}
      <div>
        <label className="block mb-2 font-medium">Billing Address</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBillingDropdown((v) => !v)}
            className="w-full p-2 border rounded bg-white text-left flex justify-between items-center"
          >
            <span className="truncate">
              {selectedBillingAddress
                ? formatAddress(selectedBillingAddress)
                : "Select billing address"}
            </span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showBillingDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
              {billingAddresses.length > 0 ? (
                billingAddresses.map((addr, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onBillingAddressSelect(addr);
                      setShowBillingDropdown(false);
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="text-sm">{formatAddress(addr)}</div>
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-500">
                  No billing addresses found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Shipping */}
      <div>
        <label className="block mb-2 font-medium">Shipping Address</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowShippingDropdown((v) => !v)}
            className="w-full p-2 border rounded bg-white text-left flex justify-between items-center"
          >
            <span className="truncate">
              {selectedShippingAddress
                ? formatAddress(selectedShippingAddress)
                : "Select shipping address"}
            </span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showShippingDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
              {shippingAddresses.length > 0 ? (
                shippingAddresses.map((addr, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      onShippingAddressSelect(addr);
                      setShowShippingDropdown(false);
                    }}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="text-sm">{formatAddress(addr)}</div>
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-500">
                  No shipping addresses found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerAddressSelector;

