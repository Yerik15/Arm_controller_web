/*
 * @Author: _yerik
 * @Date: 2025-12-02 10:54:48
 * @LastEditTime: 2025-12-02 10:54:49
 * @LastEditors: _yerik
 * @Description: 
 * Code. Run. No errors.
 */
import React, { useState } from 'react';
import { Upload, FileType, FolderArchive, X, Info } from 'lucide-react';
import JSZip from 'jszip';
import { clsx } from 'clsx';

export const UploadModal = ({ isOpen, onClose, onLoadFiles }) => {
  const [step, setStep] = useState('choice'); // 'choice' | 'simple' | 'complex'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const fileMap = {};
      let urdfUrl = null;

      // 遍历 ZIP 内容
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry.async('blob').then((blob) => {
            const fileName = relativePath.split('/').pop(); // 只取文件名，忽略文件夹路径
            const url = URL.createObjectURL(blob);
            fileMap[fileName] = url; // 建立 "文件名 -> URL" 映射
            
            if (fileName.endsWith('.urdf')) {
              urdfUrl = url;
              fileMap.urdf = url;
            }
          });
          promises.push(promise);
        }
      });

      await Promise.all(promises);

      if (!urdfUrl) {
        alert("Error: No .urdf file found in the ZIP!");
      } else {
        onLoadFiles(fileMap);
        onClose();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to unzip file.");
    }
    setIsProcessing(false);
  };

  const handleSimpleUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onLoadFiles({ urdf: url }); // 单文件模式
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative">
        
        {/* 关闭按钮 */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* 标题 */}
        <div className="p-8 pb-4">
          <h2 className="text-2xl font-bold text-white mb-2">Import Robot Model</h2>
          <p className="text-slate-400">Choose how you want to load your URDF configuration.</p>
        </div>

        {/* 内容区域 */}
        <div className="p-8 pt-0 flex-1">
          {step === 'choice' && (
            <div className="grid grid-cols-2 gap-6 h-64">
              <button 
                onClick={() => setStep('simple')}
                className="group relative bg-slate-800/50 hover:bg-indigo-600/10 border border-slate-700 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all"
              >
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-indigo-500 transition-colors">
                  <FileType className="w-8 h-8 text-slate-300 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white mb-1">Simple URDF</h3>
                  <p className="text-xs text-slate-400">Single .urdf file.<br/>No external meshes/STL.</p>
                </div>
              </button>

              <button 
                onClick={() => setStep('complex')}
                className="group relative bg-slate-800/50 hover:bg-indigo-600/10 border border-slate-700 hover:border-indigo-500 rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all"
              >
                <div className="p-4 bg-slate-800 rounded-full group-hover:bg-indigo-500 transition-colors">
                  <FolderArchive className="w-8 h-8 text-slate-300 group-hover:text-white" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white mb-1">Package (ZIP)</h3>
                  <p className="text-xs text-slate-400">URDF + STL/DAE meshes.<br/>Upload as .zip archive.</p>
                </div>
              </button>
            </div>
          )}

          {step === 'complex' && (
            <div className="space-y-6 animate-in slide-in-from-right duration-300">
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 flex gap-4">
                <Info className="w-6 h-6 text-indigo-400 shrink-0" />
                <div className="text-sm text-slate-300 space-y-2">
                  <p className="font-bold text-indigo-300">File Structure Guide</p>
                  <p>Please zip your project folder. The system will automatically match filenames.</p>
                  <div className="font-mono text-xs bg-black/30 p-3 rounded border border-white/5 text-slate-400">
                    robot.zip<br/>
                    ├── model.urdf<br/>
                    └── meshes/<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;├── base.stl<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;└── link1.stl
                  </div>
                  <p className="text-xs opacity-70">Note: We handle `package://` paths by matching filenames directly.</p>
                </div>
              </div>

              <div className="relative group">
                <input 
                  type="file" 
                  accept=".zip" 
                  onChange={handleZipUpload}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed" 
                />
                <button className={clsx(
                  "w-full py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all",
                  isProcessing 
                    ? "bg-slate-800 border-slate-700 text-slate-500" 
                    : "bg-slate-800/50 border-slate-600 text-white hover:border-indigo-500 hover:text-indigo-400"
                )}>
                  {isProcessing ? (
                    <span>Unzipping & Processing...</span>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="font-medium">Select ZIP File</span>
                    </>
                  )}
                </button>
              </div>
              
              <button onClick={() => setStep('choice')} className="text-xs text-slate-500 hover:text-white underline">
                Back to selection
              </button>
            </div>
          )}

          {step === 'simple' && (
             <div className="space-y-6 animate-in slide-in-from-right duration-300">
                <div className="relative group h-32">
                  <input type="file" accept=".urdf" onChange={handleSimpleUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  <div className="w-full h-full border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center text-slate-400 group-hover:border-indigo-400 group-hover:text-indigo-400 transition-colors">
                    <FileType className="w-8 h-8 mb-2" />
                    <span>Select .urdf file</span>
                  </div>
                </div>
                <button onClick={() => setStep('choice')} className="text-xs text-slate-500 hover:text-white underline">Back</button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};