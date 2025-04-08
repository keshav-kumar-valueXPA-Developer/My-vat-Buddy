import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { parse } from 'date-fns';
import { supabase } from './supabase';

interface ValidationIssue {
  id: string;
  row: number;
  sheet: string;
  field: string;
  issue: string;
}

export const importFromExcel = async (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const validationIssues: ValidationIssue[] = [];
    
    reader.onload = async (e) => {
      try {
        if (!e.target?.result) {
          throw new Error('Failed to read file');
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Please sign in to import transactions');
        }

        console.log('Starting Excel import process...');
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const transactions: Transaction[] = [];
        const requiredSheets = ['Sales', 'Purchases', 'Expenses', 'Credit Notes', 'Debit Notes'];
        
        console.log('Available sheets:', workbook.SheetNames);
        
        // Check for missing sheets
        requiredSheets.forEach(sheet => {
          if (!workbook.SheetNames.includes(sheet)) {
            validationIssues.push({
              id: crypto.randomUUID(),
              row: 0,
              sheet,
              field: 'Sheet',
              issue: `Missing required sheet: ${sheet}`
            });
          }
        });

        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
          if (!requiredSheets.includes(sheetName)) continue;

          console.log(`Processing sheet: ${sheetName}`);
          const worksheet = workbook.Sheets[sheetName];
          if (!worksheet) continue;

          try {
            const sheetData = XLSX.utils.sheet_to_json(worksheet);
            console.log(`Found ${sheetData.length} rows in ${sheetName}`);
            
            for (let rowIndex = 0; rowIndex < sheetData.length; rowIndex++) {
              const row = sheetData[rowIndex] as any;
              
              try {
                // Skip empty rows
                if (!row || Object.keys(row).length === 0) {
                  console.log(`Skipping empty row ${rowIndex + 1} in ${sheetName}`);
                  continue;
                }

                // Skip opening balance rows and row 2
                if (rowIndex === 0 || rowIndex === 1 || (
                  row['Description']?.toLowerCase().includes('op') || 
                  row['Description']?.toLowerCase().includes('opening balance')
                )) {
                  console.log(`Skipping header/opening balance row ${rowIndex + 1} in ${sheetName}`);
                  continue;
                }

                // Parse date
                let transactionDate: Date;
                try {
                  if (typeof row['Doc. Date'] === 'number') {
                    transactionDate = new Date(Math.round((row['Doc. Date'] - 25569) * 86400 * 1000));
                  } else if (row['Doc. Date']) {
                    const dateStr = row['Doc. Date'].toString();
                    if (dateStr.includes('/')) {
                      transactionDate = parse(dateStr, 'dd/MM/yyyy', new Date());
                    } else if (dateStr.includes('-')) {
                      transactionDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                    } else {
                      throw new Error('Invalid date format');
                    }
                  } else {
                    throw new Error('Missing date');
                  }

                  if (isNaN(transactionDate.getTime())) {
                    throw new Error('Invalid date');
                  }
                } catch (error) {
                  console.error(`Date parsing error in ${sheetName} row ${rowIndex + 2}:`, error);
                  validationIssues.push({
                    id: crypto.randomUUID(),
                    row: rowIndex + 2,
                    sheet: sheetName,
                    field: 'Doc. Date',
                    issue: 'Invalid date format. Expected: DD/MM/YYYY or YYYY-MM-DD'
                  });
                  continue;
                }

                // Parse amounts
                const debit = parseFloat(row['Debit'] || '0');
                const credit = parseFloat(row['Credit'] || '0');
                const amount = Math.max(debit, credit);

                if (isNaN(amount) || amount === 0) {
                  console.error(`Invalid amount in ${sheetName} row ${rowIndex + 2}`);
                  validationIssues.push({
                    id: crypto.randomUUID(),
                    row: rowIndex + 2,
                    sheet: sheetName,
                    field: 'Amount',
                    issue: 'Invalid or zero amount'
                  });
                  continue;
                }

                const vatAmount = Number((amount * 0.05).toFixed(2)); // 5% VAT

                // Map sheet names to valid transaction types
                let transactionType: Transaction['type'];
                switch (sheetName) {
                  case 'Sales':
                    transactionType = 'Sale';
                    break;
                  case 'Purchases':
                    transactionType = 'Purchase';
                    break;
                  case 'Expenses':
                    transactionType = 'Expense';
                    break;
                  case 'Credit Notes':
                    transactionType = 'Credit Note';
                    break;
                  case 'Debit Notes':
                    transactionType = 'Debit Note';
                    break;
                  default:
                    throw new Error(`Invalid sheet name: ${sheetName}`);
                }

                const transaction = {
                  date: transactionDate,
                  document_number: row['Doc. No.']?.toString() || '',
                  description: row['Description'] || `${sheetName} Transaction ${rowIndex + 1}`,
                  ledger_name: row['Ledger Name'] || '',
                  amount: amount,
                  vat_amount: vatAmount,
                  type: transactionType,
                  category: row['Category'] || sheetName,
                  debit: debit || 0,
                  credit: credit || 0,
                  cumulative_balance: parseFloat(row['Cum. Balance'] || '0'),
                  user_id: user.id // Ensure user_id is set for each transaction
                };

                transactions.push(transaction);
                console.log(`Added transaction from ${sheetName} row ${rowIndex + 2}`);
              } catch (error) {
                console.error(`Error processing row ${rowIndex + 2} in ${sheetName}:`, error);
                validationIssues.push({
                  id: crypto.randomUUID(),
                  row: rowIndex + 2,
                  sheet: sheetName,
                  field: 'General',
                  issue: error instanceof Error ? error.message : 'Unknown error processing row'
                });
              }
            }
          } catch (error) {
            console.error(`Error processing sheet ${sheetName}:`, error);
            validationIssues.push({
              id: crypto.randomUUID(),
              row: 0,
              sheet: sheetName,
              field: 'Sheet',
              issue: `Error processing sheet: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
          }
        }

        // If there are validation issues, show them in a modal
        if (validationIssues.length > 0) {
          console.log('Validation issues found:', validationIssues);
          showValidationIssues(validationIssues);
          reject(new Error('Validation issues found'));
          return;
        }

        // Insert transactions into the database
        if (transactions.length > 0) {
          console.log(`Attempting to insert ${transactions.length} transactions...`);
          try {
            const { error: insertError } = await supabase
              .from('transactions')
              .insert(transactions);

            if (insertError) throw insertError;

            // Record the upload in upload_history
            const { error: historyError } = await supabase
              .from('upload_history')
              .insert({
                filename: file.name,
                type: 'Sales',
                user_id: user.id
              });

            if (historyError) {
              console.error('Error recording upload history:', historyError);
            }

            console.log('Successfully imported transactions');
            resolve(transactions);
          } catch (error) {
            console.error('Error saving transactions:', error);
            reject(error);
          }
        } else {
          console.log('No valid transactions found to import');
          resolve([]);
        }
      } catch (error) {
        console.error('Error importing file:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      console.error('FileReader error');
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

function showValidationIssues(issues: ValidationIssue[]) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const content = document.createElement('div');
  content.className = 'bg-white p-6 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-auto';
  
  content.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Validation Issues (${issues.length})</h2>
      <div class="flex gap-2">
        <button id="export-issues" class="bg-[#788AA3] text-white px-4 py-2 rounded-lg hover:bg-[#788AA3]/80">
          Export Issues
        </button>
        <button id="close-modal" class="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
          Close
        </button>
      </div>
    </div>
    <table class="w-full border-collapse">
      <thead>
        <tr class="bg-gray-50">
          <th class="px-4 py-2 text-left">Sheet</th>
          <th class="px-4 py-2 text-left">Row</th>
          <th class="px-4 py-2 text-left">Field</th>
          <th class="px-4 py-2 text-left">Issue</th>
        </tr>
      </thead>
      <tbody>
        ${issues.map(issue => `
          <tr class="border-t">
            <td class="px-4 py-2">${issue.sheet}</td>
            <td class="px-4 py-2">${issue.row}</td>
            <td class="px-4 py-2">${issue.field}</td>
            <td class="px-4 py-2">${issue.issue}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('close-modal')?.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  document.getElementById('export-issues')?.addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(issues);
    XLSX.utils.book_append_sheet(wb, ws, 'Validation Issues');
    XLSX.writeFile(wb, 'validation_issues.xlsx');
  });
}