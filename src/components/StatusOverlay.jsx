/*
 * @Author: _yerik
 * @Date: 2025-12-02 10:24:26
 * @LastEditTime: 2025-12-02 10:24:27
 * @LastEditors: _yerik
 * @Description: 
 * Code. Run. No errors.
 */
import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export const StatusOverlay = ({ status, message }) => {
  // status: 'idle' | 'loading' | 'success' | 'error'
  
  if (status === 'idle') return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-500">
      <div className={clsx(
        "bg-slate-900/90 border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full transition-all transform duration-500",
        status === 'loading' ? "scale-100 opacity-100" : "scale-105"
      )}>
        
        {/* 图标区域 */}
        <div className="relative">
          {status === 'loading' && (
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse" />
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin relative z-10" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="animate-[bounce_0.5s_ease-out]">
               <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20" />
               <CheckCircle2 className="w-12 h-12 text-emerald-400 relative z-10" />
            </div>
          )}

          {status === 'error' && (
             <div className="animate-shake">
                <div className="absolute inset-0 bg-red-500 blur-xl opacity-20" />
                <AlertTriangle className="w-12 h-12 text-red-400 relative z-10" />
             </div>
          )}
        </div>

        {/* 文字区域 */}
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-white tracking-wide">
            {status === 'loading' && 'Parsing Model...'}
            {status === 'success' && 'Ready to Control'}
            {status === 'error' && 'Import Failed'}
          </h3>
          <p className={clsx("text-sm font-mono", 
            status === 'error' ? "text-red-300" : "text-slate-400"
          )}>
            {message}
          </p>
        </div>

        {/* 进度条 (仅加载时显示) */}
        {status === 'loading' && (
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-1/2 animate-[progress_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </div>
    </div>
  );
};