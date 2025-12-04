import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, Vignette } from '@react-three/postprocessing'; // 引入后期特效
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
    <div className="w-full h-screen relative flex bg-black">
      <StatusOverlay status={loadStatus.status} message={loadStatus.message} />
      
      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        onLoadFiles={handleFilesLoaded}
      />

      <div className="flex-1 h-full relative bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        
        <Canvas shadows gl={{ antialias: false }} camera={{ position: [1.5, 1.5, 1.5], fov: 45 }}>
          <Suspense fallback={null}>
            
            {/* 💡 1. 环境光照 (核心升级) */}
            {/* 使用 "city" 预设，提供丰富的反射细节，让金属不再死黑 */}
            <Environment preset="city" intensity={1.2} />
            
            {/* 补充一点微弱的全局光，防止死角太黑 */}
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />

            <RobotModel 
              fileMap={fileMap} 
              setJointConfig={setJointConfig}
              jointValues={jointValues}
              setLoadStatus={setLoadStatus} 
            />

            <group position={[0, -0.001, 0]}>
               {/* 💡 2. 接地阴影 */}
               {/* 让机器人稳稳地“站”在地上，而不是飘着 */}
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

            <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
              <GizmoViewport 
                axisColors={['#ff6b6b', '#4ecdc4', '#45b7d1']} 
                labelColor="black" 
                hideNegativeAxes
              />
            </GizmoHelper>

            {/* 💡 3. 后期处理特效 (画质注入灵魂) */}
            <EffectComposer disableNormalPass>
              {/* N8AO: 高性能环境光遮蔽，增加缝隙阴影，极大地提升立体感 */}
              <N8AO intensity={1.5} aoRadius={0.5} distanceFalloff={2} />
              
              {/* Bloom: 辉光效果，让高光部分带有微微的晕染，更有质感 */}
              <Bloom luminanceThreshold={1} intensity={0.5} levels={9} mipmapBlur />

              {/* Vignette: 暗角，让视线集中在屏幕中心 */}
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
            enableZoom={true}
            zoomSpeed={1.0}
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