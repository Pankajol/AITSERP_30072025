export function getTemplateFromSchema(schema) {
  const headers = [];
  const sampleRow = {};

  for (const [key, path] of Object.entries(schema.paths)) {
    if (
      key === "_id" || key === "__v" || 
      key === "createdAt" || key === "updatedAt" ||
      key === "companyId" || key === "createdBy"
    ) continue;

    headers.push(key);
    sampleRow[key] = getSampleValue(path.instance);
  }

  return { headers, sampleRow };
}

function getSampleValue(type) {
  switch (type) {
    case "String": return "Sample";
    case "Number": return 0;
    case "Date": return new Date().toISOString().split("T")[0];
    case "Boolean": return true;
    case "ObjectID": return "6527f3aaaf4b8c40123aaa98";
    default: return "";
  }
}
