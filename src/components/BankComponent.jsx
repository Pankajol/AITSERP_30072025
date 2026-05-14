
"use client";
import React, { useState, useEffect } from "react";
import Select from "react-select";

// const BankComponent = ({ bankName, onChange }) => {
//   const [banks, setBanks] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchBanks = async () => {
//       try {
//         const response = await fetch("/api/bank-head");
//         const json = await response.json();
//         if (json.success) {
//           // Filter to include only banks where isActualBank is true
//           const options = json.data
//             .filter((bank) => bank.isActualBank === true)
//             .map((bank) => ({
//               value: bank._id,
//               label: bank.accountName || "Unknown Bank",
//             }));
//           setBanks(options);
//         } else {
//           console.error("Failed to fetch banks:", json.message);
//         }
//       } catch (error) {
//         console.error("Error fetching banks:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchBanks();
//   }, []);

//   const selectedOption = banks.find((option) => option.value === bankName) || null;
//   // const options = json.data
//   // .filter((bank) => bank.isActualBank === true)
//   // .map((bank) => ({
//   //   value: bank._id,
//   //   label: bank.accountName || "Unknown Bank",
//   //   accountCode: bank.accountCode, // Include account code here
//   // }));

//   const handleChange = (selectedOption) => {
//     onChange({
//       target: {
//         name: "bankName",
//         value: selectedOption ? selectedOption.value : "",
//       },
//     });
//   };

//   // const handleChange = (selectedOption) => {
//   //   onChange(
//   //     selectedOption
//   //       ? {
//   //           bankName: selectedOption.label,
//   //           accountCode: selectedOption.accountCode,
//   //         }
//   //       : { bankName: "", accountCode: "" }
//   //   );
//   // };

//   if (loading) return <div>Loading banks...</div>;

//   return (
//     <div>
//       <label className="block text-sm font-medium text-gray-700">
//         Bank Name
//       </label>
//       <Select
//         options={banks}
//         value={selectedOption}
//         onChange={handleChange}
//         isClearable
//         placeholder="Select a bank..."
//       />
//     </div>
//   );
// };

// export default BankComponent;

const BankComponent = ({ bankName, onChange }) => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = 
await fetch('/api/bank-head', {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

        const json = await response.json();
        if (json.success) {
          const options = json.data
            .filter((bank) => bank.isActualBank === true)
            .map((bank) => ({
              value: bank._id,
              label: bank.accountName || "Unknown Bank",
              accountCode: bank.accountCode,
            }));
          setBanks(options);
        } else {
          console.error("Failed to fetch banks:", json.message);
        }
      } catch (error) {
        console.error("Error fetching banks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanks();
  }, []);

  // Find the selected option from the bank options
  const selectedOption = banks.find((option) => option.value === bankName) || null;

  // Handle change in selected bank
  // const handleChange = (selectedOption) => {
  //   onChange({
  //     target: {
  //       name: "bankName",
  //       value: selectedOption ? selectedOption.value : "", // Send back the bank's value (ID)
  //     },
  //     accountCode: selectedOption ? selectedOption.accountCode : "",
  //   });
  // };
  const handleChange = (selectedOption) => {
    if (onChange && typeof onChange === "function") {
      onChange({
        target: {
          name: "bankName",
          value: selectedOption ? selectedOption.value : "",
        },
        // Pass accountCode as a separate field
        accountCode: selectedOption ? selectedOption.accountCode : "",
      });
    }
  };
  
  

  if (loading) return <div>Loading banks...</div>;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Bank Name</label>
      <Select
        options={banks}
        value={selectedOption}
        onChange={handleChange} // Pass the selected bank value back to the parent
        isClearable
        placeholder="Select a bank..."
      />
    </div>
  );
};
export default BankComponent;