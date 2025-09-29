import ImportTemplate from "@/components/ImportTemplete";

const csvHeaders = [
  "customerCode",
  "customerName",
  "customerGroup",
  "customerType",
  "emailId",
  "fromLead",
  "mobileNumber",
  "fromOpportunity",
  "paymentTerms",
  "gstNumber",
  "gstCategory",
  "pan",
  "contactPersonName",
  "commissionRate",
  "glAccount"
];

const sampleRow = {
  customerCode: "CUST001",
  customerName: "ABC Ltd.",
  customerGroup: "Retail",
  customerType: "Business",
  emailId: "abc@xyz.com",
  fromLead: "Lead1",
  mobileNumber: "9876543210",
  fromOpportunity: "Opp1",
  paymentTerms: "Net 30",
  gstNumber: "22ABCDE1234A1Z5",
  gstCategory: "Registered Regular",
  pan: "ABCDE1234A",
  contactPersonName: "John Doe",
  commissionRate: "10",
  glAccount: "6527f3aaaf4b8c40123aaa98"
};

const sampleJson = [sampleRow];

export default function Page() {
  return (
    <ImportTemplate
      modelName="Customer"
      csvHeaders={csvHeaders}
      sampleRow={sampleRow}
      sampleJson={sampleJson}
    />
  );
}