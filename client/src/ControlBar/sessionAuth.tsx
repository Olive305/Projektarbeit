import axios, { AxiosResponse } from "axios";

type StartSessionResponse = {
	message: string;
	session_id: string;
};

type PredictionResponse = {
	predictions: any; // Adjust type based on actual prediction data structure
};

type MatrixChangeResponse = {
	message: string;
};

type MetricsResponse = {
	metrics: any; // Adjust type based on actual metrics data structure
};

type PetriNetResponse = {
	net: any; // Adjust type based on actual Petri net data structure
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

		const formData = new FormData();
		formData.append("matrix_name", matrixName);
		if (file) {
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

	// Generate a Petri net from the provided graph input
	async generatePetriNet(): Promise<PetriNetResponse> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<PetriNetResponse> = await axios.post(
			`${this.apiUrl}/generatePetriNet`
		);

		console.log("response petri net", response.data);

		return response.data;
	}

	// Get metrics for a specific graph input
	async getMetrics(
		setFitness: any,
		setGeneralization: any,
		setSimplicity: any,
		setPrecision: any
	) {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<MetricsResponse> = await axios.post(
			`${this.apiUrl}/getMetrics`
		);

		const data = JSON.parse(response.data.metrics);
		setFitness(data.fitness);
		setGeneralization(data.generalization);
		setPrecision(data.precision);
		setSimplicity(data.setSimplicity);
	}

	// Generate predictions based on the graph input
	async predictOutcome(
		graphInput: any,
		matrix: string
	): Promise<PredictionResponse> {
		console.log(this.sessionId);
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<PredictionResponse> = await axios.post(
			`${this.apiUrl}/predictOutcome`,
			{ graph_input: graphInput, matrix }
		);
		return response.data;
	}

	// Test server connection
	async testConnection(): Promise<{ status: string }> {
		const response: AxiosResponse<{ status: string }> = await axios.get(
			`${this.apiUrl}/testConnection`
		);

		return response.data;
	}
}
