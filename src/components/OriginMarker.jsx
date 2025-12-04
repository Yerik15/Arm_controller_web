/*
 * @Author: _yerik
 * @Date: 2025-12-02 10:55:10
 * @LastEditTime: 2025-12-02 11:17:03
 * @LastEditors: _yerik
 * @Description: 
 * Code. Run. No errors.
 */
import React from 'react';

export const OriginMarker = () => {
    return (
        <group>
            {/* 核心亮点：使用 MeshPhysicalMaterial 打造磨砂银质感 */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.04, 32, 32]} />
                <meshPhysicalMaterial
                    color="#e2e8f0"
                    emissive="#ffffff"
                    emissiveIntensity={0.2} // 微微自发光
                    roughness={0.2}
                    metalness={0.8}
                    clearcoat={1}
                />
            </mesh>

            {/* 底部光圈：标识这个点是在平面上的 */}
            <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.06, 0.07, 64]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
            </mesh>
        </group>
    );
};