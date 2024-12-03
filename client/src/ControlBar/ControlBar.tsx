import React, { useEffect, useState, useRef } from "react";
import GraphController from "./GraphController";
import "./ControlBar.css";
import MultiGraphs from "./MultiGraphs";
import ArrowDropDownIcon from "../assets/arrow_drop_down_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg";

interface ControlsProps {
	controller: GraphController;
	multi: MultiGraphs;
	activeName: string;
	setActiveName: (name: string) => void;
	fitness: any;
	simplicity: any;
	precision: any;
	generalization: any;
	variantCoverage: any;
	logCoverage: any;
	variants: any;
}

const ControlBar: React.FC<ControlsProps> = ({
	controller,
	activeName,
	setActiveName,
	fitness,
	precision,
	generalization,
	simplicity,
	variantCoverage,
	logCoverage,
	variants,
}) => {
	const [sliderValue, setSliderValue] = useState(
		controller.probabilityMin * 100
	);
	const [isChecked, setIsChecked] = useState(controller.auto);
	const [showMetrics, setShowMetrics] = useState(false);
	const [showProbability, setShowProbability] = useState(false);
	const [showVariants, setShowVariants] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [displayedVariants, setDisplayedVariants] = useState<
		[string, boolean, number][]
	>([]);
	const [sortOrder, setSortOrder] = useState("default");
	const [showSortMenu, setShowSortMenu] = useState(false);
	const sortMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		getDisplayedVariants();
	}, [variants, sortOrder, searchTerm]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				sortMenuRef.current &&
				!sortMenuRef.current.contains(event.target as Node)
			) {
				setShowSortMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [sortMenuRef]);

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(event.target.value);
	};

	const getDisplayedVariants = () => {
		// convert the variant dict to a tuple of the trace, is_covered, and the support
		const newDisplayedVariants: [string, boolean, number][] = [];
		for (const variant of variants) {
			// check for search term
			const searchTerms = searchTerm
				.toLowerCase()
				.split(/[\s,]+/)
				.filter(Boolean);
			if (
				searchTerms.every((term) =>
					String(variant[0]).toLowerCase().includes(term)
				) ||
				searchTerm === ""
			) {
				newDisplayedVariants.push([variant[0], variant[1], variant[2]]);
			}
		}

		// sort the displayed variants
		if (sortOrder === "support") {
			newDisplayedVariants.sort((a, b) => {
				return b[2] - a[2];
			});
		}

		setDisplayedVariants(newDisplayedVariants);
	};

	const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number(event.target.value);
		setSliderValue(value);
	};

	const handleSliderMouseUp = () => {
		controller.probabilityMin = sliderValue / 100;
		controller.get_preview_nodes();
	};

	const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setActiveName(event.target.value);
	};

	const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		controller.auto = event.target.checked;
		setIsChecked(event.target.checked);
		controller.get_preview_nodes();
	};

	const toggleMetrics = () => setShowMetrics(!showMetrics);

	const toggleProbability = () => setShowProbability(!showProbability);

	const toggleVariants = () => setShowVariants(!showVariants);

	return (
		<div>
			<div className="processNameContainer">
				<label
					htmlFor="processName"
					className="label">
					Process:
				</label>
				<input
					type="text"
					id="processName"
					value={activeName}
					onChange={handleNameChange}
					placeholder="Enter process name"
					className="input"
				/>
			</div>

			<hr className="my-2" />

			<div className="collapsibleSection">
				<button
					onClick={toggleMetrics}
					className="collapsibleButton">
					Performance Metrics
					<img
						src={ArrowDropDownIcon}
						alt="Toggle"
						className={showMetrics ? "dropdownIconExpanded" : "dropdownIcon"}
					/>
				</button>
				{showMetrics && (
					<div className="performanceMetrics">
						<div className="metric">
							<label>Fitness: {fitness ? Math.round(fitness * 100) : 0}%</label>
							<progress
								value={fitness}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Simplicity: {simplicity ? Math.round(simplicity * 100) : 0}%
							</label>
							<progress
								value={simplicity}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Precision: {precision ? Math.round(precision * 100) : 0}%
							</label>
							<progress
								value={precision}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Generalization:{" "}
								{generalization ? Math.round(generalization * 100) : 0}%
							</label>
							<progress
								value={generalization}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Variant Coverage:{" "}
								{variantCoverage ? Math.round(variantCoverage * 100) : 0}%
							</label>
							<progress
								value={variantCoverage}
								max="1"
								className="progressBar"></progress>
						</div>
						<div className="metric">
							<label>
								Log Coverage: {logCoverage ? Math.round(logCoverage * 100) : 0}%
							</label>
							<progress
								value={logCoverage}
								max="1"
								className="progressBar"></progress>
						</div>
					</div>
				)}
			</div>

			<hr className="my-2" />

			<div className="collapsibleSection">
				<button
					onClick={toggleProbability}
					className="collapsibleButton">
					Probability Settings
					<img
						src={ArrowDropDownIcon}
						alt="Toggle"
						className={
							showProbability ? "dropdownIconExpanded" : "dropdownIcon"
						}
					/>
				</button>
				{showProbability && (
					<div className="probabilityContainer">
						<div className="checkBoxContainer">
							<input
								className="checkbox"
								type="checkbox"
								checked={isChecked}
								onChange={handleCheckboxChange}
							/>
							<label>Auto Probability</label>
						</div>
						<div className="sliderContainer">
							<div style={{ width: "10px" }}></div>
							<div className="slidecontainer">
								<p>Probability: {sliderValue}%</p>
								<input
									type="range"
									min="0"
									max="100"
									value={sliderValue}
									className="slider"
									id="myRange"
									style={{ background: "lightblue" }}
									onChange={handleSliderChange}
									onMouseUp={handleSliderMouseUp}
									disabled={isChecked}
								/>
							</div>
						</div>
					</div>
				)}
			</div>

			<hr className="my-2" />

			<div className="collapsibleSection">
				<button
					onClick={toggleVariants}
					className="collapsibleButton">
					Event Log Variants
					<img
						src={ArrowDropDownIcon}
						alt="Toggle"
						className={showVariants ? "dropdownIconExpanded" : "dropdownIcon"}
					/>
				</button>
				{showVariants && (
					<div className="variantsContainer">
						<div>
							<div className="searchSortContainer">
								<input
									type="text"
									placeholder="Search variants"
									value={searchTerm}
									onChange={handleSearchChange}
									className="input"
								/>
								<div className="sortButtonContainer">
									<button
										className="sortButton"
										onClick={() => setShowSortMenu(!showSortMenu)}>
										Sort
									</button>
									<div
										ref={sortMenuRef}
										onBlur={() => setShowSortMenu(false)}
										tabIndex={0} // Ensure the element can receive focus
									>
										{showSortMenu && (
											<div className="sortMenu">
												<button onClick={() => setSortOrder("default")}>
													Default
												</button>
												<button onClick={() => setSortOrder("support")}>
													Support
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
							<div className="variantsListContainer">
								{displayedVariants.length === 0 ? (
									<div
										className="variantItem"
										style={{ color: "gray" }}>
										No variants
									</div>
								) : (
									displayedVariants.map((variant: any) => (
										<div key={variant[0]}>
											<div
												className="variantItem"
												style={{ color: variant[1] ? "orange" : "black" }}>
												{variant[0].join(" ➔ ")}
											</div>
											<div
												className="variantSupport"
												style={{ color: "gray", fontSize: "small" }}>
												Support: {variant[2] !== undefined ? variant[2] : "N/A"}
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default ControlBar;
