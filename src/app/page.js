"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiCheckCircle } from "react-icons/hi";

export default function LandingPage() {
  const features = [
    "Procure to Pay – Streamline your procurement and payment processes.",
    "Inventory – Real-time inventory tracking and alerts.",
    "Order to Cash – Manage your sales cycle from order to cash.",
    "Production – Optimize your production processes for better efficiency.",
    "CRM – Enhance customer relationships and support.",
    "Reports – Insightful reports for better decision making.",
  ];

  // Framer motion variants
  const listVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen flex flex-col justify-between items-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800 px-4 sm:px-6 py-6">
      {/* Header */}
      <header className="flex flex-col items-center w-full">
        {/* Logos */}
        <div className="relative w-full flex justify-center items-center mb-6">
          {/* Center logo */}
          <img
            src="/aits_pig.png"
            alt="ERP Dashboard"
            className="h-20 sm:h-28 md:h-36 w-auto"
          />

          {/* Right corner logo */}
          <img
            src="/aits_logo.png"
            alt="AITS ERP Logo"
            className="absolute right-2 top-0 h-20 sm:h-28 md:h-36 w-auto"
          />
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-3 text-neutral-700"
        >
          Welcome to <span className="text-amber-500">AITS ERP</span>
        </motion.h1>
        <p className="text-center text-sm sm:text-base md:text-lg max-w-2xl">
          Manage your sales, purchases, inventory, and business operations from
          one centralized, modern ERP platform.
        </p>
      </header>

      {/* Actions & Features */}
      <div className="flex flex-col items-center gap-6 mt-6">
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/signin"
            className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition text-center"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition text-center"
          >
            Company Registration
          </Link>
        </div>

        {/* Features */}
        <h2 className="text-xl sm:text-2xl font-bold text-neutral-700">
          Key Features
        </h2>
        <motion.ul
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl"
          variants={listVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {features.map((text, idx) => (
            <motion.li
              key={idx}
              className="flex items-start gap-2 text-sm sm:text-base"
              variants={itemVariants}
            >
              <HiCheckCircle className="text-amber-500 mt-0.5 shrink-0" />
              <span>{text}</span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs sm:text-sm text-gray-600 mt-6">
        &copy; 2025 AITS ERP. All rights reserved.
      </footer>
    </main>
  );
}


// "use client";
// import Link from "next/link";
// import { motion } from "framer-motion";
// import { HiCheckCircle } from "react-icons/hi";

// export default function LandingPage() {
//   const features = [
//     "Procure to Pay – Streamline your procurement and payment processes.",
//     "Inventory – Real‑time inventory tracking and alerts.",
//     "Order to Cash – Manage your sales cycle from order to cash.",
//     "Production – Optimize your production processes for better efficiency.",
//     "CRM – Enhance customer relationships and support.",
//     "Reports – Insightful reports for better decision making.",
//   ];

//   /* ✨ Framer‑motion variants for staggered reveal */
//   const listVariants = {
//     hidden: { opacity: 0 },
//     show: {
//       opacity: 1,
//       transition: { staggerChildren: 0.15 },
//     },
//   };

//   const itemVariants = {
//     hidden: { opacity: 0, y: 20 },
//     show: { opacity: 1, y: 0 },
//   };

//   return (
//     <main className="h-screen overflow-hidden flex flex-col justify-between items-center bg-gradient-to-br from-gray-500 via-white to-amber-400 text-gray-800 p-6">
//       {/* Header */}
//       <header className="flex flex-col items-center w-full">
//         {/* Logos — one centered, one fixed to the right edge */}
//         <div className="relative w-full h-36 mb-4">
//           {/* Center logo */}
//           <img
//             src="/aits_pig.png"
//             alt="ERP Dashboard"
//             className="absolute left-1/2 -translate-x-1/2 h-full w-auto"
//           />
          
//           {/* Right‑corner logo (flush with viewport edge) */}
//           <img
//             src="/aits_logo.png"
//             alt="AITS ERP Logo"
//             className="absolute right-0 h-72 w-auto p-6"
//           />
//         </div>

//         <motion.h1
//           initial={{ opacity: 0, y: -30 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="text-4xl md:text-5xl font-bold text-center mb-3 text-neutral-700"
//         >
//           Welcome to <span className="text-amber-500">AITS ERP</span>
//         </motion.h1>
//         <p className="text-center text-base md:text-lg max-w-2xl">
//           Manage your sales, purchases, inventory, and business operations from one centralized, modern ERP platform.
//         </p>
//       </header>

//       {/* Actions & Features */}
//       <div className="flex flex-col items-center gap-6">
//         {/* Buttons */}
//         <div className="flex gap-4">
//           <Link
//             href="/signin"
//             className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
//           >
//             Sign In
//           </Link>
//           <Link
//             href="/signup"
//             className="px-6 py-3 border border-amber-500 text-amber-500 rounded-xl hover:bg-indigo-50 transition"
//           >
//             Company Registration
//           </Link>
//         </div>

//         {/* Animated checklist */}
//         <h2 className="text-2xl font-bold text-neutral-700">Key Features</h2>
//         <motion.ul
//           className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-w-4xl"
//           variants={listVariants}
//           initial="hidden"
//           whileInView="show"
//           viewport={{ once: true }}
//         >
//           {features.map((text, idx) => (
//             <motion.li
//               key={idx}
//               className="flex items-start gap-2 text-sm md:text-base"
//               variants={itemVariants}
//             >
//               <HiCheckCircle className="text-amber-500 mt-0.5" />
//               <span>{text}</span>
//             </motion.li>
//           ))}
//         </motion.ul>
//       </div>

//       {/* Footer */}
//       <footer className="text-center text-xs md:text-sm text-gray-600">
//         &copy; 2025 AITS ERP. All rights reserved.
//       </footer>
//     </main>
//   );
// }

