import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { parseShortlistExcel, FuzzyParseResult } from '../../utils/excelUtils';
import { Student } from '../../types';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShortlistValidated: (students: Student[]) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onShortlistValidated,
}) => {
  const { students, resolveUnknownSapIds } = usePortal();
  const [parseResult, setParseResult] = useState<FuzzyParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const result = parseShortlistExcel(buffer, students);
      setParseResult(result);
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleResolveAndProceed = () => {
    if (!parseResult) return;

    // Convert unmatched recruiter rows into registered UPES student records with SAP IDs
    const createdStudents: Student[] = parseResult.unmatchedRows.map((u, i) => ({
      id: `st-new-${Date.now()}-${i}`,
      sapId: u.applicantId,
      name: u.name,
      email: u.email,
      phone: u.phone || 'N/A',
      branch: u.branch || 'N/A',
      batchYear: 2026,
      cgpa: 8.0,
      activeBacklogs: 0,
      historicalBacklogs: 0,
      tenthPercent: 85.0,
      twelfthPercent: 85.0,
      status: 'ELIGIBLE',
    }));

    if (createdStudents.length > 0) {
      resolveUnknownSapIds(createdStudents);
    }

    const allValid = [
      ...parseResult.matchedStudents.map((m) => m.student),
      ...createdStudents,
    ];

    onShortlistValidated(allValid);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                Recruiter Shortlist Excel Upload
              </h3>
              <p className="text-xs text-slate-500">Auto-matches recruiter candidate names & emails to UPES Master DB</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            ✕
          </button>
        </div>

        {!parseResult ? (
          <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center space-y-4 hover:border-amber-400 transition-colors bg-slate-50/50">
            <Upload className="w-10 h-10 text-amber-500 mx-auto animate-bounce" />
            <div>
              <p className="text-sm font-bold text-slate-800">
                Drag and drop recruiter shortlist file (.xlsx, .csv)
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Reads Candidate Name, Primary Email, Applicant ID, Mobile without requiring company to know SAP IDs.
              </p>
            </div>

            <label className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all">
              <span>Browse Recruiter File</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">{fileName}</span>
              </div>
              <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                {parseResult.totalRows} Candidates Parsed
              </span>
            </div>

            {/* Results breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matched UPES Students</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-900 mt-1">
                  {parseResult.matchedStudents.length}
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">Resolved via Email & Candidate Name</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>New Recruiter Candidates</span>
                </div>
                <div className="text-2xl font-extrabold text-amber-900 mt-1">
                  {parseResult.unmatchedRows.length}
                </div>
                <p className="text-[11px] text-amber-800 mt-1">Will be assigned SAP IDs in DB</p>
              </div>
            </div>

            {/* Headers found log */}
            <div className="text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div>
                <span className="font-bold text-slate-800">Detected Recruiter Columns: </span>
                <span className="font-mono text-slate-600">{parseResult.headersFound.join(', ')}</span>
              </div>
              <div className="text-[10px] text-emerald-700 font-extrabold pt-0.5">
                ✓ Smart Extractor matched candidate data & generated personalized mobile Attendance Links for each student.
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                onClick={() => setParseResult(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Upload Different File
              </button>
              <button
                onClick={handleResolveAndProceed}
                className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Confirm & Create Round Roster</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
