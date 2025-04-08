import { Transaction, AgentValidationResult, VATStageCalculation } from '../types';
import { supabase } from './supabase';
import { processQuery } from "../utils/text2sql";


class DataCheckerAgent {
  validateTransaction(transaction: Transaction): AgentValidationResult {
    const messages: string[] = [];
    let isValid = true;

    // Check for required fields
    if (!transaction.date || !transaction.amount || !transaction.description) {
      messages.push('Missing required fields');
      isValid = false;
    }

    // Validate amount ranges
    if (transaction.amount <= 0) {
      messages.push('Transaction amount must be positive');
      isValid = false;
    }

    // Validate VAT calculation (5%)
    const expectedVAT = Number(transaction.amount) * 0.05;
    if (Math.abs(Number(transaction.vat_amount) - expectedVAT) > 0.01) {
      messages.push('VAT calculation appears incorrect');
      isValid = false;
    }

    return {
      isValid,
      messages,
      severity: isValid ? 'info' : 'error'
    };
  }
}

class CalculationAgent {
  calculateVATStage(
    currentPrice: number,
    previousStagePrice: number = 0,
    previousStageVAT: number = 0
  ): VATStageCalculation {
    const basePrice = currentPrice;
    const vatCharged = basePrice * 0.05;
    const priceAfterVAT = basePrice + vatCharged;
    const netVATRemitted = vatCharged - previousStageVAT;

    return {
      basePrice,
      vatCharged,
      priceAfterVAT,
      netVATRemitted,
      previousStageVAT
    };
  }

  validateVATChain(transactions: Transaction[]): AgentValidationResult {
    const messages: string[] = [];
    let isValid = true;

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    let previousStageVAT = 0;
    for (const transaction of sortedTransactions) {
      if (transaction.type === 'Sale') {
        const calculation = this.calculateVATStage(
          Number(transaction.amount),
          Number(transaction.previous_stage_price) || 0,
          Number(transaction.previous_stage_vat) || 0
        );

        // Validate net VAT remitted
        const expectedNetVAT = calculation.netVATRemitted;
        const actualNetVAT = Number(transaction.vat_amount) - previousStageVAT;

        if (Math.abs(expectedNetVAT - actualNetVAT) > 0.01) {
          messages.push(
            `VAT chain calculation mismatch for transaction ${transaction.document_number}`
          );
          isValid = false;
        }

        previousStageVAT = Number(transaction.vat_amount);
      }
    }

    return {
      isValid,
      messages,
      severity: isValid ? 'info' : 'warning'
    };
  }

  async executeVATQuery(query: string, userId: string): Promise<{ data: any; error: string | null }> {
    try {
      // Common query patterns and their SQL translations
      const queryPatterns: { [key: string]: (userId: string, params?: any) => string } = {
        'total vat amount': (userId: string, { month, year }: { month?: number; year?: number }) => `
          SELECT SUM(vat_amount) as total_vat
          FROM transactions
          WHERE user_id = '${userId}'
          ${month ? `AND EXTRACT(MONTH FROM date) = ${month}` : ''}
          ${year ? `AND EXTRACT(YEAR FROM date) = ${year}` : ''}
        `,
        'highest input vat': (userId: string, { limit = 10 }: { limit?: number }) => `
          SELECT description, vat_amount, date
          FROM transactions
          WHERE user_id = '${userId}'
          AND type IN ('Purchase', 'Expense')
          ORDER BY vat_amount DESC
          LIMIT ${limit}
        `,
        'highest output vat': (userId: string, { limit = 10 }: { limit?: number }) => `
          SELECT description, vat_amount, date
          FROM transactions
          WHERE user_id = '${userId}'
          AND type = 'Sale'
          ORDER BY vat_amount DESC
          LIMIT ${limit}
        `,
        'monthly vat summary': (userId: string, { year }: { year?: number }) => `
          SELECT 
            EXTRACT(MONTH FROM date) as month,
            SUM(CASE WHEN type = 'Sale' THEN vat_amount ELSE 0 END) as output_vat,
            SUM(CASE WHEN type IN ('Purchase', 'Expense') THEN vat_amount ELSE 0 END) as input_vat,
            SUM(CASE 
              WHEN type = 'Sale' THEN vat_amount 
              WHEN type IN ('Purchase', 'Expense') THEN -vat_amount 
              ELSE 0 
            END) as net_vat
          FROM transactions
          WHERE user_id = '${userId}'
          ${year ? `AND EXTRACT(YEAR FROM date) = ${year}` : ''}
          GROUP BY EXTRACT(MONTH FROM date)
          ORDER BY month
        `
      };

      // Parse the natural language query
      const normalizedQuery = query.toLowerCase().trim();
      let sqlQuery = '';
      let params: any = {};

      // Extract date information if present
      const monthMatch = normalizedQuery.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
      const yearMatch = normalizedQuery.match(/\b(20\d{2})\b/);
      const limitMatch = normalizedQuery.match(/\btop\s+(\d+)\b/);

      if (monthMatch) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        params.month = months.indexOf(monthMatch[1].toLowerCase()) + 1;
      }
      if (yearMatch) {
        params.year = parseInt(yearMatch[1]);
      }
      if (limitMatch) {
        params.limit = parseInt(limitMatch[1]);
      }

      // Match query pattern
      if (normalizedQuery.includes('total vat')) {
        sqlQuery = queryPatterns['total vat amount'](userId, params);
      } else if (normalizedQuery.includes('highest input vat') || normalizedQuery.includes('top input vat')) {
        sqlQuery = queryPatterns['highest input vat'](userId, params);
      } else if (normalizedQuery.includes('highest output vat') || normalizedQuery.includes('top output vat')) {
        sqlQuery = queryPatterns['highest output vat'](userId, params);
      } else if (normalizedQuery.includes('monthly') || normalizedQuery.includes('summary')) {
        sqlQuery = queryPatterns['monthly vat summary'](userId, params);
      } else {
        return { data: null, error: 'Query pattern not recognized' };
      }

      // Execute the query
      const { data, error } = await supabase.from('transactions').select('*').eq('user_id', userId);
      
      if (error) throw error;

      // Process the results
      let result;
      if (data) {
        // Execute the query logic on the client side since we can't run raw SQL
        if (normalizedQuery.includes('total vat')) {
          result = data.reduce((sum, t) => sum + (t.vat_amount || 0), 0);
        } else if (normalizedQuery.includes('highest input vat')) {
          result = data
            .filter(t => t.type === 'Purchase' || t.type === 'Expense')
            .sort((a, b) => b.vat_amount - a.vat_amount)
            .slice(0, params.limit || 10);
        } else if (normalizedQuery.includes('highest output vat')) {
          result = data
            .filter(t => t.type === 'Sale')
            .sort((a, b) => b.vat_amount - a.vat_amount)
            .slice(0, params.limit || 10);
        } else if (normalizedQuery.includes('monthly')) {
          const monthlySummary = data.reduce((acc: any, t) => {
            const month = new Date(t.date).getMonth();
            if (!acc[month]) {
              acc[month] = { output_vat: 0, input_vat: 0, net_vat: 0 };
            }
            if (t.type === 'Sale') {
              acc[month].output_vat += t.vat_amount;
              acc[month].net_vat += t.vat_amount;
            } else if (t.type === 'Purchase' || t.type === 'Expense') {
              acc[month].input_vat += t.vat_amount;
              acc[month].net_vat -= t.vat_amount;
            }
            return acc;
          }, {});
          result = Object.entries(monthlySummary).map(([month, data]) => ({
            month: parseInt(month) + 1,
            ...data
          }));
        }
      }

      return { data: result, error: null };
    } catch (error) {
      console.error('Error executing VAT query:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'An error occurred while executing the query' 
      };
    }
  }
}

class CritiqueAgent {
  reviewTransaction(transaction: Transaction): AgentValidationResult {
    const messages: string[] = [];
    let isValid = true;

    // Check for UAE VAT compliance
    const vatRate = Number(transaction.vat_amount) / Number(transaction.amount);
    if (Math.abs(vatRate - 0.05) > 0.001) {
      messages.push('VAT rate does not comply with UAE standard rate of 5%');
      isValid = false;
    }

    // Validate transaction chain logic
    if (
      transaction.previous_stage_price &&
      transaction.previous_stage_vat &&
      Number(transaction.amount) < Number(transaction.previous_stage_price)
    ) {
      messages.push('Sale price is lower than purchase price');
      isValid = false;
    }

    // Check for reasonable margins
    if (
      transaction.previous_stage_price &&
      Number(transaction.amount) > Number(transaction.previous_stage_price) * 2
    ) {
      messages.push('Unusually high markup detected');
      isValid = false;
    }

    return {
      isValid,
      messages,
      severity: isValid ? 'info' : 'error'
    };
  }

  validateCompliance(transactions: Transaction[]): AgentValidationResult {
    const messages: string[] = [];
    let isValid = true;

    // Check for sequential document numbers
    const documentNumbers = transactions
      .map(t => t.document_number)
      .filter(Boolean) as string[];
    const isSequential = documentNumbers.every((num, i) => {
      if (i === 0) return true;
      return parseInt(num) > parseInt(documentNumbers[i - 1]);
    });

    if (!isSequential) {
      messages.push('Document numbers are not sequential');
      isValid = false;
    }

    // Validate VAT periods
    const dates = transactions.map(t => t.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const monthsDiff =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      maxDate.getMonth() -
      minDate.getMonth();

    if (monthsDiff > 3) {
      messages.push('Transactions span more than one VAT quarter');
    }

    return {
      isValid,
      messages,
      severity: isValid ? 'info' : 'warning'
    };
  }
}

export const dataCheckerAgent = new DataCheckerAgent();
export const calculationAgent = new CalculationAgent();
export const critiqueAgent = new CritiqueAgent();