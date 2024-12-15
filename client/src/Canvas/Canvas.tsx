import React, { useEffect, useRef, useState } from "react";
import {
	Stage,
	Layer,
	Line,
	Group,
	Rect,
	Circle,
	Text,
	Label,
} from "react-konva";
import "./canvas.css"; // Import the external CSS file
import MyNode from "./NodeType";
import GraphController from "../ControlBar/GraphController";
import { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { JSX } from "react/jsx-runtime";

interface CanvasProps {
	controller: GraphController;
	rainbowPredictions: boolean;
	showGrid: boolean;
	showLineThickness: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
	controller,
	rainbowPredictions,
	showGrid,
	showLineThickness
}) => {
	const gridSize = controller.gridSize;
	const stageRef = useRef<Konva.Stage>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const selectionRecRef = useRef<Konva.Rect>(null);
	const [nodes, setNodes] = useState<Map<string, MyNode>>(controller.nodes);
	const [edges, setEdges] = useState<[string, string][]>(controller.edges);
	const [draggingEdge, setDraggingEdge] = useState<{
		startNode: MyNode;
		endX: number;
		endY: number;
	} | null>(null);
	const [isDraggingNode, setIsDraggingNode] = useState<boolean>(false);
	const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
	const [scale, setScale] = useState(1); // Initial zoom level (1 = 100%)

	// Selection variables
	let selecting = false;
	let x1: number, y1: number, x2: number, y2: number;

	const [contextMenu, setContextMenu] = useState<{
		visible: boolean;
		x: number;
		y: number;
		edge: [string, string] | null;
		node: MyNode | null;
	}>({
		visible: false,
		x: 0,
		y: 0,
		edge: null,
		node: null,
	});

	// useEffect hooks

	useEffect(() => {
		const handleControllerChange = () => {
			setNodes(new Map(controller.nodes));
			setEdges([...controller.edges]);
		};

		controller.addListener(handleControllerChange);

		return () => {
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

		window.addEventListener("contextmenu", preventContextMenu);

		return () => {
			window.removeEventListener("contextmenu", preventContextMenu);
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
			let newScale = oldScale * zoomScale;

			// Set a maximum zoom scale of 2x
			if (newScale > 2) {
				newScale = 2;
			}

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
		const gridLines: JSX.Element[] = [];
		const stage = stageRef.current;

		if (!stage || scale < 0.4) {
			return gridLines; // Don't draw the grid if zoom level is too low or stage doesn't exist
		}

		const stageWidth = stage.width();
		const stageHeight = stage.height();

		// Get the visible area in world coordinates
		const topLeftX = -stagePos.x / scale;
		const topLeftY = -stagePos.y / scale;
		const bottomRightX = topLeftX + stageWidth / scale;
		const bottomRightY = topLeftY + stageHeight / scale;

		// Calculate visible grid bounds with extra margin for smoother panning
		const margin = gridSize * 10; // Adjust the margin as needed
		const startX = Math.floor((topLeftX - margin) / gridSize) * gridSize;
		const endX = Math.ceil((bottomRightX + margin) / gridSize) * gridSize;
		const startY = Math.floor((topLeftY - margin) / gridSize) * gridSize;
		const endY = Math.ceil((bottomRightY + margin) / gridSize) * gridSize;

		// Draw vertical grid lines
		for (let x = startX; x <= endX; x += gridSize) {
			gridLines.push(
				<Line
					key={`v_${x}`}
					points={[x, topLeftY, x, bottomRightY]}
					stroke="lightgray"
					strokeWidth={1} // Keep line thickness consistent based on zoom
					opacity={scale > 0.6 ? 1 : scale < 0.4 ? 0 : (scale - 0.4) / 0.2}
				/>
			);
		}

		// Draw horizontal grid lines
		for (let y = startY; y <= endY; y += gridSize) {
			gridLines.push(
				<Line
					key={`h_${y}`}
					points={[topLeftX, y, bottomRightX, y]}
					stroke="lightgray"
					strokeWidth={1} // Keep line thickness consistent based on zoom
					opacity={scale > 0.6 ? 1 : scale < 0.4 ? 0 : (scale - 0.4) / 0.2}
				/>
			);
		}

		return gridLines;
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
			if (Math.abs(startY - endY) <= 2 * gridSize) {
				// Create a looping arc around the nodes with additional control points
				const loopOffset = gridSize * 3; // Adjust the loop size as needed
				controlPoint1X = startX + loopOffset;
				controlPoint1Y = startY;
				controlPoint2X = startX - loopOffset;
				controlPoint2Y = startY - loopOffset * 2;
				const controlMiddlePointX = (startX + endX) / 2;
				const controlMiddlePointy = (startY + endY) / 2;
				const controlPoint3X = endX + loopOffset;
				const controlPoint3Y = endY + loopOffset * 2;
				const controlPoint4X = endX - loopOffset;
				const controlPoint4Y = endY;

				const isPreviewEdge = start.isPreview || target.isPreview;

				const highestSupport = Math.max(...Array.from(nodes.values()).map(node => node.support || 0));

				return (
					<Group key={`edge_${start.id}_${target.id}`}>
						{/* Hitbox - Invisible but interactive */}
						<Line
							bezier
							points={[
								startX,
								startY,
								controlPoint1X,
								controlPoint1Y,
								controlPoint2X,
								controlPoint2Y,
								controlMiddlePointX,
								controlMiddlePointy,
							]}
							stroke={isPreviewEdge ? "blue" : "transparent"}
							strokeWidth={15} // Wider hitbox for easy interaction
							lineCap="round"
							lineJoin="round"
							opacity={0}
							onContextMenu={(e) => handleLineRightClick(e, connection)}
						/>
						<Line
							bezier
							points={[
								controlMiddlePointX,
								controlMiddlePointy,
								controlPoint3X,
								controlPoint3Y,
								controlPoint4X,
								controlPoint4Y,
								endX,
								endY,
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
								startX,
								startY,
								controlPoint1X,
								controlPoint1Y,
								controlPoint2X,
								controlPoint2Y,
								controlMiddlePointX,
								controlMiddlePointy,
							]}
							stroke={isPreviewEdge ? "blue" : "black"}
							strokeWidth={!isPreviewEdge && showLineThickness ? (0.3 + 2.5 * (nodes.get(connection[1])?.support || 0) / (highestSupport || 1)) : 1}
							lineCap="round"
							lineJoin="round"
							opacity={isPreviewEdge ? 0.5 : 1}
							dash={isPreviewEdge ? [5, 3] : []}
						/>
						<Line
							bezier
							points={[
								controlMiddlePointX,
								controlMiddlePointy,
								controlPoint3X,
								controlPoint3Y,
								controlPoint4X,
								controlPoint4Y,
								endX,
								endY,
							]}
							stroke={isPreviewEdge ? "blue" : "black"}
							strokeWidth={!isPreviewEdge && showLineThickness ? (0.3 + 2.5 * (nodes.get(connection[1])?.support || 0) / (highestSupport || 1)) : 1}
							lineCap="round"
							lineJoin="round"
							opacity={isPreviewEdge ? 0.5 : 1}
							dash={isPreviewEdge ? [5, 3] : []}
						/>
					</Group>
				);
			} else {
				// General case when startX > endX and Y values differ
				const distanceFactor = 2.5 * Math.max(1.25 * Math.log((startX - endX) / gridSize), 1);
				controlPoint1X = startX + gridSize * distanceFactor;
				controlPoint1Y = startY;
				controlPoint2X = endX - gridSize * distanceFactor;
				controlPoint2Y = endY;
			}
		} else {
			// Case: startX <= endX
			controlPoint1X = startX + gridSize * 2.5;
			controlPoint1Y = startY;
			controlPoint2X = endX - gridSize * 2.5;
			controlPoint2Y = endY;
		}

		const isPreviewEdge = start.isPreview || target.isPreview;

		const highestSupport = Math.max(...Array.from(nodes.values()).map(node => node.support || 0));

		return (
			<Group key={`edge_${start.id}_${target.id}`}>
				{/* Hitbox - Invisible but interactive */}
				<Line
					bezier
					points={[
						startX,
						startY,
						controlPoint1X,
						controlPoint1Y,
						controlPoint2X,
						controlPoint2Y,
						endX,
						endY,
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
						startX,
						startY,
						controlPoint1X,
						controlPoint1Y,
						controlPoint2X,
						controlPoint2Y,
						endX,
						endY,
					]}
					stroke={isPreviewEdge ? "blue" : "black"}
					strokeWidth={!isPreviewEdge && showLineThickness ? (0.3 + 2.5 * (nodes.get(connection[1])?.support || 0) / (highestSupport || 1)) : 1}
					lineCap="round"
					lineJoin="round"
					opacity={isPreviewEdge ? 0.5 : 1}
					dash={isPreviewEdge ? [5, 3] : []}
				/>
			</Group>
		);
	};

	const handleDragMove = (e: KonvaEventObject<DragEvent>, id: string) => {
		e.cancelBubble = true;

		if (isDraggingNode) {
			const node = nodes.get(id);
			if (!node) return;

			// Check if the dragged node is selected
			if (node.isSelected) {
				// Get the difference in movement
				const deltaX = e.target.x() - node.get_real_x();
				const deltaY = e.target.y() - node.get_real_y();

				// Apply movement to all selected nodes
				controller.selectedNodes.forEach((selectedId) => {
					const selectedNode = nodes.get(selectedId);
					if (selectedNode) {
						selectedNode.set_real_x(selectedNode.get_real_x() + deltaX);
						selectedNode.set_real_y(selectedNode.get_real_y() + deltaY);
					}
				});
			} else {
				// Move only the current node if it is not selected
				node.set_real_x(e.target.x());
				node.set_real_y(e.target.y());
			}

			setNodes(new Map(nodes)); // Update state with new node positions
		}
	};

	const handleDragEnd = (e: KonvaEventObject<DragEvent>, id: string) => {
		if (isDraggingNode) {
			const node = nodes.get(id);
			if (!node) return;

			// Check if the dragged node is selected
			if (node.isSelected) {
				// Get the actual dragged position
				const x = e.target.x();
				const y = e.target.y();

				// Calculate the snap-to-grid offsets
				const offsetX = Math.round(x / gridSize) * gridSize - node.get_real_x();
				const offsetY = Math.round(y / gridSize) * gridSize - node.get_real_y();

				// Apply snapping to all selected nodes
				controller.selectedNodes.forEach((selectedId) => {
					const selectedNode = nodes.get(selectedId);
					if (selectedNode) {
						selectedNode.set_real_x(selectedNode.get_real_x() + offsetX);
						selectedNode.set_real_y(selectedNode.get_real_y() + offsetY);
					}
				});
			} else {
				// Snap only the dragged node to the grid if it is not selected
				node.set_real_x(Math.round(e.target.x() / gridSize) * gridSize);
				node.set_real_y(Math.round(e.target.y() / gridSize) * gridSize);
			}

			setNodes(new Map(nodes)); // Update the state with the modified node positions
			setIsDraggingNode(false);
		}
	};

	const handleCircleMouseDown = (
		_: KonvaEventObject<MouseEvent>,
		node: MyNode
	) => {
		const stage = stageRef.current;
		if (!stage) return;

		const pointerPosition = stage.getPointerPosition();
		if (!pointerPosition) return;

		setDraggingEdge({
			startNode: node,
			endX: (pointerPosition.x - stagePos.x) / scale,
			endY: (pointerPosition.y - stagePos.y) / scale,
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
			const targetNode = Array.from(nodes.values()).find(
				(n) =>
					n.rect &&
					adjustedPointerX >= n.get_real_x() && // Adjusted pointer X compared to node's real X
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
				height: box.height / scale,
			};

			// Call the method to select nodes within the adjusted rectangle
			controller.selectNodesInRect(adjustedBox);

			// Update the nodes state after selection
			setNodes(new Map(controller.nodes));
		}
	};

	const handleBackgroundClick = (event: KonvaEventObject<MouseEvent>) => {
		const targetNode = Array.from(nodes.values()).find(
			(n) =>
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
	};

	const handleLineRightClick = (
		event: KonvaEventObject<MouseEvent>,
		edge: [string, string]
	) => {
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
			node: null,
		});
	};

	const handleNodeRightClick = (
		event: KonvaEventObject<MouseEvent>,
		node: MyNode
	) => {
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
			node: node,
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
			// if the node is selected, delete the selected nodes
			if (controller.nodes.get(contextMenu.node.id)?.isSelected) {
				controller.deleteSelectedNodes();
				return;
			}

			controller.removeNode(contextMenu.node.id);
			setNodes(new Map(controller.nodes)); // Update the state with the new set of nodes
			setEdges([...controller.edges]); // Update the state with the new set of edges
		}
		setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null }); // Close the context menu
	};

	const handleCanvasClick = () => {
		setContextMenu({ visible: false, x: 0, y: 0, edge: null, node: null }); // Close the context menu when clicking on the canvas
	};

	const handleStageDragMove = (e: KonvaEventObject<DragEvent>) => {
		const newPos = e.target.position();
		setStagePos(newPos);
	};

	const [update, setUpdate] = useState(false);

	useEffect(() => {
		// Trigger a re-render to ensure text dimensions are calculated
		setUpdate(!update);
	}, [nodes]);

	return (
		<div
			className="canvas-container"
			onClick={handleCanvasClick}>
			<Stage
				ref={stageRef}
				width={window.innerWidth}
				height={window.innerHeight}
				onDragMove={handleStageDragMove}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseDown={(e) => {
					if (e.evt.button === 2) {
						handleBackgroundMouseDown(e); // Left mouse button
					}
				}}
				draggable={true}
				onClick={handleBackgroundClick}
				onContextMenu={(e) => e.evt.preventDefault()} // Prevent default context menu on right-click
				onWheel={handleWheel} // Add zoom functionality
				scaleX={scale}
				scaleY={scale}
				x={stagePos.x} // Bind updated stage position
				y={stagePos.y} // Bind updated stage position
			>
				<Layer>{showGrid && drawGrid()}</Layer>

				<Layer>
					{edges.map((edge) => drawLineWithHitbox(edge))}

					{Array.from(nodes.values()).map((node) => (
						<Group
							key={node.id}
							draggable={!node.isPreview && !draggingEdge}
							x={node.get_real_x()}
							y={node.get_real_y()}
							onDragStart={() =>
								node.isPreview ? {} : setIsDraggingNode(true)
							}
							onDragMove={(e) =>
								node.isPreview ? {} : handleDragMove(e, node.id)
							}
							onDragEnd={(e) =>
								node.isPreview ? {} : handleDragEnd(e, node.id)
							}
							onContextMenu={(e) => handleNodeRightClick(e, node)}
							onClick={(e) => {
								e.cancelBubble = true;
								if (e.evt.button !== 0) return;
								const id = node.id;

								const targetNode = nodes.get(id);
								if (!targetNode) return;

								controller.nodeOnClick(targetNode);

								setNodes(controller.nodes);
							}}
							onMouseEnter={(e) => {
								const container = e.target.getStage()?.container();
								if (container) {
									container.style.cursor = "pointer";
								}
							}}
							onMouseLeave={(e) => {
								const container = e.target.getStage()?.container();
								if (container) {
									container.style.cursor = "default";
								}
							}}
						>
							{!node.isCircle ? (
								<Rect
									ref={(n) => {
										node.rect = n;
									}}
									width={node.w}
									height={node.h}
									fill={
										node.isPreview
											? rainbowPredictions
												? node.color
												: "orange"
											: node.isSelected
											? "lightblue"
											: "lightgray"
									}
									cornerRadius={5}
									stroke={"black"}
									strokeWidth={1.5}
									opacity={node.isPreview ? 0.7 : MyNode.nodeOpacity}
								/>
							) : (
								<Circle
									ref={(n) => {
										node.rect = n;
									}}
									// fix here
									x={(gridSize * MyNode.w_val) / 2}
									y={(gridSize * MyNode.h_val) / 2}
									width={node.w}
									height={node.w}
									fill={
										node.isPreview
											? rainbowPredictions
												? node.color
												: "orange"
											: node.isSelected
											? "lightblue"
											: "lightgray"
									}
									cornerRadius={5}
									stroke={"black"}
									strokeWidth={1.5}
									opacity={node.isPreview ? 0.7 : MyNode.nodeOpacity}
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
								width={node.w - 10} // Predefined width with some padding
								align="center" // Center the text within the predefined width
								x={5} // Padding from the left
								y={node.h / 2 - (node.text?.height() || 0) / 2}
								listening={true}
								opacity={node.isPreview ? 0.7 : MyNode.nodeOpacity}
							/>
							{node.isPreview ? (
								<>
									<Text
										ref={(n) => {
											node.text = n;
										}}
										text={`Probability: ${Math.max(node.probability, 0.01).toFixed(2)}`}
										fill="black"
										x={5}
										y={5}
										listening={false}
										opacity={node.isPreview ? 0.7 : MyNode.nodeOpacity}
									/>
									<Text
										ref={(n) => {
											node.text = n;
										}}
										text={`Support: ${(node.support || 0).toFixed(0)}`}
										fill="black"
										x={5}
										y={node.h - 15}
										listening={false}
										opacity={node.isPreview ? 0.7 : MyNode.nodeOpacity}
									/>
								</>
							) : (
								<></>
							)}
						</Group>
					))}

					{draggingEdge && (
						<Line
							points={[
								draggingEdge.startNode.get_real_x() + draggingEdge.startNode.w,
								draggingEdge.startNode.get_real_y() +
									draggingEdge.startNode.h / 2,
								draggingEdge.endX,
								draggingEdge.endY,
							]}
							stroke="black"
							strokeWidth={2}
						/>
					)}
				</Layer>

				<Layer>
					<Rect
						ref={selectionRecRef}
						fill="lightblue"
						stroke="blue"
						visible={false}
						listening={false}
						opacity={0.5}
					/>
				</Layer>
			</Stage>

			{contextMenu.visible && contextMenu.node && (
				<div
					className="canvas-popover"
					style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
					<button onClick={handleDeleteNode}>Delete Node</button>
					<input
						type="text"
						placeholder="Add a comment"
						value={contextMenu.node?.comment || ""}
						onClick={(e) => e.stopPropagation()}
						onChange={(e) => {
							const node = contextMenu.node;
							if (node) {
								const targetNode = contextMenu.node
									? controller.nodes.get(contextMenu.node.id)
									: undefined;
								if (targetNode) {
									targetNode.comment = e.target.value;
									controller.notifyListeners();
								}
								setNodes(new Map(nodes));
							}
						}}
					/>
					<Label>
						Support:{" "}
						{(contextMenu.node.support || 0)}
					</Label>
				</div>
			)}

			{contextMenu.visible && contextMenu.edge && (
				<div
					className="canvas-popover"
					style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}>
					<button onClick={handleDeleteEdge}>Delete Edge</button>
				</div>
			)}
		</div>
	);
};

export default Canvas;
