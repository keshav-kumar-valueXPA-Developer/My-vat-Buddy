import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileSpreadsheet } from 'lucide-react';
import { UploadHistoryItem } from '../types';
import { supabase } from '../utils/supabase';

interface UploadHistoryProps {
  history: UploadHistoryItem[];
}

export function UploadHistory({ history }: UploadHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(uploadHistory.length / itemsPerPage);

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      
      if (!user) {
        setUploadHistory([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('upload_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading upload history:', fetchError);
        setError('Failed to load upload history');
        return;
      }

      if (data) {
        setUploadHistory(data.map(item => ({
          filename: item.filename,
          date: new Date(item.created_at),
          user: user.email || 'Unknown',
          type: item.type
        })));
      }
    } catch (err) {
      console.error('Error in loadUploadHistory:', err);
      setError('Failed to load upload history');
      setUploadHistory([]);
    }
  };

  const paginatedHistory = uploadHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload History</h3>
        <div className="space-y-4">
          {paginatedHistory.length > 0 ? (
            paginatedHistory.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-[#788AA3]" />
                  <div>
                    <p className="font-medium text-gray-900">{item.filename}</p>
                    <p className="text-sm text-gray-500">
                      {item.type} - Uploaded by {item.user} on {format(item.date, 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-4">
              No upload history available
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded ${
                  currentPage === page
                    ? 'bg-[#788AA3] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}