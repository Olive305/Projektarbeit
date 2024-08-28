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
  const selectionRecRef = useRef<Konva.Rect>(null);
  const [nodes, setNodes] = useState<Map<string, MyNode>>(controller.nodes);
  const [edges, setEdges] = useState<[string, string][]>(controller.edges);
  const [draggingEdge, setDraggingEdge] = useState<{ startNode: MyNode, endX: number, endY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);

  // vars for selecting
  var selecting = false
  var x1 : number, y1 : number, x2 : number, y2 : number;

  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, edge: [string, string] | null, node: MyNode | null }>({
    visible: false,
    x: 0,
    y: 0,
    edge: null,
    node: null
  });

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

  const drawLineWithHitbox = (connection: [string, string]) => {
    const start = nodes.get(connection[0]);
    const target = nodes.get(connection[1]);
    if (!start || !target) return null;

    const startX = start.x + start.w;
    const startY = start.y + start.h / 2;
    const endX = target.x;
    const endY = target.y + target.h / 2;
    const middleX = (startX + endX) / 2;

    const points = [startX, startY, middleX, startY, middleX, endY, endX, endY];

    const isPreviewEdge = start.isPreview || target.isPreview;

    return (
        <Group key={`edge_${start.id}_${target.id}`}>
            <Line
                points={points}
                stroke={isPreviewEdge ? "blue" : "transparent"}
                strokeWidth={10} // Invisible hitbox
                opacity={isPreviewEdge ? 0.5 : 1} // Slightly transparent for preview edges
                onContextMenu={(e) => handleLineRightClick(e, connection)}
            />
            <Line
                points={points}
                stroke={isPreviewEdge ? "blue" : "black"}
                strokeWidth={1.5} // Visible line
                opacity={isPreviewEdge ? 0.5 : 1} // Slightly transparent for preview edges
            />
        </Group>
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
  }, [controller]);

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
  }, [controller]);

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

      return;
    }

    if (selecting) {
      event.evt.preventDefault();

      const pos = stageRef.current?.getPointerPosition();

      x2 = pos?.x ? pos?.x : 0;
      y2 = pos?.y ? pos?.y : 0;

      selectionRecRef.current?.setAttrs({
        visible: true,
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),

      })
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

      return;
    }

    if (selecting) {
      // do nothing if we didn't start selection
      selecting = false;
      if (!selectionRecRef.current?.visible()) {
        return;
      }
      event.evt.preventDefault();
      // update visibility in timeout, so we can check it in click event
      selectionRecRef.current?.visible(false);
      var shapes = stageRef.current?.find('.rect');
      var box = selectionRecRef.current.getClientRect();
    
      // Call the new method to select nodes within the rectangle
      controller.selectNodesInRect(box);
    
      setNodes(new Map(controller.nodes));
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

  const handleBackgroundMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (event.target !== stageRef.current) {
      return;
    }
    event.evt.preventDefault();

    const pos = stageRef.current?.getPointerPosition();

    x1 = pos?.x ? pos?.x : 0;
    y1 = pos?.y ? pos?.y : 0;
    x2 = pos?.x ? pos?.x : 0;
    y2 = pos?.y ? pos?.y : 0;

    selectionRecRef.current?.width(0);
    selectionRecRef.current?.height(0);
    selecting = true;
  }

  const handleLineRightClick = (event: KonvaEventObject<MouseEvent>, edge: [string, string]) => {
    event.evt.preventDefault(); // Prevent the default context menu from appearing

    const startNode = nodes.get(edge[0]);
    const targetNode = nodes.get(edge[1]);

    if (startNode?.isPreview || targetNode?.isPreview) {
        return; // Do not show the popover if either node is a preview
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const scrollContainer = scrollContainerRef.current;

    setContextMenu({
        visible: true,
        x: pointerPosition.x - (scrollContainer ? scrollContainer.scrollLeft : 0),
        y: pointerPosition.y - (scrollContainer ? scrollContainer.scrollTop : 0),
        edge: edge,
        node: null
    });
};



  const handleNodeRightClick = (event: KonvaEventObject<MouseEvent>, node: MyNode) => {
    event.evt.preventDefault(); // Prevent the default context menu from appearing

    if (node.isPreview) {
        return; // Do not show the popover for preview nodes
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const scrollContainer = scrollContainerRef.current;

    setContextMenu({
        visible: true,
        x: pointerPosition.x - (scrollContainer ? scrollContainer.scrollLeft : 0),
        y: pointerPosition.y - (scrollContainer ? scrollContainer.scrollTop : 0),
        edge: null,
        node: node
    });
  };



  const handleDeleteEdge = () => {
    if (contextMenu.edge) {
      controller.removeEdge(contextMenu.edge[0], contextMenu.edge[1]);
      setEdges([...controller.edges]); // Update the state with the new set of edges
    }
    setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null }); // Close the context menu
  };

  const handleDeleteNode = () => {
    if (contextMenu.node) {
      controller.removeNode(contextMenu.node.id);
      setNodes(new Map(controller.nodes)); // Update the state with the new set of nodes
      setEdges([...controller.edges]); // Update the state with the new set of edges
    }
    setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null }); // Close the context menu
  };

  const handleCanvasClick = () => {
    setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null }); // Close the context menu when clicking on the canvas
  };

  return (
    <div className="canvas-container" ref={scrollContainerRef} onClick={handleCanvasClick}>
      <div className="canvas-content">

        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseDown={handleBackgroundMouseDown}
          onClick={handleBackgroundClick}
        >

          <Layer>{grid && drawGrid()}</Layer>


          <Layer>

            {Array.from(nodes.values()).map((node) => (

              <Group
                key={node.id}
                draggable={!node.isPreview && !draggingEdge}
                x={node.x}
                y={node.y}
                onDragStart={() => node.isPreview ? {} : setIsDraggingNode(true)}
                onDragMove={(e) => node.isPreview ? {} : handleDragMove(e, node.id)}
                onDragEnd={(e) => node.isPreview ? {} : handleDragEnd(e, node.id)}
                onContextMenu={(e) => handleNodeRightClick(e, node)}
                onClick={(e) => {
                  e.cancelBubble = true;
                  const id = node.id;

                  const targetNode = nodes.get(id);
                  if (!targetNode) return;

                  if (targetNode.isPreview) {
                    targetNode.isPreview = false;
                    setNodes(new Map(nodes));

                    controller.get_preview_nodes();
                    return;
                  }

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
                  fill={node.isPreview ? "lightgreen" : (node.isSelected ? "lightblue" : "lightgray")}
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
                  onMouseDown={(e) => node.isPreview ? {} : handleCircleMouseDown(e, node)}
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
                  listening={true}
                />

              </Group>
            ))}


            {edges.map(edge => drawLineWithHitbox(edge))}


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

            <Layer>
              <Rect
                ref={selectionRecRef}
                fill='lightblue'
                visible={false}
                listening={false}
                opacity={0.5}
              />
            </Layer>



        </Stage>

        {contextMenu.visible && contextMenu.node && (
          <div
            className="popover"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            <button onClick={handleDeleteNode}>Delete Node</button>
          </div>
        )}


        {contextMenu.visible && contextMenu.edge && (
          <div
            className="popover"
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          >
            <button onClick={handleDeleteEdge}>Delete Edge</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Canvas;
