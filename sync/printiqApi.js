const axios = require('axios');

// Example function to pull customers from PrintIQ
async function fetchPrintIQCustomers() {
  try {
    const response = await axios.get(
      'https://nps-group.printiq.com/api/Customers',
      {
        headers: {
          Authorization: `dc2d3666-8c01-4664-aa81-8c5e8b8883f7`,
        },
      }
    );
    return response.data.customers; // Adjust based on real PrintIQ API response
  } catch (error) {
    console.error(
      'Error fetching PrintIQ customers:',
      error.response?.data || error.message
    );
    throw new Error('Failed to fetch customers from PrintIQ');
  }
}

module.exports = {
  fetchPrintIQCustomers,
};
