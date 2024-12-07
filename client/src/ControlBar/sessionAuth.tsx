import axios, { AxiosResponse } from "axios";

type StartSessionResponse = {
	message: string;
	session_id: string;
};

type MatrixChangeResponse = {
	message: string;
};

type MetricsResponse = {
	metrics: any; // Adjust type based on actual metrics data structure
};

export class SessionAuth {
	public sessionId: string | null = null;
	private apiUrl: string = "http://localhost:8081/api";
	setSessionStarted: any;

	// Start a new session with either a predefined matrix or a custom file upload
	async startSession(matrixName: string, file?: File) {
		if (this.sessionId) return;
		const formData = new FormData();
		formData.append("matrix_name", matrixName);
		if (file) {
			formData.append("file", file);
		}

		const response: AxiosResponse<StartSessionResponse> = await axios.post(
			`${this.apiUrl}/startSession`,
			formData,
			{ headers: { "Content-Type": "multipart/form-data" } }
		);

		this.sessionId = response.data.session_id;
		this.setSessionStarted(true);
		console.log("session has started with id: ", this.sessionId);
	}

	waitForSessionStart = async (interval = 100) => {
		while (!this.sessionId) {
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
		console.log("session started with id", this.sessionId);
	};

	// Change the matrix mid-session by selecting a new predefined matrix or uploading a custom file
	async changeMatrix(
		matrixName: string,
		file?: File
	): Promise<MatrixChangeResponse> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		console.log("changing matrix", matrixName);

		const formData = new FormData();
		formData.append("matrix_name", matrixName);
		if (file) {
			console.log("file exists");
			formData.append("file", file);
		}

		const response: AxiosResponse<MatrixChangeResponse> = await axios.post(
			`${this.apiUrl}/changeMatrix`,
			formData,
			{ headers: { "Content-Type": "multipart/form-data" } }
		);

		return response.data;
	}

	// Retrieve available predefined matrices
	async getAvailableMatrices(): Promise<string[]> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<string[]> = await axios.get(
			`${this.apiUrl}/getAvailableMatrices`
		);

		const data = JSON.parse(JSON.stringify(response.data)); // Ensures response data is in JSON format
		return data;
	}

	// Generate a Petri net from the provided graph input and download the image
	async generatePetriNet(): Promise<void> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response = await axios.post(`${this.apiUrl}/generatePetriNet`, null, {
			responseType: "blob",
		});

		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "petri_net.jpg");
		document.body.appendChild(link);
		link.click();
		link.remove();
	}

	// Get metrics for a specific graph input
	async getMetrics(
		setFitness: any,
		setGeneralization: any,
		setSimplicity: any,
		setPrecision: any,
		setVariantCoverage: any,
		setEventLogCoverage: any
	) {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<MetricsResponse> = await axios.post(
			`${this.apiUrl}/getMetrics`
		);

		const data = JSON.parse(response.data.metrics);
		console.log("setting metrics", data);

		setFitness(data.fitness);
		setGeneralization(data.generalization);
		setPrecision(data.precision);
		setSimplicity(data.simplicity);
		setVariantCoverage(data.variant_coverage);
		setEventLogCoverage(data.event_log_coverage);
	}

	// Generate predictions based on the graph input
	async predictOutcome(graphInput: any, matrix: string) {
		console.log(this.sessionId);
		if (!this.sessionId) throw new Error("Session has not been started.");

		try {
			const response: any = await axios.post(`${this.apiUrl}/predictOutcome`, {
				graph_input: graphInput,
				matrix,
			});
			return response.data;
		} catch (error) {
			console.error("Error predicting outcome:", error);
			throw error;
		}
	}

	// Test server connection
	async testConnection(): Promise<{ status: string }> {
		const response: AxiosResponse<{ status: string }> = await axios.get(
			`${this.apiUrl}/testConnection`
		);

		return response.data;
	}

	// Remove a custom matrix from the session
	async removeMatrix(matrixName: string): Promise<{ message: string }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<{ message: string }> = await axios.post(
			`${this.apiUrl}/removeMatrix`,
			{ matrix_name: matrixName }
		);

		return response.data;
	}

	// Automatically position the nodes of the current graph
	async autoPosition(): Promise<{ positions: any }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		try {
			const response: AxiosResponse<{ positions: any }> = await axios.get(
				`${this.apiUrl}/autoPosition`
			);
			return response.data;
		} catch (error) {
			console.error("Error auto positioning nodes:", error);
			throw error;
		}
	}

	// Get variants based on the last used matrix
	async getVariants(): Promise<{ variants: any }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		try {
			const response: AxiosResponse<{ variants: any }> = await axios.post(
				`${this.apiUrl}/getVariants`
			);
			console.log("variants", response, response.data);
			return response.data;
		} catch (error) {
			console.error("Error getting variants:", error);
			throw error;
		}
	}
}
