import React, { useState, useEffect } from "react";
import "./header.css";
import CloseIcon from "../assets/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import SaveIcon from "../assets/save_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import ImageIcon from "../assets/image_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import FolderIcon from "../assets/folder_open_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import AddIcon from "../assets/add_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import GraphIcon from "../assets/graph_1_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
import DownloadIcon from "../assets/download_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";
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
	handleToPetriNetFile: () => void;
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
	handleToPetriNetFile,
	defaultMatrices,
	customMatrices,
	deleteMatrix,
	toggleShowGrid,
	showGrid,
	rainbowPredictions,
	handleAutoPosition,
}) => {
	const [loading, setLoading] = useState(true); // Loading state to indicate API call

	useEffect(() => {
		setLoading(false);
	}, []); // Empty dependency array ensures this runs on component mount

	const handleCreateNew = () => {
		const newName = "New";
		if (newName) {
			createNewGraph(newName);
		}
	};

	const handleOpenFromFile = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
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
						<MenuButton className="header-dropdown-button">File</MenuButton>
					</div>
					<MenuItems className="header-dropdown-menu">
						<div className="py-1">
							<MenuItem>
								{() => (
									<a
										href="#"
										onClick={handleCreateNew}>
										<img
											src={AddIcon}
											alt="Add"
										/>
										New
									</a>
								)}
							</MenuItem>
							<hr className="header-my-2" /> {/* Horizontal line to separate items */}
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
										<img
											src={FolderIcon}
											alt="Folder"
										/>
										Open file
									</a>
								)}
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={handleSaveCurrent}>
									<img
										src={SaveIcon}
										alt="Save"
									/>
									Save
								</a>
							</MenuItem>
							<hr className="header-my-2" /> {/* Horizontal line to separate items */}
							<MenuItem>
								<a
									href="#"
									onClick={() => {
										handleToPetriNet();
									}}>
									<img
										src={ImageIcon}
										alt="PetriNetImg"
									/>
									Petri net picture
								</a>
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={() => {
										handleToPetriNetFile();
									}}>
									<img
										src={DownloadIcon}
										alt="PetriNetFile"
									/>
									Petri net pnml file
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
						<MenuButton className="header-dropdown-button">
							{loading ? "Loading..." : "Matrix"}
						</MenuButton>
					</div>
					<MenuItems className="header-dropdown-menu">
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
								<label className="header-notavailable-label">
									No matrices available
								</label>
							)}
						</div>
						<hr className="header-my-2" /> {/* Horizontal line to separate items */}
						{customMatrices.length > 0 ? (
							customMatrices.map((matrix: any) => (
								<MenuItem key={matrix}>
									<div className="header-custom-matrix-item">
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
										
									</div>
								</MenuItem>
							))
						) : (
							<label className="header-notavailable-label">No custom matrices</label>
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
						<MenuButton className="header-dropdown-button">Appearance</MenuButton>
					</div>
					<MenuItems className="header-dropdown-menu">
						<div className="py-1">
							<MenuItem>
								<a
									href="#"
									onClick={toggleShowGrid}>
									<input
										className="header-checkbox"
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
										className="header-checkbox"
										type="checkbox"
										checked={rainbowPredictions}
										onChange={toggleRainbowPredictions}
									/>
									<label>Color Predictions</label>
								</a>
							</MenuItem>
							<MenuItem>
							<hr className="header-my-2" />
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={handleAutoPosition}>
									<img
										src={GraphIcon}
										alt="Auto Position"
										style={{ transform: "rotate(270deg)" }}
									/>
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
