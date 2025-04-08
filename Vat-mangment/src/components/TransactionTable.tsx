import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { supabase } from '../utils/supabase';
import TransactionsChart from "./TransactionsChart"; 

interface TransactionTableProps {
  transactions: Transaction[];
  transactionType: string;
}

export function TransactionTable({ transactions, transactionType }: TransactionTableProps) {
  

  useEffect(() => {
    loadTransactions();
  }, [transactionType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      

      const { data: { user },error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Authentication error or user not found:", authError);
        setError('User not authenticated. Please complete login.');
        return;
      }

      console.log('User ID:', user.id);
      
      if (!user.id) {
        setError('User ID is missing. Ensure authentication is completed.');
      return;
      }

      console.log("Transactions data:", transactions);
      console.log('Loading transactions for type:', transactionType);
      
      

      // Convert transaction type to match database format
      const typeMapping: { [key: string]: string } = {
        "Sales": "Sale",
        "Purchases": "Purchase",
        "Expenses": "Expense",
        "Credit Notes": "Credit Note",
        "Debit Notes": "Debit Note"
      };
      
      const dbType = typeMapping[transactionType] || transactionType.trim(); // Map to correct type
      

      console.log("Database Query Type:", dbType);


      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .ilike('type', dbType) 
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('Fetched transactions:', data);

      if (data) {
        setLocalTransactions(data.map(t => ({
          ...t,
          date: new Date(t.date)
        })));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6B8F71]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600 text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
<div className='flex flex-col'>
    <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)] flex flex-col min-w-full">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 overflow-x-auto overflow-y-auto">
              <thead className="bg-gray-50 sticky top-0 z-10 overflow-x-auto ">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Doc. No.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                    Ledger Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Debit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Credit
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    VAT
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {localTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  localTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(transaction.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.document_number || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.description}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.ledger_name || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.type}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.debit?.toFixed(2) || '-'} AED
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.credit?.toFixed(2) || '-'} AED
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.vat_amount.toFixed(2)} AED
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.amount.toFixed(2)} AED
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.cumulative_balance?.toFixed(2) || '-'} AED
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div className='py-6'>
    <TransactionsChart transactions={localTransactions} /> 
    </div>
    
    </div>
  );
}