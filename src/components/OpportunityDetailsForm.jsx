import React from 'react';
import Field from './Field';
import FormSection from './FormSection';

const OpportunityDetailsForm = () => {
  return (
    <form className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-md space-y-6">
      <FormSection title="Opportunity Details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Opportunity From" name="opportunityFrom" />
          <Field label="Opportunity Type" name="opportunityType" />
          <Field label="Sales Stage" name="salesStage" />
          <Field label="Expected Closing Date" name="closingDate" type="date" />
          <Field label="Probability (%)" name="probability" type="number" />
        </div>
      </FormSection>

      <FormSection title="Organization">
        <div className="grid grid-cols-2 gap-4">
          <Field label="No. of Employees" name="employees" type="number" />
          <Field label="Industry" name="industry" />
          <Field label="City" name="city" />
          <Field label="State" name="state" />
          <Field label="Annual Revenue" name="revenue" type="number" />
          <Field label="Market Segment" name="segment" />
        </div>
      </FormSection>

      <FormSection title="Opportunity Value">
        <Field label="Currency" name="currency" />
        <Field label="Opportunity Amount (INR)" name="amount" type="number" />
      </FormSection>

      <FormSection title="More Information">
        <Field label="Company" name="company" />
        <Field label="Opportunity Date" name="opportunityDate" type="date" />
        <Field label="Print Language" name="language" />
      </FormSection>

      <div className="flex justify-between">
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
        >
          Add
        </button>
        <button
          type="reset"
          className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default OpportunityDetailsForm;
