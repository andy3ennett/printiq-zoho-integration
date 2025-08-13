export function toZohoAccount({ printiqCustomerId, name }) {
  return {
    Account_Name: name,
    PrintIQ_Customer_ID: String(printiqCustomerId),
  };
}

// keep backwards-compat for worker imports
export { toZohoAccount as mapCustomerToAccount };
