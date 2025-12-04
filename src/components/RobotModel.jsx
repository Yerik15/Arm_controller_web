import React, { useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import URDFLoader from 'urdf-loader';
import { LoadingManager, MeshPhysicalMaterial, Box3, Vector3, DoubleSide, Color } from 'three';

export const RobotModel = ({ fileMap, jointValues, setJointConfig, setLoadStatus }) => {
  const [robot, setRobot] = useState(null);
  const { scene } = useThree();

  useEffect(() => {
    if (!fileMap || !fileMap.urdf) return;

    setLoadStatus({ status: 'loading', message: 'Building Robot...' });
    console.log("🚀 启动加载器...");

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    let pendingRobot = null;

    // 1. 智能路径匹配
    manager.setURLModifier((url) => {
      if (url.startsWith('blob:')) return url;
      const targetFileName = url.split('/').pop().split('\\').pop().toLowerCase().replace(/%20/g, " ");
      const foundKey = Object.keys(fileMap).find(key => key.toLowerCase() === targetFileName);
      if (foundKey) return fileMap[foundKey];
      return url;
    });

    // 2. 解析 URDF
    loader.load(
      fileMap.urdf,
      (loadedRobot) => {
        loadedRobot.rotation.x = -Math.PI / 2;
        pendingRobot = loadedRobot;
      }
    );

    // 3. 后处理：美化与居中
    manager.onLoad = () => {
      if (!pendingRobot) return;

      // --- 🎨 材质美化 (升级版) ---
      // 使用更明亮、更有质感的“铂金白”作为默认材质
      const fallbackMaterial = new MeshPhysicalMaterial({
        color: new Color("#f3f4f6"), // 更亮的铂金白 (代替之前的暗灰)
        roughness: 0.25,             // 降低粗糙度，让表面更光滑、反射更清晰
        metalness: 0.7,              // 保持高金属感
        clearcoat: 0.5,              // 增加一层明显的清漆，提升高级感
        clearcoatRoughness: 0.1,
        side: DoubleSide,
        envMapIntensity: 1.5         // 增强环境反射强度
      });

      pendingRobot.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
        
        if (child.isMesh) {
          // 逻辑：如果没有材质，或者材质是默认的纯白/纯灰，就用高级材质替换
          if (!child.material || (child.material.color && child.material.color.getHex() === 0xffffff)) {
            child.material = fallbackMaterial;
          } else {
             // 如果原有材质有颜色，我们尽量保留，但升级它的物理属性，让它更好看
             if (child.material.isMeshStandardMaterial || child.material.isMeshPhongMaterial) {
                 // 创建一个新的物理材质，继承原有的颜色和贴图
                 const newMat = new MeshPhysicalMaterial({
                   color: child.material.color,
                   map: child.material.map,
                   roughness: 0.3,
                   metalness: 0.5,
                   side: DoubleSide,
                   envMapIntensity: 1.2
                 });
                 child.material = newMat;
             }
          }
        }
      });

      // --- 📏 自动居中与缩放 (保持不变) ---
      const box = new Box3().setFromObject(pendingRobot);
      const size = new Vector3();
      const center = new Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      console.log(`📦 模型尺寸: ${maxDim.toFixed(2)}m`);

      if (maxDim > 50) {
        pendingRobot.scale.setScalar(0.001);
        center.multiplyScalar(0.001);
        size.multiplyScalar(0.001);
      }

      pendingRobot.position.x -= center.x;
      pendingRobot.position.z -= center.z;
      pendingRobot.position.y -= (center.y - size.y / 2); 

      // --- 提取关节 ---
      const joints = {};
      let jointCount = 0;
      Object.keys(pendingRobot.joints).forEach((key) => {
        const joint = pendingRobot.joints[key];
        if (joint._jointType !== 'fixed') {
          joints[key] = { min: joint.limit.lower, max: joint.limit.upper, value: 0 };
          jointCount++;
        }
      });

      setJointConfig(joints);
      setRobot(pendingRobot);
      setLoadStatus({ status: 'success', message: `Loaded ${jointCount} joints` });
      setTimeout(() => setLoadStatus({ status: 'idle', message: '' }), 1500);
    };

  }, [fileMap, setJointConfig, setLoadStatus]);

  useFrame(() => {
    if (robot && jointValues) {
      Object.keys(jointValues).forEach((key) => {
        if (robot.joints[key] && typeof jointValues[key] === 'number') {
          robot.setJointValue(key, jointValues[key]);
        }
      });
    }
  });

  return robot ? <primitive object={robot} dispose={null} /> : null;
};