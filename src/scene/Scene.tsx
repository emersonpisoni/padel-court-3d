import { useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import { goToPreset, sceneRefs } from '../lib/camera'
import { stepDuration } from '../lib/trajectory'
import { select, useEditor, usePlayback } from '../store'
import { Court } from './Court'
import { Players } from './Players'
import { Ball } from './Ball'
import { Markers } from './Markers'

/** Avança o tempo da reprodução a cada quadro. */
function PlaybackDriver() {
  useFrame((_, delta) => {
    const pb = usePlayback.getState()
    if (!pb.playing) return
    const { play, stepIndex } = useEditor.getState()
    const step = play.steps[stepIndex]
    const t = pb.t + (Math.min(delta, 0.1) * pb.speed) / stepDuration(step.ball)
    if (t < 1) {
      usePlayback.setState({ t })
      return
    }
    const last = play.steps.length - 1
    if (pb.playAll && stepIndex < last) {
      useEditor.setState({ stepIndex: stepIndex + 1, selection: null })
      usePlayback.setState({ t: 0 })
    } else if (pb.loop) {
      if (pb.playAll) useEditor.setState({ stepIndex: 0, selection: null })
      usePlayback.setState({ t: 0 })
    } else {
      usePlayback.setState({ t: 1, playing: false })
    }
  })
  return null
}

let cameraInitialized = false

function RegisterRenderer() {
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls)
  const width = useThree((s) => s.size.width)
  useEffect(() => {
    sceneRefs.gl = gl
  }, [gl])
  // Enquadra a quadra só depois que o tamanho real do canvas é conhecido
  useEffect(() => {
    if (!controls || width === 0 || cameraInitialized) return
    cameraInitialized = true
    goToPreset('3d', false)
  }, [controls, width])
  return null
}

export function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.1, far: 300, position: [-16, 14, 15] }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#1b2330']} />
      <fog attach="fog" args={['#1b2330', 45, 110]} />
      <hemisphereLight args={['#dbeafe', '#334155', 0.9]} />
      <directionalLight
        position={[-8, 18, 10]}
        intensity={1.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />
      <CameraControls
        makeDefault
        ref={(c) => {
          sceneRefs.controls = c
        }}
        minDistance={1}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2 - 0.04}
        smoothTime={0.35}
      />
      <Court />
      <Markers />
      <Players />
      <Ball />
      <PlaybackDriver />
      <RegisterRenderer />
    </Canvas>
  )
}
