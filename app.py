from flask import Flask, jsonify, render_template, request
from database import init_db, get_all_wishes, create_wish, update_wish, delete_wish

app = Flask(
    __name__,
    static_folder="static",
    static_url_path="/static",
    template_folder="templates",
)

# Initialize the local SQLite database once when the application starts.
init_db()


@app.get("/")
def home():
    return render_template("index.html", wishes=get_all_wishes())


@app.post("/api/wishes")
def add_wish():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    category = (data.get("category") or "Other").strip()
    target_date = (data.get("target_date") or "").strip() or None

    if not title:
        return jsonify({"error": "Wish title is required."}), 400

    wish = create_wish(title, description, category, target_date)
    return jsonify(wish), 201


@app.patch("/api/wishes/<int:wish_id>")
def edit_wish(wish_id):
    data = request.get_json(silent=True) or {}
    allowed = {"title", "description", "category", "status", "target_date"}
    updates = {key: data[key] for key in allowed if key in data}

    if "title" in updates and not str(updates["title"]).strip():
        return jsonify({"error": "Wish title cannot be empty."}), 400

    wish = update_wish(wish_id, updates)
    if wish is None:
        return jsonify({"error": "Wish not found."}), 404

    return jsonify(wish)


@app.delete("/api/wishes/<int:wish_id>")
def remove_wish(wish_id):
    if not delete_wish(wish_id):
        return jsonify({"error": "Wish not found."}), 404
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
