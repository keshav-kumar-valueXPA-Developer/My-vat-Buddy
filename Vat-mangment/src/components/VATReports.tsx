import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { exportToExcel } from '../utils/excelExport';
import { supabase } from '../utils/supabase';

interface VATReportsProps {
  transactions: Transaction[];
}

interface ReportHistory {
  id: string;
  user_email: string;
  downloaded_at: Date;
  date_range: string;
}

export function VATReports({ transactions }: VATReportsProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportHistory();
  }, []);

  const loadReportHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('report_history')
      .select('*')
      .eq('user_id', user.id)
      .order('downloaded_at', { ascending: false });

    if (error) {
      console.error('Error loading report history:', error);
      return;
    }

    if (data) {
      setReportHistory(data.map(item => ({
        id: item.id,
        user_email: item.user_email,
        downloaded_at: new Date(item.downloaded_at),
        date_range: item.date_range
      })));
    }
  };

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (!startDate || transactionDate >= new Date(startDate)) &&
               (!endDate || transactionDate <= new Date(endDate));
      });

      if (filteredTransactions.length === 0) {
        alert('No transactions found for the selected date range');
        return;
      }

      exportToExcel(filteredTransactions);

      // Save report history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('report_history')
          .insert([{
            user_id: user.id,
            user_email: user.email,
            date_range: `${startDate || 'All time'} to ${endDate || 'All time'}`,
          }]);

        if (error) {
          console.error('Error saving report history:', error);
        } else {
          await loadReportHistory();
        }
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error exporting report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Export VAT Report</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 focus:border-[#788AA3] focus:ring-[#788AA3]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-lg border-gray-300 focus:border-[#788AA3] focus:ring-[#788AA3]"
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={loading || transactions.length === 0}
          className="flex items-center gap-2 bg-[#788AA3] text-white px-4 py-2 rounded-lg hover:bg-[#788AA3]/80 disabled:opacity-50"
        >
          <Download className="h-5 w-5" />
          {loading ? 'Exporting...' : 'Export VAT Report'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Download History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Range
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportHistory.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(report.downloaded_at, 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {report.date_range}
                  </td>
                </tr>
              ))}
              {reportHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm text-gray-500 text-center">
                    No reports downloaded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}