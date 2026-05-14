// 📁 src/lib/autoTransaction.js
// ✅ Auto create accounting entries when modules fire events
// Import this helper in: Sales Invoice, Purchase Invoice, Payment Entry, Payroll, GRN

import Transaction from "@/models/accounts/Transaction";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";
import Supplier from "@/models/SupplierModels";
import Customer from "@/models/CustomerModel";
import dbConnect from "@/lib/db";

// ─── Get running balance for an account ─────────────────────
async function getBalance(companyId, accountId) {
  const last = await LedgerEntry.findOne(
    { companyId, accountId },
    { balance: 1 },
    { sort: { date: -1, createdAt: -1 } }
  );
  return last?.balance || 0;
}

// ─── Post ledger entries after a transaction ─────────────────
async function postLedger(transaction) {
  const entries = [];
  for (const line of transaction.lines) {
    const prev    = await getBalance(transaction.companyId, line.accountId);
    const account = await AccountHead.findById(line.accountId);
    const isDebitNormal = account?.balanceType === "Debit";
    const newBal = isDebitNormal
      ? prev + (line.type === "Debit" ? line.amount : -line.amount)
      : prev + (line.type === "Credit" ? line.amount : -line.amount);

    entries.push({
      companyId:         transaction.companyId,
      accountId:         line.accountId,
      accountName:       line.accountName || account?.name,
      transactionId:     transaction._id,
      transactionNumber: transaction.transactionNumber,
      transactionType:   transaction.type,
      date:              transaction.date,
      debit:             line.type === "Debit"  ? line.amount : 0,
      credit:            line.type === "Credit" ? line.amount : 0,
      balance:           newBal,
      narration:         transaction.narration,
      partyName:         transaction.partyName,
      partyType:         transaction.partyType,
      fiscalYear:        transaction.fiscalYear,
    });
  }
  await LedgerEntry.insertMany(entries);
}

// ─── Auto number generator ────────────────────────────────────
async function genNumber(companyId, type) {
  const map = { "Sales Invoice":"SI","Purchase Invoice":"PI","Payment":"PAY","Receipt":"REC","Journal Entry":"JE","Contra":"CTR" };
  const prefix = map[type] || "TXN";
  const count  = await Transaction.countDocuments({ companyId, type }) + 1;
  return `${prefix}-${new Date().getFullYear()}-${String(count).padStart(4,"0")}`;
}

// ─── Helper to find system account by name ───────────────────
async function findAccount(companyId, name) {
  const acc = await AccountHead.findOne({ companyId, name, isActive: true });
  if (!acc) throw new Error(`Account not found: "${name}". Please create it in Chart of Accounts.`);
  return acc;
}

// ─── Helper to find Accounts Payable control account ─────────
async function getAccountsPayable(companyId) {
  let apAccount = await AccountHead.findOne({
    companyId,
    name: { $regex: "^Accounts Payable$", $options: "i" },
    type: "Liability",
    isActive: true
  });
  
  if (!apAccount) {
    apAccount = await AccountHead.create({
      companyId,
      name: "Accounts Payable",
      type: "Liability",
      group: "Current Liability",
      balanceType: "Credit",
      isSystemAccount: true
    });
  }
  return apAccount;
}

// ════════════════════════════════════════════════════════════
// 1. SALES INVOICE
// Receivable Dr ↑ (Asset)   →  Customer owes us money
// Sales Cr      ↑ (Income)  →  We earned revenue
// ════════════════════════════════════════════════════════════
export async function autoSalesInvoice({
  companyId,
  amount,
  partyId,
  partyName,
  referenceId,
  referenceNumber,
  narration,
  date,
  createdBy,
}) {
  if (!companyId || !amount || amount <= 0 || !partyId || !partyName || !referenceId || !createdBy) {
    throw new Error("Missing required fields for autoSalesInvoice");
  }

  try {
    const [receivable, sales] = await Promise.all([
      findAccount(companyId, "Accounts Receivable"),
      findAccount(companyId, "Sales Revenue"),
    ]);

    const txnNumber = await genNumber(companyId, "Sales Invoice");

    const txn = await Transaction.create({
      companyId,
      transactionNumber: txnNumber,
      type: "Sales Invoice",
      date: date || new Date(),
      totalAmount: amount,
      lines: [
        { accountId: receivable._id, accountName: receivable.name, type: "Debit", amount },
        { accountId: sales._id, accountName: sales.name, type: "Credit", amount },
      ],
      partyType: "Customer",
      partyId,
      partyName,
      referenceType: "SalesInvoice",
      referenceId,
      referenceNumber,
      narration: narration || `Sales Invoice ${referenceNumber}`,
      status: "Posted",
      createdBy,
    });

    await postLedger(txn);
    return txn;
  } catch (error) {
    console.error("autoSalesInvoice failed:", error);
    throw new Error(`Failed to create auto sales invoice: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 2. PURCHASE INVOICE (CORRECTED - Uses Accounts Payable control account)
// Purchase Dr  ↑ (Expense)   → We bought goods/services
// Accounts Payable Cr ↑ (Liability) → We owe supplier (control account)
// ════════════════════════════════════════════════════════════
export async function autoPurchaseInvoice({
  companyId,
  amount,
  partyId,
  partyName,
  referenceId,
  referenceNumber,
  narration,
  date,
  createdBy
}) {
  if (!companyId || !amount || amount <= 0 || !partyId || !partyName || !referenceId || !createdBy) {
    throw new Error("Missing required fields for autoPurchaseInvoice");
  }

  try {
    // ✅ Purchase expense account
    const purchase = await findAccount(companyId, "Purchase");
    
    // ✅ Accounts Payable control account (NOT supplier's individual account)
    const accountsPayable = await getAccountsPayable(companyId);

    console.log(`✅ Creating purchase entry: ${amount} for ${partyName}`);
    console.log(`   Purchase Account: ${purchase.name} (${purchase._id})`);
    console.log(`   Payable Account: ${accountsPayable.name} (${accountsPayable._id})`);

    const txnNumber = await genNumber(companyId, "Purchase Invoice");

    const txn = await Transaction.create({
      companyId,
      transactionNumber: txnNumber,
      type: "Purchase Invoice",
      date: date || new Date(),
      totalAmount: amount,
      lines: [
        {
          accountId: purchase._id,
          accountName: purchase.name,
          type: "Debit",
          amount
        },
        {
          accountId: accountsPayable._id,
          accountName: accountsPayable.name,
          type: "Credit",
          amount
        },
      ],
      partyType: "Supplier",
      partyId,
      partyName,
      referenceType: "PurchaseInvoice",
      referenceId,
      referenceNumber,
      narration: narration || `Purchase Invoice ${referenceNumber}`,
      status: "Posted",
      createdBy,
    });

    await postLedger(txn);
    console.log(`✅ Purchase invoice accounting completed: ${txn.transactionNumber}`);
    return txn;
  } catch (error) {
    console.error("autoPurchaseInvoice failed:", error);
    throw new Error(`Failed to create auto purchase invoice: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 3. PAYMENT ENTRY (Receiving from Customer)
// Bank Dr          ↑ (Asset)  → Money came into bank
// Receivable Cr    ↓ (Asset)  → Customer's balance reduced
// ════════════════════════════════════════════════════════════
export async function autoPaymentReceipt({ 
  companyId, 
  amount, 
  partyId, 
  partyName, 
  bankAccountName = "Bank Account", 
  referenceId, 
  referenceNumber, 
  narration, 
  date, 
  createdBy, 
  paymentMode 
}) {
  if (!companyId || !amount || amount <= 0 || !partyId) {
    throw new Error("Missing required fields for autoPaymentReceipt");
  }

  // ─────────────────────────────────────────────────────────────
  // Map incoming payment mode to Transaction model's enum values
  // Adjust this map to match your Transaction.paymentMode enum
  // ─────────────────────────────────────────────────────────────
  const paymentModeMap = {
    "cash": "Cash",
    "bank": "Bank Transfer",
    "upi": "UPI",
    "card": "Card",
    "netbanking": "Net Banking",
    "wallet": "Wallet",
    "cheque": "Cheque"
  };
  const mappedPaymentMode = paymentModeMap[paymentMode] || "Bank Transfer";

  const [bank, receivable] = await Promise.all([
    findAccount(companyId, bankAccountName),
    findAccount(companyId, "Accounts Receivable"),
  ]);

  const txnNumber = await genNumber(companyId, "Receipt");
  const txn = await Transaction.create({
    companyId, 
    transactionNumber: txnNumber,
    type: "Receipt",
    date: date || new Date(),
    totalAmount: amount,
    lines: [
      { accountId: bank._id,       accountName: bank.name,       type: "Debit",  amount },
      { accountId: receivable._id, accountName: receivable.name, type: "Credit", amount },
    ],
    partyType: "Customer", 
    partyId, 
    partyName: partyName || "Customer",
    paymentMode: mappedPaymentMode,   // ✅ now uses mapped value
    bankAccountId: bank._id,
    referenceType: "Manual", 
    referenceId, 
    referenceNumber,
    narration: narration || `Payment received from ${partyName || "Customer"}`,
    status: "Posted", 
    createdBy,
  });
  await postLedger(txn);
  return txn;
}

// ════════════════════════════════════════════════════════════
// 4. PAYMENT TO SUPPLIER (CORRECTED - Uses Accounts Payable)
// Accounts Payable Dr ↓ (Liability) → Supplier balance reduced
// Bank Cr             ↓ (Asset)     → Money went out of bank
// ════════════════════════════════════════════════════════════
export async function autoPaymentPaid({
  companyId,
  amount,
  partyId,
  partyName,
  bankAccountName = "Bank Account",
  referenceId,
  referenceNumber,
  narration,
  date,
  createdBy,
  paymentMode
}) {
  if (!companyId || !amount || amount <= 0 || !partyId) {
    throw new Error("Missing required fields for autoPaymentPaid");
  }

  try {
    const [bank, accountsPayable] = await Promise.all([
      findAccount(companyId, bankAccountName),
      getAccountsPayable(companyId),
    ]);

    console.log(`✅ Creating payment entry: ${amount} to ${partyName}`);
    console.log(`   Payable Account: ${accountsPayable.name} (${accountsPayable._id})`);
    console.log(`   Bank Account: ${bank.name} (${bank._id})`);

    const txnNumber = await genNumber(companyId, "Payment");

    const txn = await Transaction.create({
      companyId,
      transactionNumber: txnNumber,
      type: "Payment",
      date: date || new Date(),
      totalAmount: amount,
      lines: [
        {
          accountId: accountsPayable._id,
          accountName: accountsPayable.name,
          type: "Debit",
          amount
        },
        {
          accountId: bank._id,
          accountName: bank.name,
          type: "Credit",
          amount
        }
      ],
      partyType: "Supplier",
      partyId,
      partyName: partyName || "Supplier",
      paymentMode: paymentMode || "Bank Transfer",
      bankAccountId: bank._id,
      referenceType: "Manual",
      referenceId,
      referenceNumber,
      narration: narration || `Payment made to ${partyName || "Supplier"}`,
      status: "Posted",
      createdBy,
    });

    await postLedger(txn);
    console.log(`✅ Payment accounting completed: ${txn.transactionNumber}`);
    return txn;
  } catch (error) {
    console.error("autoPaymentPaid failed:", error);
    throw new Error(`Failed to create auto payment: ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════
// 5. PAYROLL MARK PAID
// Salary Expense Dr ↑ (Expense) → Cost to company
// Bank Cr           ↓ (Asset)   → Money went out of bank
// ════════════════════════════════════════════════════════════
export async function autoPayrollPaid({ 
  companyId, 
  amount, 
  employeeId, 
  employeeName, 
  payrollId, 
  month, 
  bankAccountName = "Bank Account", 
  createdBy 
}) {
  if (!companyId || !amount || amount <= 0 || !employeeId || !payrollId) {
    throw new Error("Missing required fields for autoPayrollPaid");
  }

  const [salaryExp, bank] = await Promise.all([
    findAccount(companyId, "Salary Expense"),
    findAccount(companyId, bankAccountName),
  ]);

  const txnNumber = await genNumber(companyId, "Journal Entry");
  const txn = await Transaction.create({
    companyId, 
    transactionNumber: txnNumber,
    type: "Journal Entry",
    date: new Date(),
    totalAmount: amount,
    lines: [
      { accountId: salaryExp._id, accountName: salaryExp.name, type: "Debit",  amount },
      { accountId: bank._id,      accountName: bank.name,      type: "Credit", amount },
    ],
    partyType: "Employee", 
    partyId: employeeId, 
    partyName: employeeName || "Employee",
    referenceType: "Payroll", 
    referenceId: payrollId, 
    referenceNumber: month,
    narration: `Salary paid to ${employeeName || "Employee"} for ${month}`,
    status: "Posted", 
    createdBy,
  });
  await postLedger(txn);
  return txn;
}

// ════════════════════════════════════════════════════════════
// 6. GRN (Goods Received Note)
// Inventory Dr  ↑ (Asset)     → Stock increased
// Accounts Payable Cr ↑ (Liability) → We owe supplier (control account)
// ════════════════════════════════════════════════════════════
export async function autoGRN({ 
  companyId, 
  amount, 
  partyId, 
  partyName, 
  referenceId, 
  referenceNumber, 
  narration, 
  date, 
  createdBy 
}) {
  if (!companyId || !amount || amount <= 0 || !partyId || !referenceId) {
    throw new Error("Missing required fields for autoGRN");
  }

  const [inventory, accountsPayable] = await Promise.all([
    findAccount(companyId, "Inventory / Stock"),
    getAccountsPayable(companyId),
  ]);

  const txnNumber = await genNumber(companyId, "Journal Entry");
  const txn = await Transaction.create({
    companyId, 
    transactionNumber: txnNumber,
    type: "Journal Entry",
    date: date || new Date(),
    totalAmount: amount,
    lines: [
      { accountId: inventory._id, accountName: inventory.name, type: "Debit",  amount },
      { accountId: accountsPayable._id, accountName: accountsPayable.name, type: "Credit", amount },
    ],
    partyType: "Supplier", 
    partyId, 
    partyName: partyName || "Supplier",
    referenceType: "Manual", 
    referenceId, 
    referenceNumber,
    narration: narration || `GRN ${referenceNumber} from ${partyName || "Supplier"}`,
    status: "Posted", 
    createdBy,
  });
  await postLedger(txn);
  return txn;
}

// ════════════════════════════════════════════════════════════
// 7. ALIAS for autoPaymentEntry (to match import in purchase invoice route)
// ════════════════════════════════════════════════════════════
export const autoPaymentEntry = autoPaymentPaid;




// // 📁 src/lib/autoTransaction.js
// // ✅ Auto create accounting entries when modules fire events
// // Import this helper in: Sales Invoice, Purchase Invoice, Payment Entry, Payroll, GRN

// import Transaction from "@/models/accounts/Transaction";
// import LedgerEntry from "@/models/accounts/LedgerEntry";
// import AccountHead from "@/models/accounts/AccountHead";
// import Supplier from "@/models/SupplierModels";
// import dbConnect from "@/lib/db";

// // ─── Get running balance for an account ─────────────────────
// async function getBalance(companyId, accountId) {
//   const last = await LedgerEntry.findOne(
//     { companyId, accountId },
//     { balance: 1 },
//     { sort: { date: -1, createdAt: -1 } }
//   );
//   return last?.balance || 0;
// }

// // ─── Post ledger entries after a transaction ─────────────────
// async function postLedger(transaction) {
//   const entries = [];
//   for (const line of transaction.lines) {
//     const prev    = await getBalance(transaction.companyId, line.accountId);
//     const account = await AccountHead.findById(line.accountId);
//     const isDebitNormal = account?.balanceType === "Debit";
//     const newBal = isDebitNormal
//       ? prev + (line.type === "Debit" ? line.amount : -line.amount)
//       : prev + (line.type === "Credit" ? line.amount : -line.amount);

//     entries.push({
//       companyId:         transaction.companyId,
//       accountId:         line.accountId,
//       accountName:       line.accountName || account?.name,
//       transactionId:     transaction._id,
//       transactionNumber: transaction.transactionNumber,
//       transactionType:   transaction.type,
//       date:              transaction.date,
//       debit:             line.type === "Debit"  ? line.amount : 0,
//       credit:            line.type === "Credit" ? line.amount : 0,
//       balance:           newBal,
//       narration:         transaction.narration,
//       partyName:         transaction.partyName,
//       partyType:         transaction.partyType,
//       fiscalYear:        transaction.fiscalYear,
//     });
//   }
//   await LedgerEntry.insertMany(entries);
// }

// // ─── Auto number generator ────────────────────────────────────
// async function genNumber(companyId, type) {
//   const map = { "Sales Invoice":"SI","Purchase Invoice":"PI","Payment":"PAY","Receipt":"REC","Journal Entry":"JE","Contra":"CTR" };
//   const prefix = map[type] || "TXN";
//   const count  = await Transaction.countDocuments({ companyId, type }) + 1;
//   return `${prefix}-${new Date().getFullYear()}-${String(count).padStart(4,"0")}`;
// }

// // ─── Helper to find system account by name ───────────────────
// async function findAccount(companyId, name) {
//   const acc = await AccountHead.findOne({ companyId, name, isActive: true });
//   if (!acc) throw new Error(`Account not found: "${name}". Please create it in Chart of Accounts.`);
//   return acc;
// }

// // ════════════════════════════════════════════════════════════
// // 1. SALES INVOICE
// // Receivable Dr ↑ (Asset)   →  Customer owes us money
// // Sales Cr      ↑ (Income)  →  We earned revenue
// // ════════════════════════════════════════════════════════════
// export async function autoSalesInvoice({
//   companyId,
//   amount,
//   partyId,
//   partyName,
//   referenceId,
//   referenceNumber,
//   narration,
//   date,
//   createdBy,
// }) {
//   // 1. Validate required fields
//   if (!companyId || !amount || amount <= 0 || !partyId || !partyName || !referenceId || !createdBy) {
//     throw new Error("Missing required fields for autoSalesInvoice");
//   }

//   try {
//     // 2. Find or create required accounts (Receivable & Sales Revenue)
//     const [receivable, sales] = await Promise.all([
//       findAccount(companyId, "Accounts Receivable"),
//       findAccount(companyId, "Sales Revenue"),
//     ]);

//     if (!receivable || !sales) {
//       throw new Error("Required accounts (Accounts Receivable / Sales Revenue) not found");
//     }

//     // 3. Generate transaction number
//     const txnNumber = await genNumber(companyId, "Sales Invoice");

//     // 4. Create transaction
//     const txn = await Transaction.create({
//       companyId,
//       transactionNumber: txnNumber,
//       type: "Sales Invoice",
//       date: date,
//       totalAmount: amount,
//       lines: [
//         { accountId: receivable._id, accountName: receivable.name, type: "Debit", amount },
//         { accountId: sales._id, accountName: sales.name, type: "Credit", amount },
//       ],
//       partyType: "Customer",
//       partyId,
//       partyName,
//       referenceType: "SalesInvoice",
//       referenceId,
//       referenceNumber,
//       narration: narration || `Sales Invoice ${referenceNumber}`,
//       status: "Posted",
//       createdBy,
//     });

//     // 5. Post to ledger (await the promise)
//     await postLedger(txn);

//     return txn;
//   } catch (error) {
//     console.error("autoSalesInvoice failed:", error);
//     throw new Error(`Failed to create auto sales invoice: ${error.message}`);
//   }
// }

// // ════════════════════════════════════════════════════════════
// // 2. PURCHASE INVOICE
// // Purchase Dr  ↑ (Expense)   → We bought goods/services
// // Payable Cr   ↑ (Liability) → We owe supplier money
// // ════════════════════════════════════════════════════════════
// export async function autoPurchaseInvoice({
//   companyId,
//   amount,
//   partyId,
//   partyName,
//   referenceId,
//   referenceNumber,
//   narration,
//   date,
//   createdBy
// }) {
//   // ✅ Purchase account (same)
//   const purchase = await findAccount(companyId, "Purchase");

//   // 🔥 Get supplier account
//   const supplier = await Supplier.findById(partyId);

//   if (!supplier || !supplier.glAccount) {
//     throw new Error("Supplier account not linked");
//   }

//   const payable = await AccountHead.findById(supplier.glAccount);

//   // ✅ Create transaction
//   const txnNumber = await genNumber(companyId, "Purchase Invoice");

//   const txn = await Transaction.create({
//     companyId,
//     transactionNumber: txnNumber,
//     type: "Purchase Invoice",
//     date: date,
//     totalAmount: amount,

//     lines: [
//       {
//         accountId: purchase._id,
//         accountName: purchase.name,
//         type: "Debit",
//         amount
//       },
//       {
//         accountId: payable._id,   // 🔥 supplier account
//         accountName: payable.name,
//         type: "Credit",
//         amount
//       },
//     ],

//     partyType: "Supplier",
//     partyId,
//     partyName,

//     referenceType: "PurchaseInvoice",
//     referenceId,
//     referenceNumber,

//     narration: narration || `Purchase Invoice ${referenceNumber}`,
//     status: "Posted",
//     createdBy,
//   });

//   await postLedger(txn);
//   return txn;
// }

// // ════════════════════════════════════════════════════════════
// // 3. PAYMENT ENTRY (Receiving from Customer)
// // Bank Dr          ↑ (Asset)  → Money came into bank
// // Receivable Cr    ↓ (Asset)  → Customer's balance reduced
// // ════════════════════════════════════════════════════════════
// export async function autoPaymentReceipt({ companyId, amount, partyId, partyName, bankAccountName = "Bank Account", referenceId, referenceNumber, narration, date, createdBy, paymentMode }) {
//   const [bank, receivable] = await Promise.all([
//     findAccount(companyId, bankAccountName),
//     findAccount(companyId, "Accounts Receivable"),
//   ]);

//   const txnNumber = await genNumber(companyId, "Receipt");
//   const txn = await Transaction.create({
//     companyId, transactionNumber: txnNumber,
//     type: "Receipt",
//     date: date || new Date(),
//     totalAmount: amount,
//     lines: [
//       { accountId: bank._id,       accountName: bank.name,       type: "Debit",  amount },
//       { accountId: receivable._id, accountName: receivable.name, type: "Credit", amount },
//     ],
//     partyType: "Customer", partyId, partyName,
//     paymentMode: paymentMode || "Bank Transfer",
//     bankAccountId: bank._id,
//     referenceType: "Manual", referenceId, referenceNumber,
//     narration: narration || `Payment received from ${partyName}`,
//     status: "Posted", createdBy,
//   });
//   await postLedger(txn);
//   return txn;
// }

// // ════════════════════════════════════════════════════════════
// // 4. PAYROLL MARK PAID
// // Salary Expense Dr ↑ (Expense) → Cost to company
// // Bank Cr           ↓ (Asset)   → Money went out of bank
// // ════════════════════════════════════════════════════════════
// export async function autoPayrollPaid({ companyId, amount, employeeId, employeeName, payrollId, month, bankAccountName = "Bank Account", createdBy }) {
//   const [salaryExp, bank] = await Promise.all([
//     findAccount(companyId, "Salary Expense"),
//     findAccount(companyId, bankAccountName),
//   ]);

//   const txnNumber = await genNumber(companyId, "Journal Entry");
//   const txn = await Transaction.create({
//     companyId, transactionNumber: txnNumber,
//     type: "Journal Entry",
//     date: new Date(),
//     totalAmount: amount,
//     lines: [
//       { accountId: salaryExp._id, accountName: salaryExp.name, type: "Debit",  amount },
//       { accountId: bank._id,      accountName: bank.name,      type: "Credit", amount },
//     ],
//     partyType: "Employee", partyId: employeeId, partyName: employeeName,
//     referenceType: "Payroll", referenceId: payrollId, referenceNumber: month,
//     narration: `Salary paid to ${employeeName} for ${month}`,
//     status: "Posted", createdBy,
//   });
//   await postLedger(txn);
//   return txn;
// }

// // ════════════════════════════════════════════════════════════
// // 5. GRN (Goods Received Note)
// // Inventory Dr  ↑ (Asset)     → Stock increased
// // Payable Cr    ↑ (Liability) → We owe supplier
// // ════════════════════════════════════════════════════════════
// export async function autoGRN({ companyId, amount, partyId, partyName, referenceId, referenceNumber, narration, date, createdBy }) {
//   const [inventory, payable] = await Promise.all([
//     findAccount(companyId, "Inventory / Stock"),
//     findAccount(companyId, "Accounts Payable"),
//   ]);

//   const txnNumber = await genNumber(companyId, "Journal Entry");
//   const txn = await Transaction.create({
//     companyId, transactionNumber: txnNumber,
//     type: "Journal Entry",
//     date: date || new Date(),
//     totalAmount: amount,
//     lines: [
//       { accountId: inventory._id, accountName: inventory.name, type: "Debit",  amount },
//       { accountId: payable._id,   accountName: payable.name,   type: "Credit", amount },
//     ],
//     partyType: "Supplier", partyId, partyName,
//     referenceType: "Manual", referenceId, referenceNumber,
//     narration: narration || `GRN ${referenceNumber} from ${partyName}`,
//     status: "Posted", createdBy,
//   });
//   await postLedger(txn);
//   return txn;
// }


// // 4. PAYMENT (Supplier ko paisa diya)
// export async function autoPaymentPaid({
//   companyId,
//   amount,
//   partyId,
//   partyName,
//   bankAccountName = "Bank Account",
//   referenceId,
//   referenceNumber,
//   narration,
//   date,
//   createdBy,
//   paymentMode
// }) {
//   const [bank, payable] = await Promise.all([
//     findAccount(companyId, bankAccountName),
//     findAccount(companyId, "Accounts Payable"),
//   ]);

//   const txnNumber = await genNumber(companyId, "Payment");

//   const txn = await Transaction.create({
//     companyId,
//     transactionNumber: txnNumber,
//     type: "Payment",
//     date: date || new Date(),
//     totalAmount: amount,

//     lines: [
//       {
//         accountId: payable._id,
//         accountName: payable.name,
//         type: "Debit",
//         amount
//       },
//       {
//         accountId: bank._id,
//         accountName: bank.name,
//         type: "Credit",
//         amount
//       }
//     ],

//     partyType: "Supplier",
//     partyId,
//     partyName,

//     paymentMode: paymentMode || "Bank Transfer",
//     bankAccountId: bank._id,

//     referenceType: "Manual",
//     referenceId,
//     referenceNumber,

//     narration: narration || `Payment made to ${partyName}`,
//     status: "Posted",
//     createdBy,
//   });

//   await postLedger(txn);
//   return txn;
// }