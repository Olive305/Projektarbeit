import React, { useEffect, useRef, useState } from "react";
import Header from "./Header/Header";
import Canvas from "./Canvas/Canvas";
import { createRoot } from "react-dom/client";
import ControlBar from "./ControlBar/ControlBar";
import GraphController from "./ControlBar/GraphController";
import MultiController from "./ControlBar/MultiGraphs";
import { useAuth } from "./ControlBar/AuthContext";
import "./App.css";
import CloseIcon from "./assets/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";

const App: React.FC = () => {
	const gridSize = 20;

	const {
		startSession,
		sessionId,
		predictOutcome,
		generatePetriNet,
		getAvailableMatrices,
		changeMatrix,
	} = useAuth();
	const multiController = useRef(new MultiController(gridSize));

	const [sessionStarted, setSessionStarted] = useState(false);
	const [activeTabIndex, setActiveTabIndex] = useState(0);
	const [rainbowPredictions, setRainbowPredictions] = useState(true);

	const [activeGraphController, setActiveGraphController] =
		useState<GraphController | null>(null);
	const [tabs, setTabs] = useState(multiController.current.graphs);

	const [matrices, setMatrices] = useState<string[]>([]); // Matrices fetched from API

	// Initialize session on initial render only once
	useEffect(() => {
		if (!sessionStarted && sessionId === null) {
			startSession("Simple IOR Choice")
				.then(() => setSessionStarted(true))
				.catch((error) => console.error("Failed to start session:", error));
		}
	}, [sessionStarted, sessionId, startSession]);

	useEffect(() => {
		activeGraphController?.notifyListeners();
	}, [activeGraphController]);

	// Set initial graph controller on initial render
	useEffect(() => {
		if (multiController.current.graphs.length === 0) {
			multiController.current.createNewGraph("New", predictOutcome);
		}
		setActiveGraphController(multiController.current.graphs[0][0]);
		setTabs([...multiController.current.graphs]); // Ensure initial tab is rendered
	}, [predictOutcome]);

	// Update preview nodes whenever session starts
	useEffect(() => {
		if (sessionStarted && activeGraphController) {
			activeGraphController.get_preview_nodes();
		}
	}, [sessionStarted, activeGraphController]);

	useEffect(() => {
		const getMatrices = async () => {
			if (sessionStarted) {
				setMatrices(await getAvailableMatrices());
			}
		};
		getMatrices();
	}, [sessionStarted]);

	const handleTabClick = (index: number) => {
		const controller = multiController.current.graphs[index]?.[0];
		if (controller) {
			setActiveGraphController(controller);
			setActiveTabIndex(index);
			controller.get_preview_nodes();
		} else {
			console.error("Controller is undefined or null");
		}
	};

	const handleConvertToPetriNet = async (index: number) => {
		const newIndex = await multiController.current.convertToPetriNet(
			index,
			await generatePetriNet()
		);
		setActiveTabIndex(newIndex);
		setTabs([...multiController.current.graphs]); // Update tabs state
	};

	const handleCreateNewGraph = (name: string) => {
		multiController.current.createNewGraph(name, predictOutcome);
		setActiveTabIndex(multiController.current.graphs.length - 1);
		setTabs([...multiController.current.graphs]); // Update tabs state
	};

	const handleReadGraphFromFile = async (file: File) => {
		await multiController.current.readGraphFromFile(file);
		setActiveTabIndex(multiController.current.graphs.length - 1);
		setTabs([...multiController.current.graphs]); // Update tabs state
	};

	const handleTabClose = (index: number): void => {
		multiController.current.graphs.splice(index, 1);
		if (multiController.current.graphs.length === 0) {
			multiController.current.createNewGraph("New", predictOutcome);
			setActiveTabIndex(0);
		} else {
			const newTabIndex = index > 0 ? index - 1 : 0;
			setActiveTabIndex(newTabIndex);
		}
		setTabs([...multiController.current.graphs]); // Update tabs state
	};

	return (
		<>
			<Header
				createNewGraph={handleCreateNewGraph}
				readGraphFromFile={handleReadGraphFromFile}
				saveGraph={() => multiController.current.saveGraph(activeTabIndex)}
				saveAllGraphs={multiController.current.saveAllGraphs}
				activeTabIndex={activeTabIndex}
				setActiveMatrix={(matrixName: string, file?: File) => {
					changeMatrix(matrixName, file);
					if (activeGraphController)
						activeGraphController.activeMatrix = matrixName;
					const getMatrices = async () => {
						if (sessionStarted) {
							setMatrices(await getAvailableMatrices());
						}
					};
					getMatrices();

					activeGraphController?.get_preview_nodes();
				}}
				toggleRainbowPredictions={() =>
					setRainbowPredictions(!rainbowPredictions)
				}
				handleToPetriNet={() => handleConvertToPetriNet(activeTabIndex)}
				matrices={matrices}
			/>
			<section className="workspace">
				<div className="left-bar-div">
					{activeGraphController && (
						<ControlBar
							controller={activeGraphController}
							multi={multiController.current}
						/>
					)}
				</div>
				<section className="workspace-section">
					<div className="tabs-div">
						{tabs.map(([_, name], index) => (
							<a
								key={index}
								className={`tab${activeTabIndex === index ? " active" : ""}`}
								onClick={() => handleTabClick(index)}>
								{name}
								<button
									className="tabCloseButton"
									onClick={(event) => {
										event.stopPropagation(); // Prevents triggering the tab click event
										handleTabClose(index);
									}}>
									<img
										src={CloseIcon}
										alt="Close"
									/>
								</button>
							</a>
						))}
					</div>

					<div className="canvas-div">
						{activeGraphController && (
							<Canvas
								controller={activeGraphController}
								rainbowPredictions={rainbowPredictions}
							/>
						)}
					</div>
				</section>
			</section>
		</>
	);
};

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
} else {
	console.error("Could not find root container element.");
}

export default App;
