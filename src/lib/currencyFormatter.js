export const CURRENCY_CONFIG = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
};

export function formatCurrency(amount, currency = 'USD', convertFromUSD = false) {
  // Convert from USD if flag is set
  const finalAmount = convertFromUSD ? convertCurrency(amount, currency) : amount;
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  
  if (currency === 'EUR') {
    // European format: € symbol after the number with space
    return `${finalAmount.toFixed(2)} ${config.symbol}`;
  }
  
  // Default format: symbol before the number
  return `${config.symbol}${finalAmount.toFixed(2)}`;
}

export function getCurrencySymbol(currency = 'USD') {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
}

// Exchange rates from USD (base currency)
const exchangeRates = {
  USD: 1,
  EUR: 0.9127,
  GBP: 0.7896,
  CAD: 1.3721
};

export function convertCurrency(amountInUSD, toCurrency = 'USD') {
  if (toCurrency === 'USD') return amountInUSD;
  const rate = exchangeRates[toCurrency] || 1;
  return amountInUSD * rate;
}