
from matrices.openMatrix import MyCsv
from prediction import Prediction
from flask import Flask, jsonify, send_file, request, g, send_from_directory, session
from pm4py.objects.log.importer.xes import importer as xes_importer
from flask_cors import CORS
import os
import uuid

# Definition of project folder
project_folder = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__, static_folder=os.path.join("static"), static_url_path=""
)
app.secret_key = "0000"  # Required for session management
CORS(app)

app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=False,
)

# Paths to predefined matrices
matrix_paths = [
    (os.path.join(project_folder, "matrices", "Helpdesk_nsp_matrix.csv"), "Helpdesk"),
    (
        os.path.join(
            project_folder, "matrices", "PDC_2020_1211111_TrainTest_nsp_matrix.csv"
        ),
        "PDC_2020_1211111_TrainTest",
    ),
    (
        os.path.join(project_folder, "matrices", "SimpleIORChoice_nsp_matrix.csv"),
        "Simple IOR Choice",
    ),
]

# Paths to predefined logs
logs_paths = {
    "PDC_2020_1211111_TrainTest": os.path.join(
        project_folder, "eventlogs", "pdc_2020_1211111.xes"
    )
}

# Load predefined matrices
matrices = {}
for path, name in matrix_paths:
    matrix = MyCsv()
    matrix.openCsv(path)
    matrices[name] = matrix

# Load predefined logs
logs = {}
for name, path in logs_paths.items():
    logs[name] = xes_importer.apply(path)


@app.route("/")
@app.route("/<path:path>")
def serve_frontend(path=""):
    # Serve the static file if it exists else serve index.html
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):  # type: ignore
        return send_from_directory(app.static_folder, path)  # type: ignore
    else:
        return send_from_directory(app.static_folder, "index.html")  # type: ignore


@app.route("/api/testConnection", methods=["GET"])
def test_connection():
    # Test if server has connection  
    return jsonify({"status": "Connection successful"})


@app.route("/api/autoPosition", methods=["GET"])
def auto_position():
    # Auto position the nodes

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    prediction.positionGraph()
    return jsonify({"positions": prediction.serializeNodePositions()})


@app.route("/api/startSession", methods=["POST"])
def start_session():
    # Start a new session  
    data = request.form

    # Check for matrix name and custom CSV upload
    matrix_name = data.get("matrix_name")
    custom_csv = None if "file" not in request.files else request.files.get("file")

    # Initialize a new Prediction variable
    if custom_csv:
        tmp = os.path.join(os.path.sep, "tmp")
        if not os.path.exists(tmp):
            os.makedirs(tmp)
        custom_path = os.path.join(tmp, f"{uuid.uuid4()}.csv")
        custom_csv.save(custom_path)
        csv = MyCsv()
        csv.openCsv(custom_path)
        session["matrix"] = csv
        g.custom_path = custom_path
        matrix = csv
    elif matrix_name and matrix_name in matrices:
        matrix = matrices[matrix_name]
    else:
        return jsonify(
            {"error": "Please provide a valid matrix name or upload a CSV file."}
        ), 400

    pred = Prediction(matrix)

    session["prediction"] = pred.to_json()
    session["session_id"] = str(uuid.uuid4())

    return jsonify(
        {"message": "Session started successfully", "session_id": session["session_id"]}
    )


@app.route("/api/changeMatrix", methods=["POST"])
def change_matrix():
    # Change the currently used matrix
    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found."}
        ), 400

    data = request.form or {}
    matrix_name = data.get("matrix_name")
    custom_csv = None if "file" not in request.files else request.files.get("file")

    # Check if custom matrices are in session
    if "custom_matrices" not in session:
        session["custom_matrices"] = {}

    # Check if using a predefined matrix
    if matrix_name in matrices:
        # Update predefined matrix and delete custom matrix path
        matrix = matrices[matrix_name]

    elif matrix_name in session.get("custom_matrices", {}):
        # Update custom matrix and clear predefined matrix
        matrix = MyCsv.from_dict(session["custom_matrices"][matrix_name])

    # Check if the custom matrix is uploaded as file
    elif custom_csv:
        # Create tmp directory if it doesnt exist
        tmp = os.path.join(os.path.sep, "tmp")
        if not os.path.exists(tmp):
            os.makedirs(tmp)

        # Save new custom CSV
        custom_path = os.path.join(tmp, f"{uuid.uuid4()}.csv")
        custom_csv.save(custom_path)

        # Load matrix from CSV
        matrix = MyCsv()
        matrix.openCsv(custom_path)

        # Store the custom matrix in session
        session["custom_matrices"][matrix_name] = matrix.to_dict()
        if "matrix_paths" not in session:
            session["matrix_paths"] = {}
        session["matrix_paths"][matrix_name] = custom_path  # Update path for teardown
        g.custom_path = custom_path  # Update for teardown

    else:
        return jsonify(
            {"error": "Please provide a valid matrix name or upload a CSV file."}
        ), 400

    # Update the Prediction variable with the new matrix
    session["lastUsedMatrix"] = matrix_name

    return jsonify({"message": "Matrix added successfully"})


@app.route("/api/removeMatrix", methods=["POST"])  # type: ignore
def remove_matrix():
    # Remove a custom matrix from the session
    
    data = request.json
    matrix_name = data.get("matrix_name")  # type: ignore

    # If the matrix to remove is a predefined matrix do nothing
    if matrix_name in matrices:
        return jsonify({"message": "Predefined matrices cannot be removed"})

    # Ensure custom matrices are in session
    custom_matrices = session.get("custom_matrices", {})
    matrix_paths = session.get("matrix_paths", {})

    # Check if the matrix exists in the session
    if matrix_name in custom_matrices:
        # Remove the matrix from the session
        del custom_matrices[matrix_name]
        session["custom_matrices"] = custom_matrices

        # Remove the matrix file if it exists
        custom_path = matrix_paths.get(matrix_name)
        if custom_path and os.path.exists(custom_path):
            os.remove(custom_path)
            del matrix_paths[matrix_name]
            session["matrix_paths"] = matrix_paths
            
        if "custom_logs" in session and matrix_name in session["custom_logs"]:
            del session["custom_logs"][matrix_name]

        # Check if the last used matrix is the deleted matrix
        if session.get("lastUsedMatrix") == matrix_name:
            session["lastUsedMatrix"] = "Simple IOR Choice"

    return jsonify({"message": "Matrix removed successfully"})

@app.route("/api/addLog", methods=["POST"])
def add_log():
    # Add a log to an existing custom matrix
    data = request.form or {}
    matrix_name = data.get("matrix_name")
    custom_log = request.files.get("file") if "file" in request.files else None
    
    if matrix_name not in session.get("custom_matrices", {}):
        return jsonify({"error": "Matrix not found in session"}), 400
    
    if not custom_log:
        return jsonify({"error": "Please provide a valid log file"}), 400
    
    # Save the uploaded log to a temporary file
    tmp = os.path.join(os.path.sep, "tmp")
    if not os.path.exists(tmp):
        os.makedirs(tmp)
    custom_log_path = os.path.join(tmp, f"{uuid.uuid4()}.xes")
    custom_log.save(custom_log_path)
    
    # Store the log in the session
    if "custom_logs" not in session:
        session["custom_logs"] = {}
    session["custom_logs"][matrix_name] = custom_log_path
    
    return jsonify({"message": "Log added successfully"})


@app.route("/api/getAvailableMatrices", methods=["GET"])
def get_available_matrices():
    # Get all the matrices currently available (list)
    
    # Ensure custom matrices are in session
    custom_matrices_dict = session.get("custom_matrices", {})

    # Get predefined and custom matrices and the logs of custom matrices
    default_matrices = list(matrices.keys())
    custom_matrices = list(custom_matrices_dict.keys())
    custom_log = list(session.get("custom_logs", {}).keys())
    matrix_max_support_dict = {}
    for matrix in default_matrices:
        matrix_max_support_dict[matrix] = matrices[matrix].supportMax
    
    for matrix in custom_matrices:
        matrix_max_support_dict[matrix] = MyCsv.from_dict(custom_matrices_dict[matrix]).supportMax
    
    return jsonify({
        "default_matrices": default_matrices,
        "custom_matrices": custom_matrices,
        "custom_logs": custom_log,
        "matrix_max_support": matrix_max_support_dict
    })


@app.route("/api/generatePetriNet", methods=["POST"])
def generate_petri_net():
    # Generate a petri net image from the dfg

    if "prediction" not in session:
        return jsonify(
            {"error": "No active sesion found."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    petriNetPath = prediction.convert_to_petri_net()

    # Check if the file exists before sending it
    if os.path.exists(petriNetPath):
        return send_file(petriNetPath, mimetype="image/jpeg")
    else:
        return jsonify({"error": "Petri net image not found"}), 404
    
@app.route("/api/generatePetriNetFile", methods=["POST"])
def generate_petri_net_file():
    # # Generate a petri net file from the dfg

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    petriNetPath = prediction.convert_to_petri_net_as_file()

    # Check if the file exists before sending it
    if os.path.exists(petriNetPath):
        return send_file(petriNetPath)
    else:
        return jsonify({"error": "Petri net file not found"}), 404


@app.route("/api/getVariants", methods=["POST"])
def get_variants():
    # Get the variants from the current matrix
    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )

    variants = prediction.getVariants()

    return jsonify({"variants": variants})


@app.route("/api/getMetrics", methods=["POST"]) 
def get_metrics():
    # Get metrics

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found. Please start a session first."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )


    metrics = prediction.getMetrics()

    return jsonify({"metrics": metrics})

@app.route("/api/getPm4pyMetrics", methods=["POST"])
def get_pm4py_metrics():
    # Get pm4py metrics (here only fitness)

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found."}
        ), 400

    # Initialize Prediction with last used matrix
    prediction = Prediction.from_json(
        session["prediction"],
        matrices.get(session["lastUsedMatrix"])
        or MyCsv.from_dict(
            session.get("custom_matrices", {}).get(session["lastUsedMatrix"])
        ),
    )
    
    log = None

    # Get the log from predefined logs or custom logs in the session
    if "custom_logs" in session:
        if session["lastUsedMatrix"] in session["custom_logs"]:
            log = xes_importer.apply(session["custom_logs"][session["lastUsedMatrix"]])
            
    if not log:        
        log = logs.get(session["lastUsedMatrix"], None)

    metrics = prediction.getPm4pyMetrics(log)

    return jsonify({"metrics": metrics})


@app.route("/api/predictOutcome", methods=["POST"])
def predict_outcome():
    # Predict the next nodes for the given graph

    data = request.json
    graph_input = data.get("graph_input")  # type: ignore
    matrixName = data.get("matrix")  # type: ignore

    session["lastUsedMatrix"] = matrixName

    if "prediction" not in session:
        return jsonify(
            {"error": "No active session found"}
        ), 400

    # Get the matrix from predefined matrices or custom matrices
    matrix = matrices.get(matrixName) or MyCsv.from_dict(
        session.get("custom_matrices", {}).get(matrixName)
    )

    if not matrix:
        return jsonify({"error": "Given matrix not available in this session."}), 400

    prediction_data = session["prediction"]

    # Load Prediction from session and update it with new data
    prediction = Prediction.from_json(prediction_data, matrix)
    predictions = prediction.getPredictions(graph_input)

    # Update session with the Prediction instance
    session["prediction"] = prediction.to_json()
    session.modified = True  # Ensure session updates are saved

    return jsonify({"predictions": predictions})


@app.teardown_appcontext
def cleanup(exception=None):
    # Cleanup function for temp files
    # Access g.custom_path instead of session to avoid error
    custom_path = getattr(g, "custom_path", None)
    if custom_path and os.path.exists(custom_path):
        os.remove(custom_path)


if __name__ == "__main__":
    app.run()
