import React, { useState, useRef } from 'react';
import { Link, Plus, Trash2, FileText, Upload } from 'lucide-react';
import { ContextDocument } from '../types';
import { supabase } from '../utils/supabase';

interface ContextTabProps {
  documents: ContextDocument[];
  onAddDocument: (doc: Omit<ContextDocument, 'id' | 'uploadDate'>) => void;
  onDeleteDocument: (id: string) => void;
}

export function ContextTab({ documents, onAddDocument, onDeleteDocument }: ContextTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'link' as const,
    description: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to add documents');
      }

      // Validate URL format for links
      if (formData.type === 'link' && !formData.url.match(/^https?:\/\/.+/)) {
        throw new Error('Please enter a valid URL starting with http:// or https://');
      }

      // Insert document with explicit user_id
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: formData.title,
          url: formData.url,
          type: formData.type,
          description: formData.description,
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting document:', insertError);
        throw insertError;
      }

      if (data) {
        onAddDocument({
          title: formData.title,
          url: formData.url,
          type: formData.type,
          description: formData.description
        });
        setShowForm(false);
        setFormData({
          title: '',
          url: '',
          type: 'link',
          description: ''
        });
      }
    } catch (err) {
      console.error('Error adding document:', err);
      setError(err instanceof Error ? err.message : 'Failed to add document');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to upload documents');
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF, DOC, DOCX, and TXT files are allowed');
      }

      // Create a unique filename with user ID prefix
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Insert document record with user_id
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          url: publicUrl,
          type: 'document',
          description: `Uploaded document: ${file.name}`,
          user_id: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        onAddDocument({
          title: file.name,
          url: publicUrl,
          type: 'document',
          description: `Uploaded document: ${file.name}`
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Reference Documents & Links</h2>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-2 bg-[#92B6B1] text-white px-4 py-2 rounded-lg hover:bg-[#92B6B1]/80 disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            Upload Document
          </button>
          <button
            onClick={() => setShowForm(true)}
            disabled={loading}
            className="flex items-center gap-2 bg-[#788AA3] text-white px-4 py-2 rounded-lg hover:bg-[#788AA3]/80 disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Add Link
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {doc.type === 'link' ? (
                <Link className="h-5 w-5 text-[#788AA3]" />
              ) : (
                <FileText className="h-5 w-5 text-[#92B6B1]" />
              )}
              <div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-gray-900 hover:text-[#788AA3]"
                >
                  {doc.title}
                </a>
                {doc.description && (
                  <p className="text-sm text-gray-500">{doc.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  Added on {doc.uploadDate.toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDeleteDocument(doc.id)}
              className="text-red-600 hover:text-red-700"
              disabled={loading}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Reference</h2>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#788AA3] focus:ring-[#788AA3]"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL</label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#788AA3] focus:ring-[#788AA3]"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#788AA3] focus:ring-[#788AA3]"
                  rows={3}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#788AA3] text-white px-4 py-2 rounded-lg hover:bg-[#788AA3]/80 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}