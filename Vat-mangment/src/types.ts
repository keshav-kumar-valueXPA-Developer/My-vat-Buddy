export interface Transaction {
  date: Date;
  document_number?: string;
  description: string;
  ledger_name?: string;
  amount: number;
  vat_amount: number;
  type: 'Sale' | 'Purchase' | 'Expense' | 'Credit Note' | 'Debit Note';
  category: string;
  debit?: number;
  credit?: number;
  cumulative_balance?: number;
  previous_stage_price?: number;
  previous_stage_vat?: number;
}

export interface VATCalculation {
  outputVAT: number;
  inputVAT: number;
  reverseChargeVAT: number;
  netVATPayable: number;
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
}

export interface MonthlyStats {
  month: string;
  outputVAT: number;
  inputVAT: number;
  reverseChargeVAT: number;
  netVATPayable: number;
}

export interface ContextDocument {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'document';
  uploadDate: Date;
  description?: string;
}

export interface AgentValidationResult {
  isValid: boolean;
  messages: string[];
  severity: 'info' | 'warning' | 'error';
}

export interface VATStageCalculation {
  basePrice: number;
  vatCharged: number;
  priceAfterVAT: number;
  netVATRemitted: number;
  previousStageVAT: number;
}

export interface UploadHistoryItem {
  filename: string;
  date: Date;
  user: string;
  type: 'Sales' | 'Purchases' | 'Expenses' | 'Credit Notes' | 'Debit Notes';
}