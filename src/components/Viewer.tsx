import { Component, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Edges, Line, OrbitControls } from "@react-three/drei";
import { BufferAttribute, BufferGeometry, DoubleSide } from "three";
import type { MeshInfo, Motion, Vec3 } from "../domain/types";
export interface ViewerProps {
  mesh: MeshInfo;
  width: number;
  height: number;
  stockHeight: number;
  motions: Motion[];
  progress: number;
  top: boolean;
  partVisible: boolean;
  pathVisible: boolean;
}
function extent(p: ViewerProps) {
  const points: Vec3[] = [
    [0, 0, -p.stockHeight],
    [p.width, p.height, 10],
    ...p.motions.flatMap((m) => [m.from, m.to]),
  ];
  const min = [0, 0, -p.stockHeight],
    max = [p.width, p.height, 10];
  for (const point of points)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], point[a]);
      max[a] = Math.max(max[a], point[a]);
    }
  return {
    min,
    max,
    center: min.map((x, a) => (x + max[a]) / 2) as Vec3,
    size: Math.max(20, ...max.map((x, a) => x - min[a])),
  };
}
function TopView(p: ViewerProps) {
  const e = extent(p),
    pad = e.size * 0.15,
    w = e.max[0] - e.min[0] + pad * 2,
    h = e.max[1] - e.min[1] + pad * 2;
  const visible = p.motions.slice(
      0,
      Math.ceil((p.progress * p.motions.length) / 100),
    ),
    cursor = visible.at(-1)?.to;
  return (
    <svg
      className="top-view"
      role="img"
      aria-label="Werkzeugbahn in Draufsicht"
      viewBox={`${e.min[0] - pad} ${-e.max[1] - pad} ${w} ${h}`}
    >
      <defs>
        <pattern
          id="grid2d"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 10 0 L 0 0 0 10"
            fill="none"
            stroke="#253540"
            strokeWidth=".2"
          />
        </pattern>
      </defs>
      <rect
        x={e.min[0] - pad}
        y={-e.max[1] - pad}
        width={w}
        height={h}
        fill="url(#grid2d)"
      />
      <rect
        x="0"
        y={-p.height}
        width={p.width}
        height={p.height}
        fill="#2c424e"
        fillOpacity=".45"
        stroke="#c3a87a"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      {p.pathVisible
        ? visible.map((m, i) => (
            <path
              key={i}
              d={`M${m.from[0]},${-m.from[1]}L${m.to[0]},${-m.to[1]}`}
              stroke={m.kind === "cut" ? "#8be4cf" : "#d7ad73"}
              strokeWidth={m.kind === "cut" ? 1.7 : 0.8}
              strokeDasharray={m.kind === "rapid" ? "3 3" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      {cursor ? (
        <circle
          cx={cursor[0]}
          cy={-cursor[1]}
          r={e.size * 0.012}
          fill="#faf2d5"
        />
      ) : null}
    </svg>
  );
}
class ViewerBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <>
        <div className="webgl-note">
          WebGL nicht verfügbar · nutzbare 2D-Draufsicht
        </div>
        {this.props.fallback}
      </>
    ) : (
      this.props.children
    );
  }
}
function CameraRig({ center, size }: { center: Vec3; size: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.up.set(0, 0, 1);
    camera.position.set(
      center[0] + size * 1.1,
      center[1] - size * 1.35,
      center[2] + size * 1.1,
    );
    camera.lookAt(...center);
    camera.updateProjectionMatrix();
  }, [camera, center, size]);
  return (
    <OrbitControls
      makeDefault
      target={center}
      enableDamping
      minDistance={1}
      maxDistance={size * 12}
    />
  );
}
function Scene(p: ViewerProps) {
  const e = useMemo(() => extent(p), [p]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry(),
      positions = p.mesh.positions.slice();
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] -= p.mesh.min[0];
      positions[i + 1] -= p.mesh.min[1];
      positions[i + 2] -= p.mesh.max[2];
    }
    g.setAttribute("position", new BufferAttribute(positions, 3));
    g.computeVertexNormals();
    return g;
  }, [p.mesh]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const paths = useMemo(() => {
    const cut: Vec3[] = [],
      rapid: Vec3[] = [];
    for (const m of p.motions.slice(
      0,
      Math.ceil((p.progress * p.motions.length) / 100),
    ))
      (m.kind === "cut" ? cut : rapid).push(m.from, m.to);
    return { cut, rapid };
  }, [p.motions, p.progress]);
  const cursor =
    p.motions[Math.max(0, Math.ceil((p.progress * p.motions.length) / 100) - 1)]
      ?.to;
  return (
    <>
      <color attach="background" args={["#101b25"]} />
      <ambientLight intensity={1.5} />
      <directionalLight position={[50, -80, 150]} intensity={3} />
      <directionalLight
        position={[-100, 80, 80]}
        color="#8bb8d8"
        intensity={2}
      />
      <CameraRig center={e.center} size={e.size} />
      <gridHelper
        args={[Math.max(200, e.size * 3), 30, "#38505d", "#21333f"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[p.width / 2, p.height / 2, -p.stockHeight - 0.5]}
      />
      <mesh position={[p.width / 2, p.height / 2, -p.stockHeight / 2]}>
        <boxGeometry args={[p.width, p.height, p.stockHeight]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges color="#a68c68" lineWidth={0.8} />
      </mesh>
      {p.partVisible ? (
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color="#8bafc0"
            metalness={0.55}
            roughness={0.35}
            transparent
            opacity={0.32}
            depthWrite={false}
            side={DoubleSide}
          />
          <Edges threshold={25} color="#91a7ae" lineWidth={0.65} />
        </mesh>
      ) : null}
      {p.pathVisible ? (
        <>
          {paths.cut.length > 1 ? (
            <Line points={paths.cut} segments color="#8be4cf" lineWidth={1.6} />
          ) : null}
          {paths.rapid.length > 1 ? (
            <Line
              points={paths.rapid}
              segments
              color="#d0a572"
              lineWidth={0.85}
              dashed
              dashSize={2}
              gapSize={1.4}
            />
          ) : null}
        </>
      ) : null}
      {cursor && p.pathVisible ? (
        <mesh position={cursor}>
          <sphereGeometry args={[e.size * 0.012, 16, 16]} />
          <meshBasicMaterial color="#fff2c4" />
        </mesh>
      ) : null}
      <axesHelper args={[Math.min(p.width, p.height) * 0.4]} />
    </>
  );
}
export default function Viewer(p: ViewerProps) {
  if (p.top) return <TopView {...p} />;
  return (
    <ViewerBoundary fallback={<TopView {...p} />}>
      <Canvas
        camera={{ fov: 40, near: 0.1, far: 1000000, up: [0, 0, 1] }}
        dpr={[1, 1.8]}
        gl={{ antialias: true }}
        fallback={<TopView {...p} />}
      >
        <Scene {...p} />
      </Canvas>
    </ViewerBoundary>
  );
}
