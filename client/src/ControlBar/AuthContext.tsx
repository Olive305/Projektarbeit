import React, {
	createContext,
	useState,
	useContext,
	useEffect,
	ReactNode,
} from "react";
import { SessionAuth } from "./sessionAuth";

// Define AuthContext structure with types for TypeScript
interface AuthContextProps {
	sessionId: string | null;
	startSession: (matrixName: string, file?: File) => Promise<void>;
	changeMatrix: (matrixName: string, file?: File) => Promise<any>;
	getAvailableMatrices: () => Promise<any>;
	generatePetriNet: () => Promise<any>;
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
		setFitness: (val: number) => void,
		setSimplicity: (val: number) => void,
		setPrecision: (val: number) => void,
		setGeneralization: (val: number) => void
	) => Promise<void>;
}

// Add children prop in AuthProviderProps
interface AuthProviderProps {
	children: ReactNode;
}

export const AuthContext = createContext<AuthContextProps | undefined>(
	undefined
);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [sessionResponse] = useState(new SessionAuth());
	const [sessionId, setSessionId] = useState<string | null>(null);

	// Define functions that will be available through context
	const startSession = async (matrixName: string, file?: File) => {
		await sessionResponse.startSession(matrixName, file);
		setSessionId(sessionResponse.sessionId);
	};

	const changeMatrix = async (matrixName: string, file?: File) => {
		const response = await sessionResponse.changeMatrix(matrixName, file);
		return response; // Keep the type consistent with MatrixChangeResponse
	};

	const removeMatrix = async (matrixName: string) => {
		if (!sessionId) throw new Error("Session has not been started.");
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
		setFitness: (val: number) => void,
		setSimplicity: (val: number) => void,
		setPrecision: (val: number) => void,
		setGeneralization: (val: number) => void
	) => {
		await sessionResponse.getPm4pyMetrics(
			setFitness,
			setSimplicity,
			setPrecision,
			setGeneralization
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

// Hook to use AuthContext in other components
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
