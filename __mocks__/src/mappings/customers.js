export const mapCustomerToAccount = input => ({
  Account_Name: input?.name ?? 'Mocked Name',
  External_ID: String(input?.printiqCustomerId ?? '0'),
});
export default { mapCustomerToAccount };
