import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { format } from 'date-fns';

export const exportToExcel = (transactions: Transaction[]) => {
  if (!transactions || transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  const worksheet = XLSX.utils.json_to_sheet(
    transactions.map(t => ({
      Date: format(new Date(t.date), 'dd/MM/yyyy'),
      'Document Number': t.document_number || '',
      Description: t.description || '',
      'Ledger Name': t.ledger_name || '',
      Type: t.type || '',
      Debit: t.debit?.toFixed(2) || '0.00',
      Credit: t.credit?.toFixed(2) || '0.00',
      'VAT Amount': t.vat_amount?.toFixed(2) || '0.00',
      Amount: t.amount?.toFixed(2) || '0.00',
      'Balance': t.cumulative_balance?.toFixed(2) || '0.00'
    }))
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'VAT Report');
  
  XLSX.writeFile(workbook, `VAT_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};