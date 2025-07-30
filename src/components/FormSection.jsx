const FormSection = ({ title, children }) => (
    <div className="p-4 border border-gray-300 rounded-lg mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
  
  export default FormSection;
  