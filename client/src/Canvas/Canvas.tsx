import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Group, Rect, Circle, Text } from 'react-konva';
import './canvas.css'; // Import the external CSS file
import MyNode from './NodeType';
import GraphController from '../ControlBar/GraphController';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import MultiGraphs from '../ControlBar/MultiGraphs';

interface CanvasProps {
  grid: boolean;
  controller: GraphController;
  multiController: MultiGraphs;
}

const Canvas: React.FC<CanvasProps> = ({ grid, controller, multiController }) => {
  const gridSize = controller.gridSize;
  const stageRef = useRef<Konva.Stage>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectionRecRef = useRef<Konva.Rect>(null);
  const [nodes, setNodes] = useState<Map<string, MyNode>>(controller.nodes);
  const [edges, setEdges] = useState<[string, string][]>(controller.edges);
  const [draggingEdge, setDraggingEdge] = useState<{ startNode: MyNode, endX: number, endY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [scale, setScale] = useState(1); // Initial zoom level (1 = 100%)

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

  
  // useEffect functions
  
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
  
  // Prevent the default context menu from showing when right-clicking
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('contextmenu', preventContextMenu);

    return () => {
      window.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);
  
  const handleWheel = (e: any) => {
    e.evt.preventDefault(); // Prevent default browser scroll behavior

    const stage = stageRef.current;
    if (stage) {
      const oldScale = stage.scaleX(); // Since we use the same value for both X and Y scaling, use scaleX
      const pointer = stage.getPointerPosition(); // Get the position of the mouse

      // Define the zoom factor and sensitivity
      const zoomScale = e.evt.deltaY > 0 ? 0.9 : 1.1; // Zoom out if scrolling down, zoom in if scrolling up
      const newScale = oldScale * zoomScale;

      setScale(newScale); // Update scale state

      // To make zooming focused on the mouse pointer
      const mousePointTo = {
        x: (pointer!.x - stage.x()) / oldScale,
        y: (pointer!.y - stage.y()) / oldScale,
      };

      const newPos = {
        x: pointer!.x - mousePointTo.x * newScale,
        y: pointer!.y - mousePointTo.y * newScale,
      };

      setStagePos(newPos); // Update position to ensure zoom is focused on the pointer
    }
  };

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
  
    const startX = start.get_real_x() + start.w;
    const startY = start.get_real_y() + start.h / 2;
    const endX = target.get_real_x();
    const endY = target.get_real_y() + target.h / 2;
  
    let controlPoint1X, controlPoint1Y, controlPoint2X, controlPoint2Y;
    
    if (startX > endX) {
      // Case 1: startX > endX (The line should go a little further before curving backwards)
      if (startY === endY) {
        // Special case: Nodes are horizontally aligned (same Y values)
        // Create an arc that curves above the nodes
        const midX = (startX + endX) / 2;
        const arcHeight = (GraphController.node_distance + MyNode.h_val / 2) * gridSize; // Height of the curve
        controlPoint1X = midX;
        controlPoint1Y = startY - arcHeight;
        controlPoint2X = midX;
        controlPoint2Y = endY - arcHeight;
      } else {
        // General case when startX > endX but Y values are different
        controlPoint1X = startX + gridSize * 2.5; // Push control point further to the right of the start
        controlPoint1Y = startY;
        controlPoint2X = endX - gridSize * 2.5; // Pull control point further to the left of the end
        controlPoint2Y = endY;
      }
    } else {
      // Case 2: startX <= endX (The default curve behavior)
      controlPoint1X = startX + gridSize * 2.5; // 50px right of the start
      controlPoint1Y = startY;
      controlPoint2X = endX - gridSize * 2.5; // 50px left of the end
      controlPoint2Y = endY;
    }
  
    const points = [
      startX, startY,           // P0 - Starting point
      controlPoint1X, controlPoint1Y, // P1 - Control point 1
      controlPoint2X, controlPoint2Y, // P2 - Control point 2
      endX, endY                // P3 - Ending point
    ];
  
    const isPreviewEdge = start.isPreview || target.isPreview;
  
    return (
      <Group key={`edge_${start.id}_${target.id}`}>
        {/* Hitbox - Invisible but interactive */}
        <Line
          bezier
          points={points}
          stroke={isPreviewEdge ? "blue" : "transparent"}
          strokeWidth={15} // Wider hitbox for easy interaction
          lineCap="round"
          lineJoin="round"
          opacity={0}
          onContextMenu={(e) => handleLineRightClick(e, connection)}
        />
        {/* Visible line */}
        <Line
          bezier
          points={points}
          stroke={isPreviewEdge ? "blue" : "black"}
          strokeWidth={1.5}
          lineCap="round"
          lineJoin="round"
          opacity={isPreviewEdge ? 0.5 : 1}
          dash={isPreviewEdge ? [5, 3] : []}
        />
      </Group>
    );
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
    if (isDraggingNode) {
      const node = nodes.get(id);
      if (!node) return;
      node.set_real_x(e.target.x());
      node.set_real_y(e.target.y());
      setNodes(new Map(nodes));
    }
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
    if (isDraggingNode) {
      const node = nodes.get(id);
      if (!node) return;
      
      // Get the actual dragged position
      const x = e.target.x();
      const y = e.target.y();
  
      // Set the new real positions rounded to the nearest grid
      node.set_real_x(Math.round(x / gridSize) * gridSize);
      node.set_real_y(Math.round(y / gridSize) * gridSize);
  
      // Update the state with the modified node
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
    const stage = stageRef.current;
    if (!stage) return;
  
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
  
    // Get stage position and scale
    const stagePos = stage.position();
    const scale = stage.scaleX(); // assuming uniform scaling (same scale for X and Y)
  
    if (draggingEdge) {
      // Adjust pointer position to account for stage position and scaling
      const adjustedX = (pointerPosition.x - stagePos.x) / scale;
      const adjustedY = (pointerPosition.y - stagePos.y) / scale;
  
      setDraggingEdge({
        ...draggingEdge,
        endX: adjustedX,
        endY: adjustedY,
      });
  
      return;
    }
  
    if (selecting) {
      event.evt.preventDefault();
  
      const pos = stage.getPointerPosition();
  
      if (pos) {
        x2 = (pos.x - stagePos.x) / scale;
        y2 = (pos.y - stagePos.y) / scale;
  
        selectionRecRef.current?.setAttrs({
          visible: true,
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
        });
      }
    }
  };
  

  const handleMouseUp = (event: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (stage) {
      stage.draggable(true); // Re-enable the default dragging behavior
    }
    if (draggingEdge) {
      if (!stage) return;

      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      const targetNode = Array.from(nodes.values()).find(n =>
        n.rect &&
        pointerPosition.x >= n.get_real_x() &&
        pointerPosition.x <= n.get_real_x() + n.w &&
        pointerPosition.y >= n.get_real_y() &&
        pointerPosition.y <= n.get_real_y() + n.h
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
      var box = selectionRecRef.current.getClientRect();
    
      // Call the new method to select nodes within the rectangle
      controller.selectNodesInRect(box);
    
      setNodes(new Map(controller.nodes));
    }
    
  };


  const handleBackgroundClick = (event: KonvaEventObject<MouseEvent>) => {
    const targetNode = Array.from(nodes.values()).find(n =>
      n.rect &&
      event.target.x() >= n.get_real_x() &&
      event.target.x() <= n.get_real_x() + n.w &&
      event.target.y() >= n.get_real_y() &&
      event.target.y() <= n.get_real_y() + n.h
    );

    if (targetNode) return;

    controller.unselectAllNodes();
    setNodes(new Map(controller.nodes));
  };

  const handleBackgroundMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (stage) stage.draggable(false); // Disable default dragging behavior

    if (event.target !== stageRef.current) {
      return;
    }
    event.evt.preventDefault();

    const pos = stageRef.current?.getPointerPosition();

    x1 = pos?.x ? (pos.x - stagePos.x) / scale : 0;
    y1 = pos?.y ? (pos.y - stagePos.y) / scale : 0;
    x2 = pos?.x ? (pos.x - stagePos.x) / scale : 0;
    y2 = pos?.y ? (pos.y - stagePos.y) / scale : 0;

    selectionRecRef.current?.width(0);
    selectionRecRef.current?.height(0);
    selecting = true;

    console.log("selecting")
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
        onMouseDown={(e) => {
          if (e.evt.button === 2) {
            handleBackgroundMouseDown(e);   // Left mouse button
          }
        }}

        draggable={true}
        onClick={handleBackgroundClick}
        onContextMenu={(e) => e.evt.preventDefault()} // Prevent default context menu on right-click
        onWheel={handleWheel} // Add zoom functionality
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}  // Bind updated stage position
        y={stagePos.y}  // Bind updated stage position
      >

          <Layer>{grid && drawGrid()}</Layer>

          <Layer>

          {edges.map(edge => drawLineWithHitbox(edge))}
          
          {(
              Array.from(nodes.values()).map((node) => (
                <Group
                  key={node.id}
                  draggable={!node.isPreview && !draggingEdge}
                  x={node.get_real_x()}
                  y={node.get_real_y()}
                  onDragStart={() => (node.isPreview ? {} : setIsDraggingNode(true))}
                  onDragMove={(e) => (node.isPreview ? {} : handleDragMove(e, node.id))}
                  onDragEnd={(e) => (node.isPreview ? {} : handleDragEnd(e, node.id))}
                  onContextMenu={(e) => handleNodeRightClick(e, node)}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    const id = node.id;

                    const targetNode = nodes.get(id);
                    if (!targetNode) return;

                    controller.nodeOnClick(targetNode);

                    setNodes(controller.nodes);
                  }}
                >
                  {(!node.isCircle) ? (
                    <Rect
                      ref={(n) => {
                        node.rect = n;
                      }}
                      width={node.w}
                      height={node.h}
                      fill={
                        node.isPreview
                          ? "lightgreen"
                          : node.isSelected
                          ? "lightblue"
                          : "lightgray"
                      }
                      cornerRadius={5}
                      stroke={"gray"}
                      strokeWidth={0.8}
                      opacity={MyNode.nodeOpacity}
                    />
                  ) : (
                    <Circle
                      ref={(n) => {
                        node.rect = n;
                      }}

                      // fix here
                      x = {gridSize * MyNode.w_val / 2}
                      y = {gridSize * MyNode.h_val / 2}

                      width={node.w}
                      height={node.w}
                      fill={
                        node.isPreview
                          ? "lightgreen"
                          : node.isSelected
                          ? "ligthblue"
                          : "lightgray"
                      }
                      cornerRadius={5}
                      stroke={"gray"}
                      strokeWidth={0.8}
                      opacity={MyNode.nodeOpacity}
                    />
                  )}
                  <Circle
                    ref={(n) => {
                      node.circleLeft = n;
                    }}
                    x={0}
                    y={node.h / 2}
                    width={MyNode.circleSize}
                    height={MyNode.circleSize}
                    stroke={"gray"}
                    strokeWidth={0.8}
                  />
                  <Circle
                    ref={(n) => {
                      node.circleRight = n;
                    }}
                    x={node.w}
                    y={node.h / 2}
                    width={MyNode.circleSize}
                    height={MyNode.circleSize}
                    onMouseDown={(e) =>
                      node.isPreview ? {} : handleCircleMouseDown(e, node)
                    }
                    stroke={"gray"}
                    strokeWidth={0.8}
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
              ))
            )
          }
          
          {draggingEdge && (
            <Line
              points={[
                draggingEdge.startNode.get_real_x() + draggingEdge.startNode.w,
                draggingEdge.startNode.get_real_y() + draggingEdge.startNode.h / 2,
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
