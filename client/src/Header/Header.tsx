import React, { useState, useEffect } from "react";
import "./header.css";
import CloseIcon from "../assets/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import UploadIcon from "../assets/upload_file_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

interface HeaderProps {
	createNewGraph: (name: string) => void;
	readGraphFromFile: (file: File) => Promise<void>;
	saveGraph: (index: number) => Promise<void>;
	saveAllGraphs: () => Promise<void>;
	activeTabIndex: number;
	setActiveMatrix: (matrix: string, file?: File) => void;
	toggleRainbowPredictions: () => void;
	handleToPetriNet: () => void;
	defaultMatrices: any;
	customMatrices: any;
	customLogs: any;
	showGrid: boolean;
	rainbowPredictions: boolean;
	deleteMatrix: (matrixName: string) => void;
	toggleShowGrid: () => void;
	handleAutoPosition: () => Promise<any>;
	uploadLog: (matrixName: string, file: File) => void;
}

const Header: React.FC<HeaderProps> = ({
	createNewGraph,
	readGraphFromFile,
	saveGraph,
	activeTabIndex,
	setActiveMatrix,
	toggleRainbowPredictions,
	handleToPetriNet,
	defaultMatrices,
	customMatrices,
	customLogs,
	deleteMatrix,
	toggleShowGrid,
	showGrid,
	rainbowPredictions,
	handleAutoPosition,
	uploadLog,
}) => {
	const [loading, setLoading] = useState(true); // Loading state to indicate API call

	useEffect(() => {
		setLoading(false);
	}, []); // Empty dependency array ensures this runs on component mount

	const handleCreateNew = () => {
		const newName = prompt("Enter the name for the new graph:");
		if (newName) {
			createNewGraph(newName);
		}
	};

	const handleOpenFromFile = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		console.log("Reading file");
		const file = event.target.files?.[0];
		if (file) {
			await readGraphFromFile(file);
		} else {
			console.error("No file selected");
		}
	};

	const handleSaveCurrent = async () => {
		await saveGraph(activeTabIndex);
	};

	return (
		<header className="">
			<nav className="">
				{/* File Menu */}
				<Menu
					as="div"
					className="">
					<div>
						<MenuButton className="dropdown-button">File</MenuButton>
					</div>
					<MenuItems className="dropdown-menu">
						<div className="py-1">
							<MenuItem>
								{() => (
									<a
										href="#"
										onClick={handleCreateNew}>
										New
									</a>
								)}
							</MenuItem>
							<MenuItem>
								{() => (
									<a
										href="#"
										onClick={() => {
											const input = document.createElement("input");
											input.type = "file";
											input.onchange = (event) =>
												handleOpenFromFile(
													event as unknown as React.ChangeEvent<HTMLInputElement>
												);
											input.click();
										}}>
										Open from File
									</a>
								)}
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={handleSaveCurrent}>
									Save
								</a>
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={() => {
										handleToPetriNet();
									}}>
									Zu Petri Netz
								</a>
							</MenuItem>
						</div>
					</MenuItems>
				</Menu>

				{/* Matrix Menu */}
				<Menu
					as="div"
					className="">
					<div>
						<MenuButton className="dropdown-button">
							{loading ? "Loading..." : "Matrix"}
						</MenuButton>
					</div>
					<MenuItems className="dropdown-menu">
						<div className="py-1">
							{defaultMatrices.length > 0 ? (
								defaultMatrices.map((matrix: any) => (
									<MenuItem key={matrix}>
										<div className="matrix-item">
											<a
												href="#"
												onClick={async () => setActiveMatrix(matrix)}>
												{matrix}
											</a>
										</div>
									</MenuItem>
								))
							) : (
								<div className="px-4 py-2 text-sm text-gray-500">
									No matrices available
								</div>
							)}
						</div>
						<hr className="my-2" /> {/* Horizontal line to separate items */}
						{customMatrices.length > 0 ? (
							customMatrices.map((matrix: any) => (
								<MenuItem key={matrix}>
									<div className="matrix-item">
										<a
											href="#"
											onClick={async () => setActiveMatrix(matrix)}>
											{matrix}
										</a>
										<button
											className="deleteMatrixButton"
											style={{ display: "inline-block", marginLeft: "10px" }}
											onClick={(event) => {
												event.stopPropagation();
												deleteMatrix(matrix);
											}}>
											<img
												src={CloseIcon}
												alt="Close"
											/>
										</button>
										{!customLogs[matrix] && (
											<button
												className="uploadLogButton"
												style={{ display: "inline-block", marginLeft: "10px" }}
												onClick={(_) => {
													const input = document.createElement("input");
													input.type = "file";
													input.onchange = async (event: Event) => {
														const file = (event.target as HTMLInputElement)
															.files?.[0];
														console.log("reading from file");
														if (file) {
															uploadLog(
																matrix ? matrix : "Matrix",
																file
															);
														}
													};
													input.click();
												}}>
												<img
													src={UploadIcon}
													alt="Upload"
												/>
											</button>
										)}
									</div>
								</MenuItem>
							))
						) : (
							<div className="px-4 py-2 text-sm text-gray-500">No custom matrices</div>
						)}

						<MenuItem>
							{() => (
								<a
									className="addMatrixButton"
									href="#"
									onClick={async () => {
										const input = document.createElement("input");
										input.type = "file";
										input.onchange = async (event: Event) => {
											const file = (event.target as HTMLInputElement)
												.files?.[0];
											console.log("reading from file");
											if (file) {
												const matrixName = prompt(
													"Enter the name for the new matrix:"
												);
												setActiveMatrix(
													matrixName ? matrixName : "Matrix",
													file
												); // Use this to read and set the matrix
											}
										};
										input.click();
									}}>
									Add Matrix
								</a>
							)}
						</MenuItem>
					</MenuItems>
				</Menu>

				<Menu
					as="div"
					className="">
					<div>
						<MenuButton className="dropdown-button">Appearance</MenuButton>
					</div>
					<MenuItems className="dropdown-menu">
						<div className="py-1">
							<MenuItem>
								<a
									href="#"
									onClick={toggleShowGrid}>
									<input
										className="checkbox"
										type="checkbox"
										checked={showGrid}
										onChange={toggleShowGrid}
									/>
									<label>Show Grid</label>
								</a>
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={toggleRainbowPredictions}>
									<input
										className="checkbox"
										type="checkbox"
										checked={rainbowPredictions}
										onChange={toggleRainbowPredictions}
									/>
									<label>Rainbow Prediction</label>
								</a>
							</MenuItem>
							<MenuItem>
							<hr className="my-2" />
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={handleAutoPosition}>
									Auto Position Graph
								</a>
							</MenuItem>
						</div>
					</MenuItems>
				</Menu>
			</nav>
		</header>
	);
};

export default Header;
