// Platform fee structures for all supported reselling platforms
export const PLATFORMS = {
  ebay: {
    name: "eBay",
    icon: "🏷️",
    color: "#E53238",
    fees: [
      { name: "Final Value Fee", rate: 0.1325, type: "percentage", description: "13.25%" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  stockx: {
    name: "StockX",
    icon: "📈",
    color: "#006340",
    fees: [
      { name: "Seller Fee", rate: 0.09, type: "percentage", description: "9%" },
      { name: "Payment Processing", rate: 0.03, type: "percentage", description: "3%" }
    ]
  },
  goat: {
    name: "GOAT",
    icon: "🐐",
    color: "#7B61FF",
    fees: [
      { name: "Commission", rate: 0.095, type: "percentage", description: "9.5%" },
      { name: "Cash Out Fee", rate: 0.029, type: "percentage", description: "2.9%" }
    ]
  },
  poshmark: {
    name: "Poshmark",
    icon: "👗",
    color: "#CF3458",
    fees: [
      { name: "Seller Fee", rate: 0.20, type: "percentage", description: "20%", note: "For sales over $15. Flat $2.95 for sales ≤$15." }
    ]
  },
  depop: {
    name: "Depop",
    icon: "🛍️",
    color: "#FF2300",
    fees: [
      { name: "Selling Fee", rate: 0.10, type: "percentage", description: "10%" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  whatnot: {
    name: "Whatnot",
    icon: "🎯",
    color: "#6366F1",
    fees: [
      { name: "Seller Fee", rate: 0.089, type: "percentage", description: "8.9%" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  mercari: {
    name: "Mercari",
    icon: "🔵",
    color: "#4DC4E0",
    fees: [
      { name: "Selling Fee", rate: 0.10, type: "percentage", description: "10%" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  facebook: {
    name: "Facebook",
    icon: "📘",
    color: "#1877F2",
    fees: [
      { name: "Selling Fee", rate: 0.05, type: "percentage", description: "5%", note: "Minimum $0.40" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  offerup: {
    name: "OfferUp",
    icon: "🏷️",
    color: "#00A87E",
    fees: [
      { name: "Service Fee", rate: 0.1295, type: "percentage", description: "12.95%" },
      { name: "Payment Processing", rate: 0.029, type: "percentage", fixed: 0.30, description: "2.9% + $0.30" }
    ]
  },
  goldin: {
    name: "Goldin",
    icon: "💎",
    color: "#1C4587",
    fees: [
      { name: "Seller Fee", rate: 0.10, type: "percentage", description: "10%" }
    ]
  },
  amazon: {
    name: "Amazon",
    icon: "📦",
    color: "#FF9900",
    fees: [
      { name: "Referral Fee", rate: 0.15, type: "percentage", description: "15%" }
    ]
  },
  other: {
    name: "Other",
    icon: "🤝",
    color: "#6B7280",
    fees: []
  }
};

export function calculateFees(salePrice, platform, shippingCost = 0) {
  const platformConfig = PLATFORMS[platform];
  if (!platformConfig) return { platformFee: 0, processingFee: 0, totalFees: 0 };

  let platformFee = 0;
  let processingFee = 0;

  platformConfig.fees.forEach((fee, index) => {
    let amount = salePrice * fee.rate;
    if (fee.fixed) amount += fee.fixed;
    
    // Special case: Poshmark flat fee for sales <= $15
    if (platform === "poshmark" && salePrice <= 15) {
      amount = 2.95;
    }
    
    // Special case: Facebook minimum fee
    if (platform === "facebook" && index === 0 && amount < 0.40) {
      amount = 0.40;
    }

    if (index === 0) {
      platformFee = Math.round(amount * 100) / 100;
    } else {
      processingFee = Math.round(amount * 100) / 100;
    }
  });

  return {
    platformFee,
    processingFee,
    totalFees: Math.round((platformFee + processingFee + shippingCost) * 100) / 100,
    feeDetails: platformConfig.fees.map((fee, index) => ({
      name: fee.name,
      description: fee.description,
      amount: index === 0 ? platformFee : processingFee
    }))
  };
}

export function calculateFlip(buyPrice, salePrice, platform, shippingCost = 0) {
  const fees = calculateFees(salePrice, platform, shippingCost);
  const netProfit = Math.round((salePrice - buyPrice - fees.totalFees) * 100) / 100;
  const roi = buyPrice > 0 ? Math.round((netProfit / buyPrice) * 10000) / 100 : 0;
  const totalInvested = buyPrice + shippingCost;
  const hiddenFees = fees.platformFee + fees.processingFee;

  return {
    ...fees,
    netProfit,
    roi,
    totalInvested,
    hiddenFees,
    salePrice,
    buyPrice,
    shippingCost
  };
}