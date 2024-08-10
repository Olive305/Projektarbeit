import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Group, Rect, Circle, Text } from 'react-konva';
import './canvas.css'; // Import the external CSS file
import MyNode from './NodeType';
import GraphController from '../ControlBar/GraphController';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';

interface CanvasProps {
  grid: boolean;
  controller: GraphController;
}

const Canvas: React.FC<CanvasProps> = ({ grid, controller }) => {
  const gridSize = controller.gridSize;
  const stageRef = useRef<Konva.Stage>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Map<string, MyNode>>(controller.nodes);
  const [edges, setEdges] = useState<[string, string][]>(controller.edges);
  const [draggingEdge, setDraggingEdge] = useState<{ startNode: MyNode, endX: number, endY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);

  const drawGrid = () => {
    const gridLines = [];
    for (let i = 0; i < window.innerWidth; i += gridSize) {
      gridLines.push(
        <Line
          key={`v_${i}`}
          points={[i, 0, i, window.innerHeight]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    for (let i = 0; i < window.innerHeight; i += gridSize) {
      gridLines.push(
        <Line
          key={`h_${i}`}
          points={[0, i, window.innerWidth, i]}
          stroke="#ddd"
          strokeWidth={1}
        />
      );
    }
    return gridLines;
  };

  const drawLine = (connection: [string, string]) => {
    const start = nodes.get(connection[0]);
    const target = nodes.get(connection[1]);
    if (!start || !target) return null;
    const startX = start.x + start.w;
    const startY = start.y + start.h / 2;
    const endX = target.x;
    const endY = target.y + target.h / 2;
    const middleX = (startX + endX) / 2;
    return (
      <Line
        key={`edge_${start.id}_${target.id}`}
        points={[startX, startY, middleX, startY, middleX, endY, endX, endY]}
        stroke="black"
        strokeWidth={1.5}
      />
    );
  };

  useEffect(() => {
    const handleControllerChange = () => {
      setNodes(new Map(controller.nodes));
      setEdges([...controller.edges]);
    };

    controller.addListener(handleControllerChange);

    return () => {
      controller.removeListener(handleControllerChange);
    };
  }, [controller]); // Add controller as a dependency

  useEffect(() => {
    const stage = stageRef.current;
    const scrollContainer = scrollContainerRef.current;

    if (stage && scrollContainer) {
      const repositionStage = () => {
        const dx = scrollContainer.scrollLeft;
        const dy = scrollContainer.scrollTop;
        stage.container().style.transform = `translate(${dx}px, ${dy}px)`;
        stage.x(-dx);
        stage.y(-dy);
      };

      scrollContainer.addEventListener('scroll', repositionStage);
      repositionStage();

      return () => {
        scrollContainer.removeEventListener('scroll', repositionStage);
      };
    }
  }, [controller]); // Add controller as a dependency

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    if (isDraggingNode) {
      const node = nodes.get(id);
      if (!node) return;
      node.x = e.target.x();
      node.y = e.target.y();
      setNodes(new Map(nodes));
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    if (isDraggingNode) {
      const node = nodes.get(id);
      if (!node) return;
      node.x = e.target.x();
      node.y = e.target.y();
      node.x -= node.x % gridSize;
      node.y -= node.y % gridSize;
      if (node.x < 0) node.x = 0;
      if (node.y < 0) node.y = 0;
      setNodes(new Map(nodes));
      setIsDraggingNode(false);
    }
  };

  const handleCircleMouseDown = (event: KonvaEventObject<MouseEvent>, node: MyNode) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    setDraggingEdge({
      startNode: node,
      endX: pointerPosition.x,
      endY: pointerPosition.y
    });
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (draggingEdge) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      setDraggingEdge({
        ...draggingEdge,
        endX: pointerPosition.x,
        endY: pointerPosition.y
      });
    }
  };

  const handleMouseUp = (event: KonvaEventObject<MouseEvent>) => {
    if (draggingEdge) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      const targetNode = Array.from(nodes.values()).find(n =>
        n.rect &&
        pointerPosition.x >= n.x &&
        pointerPosition.x <= n.x + n.w &&
        pointerPosition.y >= n.y &&
        pointerPosition.y <= n.y + n.h
      );

      if (targetNode) {
        controller.addEdge(draggingEdge.startNode.id, targetNode.id);
        setEdges([...controller.edges]);
      }

      setDraggingEdge(null);
    }
  };

  const handleBackgroundClick = (event: KonvaEventObject<MouseEvent>) => {
    const targetNode = Array.from(nodes.values()).find(n =>
      n.rect &&
      event.target.x() >= n.x &&
      event.target.x() <= n.x + n.w &&
      event.target.y() >= n.y &&
      event.target.y() <= n.y + n.h
    );

    if (targetNode) return;

    controller.unselectAllNodes();
    setNodes(new Map(controller.nodes));
  };

  return (
    <div ref={scrollContainerRef} className="canvas-container">
      <div className="canvas-content">
        <Stage
          width={window.innerWidth + 500 * 2}
          height={window.innerHeight + 500 * 2}
          ref={stageRef}
          style={{ transform: `translate(500px, 500px)` }}
          onContextMenu={(e) => { e.evt.preventDefault(); }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleBackgroundClick}
        >
          <Layer>{grid && drawGrid()}</Layer>
          <Layer>
            {Array.from(nodes.values()).map((node) => (
              <Group
                key={node.id}
                draggable={!draggingEdge}
                x={node.x}
                y={node.y}
                onDragStart={() => setIsDraggingNode(true)}
                onDragMove={(e) => handleDragMove(e, node.id)}
                onDragEnd={(e) => handleDragEnd(e, node.id)}
                onClick={(e) => {
                  e.cancelBubble = true; // Prevent the click event from bubbling up to the stage
                  const id = node.id;

                  const targetNode = nodes.get(id);
                  if (!targetNode) return;

                  targetNode.isSelected = !targetNode.isSelected;
                  if (targetNode.isSelected) {
                    controller.selectedNodes.push(id);
                  } else {
                    controller.selectedNodes.splice(controller.selectedNodes.indexOf(id), 1);
                  }
                  setNodes(new Map(nodes));
                }}
              >
                <Rect
                  ref={(n) => {
                    node.rect = n;
                  }}
                  width={node.w}
                  height={node.h}
                  fill={node.isSelected ? "lightblue" : "lightgray"}
                  cornerRadius={5}
                  stroke={'gray'}
                  strokeWidth={0.5}
                />
                <Circle
                  ref={(n) => {
                    node.circleLeft = n;
                  }}
                  x={0}
                  y={node.h / 2}
                  width={MyNode.circleSize}
                  height={MyNode.circleSize}

                  fill="gray"
                />
                <Circle
                  ref={(n) => {
                    node.circleRight = n;
                  }}
                  x={node.w}
                  y={node.h / 2}
                  width={MyNode.circleSize}
                  height={MyNode.circleSize}

                  fill="gray"

                  onMouseDown={(e) => handleCircleMouseDown(e, node)} // Handle mouse down on the right circle
                />
                <Text
                  ref={(n) => {
                    node.text = n;
                  }}
                  text={node.caption}
                  fill="black"
                  x={node.w / 2}
                  y={node.h / 2}
                  offsetX={node.text ? node.text.width() / 2 : 0}
                  offsetY={node.text ? node.text.height() / 2 : 0}
                  listening={true} // Ensure the text element is listening to events
                />
              </Group>
            ))}
            {edges.map(drawLine)}
            {draggingEdge && (
              <Line
                points={[
                  draggingEdge.startNode.x + draggingEdge.startNode.w,
                  draggingEdge.startNode.y + draggingEdge.startNode.h / 2,
                  draggingEdge.endX,
                  draggingEdge.endY
                ]}
                stroke="black"
                strokeWidth={2}
              />
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default Canvas;
