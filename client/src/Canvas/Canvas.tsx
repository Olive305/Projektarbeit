import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Group, Rect, Circle, Text } from 'react-konva';
import './canvas.css'; // Import the external CSS file
import MyNode from './NodeType';
import GraphController from '../ControlBar/GraphController';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import MultiGraphs from '../ControlBar/MultiGraphs';
import { View } from '../Header/view';

interface CanvasProps {
  controller: GraphController;
  multiController: MultiGraphs;
  view: View;
}

const Canvas: React.FC<CanvasProps> = ({ controller, multiController, view }) => {
  const gridSize = controller.gridSize;
  const stageRef = useRef<Konva.Stage>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectionRecRef = useRef<Konva.Rect>(null);
  const [nodes, setNodes] = useState<Map<string, MyNode>>(controller.nodes);
  const [edges, setEdges] = useState<[string, string][]>(controller.edges);
  const [draggingEdge, setDraggingEdge] = useState<{ startNode: MyNode, endX: number, endY: number } | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1); // Initial zoom level (1 = 100%)
  const [viewState, setViewState] = useState({
    showGrid: view.showGrid,
    rainbow: view.showRainbowPredictions
  });

  // Selection variables
  let selecting = false;
  let x1: number, y1: number, x2: number, y2: number;

  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, edge: [string, string] | null, node: MyNode | null }>({
    visible: false,
    x: 0,
    y: 0,
    edge: null,
    node: null
  });

  // useEffect

  // React to changes in the `view` object
  useEffect(() => {
    const updateCanvasView = () => {
      // Update the state that tracks view properties to trigger re-render
      setViewState({
        showGrid: view.showGrid,
        rainbow: view.showRainbowPredictions,
      });
    };

    // Subscribe to view changes
    view.onChange(updateCanvasView);

    // Clean up listener on component unmount
    return () => {
      view.offChange(updateCanvasView);
    };
  }, [view]);
  
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
          stroke="gray"
          strokeWidth={1}
        />
      );
    }
    for (let i = 0; i < window.innerHeight; i += gridSize) {
      gridLines.push(
        <Line
          key={`h_${i}`}
          points={[0, i, window.innerWidth, i]}
          stroke="gray"
          strokeWidth={1}
        />
      );
    }
    return gridLines;
  };

  // Function to calculate the point on a cubic bezier curve at a given t (0 <= t <= 1)
  const getCubicBezierPoint = (t: any, p0: any, p1: any, p2: any, p3: any) => {
    const x = Math.pow(1 - t, 3) * p0.x +
              3 * Math.pow(1 - t, 2) * t * p1.x +
              3 * (1 - t) * Math.pow(t, 2) * p2.x +
              Math.pow(t, 3) * p3.x;

    const y = Math.pow(1 - t, 3) * p0.y +
              3 * Math.pow(1 - t, 2) * t * p1.y +
              3 * (1 - t) * Math.pow(t, 2) * p2.y +
              Math.pow(t, 3) * p3.y;

    return { x, y };
  };

  // Main function to draw the line with hitbox and text
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
      if (startY === endY) {
        // Case: Nodes are horizontally aligned
        const midX = (startX + endX) / 2;
        const arcHeight = (GraphController.node_distance + MyNode.h_val / 2) * gridSize;
        controlPoint1X = midX;
        controlPoint1Y = startY - arcHeight;
        controlPoint2X = midX;
        controlPoint2Y = endY - arcHeight;
      } else {
        // General case when startX > endX and Y values differ
        controlPoint1X = startX + gridSize * 2.5;
        controlPoint1Y = startY;
        controlPoint2X = endX - gridSize * 2.5;
        controlPoint2Y = endY;
      }
    } else {
      // Case: startX <= endX
      controlPoint1X = startX + gridSize * 2.5;
      controlPoint1Y = startY;
      controlPoint2X = endX - gridSize * 2.5;
      controlPoint2Y = endY;
    }

    const points = [
      { x: startX, y: startY },       // P0 - Starting point
      { x: controlPoint1X, y: controlPoint1Y }, // P1 - Control point 1
      { x: controlPoint2X, y: controlPoint2Y }, // P2 - Control point 2
      { x: endX, y: endY },           // P3 - Ending point
    ];

    const isPreviewEdge = start.isPreview || target.isPreview;

    // Calculate the midpoint at t = 0.5 (midpoint of the bezier curve)
    const midPoint = getCubicBezierPoint(0.5, points[0], points[1], points[2], points[3]);

    return (
      <Group key={`edge_${start.id}_${target.id}`}>
        {/* Hitbox - Invisible but interactive */}
        <Line
          bezier
          points={[
            startX, startY, controlPoint1X, controlPoint1Y,
            controlPoint2X, controlPoint2Y, endX, endY
          ]}
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
          points={[
            startX, startY, controlPoint1X, controlPoint1Y,
            controlPoint2X, controlPoint2Y, endX, endY
          ]}
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
      endX: (pointerPosition.x - stagePos.x) / scale,
      endY: (pointerPosition.y - stagePos.y) / scale
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

    // Get current stage position and scale (for panning and zooming)
    const stagePos = stage ? stage.position() : { x: 0, y: 0 }; // Default to {x: 0, y: 0} if no stage
    const scale = stage ? stage.scaleX() : 1; // Default to scale 1 if no stage (no zoom)

    if (draggingEdge) {
      if (!stage) return;

      // Get the current pointer position relative to the stage
      const pointerPosition = stage.getPointerPosition();
      if (!pointerPosition) return;

      // Adjust pointer position to the stage's local coordinate system, accounting for zoom and pan
      const adjustedPointerX = (pointerPosition.x - stagePos.x) / scale;
      const adjustedPointerY = (pointerPosition.y - stagePos.y) / scale;

      // Find the target node by comparing the adjusted pointer position with node boundaries
      const targetNode = Array.from(nodes.values()).find(n =>
        n.rect &&
        adjustedPointerX >= n.get_real_x() &&  // Adjusted pointer X compared to node's real X
        adjustedPointerX <= n.get_real_x() + n.w && // Adjusted pointer X compared to node width
        adjustedPointerY >= n.get_real_y() && // Adjusted pointer Y compared to node's real Y
        adjustedPointerY <= n.get_real_y() + n.h // Adjusted pointer Y compared to node height
      );

      if (targetNode) {
        // Add the edge to the controller if a target node is found
        controller.addEdge(draggingEdge.startNode.id, targetNode.id);
        setEdges([...controller.edges]);
      }

      // Reset dragging state
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

      // Hide the selection rectangle
      selectionRecRef.current?.visible(false);

      // Get the bounding box of the selection rectangle, adjust for panning and zooming
      const box = selectionRecRef.current.getClientRect();

      // Adjust the selection box to account for the current pan and zoom
      const adjustedBox = {
        x: (box.x - stagePos.x) / scale,
        y: (box.y - stagePos.y) / scale,
        width: box.width / scale,
        height: box.height / scale
      };

      // Call the method to select nodes within the adjusted rectangle
      controller.selectNodesInRect(adjustedBox);
    
      // Update the nodes state after selection
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
  
    if (!stage) return;
  
    // Disable default dragging behavior for the stage
    stage.draggable(false);
  
    // Only proceed if the background of the stage was clicked (not another shape)
    if (event.target !== stage) {
      return;
    }
  
    event.evt.preventDefault();
  
    // Get pointer position relative to the stage
    const pos = stage.getPointerPosition();
    if (!pos) return;
  
    // Get the current scale of the stage (for zoom level)
    const scale = stage.scaleX();
  
    // Get the stage's current position (for pan/translate adjustment)
    const stagePos = stage.position();
  
    // Convert the pointer position to account for stage translation and scaling
    x1 = (pos.x - stagePos.x) / scale;
    y1 = (pos.y - stagePos.y) / scale;
  
    // Initialize selection rectangle coordinates
    x2 = x1;
    y2 = y1;
  
    // Reset the selection rectangle dimensions
    selectionRecRef.current?.width(0);
    selectionRecRef.current?.height(0);
  
    selecting = true;
  
    console.log("Selecting started at: ", { x1, y1 });
  };
  

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

  const handleAddNode = () => {
    if (contextMenu.node) {
        // Use the node ID from the context menu as the starting point for the new node
        controller.addNode(contextMenu.node.id); 

        // Update the state with the new set of nodes and edges
        setNodes(new Map(controller.nodes)); 
        setEdges([...controller.edges]); 
    }

    // Close the context menu after the node is added
    setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null });
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

          <Layer>{viewState.showGrid && drawGrid()}</Layer>

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
                          ? viewState.rainbow ? node.color : "lightgreen"
                          : node.isSelected
                          ? "lightblue"
                          : "lightgray"
                      }
                      cornerRadius={5}
                      stroke={"black"}
                      strokeWidth={1.5}
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
                          ? viewState.rainbow ? node.color : "lightgreen"
                          : node.isSelected
                          ? "lightblue"
                          : "lightgray"
                      }
                      cornerRadius={5}
                      stroke={"black"}
                      strokeWidth={1.5}
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
                  {node.isPreview ? <Text
                    ref={(n) => {
                      node.text = n;
                    }}
                    text={Math.max(node.probability, 0.01).toFixed(2)}
                    fill="black"
                    x={16}
                    y={9}
                    offsetX={node.text ? node.text.width() / 2 : 0}
                    offsetY={node.text ? node.text.height() / 2 : 0}
                    listening={true}
                  /> : <></>}
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
          <button onClick={handleAddNode}>Add Node</button>
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
