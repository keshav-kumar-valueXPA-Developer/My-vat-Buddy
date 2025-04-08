import { Transaction, VATCalculation } from '../types';

export const calculateVAT = (transactions: Transaction[]): VATCalculation => {
  
  if (!transactions || transactions.length === 0) {
    return {
      outputVAT: 0,
      inputVAT: 0,
      reverseChargeVAT: 0,
      netVATPayable: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0
    };
  }

  // Calculate VAT totals
  const result = transactions.reduce(
    (acc, t) => {
      if (!t) return acc;

      const amount = Number(t.amount) || 0;
      const vatAmount = Number(t.vat_amount) || 0;

      switch (t.type) {
        case 'Sale':
          acc.outputVAT += vatAmount;
          acc.totalSales += amount;
          break;
        case 'Purchase':
          acc.inputVAT += vatAmount;
          acc.totalPurchases += amount;
          break;
        case 'Expense':
          acc.inputVAT += vatAmount;
          acc.totalExpenses += amount;
          break;
        case 'Credit Note':
          // Credit notes reduce output VAT for sales and input VAT for purchases
          if (t.category.toLowerCase().includes('sale')) {
            acc.outputVAT -= vatAmount;
            acc.totalSales -= amount;
          } else if (t.category.toLowerCase().includes('purchase')) {
            acc.inputVAT -= vatAmount;
            acc.totalPurchases -= amount;
          } else {
            acc.inputVAT -= vatAmount;
            acc.totalExpenses -= amount;
          }
          break;
        case 'Debit Note':
          // Debit notes increase output VAT for sales and input VAT for purchases
          if (t.category.toLowerCase().includes('sale')) {
            acc.outputVAT += vatAmount;
            acc.totalSales += amount;
          } else if (t.category.toLowerCase().includes('purchase')) {
            acc.inputVAT += vatAmount;
            acc.totalPurchases += amount;
          } else {
            acc.inputVAT += vatAmount;
            acc.totalExpenses += amount;
          }
          break;
      }
      return acc;
    },
    {
      outputVAT: 0,
      inputVAT: 0,
      reverseChargeVAT: 0,
      netVATPayable: 0,
      totalSales: 0,
      totalPurchases: 0,
      totalExpenses: 0
    }
  );

  // Calculate net VAT payable
  result.netVATPayable = result.outputVAT - result.inputVAT + result.reverseChargeVAT;

  // Round all values to 2 decimal places for consistency
  return {
    outputVAT: Number(result.outputVAT.toFixed(2)),
    inputVAT: Number(result.inputVAT.toFixed(2)),
    reverseChargeVAT: Number(result.reverseChargeVAT.toFixed(2)),
    netVATPayable: Number(result.netVATPayable.toFixed(2)),
    totalSales: Number(result.totalSales.toFixed(2)),
    totalPurchases: Number(result.totalPurchases.toFixed(2)),
    totalExpenses: Number(result.totalExpenses.toFixed(2))
  };
};

/*uploading 
data visibiltiy and changabilty
transaction visibilty
authentication*/



