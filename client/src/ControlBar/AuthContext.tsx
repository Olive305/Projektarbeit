import React, {
	createContext,
	useState,
	useContext,
	useEffect,
	ReactNode,
} from "react";
import { SessionAuth } from "./sessionAuth";

interface AuthContextProps {
	sessionId: string | null;
	startSession: (matrixName: string, file?: File) => Promise<void>;
	changeMatrix: (matrixName: string, file?: File) => Promise<any>;
	getAvailableMatrices: () => Promise<any>;
	generatePetriNet: () => Promise<any>;
	generatePetriNetFile: () => Promise<any>;
	getMetrics: (
		setVariantCoverage: (val: number) => void,
		setEventLogCoverage: (val: number) => void
	) => Promise<void>;
	predictOutcome: (graphInput: any, matrix: string) => Promise<any>;
	testConnection: () => Promise<{ status: string }>;
	removeMatrix: (matrixName: string) => Promise<any>;
	getVariants: () => Promise<any>;
	autoPosition: () => Promise<any>;
	uploadLog: (matrixName: string, file: File) => void;
	getPm4pyMetrics: (
		setFitness: (val: number) => void
	) => Promise<void>;
}

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthContext = createContext<AuthContextProps | undefined>(
	undefined
);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [sessionResponse] = useState(new SessionAuth());
	const [sessionId, setSessionId] = useState<string | null>(null);

	const startSession = async (matrixName: string, file?: File) => {
		await sessionResponse.startSession(matrixName, file);
		setSessionId(sessionResponse.sessionId);
	};

	const changeMatrix = async (matrixName: string, file?: File) => {
		const response = await sessionResponse.changeMatrix(matrixName, file);
		return response;
	};

	const removeMatrix = async (matrixName: string) => {
		if (!sessionId) throw new Error("Session did not start.");
		const response = await sessionResponse.removeMatrix(matrixName);
		return response;
	};

	const uploadLog = async (matrixName: string, file: File) => {
		await sessionResponse.addLog(matrixName, file);
	}

	const getAvailableMatrices = async () => {
		return await sessionResponse.getAvailableMatrices();
	};

	const generatePetriNet = async () => {
		return await sessionResponse.generatePetriNet();
	};

	const generatePetriNetFile = async () => {
		return await sessionResponse.generatePetriNetFile();
	};

	const autoPosition = async () => {
		return await sessionResponse.autoPosition();
	};

	const getMetrics = async (
		setVariantCoverage: (val: number) => void,
		setEventLogCoverage: (val: number) => void
	) => {
		await sessionResponse.getMetrics(
			setVariantCoverage,
			setEventLogCoverage
		);
	};

	const getPm4pyMetrics = async (
		setFitness: (val: number) => void
	) => {
		await sessionResponse.getPm4pyMetrics(
			setFitness
		);
	}

	const predictOutcome = async (graphInput: any, matrix: string) => {
		return await sessionResponse.predictOutcome(graphInput, matrix);
	};

	const testConnection = async () => {
		return await sessionResponse.testConnection();
	};

	const getVariants = async () => {
		return await sessionResponse.getVariants();
	};

	useEffect(() => {
		sessionResponse.setSessionStarted = setSessionId;
	}, []);

	return (
		<AuthContext.Provider
			value={{
				sessionId,
				startSession,
				changeMatrix,
				getAvailableMatrices,
				generatePetriNet,
				generatePetriNetFile,
				getMetrics,
				predictOutcome,
				testConnection,
				removeMatrix,
				getVariants,
				autoPosition,
				getPm4pyMetrics,
				uploadLog,
			}}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used in a AuthProvider");
	}
	return context;
};
