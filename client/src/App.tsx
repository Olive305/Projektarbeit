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
		generatePetriNetFile,
		getAvailableMatrices,
		changeMatrix,
		getMetrics,
		removeMatrix,
		getVariants,
		autoPosition,
		getPm4pyMetrics,
		uploadLog,
	} = useAuth();
	const multiController = useRef(new MultiController(gridSize));

	const [sessionStarted, setSessionStarted] = useState(false);
	const [activeTabIndex, setActiveTabIndex] = useState(0);
	const [rainbowPredictions, setRainbowPredictions] = useState(true);
	const [showGrid, setShowGrid] = useState(true);

	const [activeName, setActiveName] = useState("");

	const [activeGraphController, setActiveGraphController] =
		useState<GraphController | null>(null);
	const [tabs, setTabs] = useState(multiController.current.graphs);

	const [matrices, setMatrices] = useState<string[]>([]); // Matrices fetched from API
	const [customMatrices, setCustomMatrices] = useState<string[]>([]); // Custom matrices uploaded by user
	const [matrixMaxSupport, setMatrixMaxSupport] = useState<{ [key: string]: number }>({});
	const [supportMax, setSupportMax] = useState(1);
	const [customLogs, setCustomLogs] = useState<string[]>([]); // Custom logs uploaded by user

	const [fitness, setFitness] = useState(0);
	const [variantCoverage, setVariantCoverage] = useState(0);
	const [logCoverage, setLogCoverage] = useState(0);
	const [variants, setVariants] = useState<any[][]>([]);

	const [gettingPm4pyMetrics, setGettingPm4pyMetrics] = useState(false);
	const [recalculateMetrics, setRecalculateMetrics] = useState(false);

	const [showLineThickness, _] = useState(false);

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

	useEffect(() => {
		activeGraphController?.notifyListeners();
	}, [activeTabIndex, activeName]);

	useEffect(() => {
		if (activeGraphController) {
			setSupportMax(matrixMaxSupport[activeGraphController.activeMatrix] || 1);
		}
	}, [activeGraphController, matrixMaxSupport]);

	// Set initial graph controller on initial render
	useEffect(() => {
		if (multiController.current.graphs.length === 0) {
			multiController.current.createNewGraph("New", handlePredictOutcome);
		}
		setActiveGraphController(multiController.current.graphs[0][0]);
		setTabs([...multiController.current.graphs]);

		setActiveName(multiController.current.graphs[activeTabIndex][1]);
	}, [predictOutcome]);

	// Update preview nodes whenever session starts
	useEffect(() => {
		if (sessionStarted && activeGraphController) {
			activeGraphController.get_preview_nodes();
		}
	}, [sessionStarted, activeGraphController]);

	useEffect(() => {
		getMatrices();
	}, [sessionStarted]);

	useEffect(() => {
		if (!gettingPm4pyMetrics && recalculateMetrics) {
			setRecalculateMetrics(false);
			handleGetPm4pyMetrics()
		}
	}, [gettingPm4pyMetrics, recalculateMetrics]);


	const getMatrices = async () => {
		if (sessionStarted) {
			const matricesData = await getAvailableMatrices();
			setMatrices(matricesData.default_matrices);
			setCustomMatrices(matricesData.custom_matrices);
			setCustomLogs(matricesData.custom_logs);
			setMatrixMaxSupport(matricesData.matrix_max_support);
		}
	};

	const handlePredictOutcome = async (graphInput: any, matrix: string) => {
		const prediction = await predictOutcome(graphInput, matrix);

		setVariants(await getVariantsFromDict());

		handleGetMetrics(
		);
		return prediction;
	}

	const getVariantsFromDict = async () => {
		try {
			const variantsDict = await getVariants();
			const parsedVariants = JSON.parse(variantsDict.variants);

			if (activeGraphController) {
				activeGraphController.sequences = parsedVariants.sequences;
			}
			var variant_list = [];
			for (const variant_dict of parsedVariants.variants) {
				variant_list.push([
					variant_dict.variant,
					variant_dict.covered,
					variant_dict.support,
				]);
			}
			return variant_list;
		} catch (error) {
			console.error("Failed to get variants from dictionary:", error);
			return [];
		}
	};

	const handleNameChange = (name: string) => {
		setActiveName(name);
		// Update the name of the current tab only
		if (
			activeGraphController &&
			multiController.current.graphs[activeTabIndex]
		) {
			multiController.current.graphs[activeTabIndex][1] = name;
		}
		setTabs([...multiController.current.graphs]); // Update tabs state
	};

	const handleUploadLog = async (matrixName: string, file: File) => {
		const data = await uploadLog(matrixName, file);
		getMatrices();
		activeGraphController?.get_preview_nodes();
		return data
	}

	const handleTabClick = async (index: number): Promise<void> => {
		const controller = multiController.current.graphs[index]?.[0];
		if (controller) {
			setActiveGraphController(controller);
			setActiveTabIndex(index);
			setActiveName(multiController.current.graphs[index][1]);

			await controller.get_preview_nodes();

			setVariants(await getVariantsFromDict());

			// Update metrics for the new active tab
			handleGetMetrics(
			);
		} else {
			console.error("Controller is undefined or null");
		}
	};

	const handleGetPm4pyMetrics = async () => {
		if (gettingPm4pyMetrics){
			setRecalculateMetrics(true);
			return;
		}
		setGettingPm4pyMetrics(true);
		await getPm4pyMetrics(
			setFitness
		);
		setGettingPm4pyMetrics(false);
	}

	const handleGetMetrics = async (
	) => {
		await getMetrics(
			setVariantCoverage,
			setLogCoverage
		);

		handleGetPm4pyMetrics();
	};

	const handleConvertToPetriNet = async (_: number) => {
		generatePetriNet();
	};

	const handleConvertToPetriNetFile = async (_: number) => {
		generatePetriNetFile();
	}

	const handleCreateNewGraph = async (name: string) => {
		multiController.current.createNewGraph(name, handlePredictOutcome);
		handleTabClick(multiController.current.graphs.length - 1);
		setTabs([...multiController.current.graphs]);
		setActiveName(name);

		setVariants(await getVariantsFromDict());

		// Update metrics for the new active tab
		handleGetMetrics(
		);
	};

	const handleReadGraphFromFile = async (file: File) => {
		await multiController.current.readGraphFromFile(file, predictOutcome);
		handleTabClick(multiController.current.graphs.length - 1);
		setTabs([...multiController.current.graphs]);
	};

	const handleDeleteMatrix = async (matrixName: string) => {
		await removeMatrix(matrixName);
		
		if (activeGraphController?.activeMatrix === matrixName) {
			activeGraphController.activeMatrix = "Simple IOR Choice";
		}
		// Check for all graphs if the active matrix is the deleted Matrix and change this to the default matrix
		multiController.current.graphs.forEach((graph) => {
			if (graph[0].activeMatrix === matrixName) {
				graph[0].activeMatrix = "Simple IOR Choice";
			}
		});

		getMatrices();
		activeGraphController?.get_preview_nodes();
	};

	const handleTabClose = async (index: number) => {
		multiController.current.graphs.splice(index, 1);
		if (multiController.current.graphs.length === 0) {
			multiController.current.createNewGraph("New", handlePredictOutcome);
			handleTabClick(0);
		} else {
			const newTabIndex = index > 0 ? index - 1 : 0;
			handleTabClick(newTabIndex);
		}
		setTabs([...multiController.current.graphs]);
	};

	const handleSetActiveMatrix = async (matrixName: string, file?: File) => {
		await changeMatrix(matrixName, file);
		if (activeGraphController) activeGraphController.activeMatrix = matrixName;
		await getMatrices();

		activeGraphController?.get_preview_nodes();
	};

	const handleAutoPosition = async () => {
		activeGraphController?.deserializeNodePositions(await autoPosition());
	};

	return (
		<>
			<Header
				createNewGraph={handleCreateNewGraph}
				readGraphFromFile={handleReadGraphFromFile}
				saveGraph={() => multiController.current.saveGraph(activeTabIndex)}
				saveAllGraphs={multiController.current.saveAllGraphs}
				activeTabIndex={activeTabIndex}
				setActiveMatrix={handleSetActiveMatrix}
				toggleRainbowPredictions={() =>
					setRainbowPredictions(!rainbowPredictions)
				}
				handleToPetriNet={() => handleConvertToPetriNet(activeTabIndex)}
				handleToPetriNetFile={() => handleConvertToPetriNetFile(activeTabIndex)}
				defaultMatrices={matrices}
				customMatrices={customMatrices}
				customLogs={customLogs}
				deleteMatrix={handleDeleteMatrix}
				toggleShowGrid={() => setShowGrid(!showGrid)}
				handleAutoPosition={handleAutoPosition}
				uploadLog={handleUploadLog}
				showGrid={showGrid}
				rainbowPredictions={rainbowPredictions}
			/>
			<section className="workspace">
				<div className="left-bar-div">
					{activeGraphController && (
						<ControlBar
							controller={activeGraphController}
							multi={multiController.current}
							activeName={activeName}
							setActiveName={handleNameChange}
							fitness={fitness}
							variantCoverage={variantCoverage}
							logCoverage={logCoverage}
							variants={variants}
							supportMax={supportMax}
						/>
					)}
				</div>
				<section className="workspace-div">
					<div className="tabs-div">
						{tabs.map(([_, name], index) => (
							<a
								key={index}
								className={`tab${activeTabIndex === index ? "active" : ""}`}
								onClick={() => handleTabClick(index)}>
								{name}
								{activeTabIndex === index && (
									<div className="active-tab-indicator" />
								)}
								<button
									className="tabCloseButton"
									onClick={(event) => {
										event.stopPropagation();
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
								showGrid={showGrid}
								showLineThickness={showLineThickness}
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
