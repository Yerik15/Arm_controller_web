import React, { useState } from 'react';
import { Settings2, Usb, Unplug, Cpu, RotateCw, FolderOpen } from 'lucide-react'; // 这里的 FolderOpen 只要这一个
import { clsx } from 'clsx';

export const Interface = ({ 
  jointConfig, 
  jointValues, 
  onJointChange, 
  onOpenUpload // ✅ 正确：这里只需要接收打开弹窗的函数
}) => {
  const [port, setPort] = useState(null);
  const [writer, setWriter] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    setConsoleLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  // --- ❌ 已删除 handleFile 函数 (因为文件上传逻辑移到了弹窗里) ---

  // 串口连接逻辑
  const connectSerial = async () => {
    if (!navigator.serial) { alert("Browser not supported."); return; }
    try {
      const p = await navigator.serial.requestPort();
      await p.open({ baudRate: 115200 });
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(p.writable);
      const w = textEncoder.writable.getWriter();
      setPort(p); setWriter(w); addLog("Connected.", "success");
    } catch (err) { addLog(err.message, "error"); }
  };

  const disconnectSerial = async () => {
    if (writer) { await writer.close(); setWriter(null); }
    if (port) { await port.close(); setPort(null); }
    addLog("Disconnected.");
  };

  const handleSliderChange = async (name, value) => {
    const val = parseFloat(value);
    onJointChange(name, val);
    if (writer) {
      const data = `${name}:${val.toFixed(3)}\n`;
      await writer.write(data);
    }
  };

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-slate-900/80 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl z-10">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg"><Cpu className="w-6 h-6 text-indigo-400" /></div>
          <div><h1 className="text-xl font-bold text-white">RoboControl</h1></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Connection */}
        <section>
          {!port ? (
            <button onClick={connectSerial} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"><Usb className="w-4 h-4" /> Connect USB</button>
          ) : (
            <button onClick={disconnectSerial} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center gap-2 border border-red-500/50"><Unplug className="w-4 h-4" /> Disconnect</button>
          )}
        </section>

        {/* 模型导入区 - 只有一个大按钮，点击触发 onOpenUpload */}
        <section>
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Model Import</h3>
          <button 
            onClick={onOpenUpload}
            className="w-full border-2 border-dashed border-slate-600 hover:border-indigo-400 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-indigo-400 transition-all bg-slate-800/50 hover:bg-slate-800"
          >
            <FolderOpen className="w-8 h-8" />
            <span className="text-sm font-medium">Import Model</span>
            <span className="text-xs text-slate-500">URDF or ZIP Archive</span>
          </button>
        </section>

        {/* Joint Controls */}
        <section>
          <div className="flex items-center gap-2 mb-4"><Settings2 className="w-4 h-4 text-indigo-400" /><h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Joint Control</h3></div>
          
          <div className="space-y-5">
            {Object.keys(jointConfig).length === 0 && (
               <div className="text-center text-slate-500 text-sm py-4">No joints detected. Import a model first.</div>
            )}

            {Object.keys(jointConfig).map((name) => (
              <div key={name} className="bg-slate-800/40 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-200 flex items-center gap-2"><RotateCw className="w-3 h-3 text-emerald-400" />{name}</label>
                  <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">{jointValues[name]?.toFixed(2)}</span>
                </div>
                <input type="range" min={jointConfig[name].min} max={jointConfig[name].max} step={0.01} value={jointValues[name] || 0} onChange={(e) => handleSliderChange(name, e.target.value)} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              </div>
            ))}
          </div>
        </section>
      </div>
      
      {/* Console */}
      <div className="h-40 bg-black/40 border-t border-white/10 p-4 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
        {consoleLogs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
};