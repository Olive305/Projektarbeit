import React, { useState, useEffect } from "react";
import "./header.css";
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
	matrices: any;
}

const Header: React.FC<HeaderProps> = ({
	createNewGraph,
	readGraphFromFile,
	saveGraph,
	saveAllGraphs,
	activeTabIndex,
	setActiveMatrix,
	toggleRainbowPredictions,
	handleToPetriNet,
	matrices,
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
		const file = event.target.files?.[0];
		if (file) {
			await readGraphFromFile(file);
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
								<>
									<label>
										<input
											type="file"
											onChange={handleOpenFromFile}
										/>
									</label>
								</>
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
									onClick={saveAllGraphs}>
									Save All
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
							{matrices.length > 0 ? (
								matrices.map((matrix: any) => (
									<MenuItem key={matrix}>
										<a
											href="#"
											onClick={async () => setActiveMatrix(matrix)}>
											{matrix}
										</a>
									</MenuItem>
								))
							) : (
								<div className="px-4 py-2 text-sm text-gray-500">
									No matrices available
								</div>
							)}
						</div>
						<hr className="my-2" /> {/* Horizontal line to separate items */}
						<MenuItem>
							{() => (
								<label
									className="px-4 py-2 text-sm text-gray-700 cursor-pointer"
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
								</label>
							)}
						</MenuItem>
					</MenuItems>
				</Menu>

				<Menu
					as="div"
					className="">
					<div>
						<MenuButton className="dropdown-button">View</MenuButton>
					</div>
					<MenuItems className="dropdown-menu">
						<div className="py-1">
							<MenuItem>
								<a
									href="#"
									onClick={() => {}}>
									Show Grid
								</a>
							</MenuItem>
							<MenuItem>
								<a
									href="#"
									onClick={toggleRainbowPredictions}>
									Rainbow Prediction
								</a>
							</MenuItem>
						</div>
					</MenuItems>
				</Menu>
			</nav>
			<hr />
		</header>
	);
};

export default Header;
