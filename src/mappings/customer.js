export function toZohoAccount(printiq) {
  return {
    Account_Name: printiq.name,
    PrintIQ_Customer_ID: String(printiq.printiqCustomerId),
    // TODO: map additional fields as needed
  };
}
