import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RobotModel } from './components/RobotModel';
import { Interface } from './components/Interface';
import { StatusOverlay } from './components/StatusOverlay';
import { UploadModal } from './components/UploadModal';
import { OriginMarker } from './components/OriginMarker';

function App() {
  const [fileMap, setFileMap] = useState(null);
  const [jointConfig, setJointConfig] = useState({});
  const [jointValues, setJointValues] = useState({});
  const [loadStatus, setLoadStatus] = useState({ status: 'idle', message: '' });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleJointChange = (name, value) => {
    setJointValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilesLoaded = (newMap) => {
    setFileMap(newMap);
    setLoadStatus({ status: 'loading', message: 'Processing...' });
  };

  return (
    <div className="w-full h-screen flex bg-black overflow-hidden">
      <StatusOverlay status={loadStatus.status} message={loadStatus.message} />
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onLoadFiles={handleFilesLoaded}
      />

      <div className="flex-1 relative h-full bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        
        <Canvas shadows gl={{ antialias: false }} camera={{ position: [1.5, 1.5, 1.5], fov: 45 }}>
          <Suspense fallback={null}>
            
            <Environment preset="city" intensity={1.2} />
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

            <RobotModel 
              fileMap={fileMap} 
              setJointConfig={setJointConfig}
              jointValues={jointValues}
              setLoadStatus={setLoadStatus} 
            />

            <group position={[0, -0.001, 0]}>
               <ContactShadows resolution={1024} scale={10} blur={1.5} opacity={0.5} far={1} color="#000000" />
               <Grid 
                 infiniteGrid 
                 cellSize={0.5} 
                 sectionSize={2} 
                 fadeDistance={25} 
                 sectionColor="#6366f1" 
                 cellColor="#1e293b"
                 position={[0, -0.01, 0]}
               />
               <OriginMarker />
            </group>

            {/* === 强制左下角 XYZ 坐标轴 === 
                margin: 调整到 [80, 80] 避免贴边
                renderOrder: 999 确保在最上层绘制
            */}
            <GizmoHelper alignment="bottom-left" margin={[80, 80]} renderOrder={999}>
              <GizmoViewport 
                axisColors={['#ef4444', '#22c55e', '#3b82f6']} 
                labelColor="white"
                hideNegativeAxes={false}
              />
            </GizmoHelper>

            <EffectComposer disableNormalPass>
              <N8AO intensity={1.5} aoRadius={0.5} distanceFalloff={2} />
              <Bloom luminanceThreshold={1} intensity={0.5} levels={9} mipmapBlur />
              <Vignette eskil={false} offset={0.1} darkness={0.5} />
            </EffectComposer>

          </Suspense>

          <OrbitControls 
            makeDefault 
            enableDamping={true}
            dampingFactor={0.05}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.PAN,
              RIGHT: THREE.MOUSE.ROTATE 
            }}
            minDistance={0.1}
            maxDistance={100}
          />
        </Canvas>

        <div className="absolute top-6 left-6 pointer-events-none select-none z-0 opacity-50">
           <h1 className="text-4xl font-black text-white tracking-tighter mix-blend-overlay">
            URDF<span className="text-indigo-400">VIZ</span>
          </h1>
        </div>
      </div>

      <Interface 
        onOpenUpload={() => setIsUploadModalOpen(true)}
        jointConfig={jointConfig}
        jointValues={jointValues}
        onJointChange={handleJointChange}
      />
    </div>
  );
}

export default App;