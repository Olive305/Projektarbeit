from matrices.openMatrix import MyCsv
from prediction import Prediction
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Multiple matrices usable
matrixPaths = [(r"C:\Users\olive\Coding\Projektarbeit\Code\server\matrices\Helpdesk_nsp_matrix.csv", "Helpdesk"),
               (r"C:\Users\olive\Coding\Projektarbeit\Code\server\matrices\PDC_2020_1211111_TrainTest_nsp_matrix.csv", "PDC_2020_1211111_TrainTest"),
               (r"C:\Users\olive\Coding\Projektarbeit\Code\server\matrices\SimpleIORChoice_nsp_matrix.csv", "Simple IOR Choice")]

matrices = {}

# Initialize the matrices
for path in matrixPaths:
    matrix = MyCsv()
    matrix.openCsv(path[0])
    matrix.preprocess_df()
    matrices[path[1]] = matrix

# Set default matrix and name
current_matrix = matrices["PDC_2020_1211111_TrainTest"]
current_matrix_name = "PDC_2020_1211111_TrainTest"

@app.route("/api/test", methods=['GET'])
def test():
    return jsonify(True)

@app.route("/api/predict", methods=['POST'])
def predict():
    data = request.json
    if 'input_value' not in data:
        return jsonify({"error": "No input_value provided"}), 400

    input_value = data['input_value']
    prediction = Prediction(current_matrix)

    # Function call for the prediction (to be added)
    result = prediction.getPredictions(input_value)

    return jsonify(result)

@app.route("/api/switchMatrix", methods=['POST'])
def switchMatrix():
    global current_matrix, current_matrix_name
    
    data = request.json
    if 'matrix_name' not in data:
        return jsonify({"error": "No matrix_name provided"}), 400

    matrix_name = data['matrix_name']
    
    if matrix_name not in matrices:
        return jsonify({"error": f"Matrix '{matrix_name}' not found"}), 404

    # Switch the matrix
    current_matrix = matrices[matrix_name]
    current_matrix_name = matrix_name

    return jsonify({"success": True, "message": f"Matrix switched to '{matrix_name}'"})

@app.route("/api/getMatrices", methods=['GET'])
def getMatrices():
    # Return current open matrix and available matrices
    return jsonify({
        "available_matrices": list(matrices.keys()),
        "current_matrix": current_matrix_name
    })

if __name__ == "__main__":
    app.run(debug=True, port=8081)
