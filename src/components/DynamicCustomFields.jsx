"use client";

export default function DynamicCustomFields({
  fields = [],
  values = {},
  onChange,
  formFieldClass
}) {

  return (
    <>
      {fields.map(field => (
        <div key={field._id}>
          <label className="block text-sm mb-1">
            {field.label}
          </label>

          <input
            type="text"
            value={values?.[field.name] || ""}
            onChange={(e)=>onChange(e,field.name)}
            className={formFieldClass}
          />
        </div>
      ))}
    </>
  );
}