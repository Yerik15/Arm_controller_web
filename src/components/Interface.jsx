import React, { useState, useEffect, useRef } from 'react';
import { Settings2, Usb, Unplug, Cpu, RotateCcw, FolderOpen, ChevronDown, RefreshCw, Network, Terminal, CheckCircle2, XCircle, Info, Trash2, Monitor, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

// 厂商 ID 映射表 (用于显示人类可读的设备名)
const VENDOR_MAP = {
  0x0483: "STM32",
  0x2341: "Arduino",
  0x1A86: "CH340 (Clone/ESP)",
  0x10C4: "CP210x (Silicon Labs)",
  0x0403: "FTDI",
  0x2E8A: "RP2040 (Pico)",
  0x303A: "ESP32"
};

export const Interface = ({ 
  jointConfig, 
  jointValues, 
  onJointChange, 
  onOpenUpload 
}) => {
  // --- 核心状态 ---
  const [port, setPort] = useState(null);
  const [socket, setSocket] = useState(null);
  const [writer, setWriter] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [connectionType, setConnectionType] = useState('none'); 
  
  // --- UI 状态 ---
  const [availablePorts, setAvailablePorts] = useState([]); 
  const [selectedPortIndex, setSelectedPortIndex] = useState("new"); 
  const [baudRate, setBaudRate] = useState(115200);
  const [virtualPortName, setVirtualPortName] = useState("ttyUSB0"); 
  
  const [showBaudMenu, setShowBaudMenu] = useState(false);
  const [isPortMenuOpen, setIsPortMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [consoleLogs, setConsoleLogs] = useState([]);
  const menuRef = useRef(null);
  const baudRef = useRef(null);
  const logEndRef = useRef(null);

  const commonBaudRates = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

  // 日志系统
  const addLog = (msg, type = 'info') => {
    const newLog = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      msg,
      type
    };
    setConsoleLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const clearLogs = () => setConsoleLogs([]);

  // 获取设备显示名称
  const getDeviceLabel = (info, index) => {
    const vid = info.usbVendorId;
    const pid = info.usbProductId;
    const hexVid = vid ? '0x' + vid.toString(16).toUpperCase().padStart(4, '0') : '????';
    const chipName = VENDOR_MAP[vid] || "Serial Device";
    return {
      title: `${chipName} (Port ${index + 1})`,
      subtitle: `ID: ${hexVid}:${pid ? '0x' + pid.toString(16).toUpperCase() : '????'}`
    };
  };

  // 刷新设备列表
  const refreshPorts = async () => {
    if (navigator.serial) {
      const ports = await navigator.serial.getPorts();
      setAvailablePorts(ports);
      // 自动选中第一个可用设备
      if (selectedPortIndex === "new" && ports.length > 0) {
        setSelectedPortIndex(0);
      }
    }
  };

  // 手动刷新按钮
  const handleManualRefresh = async (e) => {
    e.stopPropagation();
    setIsRefreshing(true);
    await refreshPorts();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 初始化检查
  useEffect(() => {
    if (!navigator.serial) {
      addLog("Web Serial API not supported in this browser.", "error");
    } else {
      refreshPorts();
      navigator.serial.addEventListener('connect', (e) => {
        addLog("Device connected.", "info");
        refreshPorts();
      });
      navigator.serial.addEventListener('disconnect', (e) => {
        addLog("Device disconnected.", "info");
        refreshPorts();
        if (port === e.target) disconnectAll();
      });
    }

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsPortMenuOpen(false);
      if (baudRef.current && !baudRef.current.contains(event.target)) setShowBaudMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [port]);

  // --- 断开逻辑 ---
  const disconnectAll = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (socket) { socket.close(); setSocket(null); }
      if (writer) { await writer.close(); setWriter(null); }
      if (port) { await port.close(); setPort(null); }
      setConnectionType('none');
      addLog("Disconnected.", "info");
    } catch (err) {
      addLog(`Error closing: ${err.message}`, "error");
    } finally {
      setIsBusy(false);
    }
  };

  // --- 核心连接逻辑 ---
  // targetPort: 可选，如果不传则使用当前 selectedPortIndex
  const connectToPort = async (targetPort = null) => {
    if (isBusy) return;
    setIsBusy(true);

    try {
      // 1. 如果没传端口，从列表里找
      if (!targetPort) {
        if (selectedPortIndex === "new" || selectedPortIndex === "virtual") {
          // 这种情况不应该发生，因为按钮逻辑已分离，但为了健壮性
          throw new Error("Please select a device first");
        }
        targetPort = availablePorts[selectedPortIndex];
      }

      if (!targetPort) throw new Error("Invalid port selected");

      // 2. 检查占用
      if (targetPort.readable || targetPort.writable) {
         throw new Error("Port is already open/busy.");
      }

      // 3. 打开连接
      await targetPort.open({ baudRate: parseInt(baudRate) });
      
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(targetPort.writable);
      const w = textEncoder.writable.getWriter();
      
      setPort(targetPort);
      setWriter(w);
      setConnectionType('physical');
      
      const info = targetPort.getInfo();
      const label = getDeviceLabel(info, availablePorts.indexOf(targetPort));
      addLog(`Connected: ${label.title} @ ${baudRate}`, "success");
      
      setIsPortMenuOpen(false);

    } catch (err) {
      console.error(err);
      addLog(err.message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  // --- 【关键修复】直接触发浏览器弹窗 ---
  const handleDirectPair = async () => {
    if (!navigator.serial) return;
    
    setIsPortMenuOpen(false); // 先关闭菜单
    
    try {
      // 这一步必须由用户点击直接触发，不能放在 async/await 之后太久
      const newPort = await navigator.serial.requestPort();
      
      // 获取到权限后，刷新列表
      const ports = await navigator.serial.getPorts();
      setAvailablePorts(ports);
      
      // 找到新设备的索引
      const index = ports.indexOf(newPort);
      if (index !== -1) {
        setSelectedPortIndex(index);
        // 可选：直接连接
        // connectToPort(newPort); 
        addLog("Device paired. Click 'Connect' to open.", "success");
      }
    } catch (err) {
      // 用户取消弹窗不算错误
      if (!err.message.includes("No port selected")) {
        addLog(`Pairing failed: ${err.message}`, "error");
      }
    }
  };

  // --- 虚拟连接 ---
  const connectVirtual = () => {
    if (isBusy) return;
    setIsBusy(true);
    setIsPortMenuOpen(false);

    addLog(`Connecting to bridge...`, "virtual");
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      setSocket(ws);
      setConnectionType('websocket');
      addLog(`Linked to Virtual Port: ${virtualPortName}`, "success");
      setIsBusy(false);
    };
    ws.onerror = () => {
      addLog("Bridge failed. Check python script.", "error");
      setIsBusy(false);
    };
    ws.onclose = () => {
      if (connectionType === 'websocket') disconnectAll();
    };
  };

  // --- 发送数据 ---
  const sendData = async (name, value) => {
    onJointChange(name, value);
    const data = `${name}:${value.toFixed(3)}\n`; 

    if (connectionType === 'physical' && writer) {
      await writer.write(data).catch(e => addLog(e.message, "error"));
    }
    else if (connectionType === 'websocket' && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data); 
    }
  };

  const resetJoint = (name) => sendData(name, 0);
  const resetAll = () => Object.keys(jointConfig).forEach(name => sendData(name, 0));

  return (
    <div className="w-96 h-full bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl z-10 shrink-0 transition-all">
      
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-black/20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className={clsx("p-2 rounded-lg transition-colors", connectionType !== 'none' ? (connectionType === 'websocket' ? "bg-orange-500/20" : "bg-emerald-500/20") : "bg-indigo-500/20")}>
            <Cpu className={clsx("w-6 h-6", connectionType !== 'none' ? (connectionType === 'websocket' ? "text-orange-400" : "text-emerald-400") : "text-indigo-400")} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">RoboControl</h1>
            <p className="text-xs text-slate-500">Serial Interface</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-1">
          <div className={clsx(
            "w-3 h-3 rounded-full transition-all duration-500",
            connectionType === 'physical' && "bg-emerald-500 shadow-[0_0_12px_#10b981]",
            connectionType === 'websocket' && "bg-orange-500 shadow-[0_0_12px_#f97316]",
            connectionType === 'none' && "bg-red-500/30 border border-red-500/50"
          )} />
          <span className={clsx("text-[9px] font-bold tracking-widest uppercase", 
            connectionType === 'physical' ? "text-emerald-500" : (connectionType === 'websocket' ? "text-orange-500" : "text-slate-600")
          )}>
            {connectionType === 'none' ? "OFFLINE" : (connectionType === 'physical' ? "USB" : "VIRTUAL")}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        
        {/* Connection Section */}
        <section className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Hardware Link</h3>
          </div>

          {connectionType === 'none' ? (
            <div className="flex flex-col gap-3">
              
              {/* 1. 设备选择器 */}
              <div className="relative" ref={menuRef}>
                 <button 
                    onClick={() => setIsPortMenuOpen(!isPortMenuOpen)}
                    className="w-full bg-slate-800 border border-slate-600 hover:border-indigo-500 text-left text-slate-200 text-xs rounded-lg p-3 flex items-center justify-between transition-all group"
                 >
                    <div className="flex items-center gap-3 overflow-hidden">
                        {selectedPortIndex === "virtual" ? <Network className="w-4 h-4 text-orange-400" /> : <Usb className="w-4 h-4 text-slate-400 group-hover:text-white" />}
                        
                        <div className="flex flex-col truncate">
                            {/* 显示当前选中项 */}
                            {selectedPortIndex === "new" && <span className="font-medium text-slate-400 italic">Select a device...</span>}
                            {selectedPortIndex === "virtual" && <span className="font-bold text-orange-300">Virtual Bridge</span>}
                            {typeof selectedPortIndex === 'number' && (
                                <>
                                    <span className="font-bold text-emerald-300">
                                        {availablePorts[selectedPortIndex] ? getDeviceLabel(availablePorts[selectedPortIndex].getInfo(), selectedPortIndex).title : "Device Not Found"}
                                    </span>
                                    <span className="text-[9px] text-slate-500">
                                        {availablePorts[selectedPortIndex] ? getDeviceLabel(availablePorts[selectedPortIndex].getInfo(), selectedPortIndex).subtitle : "Please Reselect"}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                 </button>

                 {isPortMenuOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 overflow-hidden">
                        <div className="py-1">
                           {/* 物理设备标题 & 刷新 */}
                           <div className="px-3 py-2 bg-black/20 flex justify-between items-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold">Physical (USB)</span>
                              <button 
                                onClick={handleManualRefresh}
                                className={clsx("p-1 text-slate-500 hover:text-white transition-colors rounded", isRefreshing && "animate-spin")}
                                title="Refresh Device List"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </button>
                           </div>

                            {/* 【关键修改】直接点击配对，不选状态 */}
                            <button 
                                onClick={handleDirectPair} 
                                className="w-full text-left px-4 py-3 hover:bg-indigo-500/20 flex items-center gap-2 border-b border-white/5"
                            >
                                <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">+</div>
                                <div className="flex flex-col">
                                   <span className="text-xs font-bold text-white">Pair New Device</span>
                                   <span className="text-[9px] text-slate-400">Open browser picker</span>
                                </div>
                            </button>
                            
                            {availablePorts.map((p, i) => {
                                const { title } = getDeviceLabel(p.getInfo(), i);
                                return (
                                  <button key={i} onClick={() => { setSelectedPortIndex(i); setIsPortMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-700 flex items-center gap-2">
                                      <Usb className="w-4 h-4 text-emerald-500" />
                                      <span className="text-xs text-white truncate">{title}</span>
                                  </button>
                                )
                            })}
                            
                            {availablePorts.length === 0 && (
                               <div className="px-4 py-2 text-[10px] text-slate-600 italic">No paired devices found</div>
                            )}
                            
                            {/* 虚拟设备选项 */}
                            <div className="px-3 py-1.5 text-[9px] text-slate-500 uppercase font-bold bg-black/20 mt-1">Debug</div>
                            <button onClick={() => { setSelectedPortIndex("virtual"); setIsPortMenuOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-orange-500/10 flex items-center gap-2 group">
                                <Network className="w-4 h-4 text-slate-400 group-hover:text-orange-400" />
                                <span className="text-xs text-slate-300 group-hover:text-orange-300">Use Virtual Port</span>
                            </button>
                        </div>
                    </div>
                 )}
              </div>

              {/* 2. 第二行：参数设置 + 连接按钮 */}
              <div className="flex gap-2 h-10">
                {selectedPortIndex === "virtual" ? (
                    <div className="relative flex-1 group">
                        <input 
                            type="text" 
                            value={wsUrl}
                            onChange={(e) => setWsUrl(e.target.value)}
                            className="w-full h-full bg-slate-800 border border-slate-600 rounded-lg px-3 text-xs text-orange-300 focus:border-orange-500 outline-none font-mono placeholder-slate-600 transition-all"
                            placeholder="ws://localhost:8080"
                        />
                    </div>
                ) : (
                    <div className="relative w-32 shrink-0" ref={baudRef}>
                        <div className="flex h-full">
                            <input 
                                type="number" 
                                value={baudRate}
                                onChange={(e) => setBaudRate(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-600 border-r-0 rounded-l-lg px-2 text-xs text-white focus:border-indigo-500 outline-none text-center font-mono"
                                placeholder="Baud"
                            />
                            <button 
                                onClick={() => setShowBaudMenu(!showBaudMenu)}
                                className="bg-slate-800 border border-slate-600 border-l-0 rounded-r-lg px-1.5 hover:bg-slate-700 text-slate-400 transition-colors"
                            >
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                        {showBaudMenu && (
                            <div className="absolute top-full mt-1 left-0 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                {commonBaudRates.map(r => (
                                    <button key={r} onClick={() => { setBaudRate(r); setShowBaudMenu(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-white font-mono transition-colors">
                                        {r}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 智能 Connect 按钮 */}
                <button 
                    onClick={selectedPortIndex === 'virtual' ? connectVirtual : () => connectToPort()} 
                    disabled={isBusy || (selectedPortIndex === 'new')}
                    className={clsx(
                        "flex-1 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-all text-xs font-bold uppercase tracking-wide",
                        (isBusy || selectedPortIndex === 'new') ? "bg-slate-700 text-slate-500 cursor-not-allowed" : 
                        selectedPortIndex === "virtual" ? "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20" : 
                        "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                    )}
                >
                    {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : (selectedPortIndex === 'virtual' ? <Network className="w-3 h-3"/> : <Usb className="w-3 h-3" />)}
                    {isBusy ? "Wait..." : "Connect"}
                </button>
              </div>
              
              {/* 提示信息 */}
              {selectedPortIndex === "new" && (
                <div className="flex items-center gap-2 text-[10px] text-yellow-500/80 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                   <AlertTriangle className="w-3 h-3" />
                   <span>Click "Pair New Device" first.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-1 border border-slate-700">
                <button 
                  onClick={disconnectAll} 
                  disabled={isBusy}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center gap-2 border border-red-500/20 transition-all text-xs font-bold uppercase"
                >
                  {isBusy ? "..." : <><Unplug className="w-4 h-4" /> Disconnect</>}
                </button>
                <div className="text-center text-[10px] text-slate-500 py-1 font-mono flex justify-center items-center gap-2">
                   {connectionType === 'websocket' ? <Network className="w-3 h-3 text-orange-500" /> : <Usb className="w-3 h-3 text-emerald-500" />}
                   {connectionType === 'websocket' ? `Bridge` : `${baudRate} bps`}
                </div>
            </div>
          )}
        </section>

        {/* Model Source */}
        <section>
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Model Source</h3>
          <button onClick={onOpenUpload} className="w-full border-2 border-dashed border-slate-600 hover:border-indigo-400 hover:text-indigo-300 text-slate-400 rounded-xl p-4 flex flex-col items-center gap-2 transition-all bg-slate-800/30 hover:bg-slate-800/80 group">
            <FolderOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Import URDF / ZIP</span>
          </button>
        </section>

        {/* Joint Controls */}
        <section>
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Joints</h3>
             </div>
             {Object.keys(jointConfig).length > 0 && (
               <button onClick={resetAll} className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-all border border-white/5 hover:border-white/20">
                 <RefreshCw className="w-3 h-3" /> Reset All
               </button>
             )}
          </div>
          <div className="space-y-3">
            {Object.keys(jointConfig).length === 0 && (
               <div className="text-center text-slate-600 text-xs py-8 border border-dashed border-slate-800 rounded-xl bg-slate-900/50 flex flex-col items-center gap-2">
                 <div className="opacity-50">No joints active</div>
               </div>
            )}
            {Object.keys(jointConfig).map((name) => (
              <div key={name} className="bg-slate-800/40 p-3 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-colors group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-2 truncate max-w-[140px]" title={name}>
                    <div className="w-1 h-4 rounded-full bg-indigo-500/50 group-hover:bg-indigo-400 transition-colors"></div>
                    {name}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-indigo-300 bg-black/30 px-1.5 py-0.5 rounded min-w-[40px] text-right">{jointValues[name]?.toFixed(2)}</span>
                    <button onClick={() => resetJoint(name)} className="p-1 hover:bg-indigo-500 rounded text-slate-600 hover:text-white transition-colors ml-1" title="Reset to 0">
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 w-6 text-right font-mono">{jointConfig[name].min.toFixed(1)}</span>
                    <input type="range" min={jointConfig[name].min} max={jointConfig[name].max} step={0.01} value={jointValues[name] || 0} onChange={(e) => sendData(name, parseFloat(e.target.value))} className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400" />
                    <span className="text-[9px] text-slate-500 w-6 font-mono">{jointConfig[name].max.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      {/* Console */}
      <div className="h-40 bg-[#0a0f1c] border-t border-white/10 flex flex-col shrink-0 relative group">
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <button onClick={clearLogs} className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors" title="Clear Output">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        
        <div className="flex items-center px-3 py-2 border-b border-white/5 bg-black/20 select-none">
           <Terminal className="w-3 h-3 text-slate-500 mr-2" />
           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Output</span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar" ref={logEndRef}>
           {consoleLogs.length === 0 && (
             <div className="flex items-center gap-2 text-slate-700 italic mt-2 pl-1">
               <div className="w-1 h-1 rounded-full bg-slate-700 animate-pulse"></div>
               Ready.
             </div>
           )}
           {consoleLogs.map((log) => (
             <div key={log.id} className={clsx(
               "flex items-start gap-2 px-2 py-1 rounded border border-transparent transition-all animate-in slide-in-from-left-1 duration-200",
               log.type === 'error' ? "bg-red-900/10 border-red-500/10 text-red-300" :
               log.type === 'success' ? "bg-emerald-900/10 border-emerald-500/10 text-emerald-300" :
               log.type === 'virtual' ? "bg-cyan-900/10 border-cyan-500/10 text-cyan-300" :
               "text-slate-400 hover:bg-white/5"
             )}>
                <span className="text-[9px] opacity-40 shrink-0 mt-[1px] select-none font-sans">{log.time}</span>
                <span className="shrink-0 mt-[1px]">
                  {log.type === 'error' ? <XCircle className="w-3 h-3 text-red-500" /> :
                   log.type === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> :
                   log.type === 'virtual' ? <Network className="w-3 h-3 text-cyan-500" /> :
                   <Info className="w-3 h-3 text-slate-600" />}
                </span>
                <span className="break-all leading-relaxed">{log.msg}</span>
             </div>
           ))}
           <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};