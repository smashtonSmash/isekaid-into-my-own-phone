import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  ACESFilmicToneMapping,
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  Raycaster,
  Vector2,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
} from 'three'
import {
  BUILDING_POS,
  PEOPLE_POS,
  VILLAGERS,
  growthOf,
  plotCoords,
} from '../game/data.ts'
import type { CropId, GameState, VillagerId } from '../game/types.ts'
import { getPaint, type PaintSet } from './paint.ts'
import type { WorldPick } from './pick.ts'

const TexContext = createContext<PaintSet | null>(null)

function useTex(): PaintSet {
  const tex = useContext(TexContext)
  if (!tex) throw new Error('paint missing')
  return tex
}

const OFFSET = new Vector3(1, 1.05, 1).normalize()
const MIN_DIST = 14
const MAX_DIST = 34

const TREES: { x: number; z: number; s: number; k: 0 | 1 | 2 }[] = [
  { x: -9.4, z: -6.2, s: 1.2, k: 0 },
  { x: -8.6, z: -3.1, s: 1.05, k: 1 },
  { x: -9.2, z: 0.4, s: 1.3, k: 0 },
  { x: -8.4, z: 4.6, s: 1.1, k: 2 },
  { x: -6.2, z: 6.8, s: 1.25, k: 0 },
  { x: -2.8, z: 7.2, s: 1.15, k: 1 },
  { x: 0.6, z: 7.4, s: 1.35, k: 0 },
  { x: 3.8, z: 6.9, s: 1.1, k: 2 },
  { x: 7.2, z: 6.2, s: 1.2, k: 0 },
  { x: 9.2, z: 3.4, s: 1.15, k: 1 },
  { x: 9.5, z: -0.4, s: 1.3, k: 0 },
  { x: 8.8, z: -4.2, s: 1.05, k: 0 },
  { x: 6.4, z: -7.1, s: 1.2, k: 1 },
  { x: 2.4, z: -7.6, s: 1.25, k: 0 },
  { x: -1.6, z: -7.5, s: 1.15, k: 2 },
  { x: -5.4, z: -6.8, s: 1.3, k: 0 },
  { x: -7.6, z: 2.2, s: 0.9, k: 1 },
  { x: -3.8, z: 2.55, s: 0.85, k: 2 },
  { x: 2.35, z: -1.35, s: 0.95, k: 0 },
  { x: 8.2, z: 2.4, s: 1.05, k: 2 },
]

function clampTarget(target: Vector3) {
  target.x = Math.min(8, Math.max(-8, target.x))
  target.y = 0
  target.z = Math.min(6.5, Math.max(-6.5, target.z))
}

function skyFor(hour: number) {
  const dusk = hour < 6 || hour >= 20
  const golden = !dusk && hour >= 17
  return {
    sky: dusk ? '#c5d4ef' : golden ? '#ffd2a6' : '#b7e3fb',
    fog: dusk ? '#d5e0f2' : golden ? '#ffe3c4' : '#f3ead2',
    sun: dusk ? '#e4ecff' : '#fff3d2',
    sunI: dusk ? 0.95 : golden ? 1.22 : 1.32,
    amb: dusk ? 0.68 : 0.55,
  }
}

function IsoRig({ onPick }: { onPick: (pick: WorldPick) => void }) {
  const { camera, gl, scene } = useThree()
  const target = useMemo(() => new Vector3(-0.15, 0, 1.05), [])
  const distance = useRef(22)
  const onPickRef = useRef(onPick)
  const raycaster = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])
  const right = useMemo(() => new Vector3(), [])
  const forward = useMemo(() => new Vector3(), [])

  const place = useCallback(() => {
    camera.position.copy(OFFSET).multiplyScalar(distance.current).add(target)
    camera.lookAt(target)
  }, [camera, target])

  useLayoutEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    perspective.fov = 32
    perspective.near = 0.1
    perspective.far = 80
    perspective.updateProjectionMatrix()
    place()
  }, [camera, place])

  useEffect(() => {
    const el = gl.domElement
    el.style.touchAction = 'none'
    el.style.imageRendering = 'auto'
    const pointers = new Map<number, { x: number; y: number }>()
    let moved = 0
    let multi = false
    let pinch: number | null = null
    let lastX = 0
    let lastY = 0
    let active = -1

    const pinchDistance = () => {
      const pts = [...pointers.values()]
      if (pts.length < 2) return 0
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        /* pointer already released */
      }
      if (pointers.size === 1) {
        moved = 0
        multi = false
        pinch = null
        active = event.pointerId
        lastX = event.clientX
        lastY = event.clientY
      } else {
        multi = true
        pinch = pinchDistance()
      }
    }

    const onMove = (event: PointerEvent) => {
      const point = pointers.get(event.pointerId)
      if (!point) return
      event.preventDefault()
      point.x = event.clientX
      point.y = event.clientY
      if (pointers.size >= 2) {
        multi = true
        const dist = pinchDistance()
        if (pinch != null) distance.current = Math.min(MAX_DIST, Math.max(MIN_DIST, distance.current - (dist - pinch) * 0.045))
        pinch = dist
        return
      }
      if (event.pointerId !== active) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      camera.updateMatrixWorld()
      right.setFromMatrixColumn(camera.matrixWorld, 0)
      right.y = 0
      if (right.lengthSq() < 1e-6) return
      right.normalize()
      forward.setFromMatrixColumn(camera.matrixWorld, 2)
      forward.y = 0
      if (forward.lengthSq() < 1e-6) return
      forward.normalize()
      const scale = distance.current * 0.0022
      target.addScaledVector(right, -dx * scale)
      target.addScaledVector(forward, -dy * scale)
      clampTarget(target)
    }

    const onUp = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return
      pointers.delete(event.pointerId)
      try {
        el.releasePointerCapture(event.pointerId)
      } catch {
        /* not captured */
      }
      if (pointers.size >= 2) {
        pinch = pinchDistance()
        return
      }
      pinch = null
      if (pointers.size === 1) {
        const [id, pt] = [...pointers.entries()][0]
        active = id
        lastX = pt.x
        lastY = pt.y
        return
      }
      if (multi || moved >= 14) return
      const rect = el.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      for (const hit of hits) {
        let obj: Object3D | null = hit.object
        while (obj) {
          const pick = obj.userData.pick as WorldPick | undefined
          if (pick) {
            onPickRef.current(pick)
            return
          }
          obj = obj.parent
        }
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scale = event.deltaMode === 1 ? 16 : 1
      distance.current = Math.min(MAX_DIST, Math.max(MIN_DIST, distance.current + event.deltaY * 0.01 * scale))
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove, { passive: false })
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [camera, forward, gl, ndc, raycaster, right, scene, target])

  useFrame(place)
  return null
}

function Lights({ hour }: { hour: number }) {
  const look = skyFor(hour)
  return (
    <>
      <color attach="background" args={[look.sky]} />
      <fog attach="fog" args={[look.fog, 24, 54]} />
      <ambientLight intensity={look.amb} color="#fff6ea" />
      <hemisphereLight args={[look.sun, '#6f9a45', 0.55]} />
      <directionalLight
        position={[14, 18, 8]}
        intensity={look.sunI}
        color={look.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-near={2}
        shadow-camera-far={48}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <mesh position={[16, 18, 6]}>
        <sphereGeometry args={[1.1, 16, 12]} />
        <meshBasicMaterial color={look.sun} />
      </mesh>
    </>
  )
}

function Ground() {
  const tex = useTex()
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
        <circleGeometry args={[28, 48]} />
        <meshStandardMaterial color="#5d8a38" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0, 0.2]} receiveShadow>
        <circleGeometry args={[20, 48]} />
        <meshStandardMaterial map={tex.grass} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.6, 0.015, 2.9]} receiveShadow>
        <circleGeometry args={[2.3, 20]} />
        <meshStandardMaterial map={tex.wheat} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.05]} position={[-1.2, 0.02, 0.15]} receiveShadow>
        <planeGeometry args={[8.4, 1.15]} />
        <meshStandardMaterial map={tex.path} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.4, 0.02, -2.4]} receiveShadow>
        <planeGeometry args={[1.15, 6.4]} />
        <meshStandardMaterial map={tex.path} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.4]} position={[3.6, 0.02, -0.6]} receiveShadow>
        <planeGeometry args={[4.2, 1.05]} />
        <meshStandardMaterial map={tex.path} roughness={1} />
      </mesh>
    </group>
  )
}

function Stream() {
  const tex = useTex()
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => {
    const material = ref.current?.material
    if (!(material instanceof MeshStandardMaterial) || !material.map) return
    material.map.offset.y -= dt * 0.05
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0.08]} position={[8.55, 0.012, -0.2]} receiveShadow>
        <planeGeometry args={[2.1, 15]} />
        <meshStandardMaterial map={tex.path} color="#c9b08a" roughness={1} />
      </mesh>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0.08]} position={[8.55, 0.03, -0.2]}>
        <planeGeometry args={[1.15, 14.2]} />
        <meshStandardMaterial map={tex.water} roughness={0.18} metalness={0.04} transparent opacity={0.95} />
      </mesh>
      <mesh position={[8.15, 0.18, -1.1]} rotation={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[1.5, 0.08, 0.7]} />
        <meshStandardMaterial color="#8a5a34" roughness={0.8} />
      </mesh>
    </group>
  )
}

function Fence({ x1, z1, x2, z2, posts }: { x1: number; z1: number; x2: number; z2: number; posts: number }) {
  const dx = x2 - x1
  const dz = z2 - z1
  const len = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  const tex = useTex()
  const bits: ReactNode[] = []
  for (let i = 0; i <= posts; i += 1) {
    const t = i / posts
    bits.push(
      <mesh key={`p${i}`} position={[x1 + dx * t, 0.28, z1 + dz * t]} castShadow>
        <boxGeometry args={[0.08, 0.56, 0.08]} />
        <meshStandardMaterial map={tex.timber} roughness={1} />
      </mesh>,
    )
  }
  return (
    <group>
      {bits}
      <mesh position={[(x1 + x2) / 2, 0.4, (z1 + z2) / 2]} rotation={[0, yaw, 0]} castShadow>
        <boxGeometry args={[0.05, 0.06, len]} />
        <meshStandardMaterial map={tex.timber} roughness={1} />
      </mesh>
      <mesh position={[(x1 + x2) / 2, 0.18, (z1 + z2) / 2]} rotation={[0, yaw, 0]} castShadow>
        <boxGeometry args={[0.04, 0.05, len]} />
        <meshStandardMaterial map={tex.timber} roughness={1} />
      </mesh>
    </group>
  )
}

function Trees() {
  const tex = useTex()
  return (
    <group>
      {TREES.map((tree) => (
        <group key={`${tree.x}-${tree.z}`} position={[tree.x, 0, tree.z]} scale={tree.s}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.18, 1.1, 7]} />
            <meshStandardMaterial map={tex.bark} roughness={1} />
          </mesh>
          <mesh position={[0, 1.32, 0]} castShadow>
            <sphereGeometry args={[0.62, 12, 10]} />
            <meshStandardMaterial map={tree.k === 2 ? tex.blossom : tex.leaf} color={tree.k === 1 ? '#d7e7a8' : '#ffffff'} roughness={1} />
          </mesh>
          <mesh position={[0.28, 1.55, 0.08]} castShadow>
            <sphereGeometry args={[0.4, 10, 8]} />
            <meshStandardMaterial map={tree.k === 2 ? tex.blossom : tex.leaf} color={tree.k === 1 ? '#d7e7a8' : '#ffffff'} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Flowers() {
  const colors = ['#f4a8c4', '#ffe08a', '#ffffff', '#f39a32', '#d98adf']
  const spots = [
    [-2.5, 0.9],
    [-1.8, 0.82],
    [-0.9, 0.78],
    [0.2, 0.8],
    [1.1, 0.84],
    [1.9, 0.78],
    [2.6, 0.9],
    [-5.1, -0.2],
    [-4.2, 1.7],
    [4.8, -0.4],
    [3.2, 3.3],
  ]
  return (
    <group>
      {spots.map(([x, z], index) => (
        <mesh key={`${x}-${z}`} position={[x, 0.12, z]} castShadow>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color={colors[index % colors.length]} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function Wheat() {
  const tufts = useMemo(() => {
    const spots: { x: number; z: number; h: number }[] = []
    for (let x = 0; x < 7; x += 1) {
      for (let z = 0; z < 5; z += 1) {
        spots.push({ x: -7.5 + x * 0.32, z: 2.15 + z * 0.3, h: 0.55 + ((x + z) % 3) * 0.12 })
      }
    }
    return spots
  }, [])
  return (
    <group>
      {tufts.map((tuft) => (
        <mesh key={`${tuft.x}-${tuft.z}`} position={[tuft.x, tuft.h / 2, tuft.z]} castShadow>
          <coneGeometry args={[0.08, tuft.h, 4]} />
          <meshStandardMaterial color="#e6c85a" roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

function Roof({ w, d, h }: { w: number; d: number; h: number }) {
  const tex = useTex()
  const geom = useMemo(() => {
    const hw = w / 2
    const hd = d / 2
    const positions = new Float32Array([
      -hw, 0, hd, hw, 0, hd, 0, h, hd,
      hw, 0, -hd, -hw, 0, -hd, 0, h, -hd,
      -hw, 0, -hd, -hw, 0, hd, 0, h, hd,
      -hw, 0, -hd, 0, h, hd, 0, h, -hd,
      hw, 0, hd, hw, 0, -hd, 0, h, -hd,
      hw, 0, hd, 0, h, -hd, 0, h, hd,
    ])
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    return geometry
  }, [d, h, w])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial map={tex.thatch} roughness={1} />
    </mesh>
  )
}

function House({
  position,
  level,
  busy,
  pick,
  wall = '#fffaf3',
  w = 1.7,
  d = 1.45,
  tall = 1.25,
  porch = false,
}: {
  position: [number, number, number]
  level: number
  busy: boolean
  pick: WorldPick
  wall?: string
  w?: number
  d?: number
  tall?: number
  porch?: boolean
}) {
  const tex = useTex()
  if (level <= 0) {
    return (
      <group position={position} userData={{ pick }}>
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[w, 0.16, d]} />
          <meshStandardMaterial map={tex.timber} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.08, 0.8, 0.08]} />
          <meshStandardMaterial map={tex.timber} />
        </mesh>
        <mesh position={[0.28, 0.85, 0]}>
          <boxGeometry args={[0.46, 0.28, 0.06]} />
          <meshStandardMaterial color="#f4e2b8" />
        </mesh>
      </group>
    )
  }
  const scale = 1 + Math.max(0, level - 1) * 0.08
  return (
    <group position={position} scale={scale} userData={{ pick }}>
      <mesh position={[0, tall / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, tall, d]} />
        <meshStandardMaterial map={tex.plaster} color={wall} roughness={1} />
      </mesh>
      <mesh position={[0, tall * 0.72, d / 2 + 0.02]}>
        <boxGeometry args={[w + 0.04, 0.08, 0.06]} />
        <meshStandardMaterial map={tex.timber} />
      </mesh>
      <mesh position={[0, tall * 0.28, d / 2 + 0.02]}>
        <boxGeometry args={[w + 0.04, 0.08, 0.06]} />
        <meshStandardMaterial map={tex.timber} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(sx * w) / 2, tall / 2, (sz * d) / 2]} castShadow>
          <boxGeometry args={[0.07, tall, 0.07]} />
          <meshStandardMaterial map={tex.timber} />
        </mesh>
      ))}
      <group position={[0, tall, 0]}>
        <Roof w={w + 0.35} d={d + 0.28} h={0.72} />
      </group>
      <mesh position={[0, 0.38, d / 2 + 0.03]} castShadow>
        <boxGeometry args={[0.34, 0.62, 0.06]} />
        <meshStandardMaterial map={tex.timber} color="#5c331f" />
      </mesh>
      <mesh position={[-0.42, tall * 0.55, d / 2 + 0.04]}>
        <boxGeometry args={[0.28, 0.28, 0.05]} />
        <meshStandardMaterial color="#ffe7b8" emissive="#ffb15a" emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0.46, tall * 0.55, d / 2 + 0.04]}>
        <boxGeometry args={[0.28, 0.28, 0.05]} />
        <meshStandardMaterial color="#ffe7b8" emissive="#ffb15a" emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[w / 2 - 0.12, tall + 0.35, 0]} castShadow>
        <boxGeometry args={[0.22, 0.46, 0.22]} />
        <meshStandardMaterial map={tex.stone} />
      </mesh>
      {porch && (
        <mesh position={[0, 0.08, d / 2 + 0.45]} receiveShadow>
          <boxGeometry args={[w * 0.8, 0.1, 0.7]} />
          <meshStandardMaterial map={tex.timber} />
        </mesh>
      )}
      {busy && (
        <mesh position={[w / 2 + 0.2, 0.7, 0]}>
          <boxGeometry args={[0.06, 1.4, 0.06]} />
          <meshStandardMaterial color="#e6c56a" />
        </mesh>
      )}
    </group>
  )
}

function TownHall({ level, busy }: { level: number; busy: boolean }) {
  const tex = useTex()
  const pos = BUILDING_POS.hall
  const scale = 1 + Math.max(0, level - 1) * 0.04
  return (
    <group position={pos} scale={scale} userData={{ pick: { kind: 'hall' } satisfies WorldPick }}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.9, 2]} />
        <meshStandardMaterial map={tex.stone} roughness={1} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[2.4, 0.9, 1.7]} />
        <meshStandardMaterial map={tex.plaster} color="#f7f1e4" roughness={1} />
      </mesh>
      <group position={[0, 1.8, 0]}>
        <Roof w={2.9} d={2.15} h={0.95} />
      </group>
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[0.45, 0.7, 0.45]} />
        <meshStandardMaterial map={tex.timber} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <coneGeometry args={[0.4, 0.45, 4]} />
        <meshStandardMaterial map={tex.thatch} />
      </mesh>
      <mesh position={[0, 0.55, 1.02]} castShadow>
        <boxGeometry args={[0.5, 0.8, 0.08]} />
        <meshStandardMaterial color="#6b3a28" />
      </mesh>
      <mesh position={[-0.7, 1.4, 0.88]}>
        <boxGeometry args={[0.36, 0.42, 0.06]} />
        <meshStandardMaterial color="#ffe7b8" emissive="#ffb15a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.7, 1.4, 0.88]}>
        <boxGeometry args={[0.36, 0.42, 0.06]} />
        <meshStandardMaterial color="#ffe7b8" emissive="#ffb15a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.15, 1.7, 0.9]}>
        <boxGeometry args={[0.08, 0.7, 0.5]} />
        <meshStandardMaterial color="#c4493a" />
      </mesh>
      {busy && (
        <mesh position={[1.6, 0.8, 0.4]}>
          <boxGeometry args={[0.08, 1.6, 0.08]} />
          <meshStandardMaterial color="#e6c56a" />
        </mesh>
      )}
    </group>
  )
}

function CropVisual({ crop, fraction, stale }: { crop: CropId; fraction: number; stale: boolean }) {
  const bulb =
    crop === 'carrot' ? '#e07a2f' : crop === 'strawberry' ? '#d6455d' : crop === 'turnip' ? '#f6f1e4' : '#e2555a'
  const h = 0.18 + fraction * 0.4
  return (
    <group scale={stale ? 0.82 : 1}>
      <mesh position={[0, h, 0]} castShadow>
        <sphereGeometry args={[0.16 + fraction * 0.1, 10, 8]} />
        <meshStandardMaterial color="#3f8a32" roughness={1} />
      </mesh>
      {fraction > 0.45 && (
        <mesh position={[0.05, 0.1, 0.12]} castShadow>
          <sphereGeometry args={[0.1 + fraction * 0.04, 8, 6]} />
          <meshStandardMaterial color={bulb} roughness={0.7} />
        </mesh>
      )}
    </group>
  )
}

function Plots({ state, now }: { state: GameState; now: number }) {
  const tex = useTex()
  return (
    <group>
      {state.plots.map((plot, index) => {
        const [x, , z] = plotCoords(index)
        const growth = growthOf(plot, state.villagers, now)
        return (
          <group key={index} position={[x, 0, z]} userData={{ pick: { kind: 'plot', index } satisfies WorldPick }}>
            <mesh position={[0, 0.06, 0]} receiveShadow>
              <boxGeometry args={[1.05, 0.12, 1.05]} />
              <meshStandardMaterial map={tex.timber} />
            </mesh>
            <mesh position={[0, 0.14, 0]} receiveShadow>
              <boxGeometry args={[0.9, 0.08, 0.9]} />
              <meshStandardMaterial map={tex.soil} color={plot.watered ? '#8d5a32' : '#ffffff'} roughness={1} />
            </mesh>
            {plot.crop && growth && <CropVisual crop={plot.crop} fraction={growth.fraction} stale={growth.stale} />}
          </group>
        )
      })}
    </group>
  )
}

function Person({ id, hired }: { id: VillagerId; hired: boolean }) {
  const look = VILLAGERS[id].look
  const pos = PEOPLE_POS[id]
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.y = Math.sin(clock.elapsedTime * 2 + pos[0]) * 0.03
  })
  return (
    <group ref={ref} position={pos} userData={{ pick: { kind: 'villager', id } satisfies WorldPick }}>
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 1.5, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Chibi look={look} hired={hired} />
    </group>
  )
}

function Chibi({
  look,
  hired,
}: {
  look: { hair: string; skin: string; cloth: string; eye: string; extra: string }
  hired: boolean
}) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.28, 4, 8]} />
        <meshStandardMaterial color={look.cloth} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.92, 0]} castShadow>
        <sphereGeometry args={[0.26, 14, 12]} />
        <meshStandardMaterial color={look.skin} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <sphereGeometry args={[0.28, 14, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={look.hair} roughness={0.7} />
      </mesh>
      <mesh position={[-0.08, 0.94, 0.22]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={look.eye} />
      </mesh>
      <mesh position={[0.08, 0.94, 0.22]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color={look.eye} />
      </mesh>
      {look.extra === 'cat' && (
        <>
          <mesh position={[-0.12, 1.2, 0]} rotation={[0, 0, 0.4]}>
            <coneGeometry args={[0.06, 0.14, 4]} />
            <meshStandardMaterial color={look.hair} />
          </mesh>
          <mesh position={[0.12, 1.2, 0]} rotation={[0, 0, -0.4]}>
            <coneGeometry args={[0.06, 0.14, 4]} />
            <meshStandardMaterial color={look.hair} />
          </mesh>
        </>
      )}
      {look.extra === 'beard' && (
        <mesh position={[0, 0.78, 0.16]}>
          <sphereGeometry args={[0.1, 8, 6]} />
          <meshStandardMaterial color={look.hair} />
        </mesh>
      )}
      {look.extra === 'mustache' && (
        <mesh position={[0, 0.84, 0.22]}>
          <boxGeometry args={[0.14, 0.03, 0.04]} />
          <meshStandardMaterial color="#d9d3c8" />
        </mesh>
      )}
      {(look.extra === 'hat' || look.extra === 'sunhat') && (
        <group position={[0, 1.18, 0]}>
          <mesh>
            <cylinderGeometry args={[look.extra === 'sunhat' ? 0.34 : 0.18, look.extra === 'sunhat' ? 0.34 : 0.2, 0.06, 12]} />
            <meshStandardMaterial color={look.extra === 'sunhat' ? '#f4e2b0' : '#6b3a28'} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.14, 0.16, 0.18, 10]} />
            <meshStandardMaterial color={look.extra === 'sunhat' ? '#f4e2b0' : '#6b3a28'} />
          </mesh>
        </group>
      )}
      {look.extra === 'glasses' && (
        <mesh position={[0, 0.94, 0.24]}>
          <boxGeometry args={[0.22, 0.06, 0.02]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      )}
      {look.extra === 'clasp' && (
        <mesh position={[0.12, 1.12, 0.12]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshStandardMaterial color="#e6c15a" metalness={0.4} roughness={0.4} />
        </mesh>
      )}
      {hired && (
        <mesh position={[0, 1.4, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#f2c14e" emissive="#f2c14e" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  )
}

function FocusRing({ focus, state }: { focus: WorldPick | null; state: GameState }) {
  if (!focus) return null
  let pos: [number, number, number] | null = null
  let radius = 0.7
  if (focus.kind === 'plot') pos = plotCoords(focus.index)
  if (focus.kind === 'villager') pos = PEOPLE_POS[focus.id]
  if (focus.kind === 'building') {
    pos = BUILDING_POS[focus.id]
    radius = 1.3
  }
  if (focus.kind === 'hall') {
    pos = BUILDING_POS.hall
    radius = 1.7
  }
  if (focus.kind === 'market') {
    pos = [3.15, 0, -0.15]
    radius = 0.8
  }
  if (!pos) return null
  if (focus.kind === 'plot' && focus.index >= state.plots.length) return null
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pos[0], 0.05, pos[2]]}>
      <ringGeometry args={[radius, radius + 0.12, 28]} />
      <meshBasicMaterial color="#ffe08a" transparent opacity={0.95} />
    </mesh>
  )
}

function Scene({ state, now, focus, onPick }: { state: GameState; now: number; focus: WorldPick | null; onPick: (pick: WorldPick) => void }) {
  const tex = useMemo(() => getPaint(), [])
  const hour = new Date(now).getHours()
  const valeLook = { hair: '#8a3d2a', skin: '#c68642', cloth: '#6e8b4e', eye: '#2f6b45', extra: 'clasp' }
  return (
    <TexContext.Provider value={tex}>
      <Lights hour={hour} />
      <IsoRig onPick={onPick} />
      <Ground />
      <Stream />
      <Wheat />
      <Trees />
      <Fence x1={-2.85} z1={1.05} x2={2.7} z2={1.05} posts={6} />
      <Flowers />
      <Fence x1={-7.8} z1={1.7} x2={-5.4} z2={1.7} posts={3} />
      <Fence x1={-7.8} z1={1.7} x2={-7.8} z2={3.9} posts={3} />
      <House position={BUILDING_POS.house} level={state.buildings.house.level} busy={state.buildings.house.readyAt != null} pick={{ kind: 'building', id: 'house' }} wall="#fff6ea" />
      <House position={BUILDING_POS.inn} level={state.buildings.inn.level} busy={state.buildings.inn.readyAt != null} pick={{ kind: 'building', id: 'inn' }} wall="#ffe8d2" w={2} d={1.6} porch />
      <House position={BUILDING_POS.cafe} level={state.buildings.cafe.level} busy={state.buildings.cafe.readyAt != null} pick={{ kind: 'building', id: 'cafe' }} wall="#fffaf3" w={1.8} />
      <House position={BUILDING_POS.barn} level={state.buildings.barn.level} busy={state.buildings.barn.readyAt != null} pick={{ kind: 'building', id: 'barn' }} wall="#f0d2a8" w={2.1} d={1.5} tall={1.35} />
      <House position={BUILDING_POS.garden} level={state.buildings.garden.level} busy={state.buildings.garden.readyAt != null} pick={{ kind: 'building', id: 'garden' }} wall="#f6f3e4" w={1.5} d={1.2} tall={0.9} />
      <TownHall level={state.townHall.level} busy={state.townHall.readyAt != null} />
      <Plots state={state} now={now} />
      {state.villagers.map((villager) => (
        <Person key={villager.id} id={villager.id} hired={villager.hired} />
      ))}
      <group position={[-0.85, 0, -4.35]} userData={{ pick: { kind: 'hall' } satisfies WorldPick }}>
        <Chibi look={valeLook} hired={false} />
      </group>
      <group position={[3.15, 0, -0.15]} userData={{ pick: { kind: 'market' } satisfies WorldPick }}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.5, 0.55]} />
          <meshStandardMaterial color="#8a5a34" />
        </mesh>
        <mesh position={[0, 0.72, 0]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[1.05, 0.08, 0.7]} />
          <meshStandardMaterial color="#f2d48a" />
        </mesh>
        <mesh position={[0, 0.95, 0.1]}>
          <boxGeometry args={[0.7, 0.28, 0.28]} />
          <meshStandardMaterial color="#e2555a" />
        </mesh>
      </group>
      <FocusRing focus={focus} state={state} />
    </TexContext.Provider>
  )
}

export function TownWorld({
  state,
  now,
  focus,
  onPick,
}: {
  state: GameState
  now: number
  focus: WorldPick | null
  onPick: (pick: WorldPick) => void
}) {
  return (
    <Canvas
      className="town-canvas"
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [16, 18, 16], fov: 32, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = PCFSoftShadowMap
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.08
        gl.domElement.style.imageRendering = 'auto'
      }}
    >
      <Scene state={state} now={now} focus={focus} onPick={onPick} />
    </Canvas>
  )
}
