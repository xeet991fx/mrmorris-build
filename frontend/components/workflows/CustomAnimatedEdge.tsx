import { EdgeProps, getSmoothStepPath } from 'reactflow';

export default function CustomAnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <g className="react-flow__edge">
      {/* Solid yellow line */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        strokeWidth={2.5}
        stroke="#f59e0b"
        strokeLinecap="round"
        strokeLinejoin="round"
        markerEnd={markerEnd}
        className="react-flow__edge-path"
      />
    </g>
  );
}
