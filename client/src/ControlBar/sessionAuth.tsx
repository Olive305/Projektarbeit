import axios, { AxiosResponse } from "axios";

type StartSessionResponse = {
	message: string;
	session_id: string;
};

type MatrixChangeResponse = {
	message: string;
};

type MetricsResponse = {
	metrics: any;
};

export class SessionAuth {
	public sessionId: string | null = null;
	private apiUrl: string = `${window.location.origin}/api`;
	private isCalculatingPm4pyMetrics: boolean = false;
	setSessionStarted: any;

	async startSession(matrixName: string, file?: File) {
		if (this.sessionId) return;
		const formData = new FormData();
		formData.append("matrix_name", matrixName);
		if (file) {
			formData.append("file", file);
		}

		try {
			const response: AxiosResponse<StartSessionResponse> = await axios.post(
				`${this.apiUrl}/startSession`,
				formData,
				{ headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
			);

			this.sessionId = response.data.session_id;
			this.setSessionStarted(true);
		} catch (error) {
			console.error("Error starting session:", error);
			throw new Error("Failed to start session. Please try again.");
		}
	}

	waitForSessionStart = async (interval = 100) => {
		while (!this.sessionId) {
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
	};

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

	async addLog(matrixName: string, file: File): Promise<{ message: string }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const formData = new FormData();
		formData.append("matrix_name", matrixName);
		formData.append("file", file);

		const response: AxiosResponse<{ message: string }> = await axios.post(
			`${this.apiUrl}/addLog`,
			formData,
			{ headers: { "Content-Type": "multipart/form-data" }}
		);

		return response.data;
	}

	async getAvailableMatrices(): Promise<any> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<string[]> = await axios.get(
			`${this.apiUrl}/getAvailableMatrices`
		);

		const data = JSON.parse(JSON.stringify(response.data));
		return data;
	}

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

	async generatePetriNetFile(): Promise<void> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response = await axios.post(`${this.apiUrl}/generatePetriNetFile`, null, {
			responseType: "blob",
		});

		const url = window.URL.createObjectURL(new Blob([response.data]));
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute("download", "petri_net.pnml");
		document.body.appendChild(link);
		link.click();
		link.remove();
	}

	async getMetrics(
		setVariantCoverage: any,
		setEventLogCoverage: any
	) {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<MetricsResponse> = await axios.post(
			`${this.apiUrl}/getMetrics`
		);

		const data = JSON.parse(response.data.metrics);

		setVariantCoverage(data.variant_coverage);
		setEventLogCoverage(data.event_log_coverage);
	}

	async getPm4pyMetrics(
		setFitness: any
	) {
		if (this.isCalculatingPm4pyMetrics) return false;
		this.isCalculatingPm4pyMetrics = true

		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<MetricsResponse> = await axios.post(
			`${this.apiUrl}/getPm4pyMetrics`,
			{},
			{ withCredentials: true }
		);

		const data = JSON.parse(response.data.metrics);

		setFitness(data.fitness);
		this.isCalculatingPm4pyMetrics = false;
		return true;
	}

	async predictOutcome(graphInput: any, matrix: string) {
		if (!this.sessionId) throw new Error("Session has not been started.");

		try {
			const response: any = await axios.post(`${this.apiUrl}/predictOutcome`, {
				graph_input: graphInput,
				matrix,
			}, { withCredentials: true });
			return response.data;
		} catch (error) {
			console.error("Error predicting outcome:", error);
			throw error;
		}
	}

	async testConnection(): Promise<{ status: string }> {
		const response: AxiosResponse<{ status: string }> = await axios.get(
			`${this.apiUrl}/testConnection`,
			{ withCredentials: true }
		);

		return response.data;
	}
	async removeMatrix(matrixName: string): Promise<{ message: string }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		const response: AxiosResponse<{ message: string }> = await axios.post(
			`${this.apiUrl}/removeMatrix`,
			{ matrix_name: matrixName },
			{ withCredentials: true }
		);

		return response.data;
	}

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

	async getVariants(): Promise<{ variants: any }> {
		if (!this.sessionId) throw new Error("Session has not been started.");

		try {
			const response: AxiosResponse<{ variants: any }> = await axios.post(
				`${this.apiUrl}/getVariants`
			);
			return response.data;
		} catch (error) {
			console.error("Error getting variants:", error);
			throw error;
		}
	}
}
