from matrices.openMatrix import MyCsv
from prediction import Prediction
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

matrix = MyCsv()
# Adjusted file path
matrix.openCsv(r"C:\Users\olive\Coding\Projektarbeit\Code\server\matrices\SimpleIORChoice_nsp_matrix.csv")

@app.route("/api/test", methods=['GET'])
def test():
    return jsonify(True)

@app.route("/api/predict", methods=['POST'])
def predict():
    data = request.json
    if 'input_value' not in data:
        return jsonify({"error": "No input_value provided"}), 400

    input_value = data['input_value']
    prediction = Prediction(matrix)
    
    print("hi")

    # function call for the prediction (to be added)
    result = prediction.getPredictions(input_value)
    print("bye")

    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True, port=8081)
