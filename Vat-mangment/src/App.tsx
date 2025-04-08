import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Download, LayoutDashboard, Table, FileText, MessageSquare, Upload, History, Settings, AlertTriangle, LogOut, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { Transaction, VATCalculation, ContextDocument } from './types';
import { calculateVAT } from './utils/vatCalculations';
import { exportToExcel } from './utils/excelExport';
import { importFromExcel } from './utils/excelImport';
import { Dashboard } from './components/Dashboard';
import { TransactionTable } from './components/TransactionTable';
import { ContextTab } from './components/ContextTab';
import { VATChatbot } from './components/VATChatbot';
import { UploadHistory } from './components/UploadHistory';
import { AccountSettings } from './components/AccountSettings';
import { VATReports } from './components/VATReports';
import { Auth } from './components/Auth';
import { AgentFlow } from './components/AgentFlow';
import { supabase, checkSupabaseConnection } from './utils/supabase';

function App() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<string>('current-month');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('Sales');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'transactions' | 'context' | 'reports' | 'settings' | 'agents'>('dashboard');
  const [documents, setDocuments] = useState<ContextDocument[]>([]);
  const [uploadHistory, setUploadHistory] = useState<{ filename: string; date: Date; user: string; type: string }[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Check Supabase connection first
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          setConnectionError('Unable to connect to the database. Please check your connection.');
          setLoading(false);
          return;
        }

        // Check for authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (!user) {
          setLoading(false);
          return;
        }

        await Promise.all([
          loadTransactions(),
          loadDocuments()
        ]);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsOfflineMode(true);
        setDbError('An error occurred. Running in offline mode.');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadTransactions();
        loadDocuments();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTransactions = async () => {
    try {
      const { data: { user },error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Authentication error or user not found:", authError);
        setError('User not authenticated. Please complete login.');
        return;
      }

      console.log('Loading transactions for user:', user.id);
      if (!user.id) {
        setError('User ID is missing. Ensure authentication is completed.');
      return;
      }


      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      console.log('Fetched transactions:', data);

      if (data) {
        setTransactions(data.map(t => ({
          ...t,
          date: new Date(t.date)
        })));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setIsOfflineMode(true);
      setDbError('Error loading transactions. Running in offline mode.');
    }
  };

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setDocuments(data.map(d => ({
          ...d,
          uploadDate: new Date(d.created_at)
        })));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4EE] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B8F71] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-[#F0F4EE] flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-center mb-4">Connection Error</h2>
          <p className="text-gray-600 text-center">{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-[#6B8F71] text-white py-2 px-4 rounded-lg hover:bg-[#6B8F71]/80"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onSignIn={() => loadTransactions()} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F4EE]">
      {isOfflineMode && (
        <div className="bg-yellow-50 p-4">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-700">
              {dbError || 'Running in offline mode. Some features may be limited.'}
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-50 text-green-700 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          {successMessage}
        </div>
      )}
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-48 min-h-screen bg-[#6B8F71] text-white">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-6">
              <FileSpreadsheet className="h-6 w-6" />
              <h1 className="text-xl font-bold">MyVATbuddy</h1>
            </div>
            
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'dashboard' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'upload' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <Upload className="h-5 w-5" />
                Upload
              </button>
              
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                    activeTab === 'transactions' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                  }`}
                >
                  <Table className="h-5 w-5" />
                  Transactions
                </button>
                
                {activeTab === 'transactions' && (
                  <div className="ml-4 space-y-1 mt-1">
                    <button
                      onClick={() => setSelectedTransactionType('Sale')}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                        selectedTransactionType === 'Sales' ? 'bg-[#92B6B1] text-white' : 'text-white/80 hover:bg-[#92B6B1]/50'
                      }`}
                    >
                      Sales
                    </button>
                    <button
                      onClick={() => setSelectedTransactionType('Purchase')}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                        selectedTransactionType === 'Purchases' ? 'bg-[#92B6B1] text-white' : 'text-white/80 hover:bg-[#92B6B1]/50'
                      }`}
                    >
                      Purchases
                    </button>
                    <button
                      onClick={() => setSelectedTransactionType('Expense')}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                        selectedTransactionType === 'Expenses' ? 'bg-[#92B6B1] text-white' : 'text-white/80 hover:bg-[#92B6B1]/50'
                      }`}
                    >
                      Expenses
                    </button>
                    <button
                      onClick={() => setSelectedTransactionType('Credit Note')}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                        selectedTransactionType === 'Credit Notes' ? 'bg-[#92B6B1] text-white' : 'text-white/80 hover:bg-[#92B6B1]/50'
                      }`}
                    >
                      Credit Notes
                    </button>
                    <button
                      onClick={() => setSelectedTransactionType('Debit Note')}
                      className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                        selectedTransactionType === 'Debit Notes' ? 'bg-[#92B6B1] text-white' : 'text-white/80 hover:bg-[#92B6B1]/50'
                      }`}
                    >
                      Debit Notes
                    </button>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setActiveTab('context')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'context' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <FileText className="h-5 w-5" />
                Context
              </button>
              
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'reports' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <Download className="h-5 w-5" />
                VAT Reports
              </button>

              <button
                onClick={() => setActiveTab('agents')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'agents' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <Activity className="h-5 w-5" />
                Agent Flow
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 w-full px-4 py-2 rounded-lg ${
                  activeTab === 'settings' ? 'bg-[#788AA3] text-white' : 'text-white/80 hover:bg-[#788AA3]/50'
                }`}
              >
                <Settings className="h-5 w-5" />
                Settings
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-white/80 hover:bg-[#788AA3]/50 mt-4"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content with integrated VAT Assistant */}
        <div className="flex-1 flex">
          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </h2>
                {activeTab === 'dashboard' && (
                  <select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="rounded-lg border-gray-300 text-sm"
                  >
                    <option value="current-month">Current Month</option>
                    <option value="current-quarter">Current Quarter</option>
                    <option value="last-quarter">Last Quarter</option>
                    <option value="current-year">Current Financial Year</option>
                    <option value="last-year">Last Financial Year</option>
                    <option value="all">All Time</option>
                  </select>
                )}
              </div>
            </div>

            {activeTab === 'dashboard'&& transactions.length > 0 && (
             <Dashboard transactions={transactions} dateRange={selectedDateRange} />
            )}

            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Upload Transaction Data</h3>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const importedTransactions = await importFromExcel(file);
                          await loadTransactions();
                          showSuccess('File uploaded successfully!');
                        } catch (error) {
                          console.error('Error importing file:', error);
                          alert('Error importing file. Please check the format and try again.');
                        }
                      }
                    }}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`flex items-center gap-2 bg-[#92B6B1] text-white px-4 py-2 rounded-lg hover:bg-[#92B6B1]/80 cursor-pointer w-fit ${
                      isOfflineMode ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="h-5 w-5" />
                    Select Excel File
                  </label>
                  <p className="mt-2 text-sm text-gray-600">
                    Note: Excel file should have sheets named: Sales, Purchases, Expenses, Credit Notes, Debit Notes
                  </p>
                </div>
                <UploadHistory history={uploadHistory} />
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="h-[calc(100vh-12rem)]">
                <TransactionTable
                  transactions={transactions}
                  transactionType={selectedTransactionType}
                />
              </div>
            )}

            {activeTab === 'context' && (
              <ContextTab
                documents={documents}
                onAddDocument={async (doc) => {
                  try {
                    const { error } = await supabase
                      .from('documents')
                      .insert([doc]);

                    if (error) throw error;

                    await loadDocuments();
                    showSuccess('Document added successfully!');
                  } catch (error) {
                    console.error('Error adding document:', error);
                  }
                }}
                onDeleteDocument={async (id) => {
                  try {
                    const { error } = await supabase
                      .from('documents')
                      .delete()
                      .eq('id', id);

                    if (error) throw error;

                    await loadDocuments();
                    showSuccess('Document deleted successfully!');
                  } catch (error) {
                    console.error('Error deleting document:', error);
                  }
                }}
              />
            )}

            {activeTab === 'reports' && (
              <VATReports transactions={transactions} />
            )}

            {activeTab === 'agents' && (
              <AgentFlow />
            )}

            {activeTab === 'settings' && (
              <AccountSettings />
            )}
          </div>

          {/* Fixed VAT Assistant */}
          <div className="w-96 border-l border-gray-200 overflow-hidden">
            <VATChatbot
              transactions={transactions}
              documents={documents}
              isOpen={true}
              onClose={() => {}} // No longer needed but kept for type compatibility
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;