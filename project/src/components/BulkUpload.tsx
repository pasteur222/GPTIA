import React, { useState } from 'react';
import { Upload, X, AlertCircle, FileText, Download, Send, RefreshCw, Check, Users, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import RichTextEditor from './RichTextEditor';

interface BulkUploadProps {
  onClose: () => void;
  onSend: (data: any[]) => Promise<void>;
}

const BulkUpload: React.FC<BulkUploadProps> = ({ onClose, onSend }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [fileUploaded, setFileUploaded] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFile(file);
    setFileUploaded(true);
    setValidationStatus('validating');
    
    if (file.type === 'text/plain') {
      // Process as TXT file with one phone number per line
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const phoneNumbers = text.split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (phoneNumbers.length === 0) {
          setError('No valid phone numbers found in the file');
          setValidationStatus('invalid');
          return;
        }
        
        const data = phoneNumbers.map(phoneNumber => ({
          phoneNumber: phoneNumber
        }));
        
        setParsedData(data);
        setHeaders(['phoneNumber']);
        setMappings({ phone: 'phoneNumber' });
        setValidationStatus('valid');
        setError(null);
      };
      reader.onerror = () => {
        setError('Error reading the file');
        setValidationStatus('invalid');
      };
      reader.readAsText(file);
    } else {
      // Process as CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError('Error parsing CSV file. Please check the format.');
            setValidationStatus('invalid');
            return;
          }

          const headers = results.meta.fields || [];
          if (!headers.some(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'))) {
            setError('CSV must contain a column for phone numbers (phone, phoneNumber, mobile, etc)');
            setValidationStatus('invalid');
            return;
          }

          setHeaders(headers);
          setParsedData(results.data);
          setError(null);
          setValidationStatus('valid');

          // Set default mappings
          const defaultMappings: Record<string, string> = {};
          headers.forEach(header => {
            if (header.toLowerCase().includes('phone') || header.toLowerCase().includes('mobile')) {
              defaultMappings['phone'] = header;
            }
            if (header.toLowerCase().includes('name')) {
              defaultMappings['name'] = header;
            }
            if (header.toLowerCase().includes('company')) {
              defaultMappings['company'] = header;
            }
          });
          setMappings(defaultMappings);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setError('Failed to parse contact file. Please ensure it\'s a valid CSV file.');
          setValidationStatus('invalid');
        }
      });
    }
  };

  const downloadTemplate = () => {
    const template = 'phoneNumber,name,company,custom_field\n+1234567890,John Doe,ACME Corp,Value1\n+0987654321,Jane Smith,XYZ Inc,Value2';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_contacts_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!parsedData.length) return;

    try {
      setIsProcessing(true);
      
      // For TXT files (simple phone numbers)
      if (headers.length === 1 && headers[0] === 'phoneNumber') {
        await onSend(parsedData);
      } else {
        // For CSV files with mappings
        await onSend(parsedData.map(row => ({
          ...row,
          phoneNumber: row[mappings.phone],
          name: mappings.name ? row[mappings.name] : undefined,
          company: mappings.company ? row[mappings.company] : undefined,
          message: message,
          variables: Object.entries(mappings)
            .filter(([key]) => key !== 'phone')
            .reduce((acc, [key, columnName]) => {
              if (columnName && row[columnName]) {
                acc[key] = row[columnName];
              }
              return acc;
            }, {} as Record<string, string>)
        })));
      }
      
      onClose();
    } catch (error) {
      setError('Error sending messages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex flex-col h-screen">
        <div className="flex items-center justify-between p-6 bg-white border-b">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Contacts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Contact Import Guide</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    Upload a CSV file with your contacts to send bulk messages. The file should include:
                  </p>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 ml-1">
                    <li>Phone numbers in international format (e.g., +1234567890)</li>
                    <li>Optional columns for name, company, etc. for personalization</li>
                    <li>One contact per row</li>
                  </ul>
                  <p className="text-sm text-blue-700 mt-2">
                    Alternatively, upload a TXT file with one phone number per line.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Contact File
                </label>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  
                  {fileUploaded ? (
                    <div className="flex flex-col items-center">
                      {validationStatus === 'validating' ? (
                        <div className="mb-3">
                          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                          <p className="text-gray-600 mt-2">Validating file...</p>
                        </div>
                      ) : validationStatus === 'valid' ? (
                        <div className="mb-3">
                          <Check className="w-8 h-8 text-green-500 mx-auto" />
                          <p className="text-gray-700 font-medium mt-2">{file?.name}</p>
                          <p className="text-green-600 text-sm">{parsedData.length} valid contacts found</p>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                          <p className="text-gray-700 font-medium mt-2">{file?.name}</p>
                          <p className="text-red-600 text-sm">Invalid file format</p>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          setFile(null);
                          setFileUploaded(false);
                          setValidationStatus('idle');
                          setParsedData([]);
                          setHeaders([]);
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Choose Different File
                      </button>
                    </div>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
                      <label
                        htmlFor="csv-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        Choose File
                      </label>
                      <p className="text-xs text-gray-500 mt-3">
                        Supported formats: CSV (Comma Separated Values) or TXT (one phone number per line)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {headers.length > 0 && headers[0] !== 'phoneNumber' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Column Mappings</h3>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-4">
                    <label className="block text-sm text-gray-600 w-32">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={mappings.phone || ''}
                      onChange={(e) => setMappings(prev => ({ ...prev, phone: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select column</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="block text-sm text-gray-600 w-32">
                      Name
                    </label>
                    <select
                      value={mappings.name || ''}
                      onChange={(e) => setMappings(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select column (optional)</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="block text-sm text-gray-600 w-32">
                      Company
                    </label>
                    <select
                      value={mappings.company || ''}
                      onChange={(e) => setMappings(prev => ({ ...prev, company: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select column (optional)</option>
                      {headers.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {parsedData.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message (Optional)
                  </label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="Type your message here... Use {{variable}} for personalization"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    You can leave this empty if you just want to import contacts
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {headers.map(header => (
                              <th
                                key={header}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {header}
                                {mappings.phone === header && (
                                  <span className="ml-1 text-blue-600">(Phone)</span>
                                )}
                                {mappings.name === header && (
                                  <span className="ml-1 text-green-600">(Name)</span>
                                )}
                                {mappings.company === header && (
                                  <span className="ml-1 text-purple-600">(Company)</span>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {parsedData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              {headers.map(header => (
                                <td
                                  key={header}
                                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                                >
                                  {row[header]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
                        Showing 5 of {parsedData.length} records
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!parsedData.length || (headers[0] !== 'phoneNumber' && !mappings.phone) || isProcessing}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {message ? 'Send to' : 'Import'} {parsedData.length} {parsedData.length === 1 ? 'Contact' : 'Contacts'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;