import React, { useState, useEffect } from 'react';
import { BarChart, PieChart } from 'lucide-react';
import { Transaction, VATCalculation } from '../types';
import { format, subMonths } from 'date-fns';
import { calculateVAT } from '../utils/vatCalculations';

interface DashboardProps {
  transactions: Transaction[];
  dateRange: string;
}

export function Dashboard({ transactions, dateRange }: DashboardProps) {
  const [vatCalculation, setVatCalculation] = useState<VATCalculation | null>(null);

  console.log("📊 Dashboard fetch transactions:", transactions);

  // Calculate VAT when transactions change
  useEffect(() => {
    if (transactions.length > 0) {
      const vatData = calculateVAT(transactions);
      setVatCalculation(vatData);
      console.log("🧮 VAT Calculated:", vatData);
    }
  }, [transactions]); // Dependency on transactions

  // Ensure VAT is calculated only when transactions are available
  if (!vatCalculation) {
    return <div className="text-center p-6">Loading VAT Data...</div>;
  }

  // Get last 6 months data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const month = format(date, 'MMM yyyy');
    
    // Make sure to properly filter by date
    const monthTransactions = transactions.filter(t => {
      // Ensure t.date is a valid Date object
      const tDate = t.date instanceof Date ? t.date : new Date(t.date);
      return format(tDate, 'MMM yyyy') === month;
    });

    const monthVAT = calculateVAT(monthTransactions);
    return {
      month,
      netVATPayable: monthVAT.netVATPayable || 0,
      outputVAT: monthVAT.outputVAT || 0,
      inputVAT: monthVAT.inputVAT || 0
    };
  }).reverse();

  console.log("📊 Processed last 6 months VAT data:", last6Months);

  // Calculate maximum value for chart scaling
  const maxValue = Math.max(
    ...last6Months.map(m => Math.max(
      Math.abs(m.netVATPayable),
      m.outputVAT,
      m.inputVAT
    ))
  ) || 1; // Default to 1 if all values are 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="h-5 w-5 text-[#6B8F71]" />
            <h3 className="text-lg font-semibold">Net VAT Payable</h3>
          </div>
          <p className={`text-3xl font-bold ${vatCalculation.netVATPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {vatCalculation.netVATPayable.toFixed(2)} AED
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-[#788AA3]" />
            <h3 className="text-lg font-semibold">Output VAT</h3>
          </div>
          <p className="text-3xl font-bold text-[#788AA3]">
            {vatCalculation.outputVAT.toFixed(2)} AED
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-[#92B6B1]" />
            <h3 className="text-lg font-semibold">Input VAT</h3>
          </div>
          <p className="text-3xl font-bold text-[#92B6B1]">
            {vatCalculation.inputVAT.toFixed(2)} AED
          </p>
        </div>
      </div>

      {/* VAT Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">VAT Trend - Last 6 Months</h3>
        <div className="h-80">
          <div className="flex h-full flex-col">
            <div className="flex-1">
              <div className="relative h-full">
                <div className="absolute inset-0 flex">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between text-sm text-gray-600 pr-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <span key={i}>
                        {Math.round((maxValue * (5 - i) / 5)).toLocaleString()}
                      </span>
                    ))}
                  </div>
                  
                  {/* Chart content */}
                  <div className="flex-1">
                    <div className="grid grid-cols-6 gap-4 h-full">
                      {last6Months.map((month, index) => (
                        <div key={index} className="flex flex-col justify-end h-full">
                          <div className="relative h-full flex items-end justify-center w-full">
                            {/* Net VAT Bar */}
                            <div 
                              className="absolute bottom-0 w-3/4 bg-[#6B8F71] rounded-t"
                              style={{
                                height: `${(Math.abs(month.netVATPayable) / maxValue * 100)}%`,
                                left: '10%'
                              }}
                            ></div>
                            
                            {/* Output VAT Bar */}
                            <div 
                              className="absolute bottom-0 w-2/4 bg-[#788AA3] rounded-t opacity-80"
                              style={{
                                height: `${(month.outputVAT / maxValue * 100)}%`,
                                left: '30%'
                              }}
                            ></div>
                            
                            {/* Input VAT Bar */}
                            <div 
                              className="absolute bottom-0 w-2/4 bg-[#92B6B1] rounded-t opacity-80"
                              style={{
                                height: `${(month.inputVAT / maxValue * 100)}%`,
                                right: '30%'
                              }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 text-center mt-2">
                            {format(new Date(month.month), 'MMM')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#6B8F71] rounded" />
                <span className="text-sm">Net VAT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#788AA3] rounded" />
                <span className="text-sm">Output VAT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#92B6B1] rounded" />
                <span className="text-sm">Input VAT</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}